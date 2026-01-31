import { create } from "zustand";

export type Category = {
  id: string;
  name: string;
  icon: string; // Ionicons name
  color: string; // hex
  createdAt: string;
};

type CategoryInput = Omit<Category, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

type CategoriesState = {
  categories: Category[];
  addCategory: (input: CategoryInput) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id" | "createdAt">>) => void;
  removeCategory: (id: string) => void;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Food", icon: "fast-food-outline", color: "#FFB020", createdAt: new Date().toISOString() },
  { id: "groceries", name: "Groceries", icon: "basket-outline", color: "#34D399", createdAt: new Date().toISOString() },
  { id: "transport", name: "Transport", icon: "car-outline", color: "#60A5FA", createdAt: new Date().toISOString() },
  { id: "rent", name: "Rent", icon: "home-outline", color: "#A78BFA", createdAt: new Date().toISOString() },
  { id: "shopping", name: "Shopping", icon: "cart-outline", color: "#F472B6", createdAt: new Date().toISOString() },
  { id: "salary", name: "Salary", icon: "cash-outline", color: "#00C805", createdAt: new Date().toISOString() }
];

function makeId() {
  return `cat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: DEFAULT_CATEGORIES,

  addCategory: (input) => {
    const id = input.id ?? makeId();
    const createdAt = input.createdAt ?? new Date().toISOString();

    const next: Category = {
      id,
      createdAt,
      name: input.name.trim() || "Untitled",
      icon: input.icon || "pricetag-outline",
      color: input.color || "#00C805"
    };

    set((s) => ({ categories: [next, ...s.categories] }));
    return id;
  },

  updateCategory: (id, patch) => {
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              name: patch.name !== undefined ? patch.name.trim() || "Untitled" : c.name
            }
          : c
      )
    }));
  },

  removeCategory: (id) => {
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  }
}));
