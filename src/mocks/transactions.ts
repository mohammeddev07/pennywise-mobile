import type { Transaction } from "../types/dto";

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t_1",
    occurredOn: "2026-04-24",
    type: "EXPENSE",
    amountMinor: 8520,
    category: { id: "c_groc", name: "Groceries" },
    merchantName: "Whole Foods Market",
    createdAt: "2026-04-24T10:12:00.000Z"
  },
  {
    id: "t_2",
    occurredOn: "2026-04-23",
    type: "INCOME",
    amountMinor: 350000,
    category: { id: "c_salary", name: "Salary" },
    merchantName: "Monthly Salary",
    createdAt: "2026-04-23T09:04:00.000Z"
  },
  {
    id: "t_3",
    occurredOn: "2026-04-22",
    type: "EXPENSE",
    amountMinor: 2400,
    category: { id: "c_fuel", name: "Transport" },
    merchantName: "Uber Trip",
    createdAt: "2026-04-22T18:25:00.000Z"
  },
  {
    id: "t_4",
    occurredOn: "2026-04-21",
    type: "EXPENSE",
    amountMinor: 1599,
    category: { id: "c_fun", name: "Entertainment" },
    merchantName: "Netflix Subscription",
    createdAt: "2026-04-21T08:00:00.000Z"
  }
];
