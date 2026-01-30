import { create } from "zustand";

export type TransactionType = "expense" | "income";

export type Transaction = {
  id: string;
  bookId: string;
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryId: string;
  categoryName: string;
  note?: string;
  occurredAt: string; // ISO
};

type Draft = {
  type: TransactionType;
  rawAmount: string; // e.g. "50" or "50.2" or "50.20"
  categoryId: string;
  categoryName: string;
  note: string;
};

type State = {
  selectedBookId: string;
  transactions: Transaction[];
  draft: Draft;

  setDraftType: (t: TransactionType) => void;
  setDraftCategory: (id: string, name: string) => void;
  setDraftNote: (note: string) => void;

  pressKey: (k: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back") => void;

  getFormattedAmount: () => string;
  submitDraft: () => Transaction;
  resetDraft: () => void;
};

const initialDraft: Draft = {
  type: "expense",
  rawAmount: "50.00",
  categoryId: "food",
  categoryName: "Food & Drink",
  note: ""
};

export const useTransactionsStore = create<State>((set, get) => ({
  selectedBookId: "personal",
  transactions: [],
  draft: initialDraft,

  setDraftType: (t) => set((s) => ({ draft: { ...s.draft, type: t } })),
  setDraftCategory: (id, name) => set((s) => ({ draft: { ...s.draft, categoryId: id, categoryName: name } })),
  setDraftNote: (note) => set((s) => ({ draft: { ...s.draft, note } })),

  pressKey: (k) => {
    const { rawAmount } = get().draft;

    if (k === "back") {
      const next = rawAmount.length <= 1 ? "0" : rawAmount.slice(0, -1);
      set((s) => ({ draft: { ...s.draft, rawAmount: normalize(next) } }));
      return;
    }

    if (k === ".") {
      if (rawAmount.includes(".")) return;
      set((s) => ({ draft: { ...s.draft, rawAmount: normalize(rawAmount + ".") } }));
      return;
    }

    // digit
    const [intPart, decPart] = rawAmount.split(".");
    if (decPart && decPart.length >= 2) return;

    const appended =
      rawAmount === "0"
        ? k
        : rawAmount === "0.00"
          ? k
          : rawAmount + k;

    set((s) => ({ draft: { ...s.draft, rawAmount: normalize(appended) } }));
  },

  getFormattedAmount: () => {
    const { rawAmount } = get().draft;
    const n = parseFloat(rawAmount || "0");
    const fixed = Number.isFinite(n) ? n.toFixed(2) : "0.00";
    return `$${fixed}`;
  },

  submitDraft: () => {
    const s = get();
    const n = parseFloat(s.draft.rawAmount || "0");
    const amountMinor = Math.round((Number.isFinite(n) ? n : 0) * 100);

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      bookId: s.selectedBookId,
      type: s.draft.type,
      amountMinor: amountMinor,
      currencyCode: "USD",
      categoryId: s.draft.categoryId,
      categoryName: s.draft.categoryName,
      note: s.draft.note.trim() || undefined,
      occurredAt: new Date().toISOString()
    };

    set((prev) => ({ transactions: [tx, ...prev.transactions] }));
    return tx;
  },

  resetDraft: () => set({ draft: initialDraft })
}));

function normalize(v: string) {
  // Keep it usable for money input
  if (v === "") return "0";
  if (v.startsWith(".")) return "0" + v;
  // Avoid leading zeros like "0005"
  if (!v.includes(".")) {
    const stripped = v.replace(/^0+(?=\d)/, "");
    return stripped === "" ? "0" : stripped;
  }
  return v;
}
