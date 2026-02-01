import { create } from "zustand";

export type DraftKind = "expense" | "income";

type State = {
  amount: string;
  kind: DraftKind;

  title: string;
  category: string;
  note: string;

  bookId: string;

  setAmount: (amount: string) => void;
  setKind: (kind: DraftKind) => void;

  setTitle: (title: string) => void;
  setCategory: (category: string) => void;
  setNote: (note: string) => void;

  setBookId: (bookId: string) => void;

  reset: () => void;
};

const DEFAULTS = {
  amount: "0",
  kind: "expense" as DraftKind,

  title: "",
  category: "Uncategorized",
  note: "",

  bookId: "personal",
};

export const useAddTransactionDraftStore = create<State>((set) => ({
  ...DEFAULTS,

  setAmount: (amount) => set({ amount }),
  setKind: (kind) => set({ kind }),

  setTitle: (title) => set({ title }),
  setCategory: (category) => set({ category }),
  setNote: (note) => set({ note }),

  setBookId: (bookId) => set({ bookId }),

  reset: () => set({ ...DEFAULTS }),
}));
