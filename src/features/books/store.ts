import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Book = {
  id: string;
  name: string;
  subtitle?: string;
  lastSyncedAt?: string; // ISO (optional)
};

type State = {
  books: Book[];
  selectedBookId: string;

  setSelectedBookId: (id: string) => void;

  addBook: (input: Omit<Book, "id"> & { id?: string }) => string;
  updateBook: (id: string, patch: Partial<Omit<Book, "id">>) => void;
  removeBook: (id: string) => void;
};

function makeId() {
  return `book_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_BOOKS: Book[] = [
  { id: "personal", name: "Personal", subtitle: "CashBook Pro", lastSyncedAt: new Date().toISOString() },
  { id: "business", name: "Business", subtitle: "LLC", lastSyncedAt: new Date().toISOString() },
];

export const useBooksStore = create<State>()(
  persist(
    (set, get) => ({
      books: DEFAULT_BOOKS,
      selectedBookId: "personal",

      setSelectedBookId: (id) => {
        const exists = get().books.some((b) => b.id === id);
        set({ selectedBookId: exists ? id : (get().books[0]?.id ?? "personal") });
      },

      addBook: (input) => {
        const id = input.id ?? makeId();
        const next: Book = {
          id,
          name: input.name.trim() || "Untitled",
          subtitle: input.subtitle?.trim() ? input.subtitle.trim() : undefined,
          lastSyncedAt: input.lastSyncedAt ?? new Date().toISOString(),
        };
        set((s) => ({ books: [next, ...s.books] }));
        return id;
      },

      updateBook: (id, patch) => {
        set((s) => ({
          books: s.books.map((b) =>
            b.id === id
              ? {
                  ...b,
                  ...patch,
                  name: patch.name !== undefined ? patch.name.trim() || "Untitled" : b.name,
                  subtitle: patch.subtitle !== undefined ? (patch.subtitle?.trim() || undefined) : b.subtitle,
                }
              : b
          ),
        }));
      },

      removeBook: (id) => {
        set((s) => {
          const books = s.books.filter((b) => b.id !== id);
          const selectedBookId = s.selectedBookId === id ? (books[0]?.id ?? "personal") : s.selectedBookId;
          return { books, selectedBookId };
        });
      },
    }),
    {
      name: "pennywise_books_v1",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ books: s.books, selectedBookId: s.selectedBookId }),
    }
  )
);
