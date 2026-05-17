import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as categoriesApi from "@/shared/api/categories";
import type { CategoryUpdateRequest, TransactionType } from "@/shared/types/api";
import type { Category } from "@/shared/types/models";

export type { Category };

type CategoryInput = {
  type: TransactionType;
  name: string;
  icon?: string;
  color?: string;
};

type CategoriesState = {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  lastCreatedCategoryId: string | null;
  markLastCreatedCategoryId: (id: string) => void;
  consumeLastCreatedCategoryId: () => string | null;

  loadCategories: (bookId: string) => Promise<void>;
  addCategory: (bookId: string, input: CategoryInput) => Promise<string>;
  updateCategory: (bookId: string, id: string, patch: CategoryUpdateRequest) => Promise<void>;
  removeCategory: (bookId: string, id: string) => Promise<void>;
};

function normalizeCategory(input: any): Category {
  return {
    id: String(input.id),
    bookId: String(input.bookId),
    type: input.type === "INCOME" ? "INCOME" : "EXPENSE",
    name: String(input.name ?? "Untitled"),
    icon: String(input.icon ?? "pricetag-outline"),
    color: String(input.color ?? "#22C55E"),
    isDisabled: Boolean(input.isDisabled),
    version: Number(input.version ?? 0) || 0,
    createdAt: String(input.createdAt ?? new Date().toISOString()),
  };
}

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set, get) => ({
      categories: [],
      isLoading: false,
      error: null,

      lastCreatedCategoryId: null,
      markLastCreatedCategoryId: (id) => set({ lastCreatedCategoryId: id }),
      consumeLastCreatedCategoryId: () => {
        const v = get().lastCreatedCategoryId;
        if (v) set({ lastCreatedCategoryId: null });
        return v ?? null;
      },

      loadCategories: async (bookId) => {
        if (!bookId) return;
        set({ isLoading: true, error: null });
        try {
          const res = await categoriesApi.listCategories(bookId);
          const next = res.items.map(normalizeCategory);
          set((s) => ({
            categories: [...s.categories.filter((c) => c.bookId !== bookId), ...next],
            isLoading: false,
            error: null,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not load categories";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      addCategory: async (bookId, input) => {
        const category = normalizeCategory(
          await categoriesApi.createCategory(
            bookId,
            input.type,
            input.name.trim() || "Untitled",
            input.icon || "pricetag-outline",
            input.color || "#22C55E"
          )
        );
        set((s) => ({ categories: [category, ...s.categories.filter((c) => c.id !== category.id)] }));
        return category.id;
      },

      updateCategory: async (bookId, id, patch) => {
        const current = get().categories.find((c) => c.id === id && c.bookId === bookId);
        if (!current) return;
        const category = normalizeCategory(await categoriesApi.patchCategory(bookId, id, current.version, patch));
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? category : c)) }));
      },

      removeCategory: async (bookId, id) => {
        const current = get().categories.find((c) => c.id === id && c.bookId === bookId);
        if (!current) return;
        await categoriesApi.deleteCategory(bookId, id, current.version);
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
      },
    }),
    {
      name: "pennywise_categories_v1",
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ categories: s.categories }),
      migrate: async (persisted: any) => {
        const categories = Array.isArray(persisted?.categories)
          ? persisted.categories
              .filter((c: any) => typeof c?.bookId === "string" && typeof c?.type === "string")
              .map(normalizeCategory)
          : [];
        return { categories };
      },
    }
  )
);
