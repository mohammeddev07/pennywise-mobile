import { create } from "zustand";

export type DraftKind = "EXPENSE" | "INCOME";

type State = {
  amount: string;
  kind: DraftKind;
  bookId: string;
  idempotencyKey: string;

  title: string;
  categoryId?: string;
  categoryName: string;
  note: string;

  occurredAt: string;

  setAmount: (amount: string) => void;
  setKind: (kind: DraftKind) => void;
  setBookId: (bookId: string) => void;
  resetIdempotencyKey: () => void;

  setTitle: (title: string) => void;
  setCategory: (categoryId: string | undefined, categoryName: string) => void;
  setNote: (note: string) => void;

  setOccurredAt: (iso: string) => void;

  reset: () => void;
};

function randomIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function freshDraft(): Omit<
  State,
  | "setAmount"
  | "setKind"
  | "setBookId"
  | "resetIdempotencyKey"
  | "setTitle"
  | "setCategory"
  | "setNote"
  | "setOccurredAt"
  | "reset"
> {
  return {
    amount: "0",
    kind: "EXPENSE",
    bookId: "",
    idempotencyKey: randomIdempotencyKey(),
    title: "",
    categoryId: undefined,
    categoryName: "Uncategorized",
    note: "",
    occurredAt: new Date().toISOString(),
  };
}

export const useAddTransactionDraftStore = create<State>((set) => ({
  ...freshDraft(),

  setAmount: (amount) => set({ amount }),
  setKind: (kind) => set({ kind, categoryId: undefined, categoryName: "Uncategorized" }),
  setBookId: (bookId) => set({ bookId }),
  resetIdempotencyKey: () => set({ idempotencyKey: randomIdempotencyKey() }),

  setTitle: (title) => set({ title }),
  setCategory: (categoryId, categoryName) => set({ categoryId, categoryName: categoryName.trim() || "Uncategorized" }),
  setNote: (note) => set({ note }),

  setOccurredAt: (iso) => set({ occurredAt: iso }),

  reset: () => set(freshDraft()),
}));
