import { create } from "zustand";
import type { Book, BookId } from "@/shared/types/models";

type BooksState = {
  books: Book[];
  selectedBookId: BookId | null;
  selectBook: (id: BookId) => void;
  addBook: (book: Book) => void;
};

const INITIAL_BOOKS: Book[] = [
  { id: "personal", name: "Personal", subtitle: "Everyday spending" },
  { id: "business", name: "Business", subtitle: "Work & clients" },
];

export const useBooksStore = create<BooksState>((set) => ({
  books: INITIAL_BOOKS,
  selectedBookId: null,

  selectBook: (id) => set({ selectedBookId: id }),

  addBook: (book) =>
    set((s) => ({
      books: [book, ...s.books],
    })),
}));
