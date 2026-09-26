import { create } from "zustand";

type State = {
  visible: boolean;
  show: () => void;
  hide: () => void;
};

/**
 * No auto-hide timer, unlike the export/undo toasts - an available update
 * stays offered until the user restarts or dismisses it, not until a clock
 * runs out.
 */
export const useUpdateToastStore = create<State>((set) => ({
  visible: false,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));
