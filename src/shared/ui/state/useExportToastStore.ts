import { create } from "zustand";
import * as Haptics from "expo-haptics";

let hideTimer: ReturnType<typeof setTimeout> | null = null;

type State = {
  visible: boolean;
  message: string;

  showSuccess: (message: string) => void;
  hide: () => void;
};

export const useExportToastStore = create<State>((set) => ({
  visible: false,
  message: "",

  showSuccess: (message) => {
    if (hideTimer) clearTimeout(hideTimer);

    set({ visible: true, message });

    hideTimer = setTimeout(() => {
      set({ visible: false });
      hideTimer = null;
    }, 4000);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    set({ visible: false });
  },
}));
