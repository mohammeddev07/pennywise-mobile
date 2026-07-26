import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as booksApi from "@/shared/api/books";
import type { Book } from "@/shared/types/models";
import { useSettingsStore } from "@/features/settings/store";

export type { Book };

type AddBookInput = {
  name: string;
  currencyCode?: string;
  timezone?: string;
  openingBalanceMinor?: number;
};

type State = {
  books: Book[];
  selectedBookId: string;
  isLoading: boolean;
  error: string | null;

  loadBooks: () => Promise<void>;
  setSelectedBookId: (id: string) => void;

  addBook: (input: AddBookInput) => Promise<string>;
  updateBook: (id: string, patch: Partial<Pick<Book, "name">>) => Promise<void>;
  removeBook: (id: string) => Promise<boolean>;
};

function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function normalizeBook(input: any): Book {
  const now = new Date().toISOString();
  return {
    id: String(input.id),
    name: String(input.name ?? "Untitled"),
    currencyCode: String(input.currencyCode ?? "USD").toUpperCase(),
    timezone: String(input.timezone ?? deviceTimezone()),
    openingBalanceMinor: Number(input.openingBalanceMinor ?? 0) || 0,
    version: Number(input.version ?? 0) || 0,
    createdAt: String(input.createdAt ?? now),
    updatedAt: String(input.updatedAt ?? input.createdAt ?? now),
  };
}

function selectedOrFirst(books: Book[], selectedBookId?: string) {
  if (selectedBookId && books.some((b) => b.id === selectedBookId)) return selectedBookId;
  return books[0]?.id ?? "";
}

export const useBooksStore = create<State>()(
  persist(
    (set, get) => ({
      books: [],
      selectedBookId: "",
      isLoading: false,
      error: null,

      loadBooks: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await booksApi.listBooks();
          const books = res.items.map(normalizeBook);
          set((s) => ({
            books,
            selectedBookId: selectedOrFirst(books, s.selectedBookId),
            isLoading: false,
            error: null,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not load books";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      setSelectedBookId: (id) => {
        const exists = get().books.some((b) => b.id === id);
        set((s) => ({ selectedBookId: exists ? id : (s.books[0]?.id ?? "") }));
      },

      addBook: async (input) => {
        const currencyCode = input.currencyCode ?? useSettingsStore.getState().primaryCurrency ?? "USD";
        const book = normalizeBook(
          await booksApi.createBook(
            input.name.trim() || "Untitled",
            currencyCode,
            input.timezone ?? deviceTimezone(),
            input.openingBalanceMinor ?? 0
          )
        );
        set((s) => ({ books: [book, ...s.books.filter((b) => b.id !== book.id)], selectedBookId: book.id }));
        return book.id;
      },

      updateBook: async (id, patch) => {
        const current = get().books.find((b) => b.id === id);
        if (!current) return;
        const name = patch.name?.trim() || current.name;
        const book = normalizeBook(await booksApi.patchBook(id, current.version, name));
        set((s) => ({ books: s.books.map((b) => (b.id === id ? book : b)) }));
      },

      removeBook: async (id) => {
        const current = get().books.find((b) => b.id === id);
        if (!current || get().books.length <= 1) return false;
        await booksApi.deleteBook(id, current.version);
        set((s) => {
          const books = s.books.filter((b) => b.id !== id);
          return { books, selectedBookId: selectedOrFirst(books, s.selectedBookId === id ? undefined : s.selectedBookId) };
        });
        return true;
      },
    }),
    {
      name: "pennywise_books_v1",
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ books: s.books, selectedBookId: s.selectedBookId }),
      migrate: async (persisted: any) => {
        const books = Array.isArray(persisted?.books)
          ? persisted.books
              .filter((b: any) => typeof b?.currencyCode === "string" && typeof b?.version === "number")
              .map(normalizeBook)
          : [];
        return { books, selectedBookId: selectedOrFirst(books, persisted?.selectedBookId) };
      },
    }
  )
);
