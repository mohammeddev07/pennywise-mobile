import { create } from "zustand";

type ThemeMode = "dark" | "light" | "system";

type AppState = {
  selectedBookId: string | null;
  setSelectedBookId: (id: string) => void;

  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedBookId: "3f1f2c2a-7d9e-4c7d-9a2f-0c3b6f9c1a11",
  setSelectedBookId: (id) => set({ selectedBookId: id }),

  // Requirement: dark default
  themeMode: "dark",
  setThemeMode: (mode) => set({ themeMode: mode })
}));
