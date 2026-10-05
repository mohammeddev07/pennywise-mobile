import { type PropsWithChildren, type ReactNode, useRef } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
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
  /** Render inside a caller-owned Modal for multi-step sheets. */
  embedded?: boolean;
  onClose: () => void;
  title?: string;
  rightAction?: ReactNode;
  footer?: ReactNode;
  /** Tall sheet: body scrolls under a fixed header and footer. For long forms (filters, sort). */
  scroll?: boolean;
  /**
   * Slide in on show. Defaults to true. Pass false when the sheet is coming
   * back from being briefly hidden (e.g. behind an Android date dialog), so it
   * reappears where it was instead of travelling up the screen a second time.
   * A `scroll` sheet also returns at the scroll position it was left at.
   */
  animateIn?: boolean;
  entrance?: "slide" | "fade";
}>;

// The sheet decelerates into place and stops - no spring, so there is no
// overshoot to wait out before the controls can be used.
const SHEET_ENTER = SlideInDown.duration(tokens.motion.base).easing(Easing.out(Easing.cubic));
const FADE_ENTER = FadeIn.duration(tokens.motion.fast);

const SWIPE_CLOSE_DISTANCE = 96;
const SWIPE_CLOSE_VELOCITY = 900;

/**
 * The app's only inline bottom sheet - a modal picker that keeps the user on
 * the screen behind it instead of navigating to a new route.
 *
 * Used for the date/time pickers on the add-transaction flow and the custom
 * date-range picker on Activity. Screens must not hand-roll a second one.
 */
export function BottomSheetModal({
  visible,
  embedded = false,
  onClose,
  title,
  rightAction,
  footer,
  scroll,
  animateIn = true,
  entrance = "slide",
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  // Swipe only on the handle, so the X and other header controls receive taps.
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
    })
    .onFinalize(() => {
      dragY.value = withSpring(0, tokens.spring.snappy);
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  const paddingX = useScreenPaddingX();
  const reduceMotion = useReducedMotion();
  const fill = scroll ? { flex: 1 } : null;
  // A hidden Modal unmounts its contents, scroll view included. Remember where
  // the body was so a sheet returning from being hidden is not reset to the top;
  // a fresh open (animateIn) always starts at the top.
  const scrollY = useRef(0);

  // Android modals need their own gesture root.
  const content = (
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/*
          Entering only - never `exiting` - on anything inside this Modal. With
          animationType="none" the Modal's window is torn down the moment
          `visible` goes false, so an exit animation has nowhere to play; worse,
          on Android a Reanimated `exiting` animation inside a Modal can leave
          the view stuck and the whole sheet unresponsive to touches (Cancel,
          close and Apply all "doing nothing"). Closing is instant by design.
        */}
        <Animated.View
          entering={animateIn ? FADE_ENTER : undefined}
          collapsable={false}
          style={{ flex: 1, backgroundColor: withAlpha(tokens.colors.black, 0.55) }}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />

          <KeyboardAvoidingView
            // RN's `Modal` opens its own native window on Android, which the activity's
            // windowSoftInputMode (adjustResize) never reaches - unlike every plain-screen
            // KeyboardAvoidingView in this app, `undefined` here means Android gets no keyboard
            // avoidance at all. A focused text field (e.g. DescribeFilterSheet's question field)
            // then leaves the keyboard sitting on top of the footer button, so only the sliver
            // still above the keyboard is tappable. "height" resizes the view in JS instead of
            // relying on native window resize, so it works even inside a Modal.
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            // A scrolling sheet fills this view. Reserve the status-bar/notch
            // inset above it while keeping its bottom edge at the screen edge.
            style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingTop: scroll ? insets.top : 0 }}
            pointerEvents="box-none"
          >
            <Animated.View
              // Reduced motion: the sheet fades in place instead of travelling up the screen.
              entering={animateIn ? (reduceMotion || entrance === "fade" ? FADE_ENTER : SHEET_ENTER) : undefined}
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
                  <View
                    testID="sheet-drag-handle"
                    collapsable={false}
                    style={{ minHeight: 32, justifyContent: "center" }}
                  >
                    <View
                      style={{
                        alignSelf: "center",
                        width: 36,
                        height: 4,
                        borderRadius: 2,
                        // Was the hairline colour (1.2:1): a drag handle nobody could see.
                        backgroundColor: withAlpha(tokens.colors.muted, 0.5),
                      }}
                    />
                  </View>
                </GestureDetector>

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
                        <AppText
                          style={{ flex: 1, marginRight: 12 }}
                          numberOfLines={2}
                          variant="lg"
                          weight="semibold"
                          accessibilityRole="header"
                        >
                          {title}
                        </AppText>
                        {rightAction ?? <View style={{ width: tokens.layout.minTap }} />}
                      </View>
                ) : null}

                {scroll ? (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentOffset={{ x: 0, y: animateIn ? 0 : scrollY.current }}
                    onScroll={(e) => {
                      scrollY.current = e.nativeEvent.contentOffset.y;
                    }}
                    scrollEventThrottle={32}
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
  );

  if (embedded) return visible ? content : null;
  return (
    <Modal visible={visible} transparent presentationStyle="overFullScreen" animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {content}
    </Modal>
  );
}

export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return <IconButton icon="close" accessibilityLabel="Close" onPress={onPress} />;
}

export default BottomSheetModal;
