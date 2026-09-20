import { type PropsWithChildren, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";
import { AppText } from "@/shared/ui/components/AppText";
import { IconButton } from "@/shared/ui/components/IconButton";
import { useScreenPaddingX } from "@/shared/ui/components/Screen";

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  rightAction?: ReactNode;
  footer?: ReactNode;
  /** Tall sheet: body scrolls under a fixed header and footer. For long forms (filters, sort). */
  scroll?: boolean;
}>;

const SWIPE_CLOSE_DISTANCE = 96;
const SWIPE_CLOSE_VELOCITY = 900;

/**
 * The app's only inline bottom sheet - a modal picker that keeps the user on
 * the screen behind it instead of navigating to a new route.
 *
 * Used for the date/time pickers on the add-transaction flow and the custom
 * date-range picker on Activity. Screens must not hand-roll a second one.
 */
export function BottomSheetModal({ visible, onClose, title, rightAction, footer, scroll, children }: Props) {
  const insets = useSafeAreaInsets();

  // Swipe down on the handle + title strip to dismiss. It is a pan on the
  // header only, so the body's own scrolling and inputs never compete with it.
  // Past 96px or a flick, the sheet closes; otherwise it springs back.
  const dragY = useSharedValue(0);
  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > SWIPE_CLOSE_DISTANCE || e.velocityY > SWIPE_CLOSE_VELOCITY) {
        runOnJS(onClose)();
      }
      dragY.value = withSpring(0, tokens.spring.snappy);
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  const paddingX = useScreenPaddingX();
  const reduceMotion = useReducedMotion();
  const fill = scroll ? { flex: 1 } : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Android renders a Modal outside the app's root gesture view, so it needs its own. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          entering={FadeIn.duration(tokens.motion.fast)}
          exiting={FadeOut.duration(tokens.motion.fast)}
          collapsable={false}
          style={{ flex: 1, backgroundColor: withAlpha(tokens.colors.black, 0.55) }}
        >
          <Pressable
            style={scroll ? { height: insets.top + tokens.space[6] } : { flex: 1 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[fill, { alignItems: "center" }]}
          >
            <Animated.View
              // Reduced motion: the sheet fades in place instead of travelling up the screen.
              entering={reduceMotion ? FadeIn.duration(tokens.motion.fast) : SlideInDown.duration(tokens.motion.base).springify().damping(24).stiffness(260)}
              exiting={reduceMotion ? FadeOut.duration(tokens.motion.fast) : SlideOutDown.duration(tokens.motion.fast)}
              collapsable={false}
              accessibilityViewIsModal
              aria-modal
              // Capped like a form column so a sheet on tablet/web is not a
              // 1280px slab; a phone is narrower than the cap.
              style={[{ width: "100%", maxWidth: tokens.layout.container.form }, fill]}
            >
              <Animated.View
                style={[
                  {
                    borderTopLeftRadius: tokens.radii.xl,
                    borderTopRightRadius: tokens.radii.xl,
                    borderWidth: 1,
                    borderColor: tokens.colors.stroke,
                    backgroundColor: tokens.colors.app,
                    paddingBottom: insets.bottom + tokens.space[4],
                    paddingHorizontal: paddingX,
                  },
                  fill,
                  dragStyle,
                ]}
              >
                <GestureDetector gesture={drag}>
                  <View collapsable={false} style={{ paddingTop: tokens.space[3] }}>
                    <View
                      style={{
                        alignSelf: "center",
                        width: 36,
                        height: 4,
                        borderRadius: 2,
                        // Was the hairline colour (1.2:1): a drag handle nobody could see.
                        backgroundColor: withAlpha(tokens.colors.muted, 0.5),
                        marginBottom: tokens.space[3],
                      }}
                    />

                    {title || rightAction ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: tokens.layout.iconTap,
                          marginBottom: tokens.space[4],
                        }}
                      >
                        <AppText variant="lg" weight="semibold" accessibilityRole="header">
                          {title}
                        </AppText>
                        {rightAction ?? <View style={{ width: tokens.layout.minTap }} />}
                      </View>
                    ) : null}
                  </View>
                </GestureDetector>

                {scroll ? (
                  <ScrollView
                    style={{ flex: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: tokens.space[4] }}
                  >
                    {children}
                  </ScrollView>
                ) : (
                  children
                )}

                {footer ? (
                  <View
                    style={{
                      marginTop: tokens.space[5],
                      paddingTop: tokens.space[4],
                      borderTopWidth: 1,
                      borderTopColor: tokens.colors.divider,
                    }}
                  >
                    {footer}
                  </View>
                ) : null}
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return <IconButton icon="close" accessibilityLabel="Close" onPress={onPress} />;
}

export default BottomSheetModal;
