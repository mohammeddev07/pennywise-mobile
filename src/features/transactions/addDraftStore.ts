import { create } from "zustand";

export type DraftKind = "expense" | "income";

type State = {
  // core
  amount: string; // "10.00" style string for keypad
  kind: DraftKind;
  bookId: string;

  // fields
  title: string;
  category: string;
  note: string;

  // ✅ new
  occurredAt: string; // ISO

  // actions
  setAmount: (amount: string) => void;
  setKind: (kind: DraftKind) => void;
  setBookId: (bookId: string) => void;

  setTitle: (title: string) => void;
  setCategory: (category: string) => void;
  setNote: (note: string) => void;

  setOccurredAt: (iso: string) => void;

  reset: () => void;
};

function freshDraft(): Omit<
  State,
  | "setAmount"
  | "setKind"
  | "setBookId"
  | "setTitle"
  | "setCategory"
  | "setNote"
  | "setOccurredAt"
  | "reset"
> {
  return {
    amount: "0",
    kind: "expense",
    bookId: "personal",
    title: "",
    category: "Uncategorized",
    note: "",
    occurredAt: new Date().toISOString(),
  };
}

export const useAddTransactionDraftStore = create<State>((set) => ({
  ...freshDraft(),

  setAmount: (amount) => set({ amount }),
  setKind: (kind) => set({ kind }),
  setBookId: (bookId) => set({ bookId }),

  setTitle: (title) => set({ title }),
  setCategory: (category) => set({ category }),
  setNote: (note) => set({ note }),

  setOccurredAt: (iso) => set({ occurredAt: iso }),

  reset: () => set(freshDraft()),
}));
