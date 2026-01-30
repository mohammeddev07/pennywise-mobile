import type { Category } from "../types/dto";

export const MOCK_CATEGORIES: Category[] = [
  { id: "c_food", name: "Food", type: "EXPENSE", isDisabled: false },
  { id: "c_rent", name: "Rent", type: "EXPENSE", isDisabled: false },
  { id: "c_fuel", name: "Fuel", type: "EXPENSE", isDisabled: false },
  { id: "c_shop", name: "Shopping", type: "EXPENSE", isDisabled: false },
  { id: "c_fun", name: "Entertainment", type: "EXPENSE", isDisabled: false },
  { id: "c_groc", name: "Groceries", type: "EXPENSE", isDisabled: false },
  { id: "c_salary", name: "Salary", type: "INCOME", isDisabled: false }
];
