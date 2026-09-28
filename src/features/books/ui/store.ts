import { create } from 'zustand';
type State = { sheet: 'switcher' | 'create' | 'edit' | 'menu' | null; bookId: string | null; open: (sheet: State['sheet'], bookId?: string) => void; close: () => void };
export const useBookUIStore = create<State>(set => ({ sheet: null, bookId: null, open: (sheet, bookId) => set({ sheet, bookId: bookId ?? null }), close: () => set({ sheet: null, bookId: null }) }));
