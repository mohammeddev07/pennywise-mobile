export const qk = {
  books: ["books"] as const,
  categories: (bookId: string) => ["categories", bookId] as const,
  balance: (bookId: string) => ["balance", bookId] as const,
  transactions: (bookId: string) => ["transactions", bookId] as const
};
