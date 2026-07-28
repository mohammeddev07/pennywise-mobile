import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as booksApi from "@/shared/api/books";
import type { Book } from "@/shared/types/models";
import { useSettingsStore } from "@/features/settings/store";
import { getAccountEpoch, isCurrentAccountEpoch } from "@/shared/session/accountEpoch";

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

  loadBooks: () => Promise<Book[]>;
  ensureBook: (input: AddBookInput) => Promise<string>;
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

let ensureBookInFlight: { accountEpoch: number; promise: Promise<string> } | null = null;

export const useBooksStore = create<State>()(
  persist(
    (set, get) => ({
      books: [],
      selectedBookId: "",
      isLoading: false,
      error: null,

      loadBooks: async () => {
        const accountEpoch = getAccountEpoch();
        set({ isLoading: true, error: null });
        try {
          const res = await booksApi.listBooks();
          const books = res.items.map(normalizeBook);
          if (!isCurrentAccountEpoch(accountEpoch)) return [];
          set({
            books,
            selectedBookId: books[0]?.id ?? "",
            isLoading: false,
            error: null,
          });
          return books;
        } catch (err) {
          if (!isCurrentAccountEpoch(accountEpoch)) return [];
          const message = err instanceof Error ? err.message : "Could not load books";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      ensureBook: async (input) => {
        const accountEpoch = getAccountEpoch();
        if (ensureBookInFlight?.accountEpoch === accountEpoch) return ensureBookInFlight.promise;

        const promise = (async () => {
          const books = await get().loadBooks();
          if (!isCurrentAccountEpoch(accountEpoch)) return "";
          if (books[0]) return books[0].id;
          return get().addBook(input);
        })();
        ensureBookInFlight = { accountEpoch, promise };

        try {
          return await promise;
        } finally {
          if (ensureBookInFlight?.promise === promise) ensureBookInFlight = null;
        }
      },

      setSelectedBookId: (id) => {
        const exists = get().books.some((b) => b.id === id);
        set((s) => ({ selectedBookId: exists ? id : (s.books[0]?.id ?? "") }));
      },

      addBook: async (input) => {
        const accountEpoch = getAccountEpoch();
        const existing = get().books[0];
        if (existing) {
          set({ selectedBookId: existing.id });
          return existing.id;
        }
        const currencyCode = input.currencyCode ?? useSettingsStore.getState().primaryCurrency ?? "USD";
        const book = normalizeBook(
          await booksApi.createBook(
            input.name.trim() || "Untitled",
            currencyCode,
            input.timezone ?? deviceTimezone(),
            input.openingBalanceMinor ?? 0
          )
        );
        if (!isCurrentAccountEpoch(accountEpoch)) return book.id;
        set((s) => ({ books: [book, ...s.books.filter((b) => b.id !== book.id)], selectedBookId: book.id }));
        return book.id;
      },

      updateBook: async (id, patch) => {
        const accountEpoch = getAccountEpoch();
        const current = get().books.find((b) => b.id === id);
        if (!current) return;
        const name = patch.name?.trim() || current.name;
        const book = normalizeBook(await booksApi.patchBook(id, current.version, name));
        if (!isCurrentAccountEpoch(accountEpoch)) return;
        set((s) => ({ books: s.books.map((b) => (b.id === id ? book : b)) }));
      },

      removeBook: async (id) => {
        const accountEpoch = getAccountEpoch();
        const current = get().books.find((b) => b.id === id);
        if (!current || get().books.length <= 1) return false;
        await booksApi.deleteBook(id, current.version);
        if (!isCurrentAccountEpoch(accountEpoch)) return false;
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
