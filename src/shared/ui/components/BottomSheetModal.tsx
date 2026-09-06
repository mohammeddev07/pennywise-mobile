import { type PropsWithChildren, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";
import { AppText } from "@/shared/ui/components/AppText";
import { IconButton } from "@/shared/ui/components/IconButton";

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  rightAction?: ReactNode;
  footer?: ReactNode;
}>;

/**
 * The app's only inline bottom sheet - a modal picker that keeps the user on
 * the screen behind it instead of navigating to a new route.
 *
 * Used for the date/time pickers on the add-transaction flow and the custom
 * date-range picker on Activity. Screens must not hand-roll a second one.
 */
export function BottomSheetModal({ visible, onClose, title, rightAction, footer, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(tokens.motion.fast)}
        exiting={FadeOut.duration(tokens.motion.fast)}
        style={{ flex: 1, backgroundColor: withAlpha(tokens.colors.black, 0.55) }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />

        <Animated.View
          entering={SlideInDown.duration(tokens.motion.base).springify().damping(24).stiffness(260)}
          exiting={SlideOutDown.duration(tokens.motion.fast)}
          style={{
            borderTopLeftRadius: tokens.radii.xl,
            borderTopRightRadius: tokens.radii.xl,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
            backgroundColor: tokens.colors.app,
            paddingTop: tokens.space[4],
            paddingBottom: insets.bottom + tokens.space[4],
            paddingHorizontal: tokens.layout.screenPaddingX,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens.colors.stroke,
              marginBottom: tokens.space[3],
            }}
          />

          {title || rightAction ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: tokens.space[4],
              }}
            >
              <AppText variant="lg" weight="semibold">
                {title}
              </AppText>
              {rightAction ?? <View style={{ width: tokens.layout.minTap }} />}
            </View>
          ) : null}

          {children}

          {footer ? (
            <View
              style={{ marginTop: tokens.space[5], paddingTop: tokens.space[4], borderTopWidth: 1, borderTopColor: tokens.colors.divider }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return <IconButton icon="close" accessibilityLabel="Close" onPress={onPress} />;
}

export default BottomSheetModal;
