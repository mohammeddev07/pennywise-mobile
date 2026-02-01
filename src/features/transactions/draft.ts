import { create } from "zustand";

export type DraftKind = "expense" | "income";
export type DraftKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

type DraftState = {
  kind: DraftKind;
  amount: string; // raw numeric string, e.g. "0", "12", "12.3"
  category: string; // category name
  note: string;

  reset: () => void;

  setKind: (k: DraftKind) => void;
  setCategory: (name: string) => void;
  setNote: (note: string) => void;

  pressKey: (k: DraftKey) => void;
};

const INITIAL = {
  kind: "expense" as DraftKind,
  amount: "0",
  category: "Uncategorized",
  note: "",
};

function clampAmount(next: string) {
  // Keep to 2 decimals if a dot exists
  if (!next.includes(".")) return next;
  const [a, b = ""] = next.split(".");
  return `${a}.${b.slice(0, 2)}`;
}

function normalize(next: string) {
  if (next === "" || next === "-" || next === "0.") return "0";
  if (next.startsWith(".")) return "0" + next;
  return next;
}

export const useTransactionDraftStore = create<DraftState>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL }),

  setKind: (k) => set({ kind: k }),
  setCategory: (name) => set({ category: name || "Uncategorized" }),
  setNote: (note) => set({ note }),

  pressKey: (k) => {
    const prev = get().amount;

    if (k === "back") {
      let next = prev.length <= 1 ? "0" : prev.slice(0, -1);
      next = normalize(next);
      set({ amount: next });
      return;
    }

    if (k === ".") {
      if (prev.includes(".")) return;
      set({ amount: prev + "." });
      return;
    }

    // digit
    let next = prev === "0" ? k : prev + k;
    next = clampAmount(next);
    next = normalize(next);
    set({ amount: next });
  },
}));
