import { create } from "zustand";
import * as Haptics from "expo-haptics";

import type { Transaction } from "@/features/transactions/store";
import { useTransactionsStore } from "@/features/transactions/store";

let hideTimer: ReturnType<typeof setTimeout> | null = null;

type State = {
  visible: boolean;
  title: string;

  tx: Transaction | null;
  index: number;

  showDeleted: (tx: Transaction, index: number) => void;
  hide: () => void;
  undo: () => void;
};

export const useUndoToastStore = create<State>((set, get) => ({
  visible: false,
  title: "Transaction deleted",

  tx: null,
  index: 0,

  showDeleted: (tx, index) => {
    if (hideTimer) clearTimeout(hideTimer);

    set({
      visible: true,
      title: "Transaction deleted",
      tx,
      index: Math.max(0, index),
    });

    hideTimer = setTimeout(() => {
      set({ visible: false, tx: null });
      hideTimer = null;
    }, 5000);
  },

  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    set({ visible: false, tx: null });
  },

  undo: () => {
    const { tx, index } = get();
    if (!tx) return;

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;

    useTransactionsStore.getState().insertTransaction(tx, index);

    set({ visible: false, tx: null });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
}));
