import { create } from "zustand";

import type { ImportResponse } from "@/shared/types/api";

type State = {
  result: ImportResponse | null;
  setResult: (result: ImportResponse) => void;
  clear: () => void;
};

export const useImportResultStore = create<State>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
