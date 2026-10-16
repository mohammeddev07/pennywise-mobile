import React from "react";
import { AxiosError } from "axios";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";

import Home from "@/app/(tabs)/home";
import { queryClient } from "@/shared/api/queryClient";
import * as summaryApi from "@/shared/api/summary";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { todayInTimeZone, addDaysYmd } from "@/shared/utils/ledgerDate";
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { buildFixture, installFixture, restoreBackend } from "@/features/transactions/__tests__/fixtures/phase1Fixture";
import type { AnalyzeResponse } from "@/shared/types/transactionQuery";
import { useHomeSnapshotStore } from "../store";
import type { HomeSnapshot } from "../types";

jest.mock("expo-file-system/legacy", () => ({}));

const fx = buildFixture(new Date().toISOString().slice(0, 10));
const book = { ...fx.book, timezone: "UTC" };
const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const weekEnd = todayInTimeZone("UTC");

const snapshot = (accountId: string): HomeSnapshot => ({
  accountId,
  bookId: book.id,
  month,
  weekStart: addDaysYmd(weekEnd, -6),
  weekEnd,
  savedAt: Date.now() - 60 * 60_000,
  balance: { bookId: book.id, currencyCode: "USD", balanceMinor: 123456 },
  summary: { bookId: book.id, month, currencyCode: "USD", incomeTotalMinor: 0, expenseTotalMinor: 0, byCategory: [] },
  weekAnalysis: { bookId: book.id, currencyCode: "USD", buckets: [], categories: [] } as unknown as AnalyzeResponse,
  recent: [],
});

const wrap = (node: React.ReactNode) => <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
const cachedLabel = `Total balance ${formatCurrency(123456, "USD")}`;
let getBalance: jest.SpyInstance;

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  installFixture(fx);
  useAuthStore.setState({ user: { id: "user-A", email: "a@x.io", defaultCurrencyCode: "USD", createdAt: "" } });
  useBooksStore.setState({ ready: true, selectedBookId: book.id, books: [book as never] });
  getBalance = jest.spyOn(summaryApi, "getBalance").mockRejectedValue(new AxiosError("timeout", "ECONNABORTED"));
});

afterEach(async () => {
  jest.restoreAllMocks();
  useHomeSnapshotStore.setState({ snapshot: null });
  await queryClient.cancelQueries();
  queryClient.clear();
});
afterAll(() => restoreBackend());

it("shows cached balance and no error when the refetch fails", async () => {
  useHomeSnapshotStore.setState({ snapshot: snapshot("user-A") });
  render(wrap(<Home />));
  expect(screen.getByLabelText(cachedLabel)).toBeTruthy();
  await waitFor(() => expect(getBalance).toHaveBeenCalled());
  await waitFor(() => expect(queryClient.getQueryState(["balance", book.id])?.status).toBe("error"));
  expect(screen.getByLabelText(cachedLabel)).toBeTruthy();
  expect(screen.queryByText("Couldn’t load balance")).toBeNull();
});

it("ignores a snapshot from another account", async () => {
  useHomeSnapshotStore.setState({ snapshot: snapshot("someone-else") });
  render(wrap(<Home />));
  await waitFor(() => expect(screen.getByText("Couldn’t load balance")).toBeTruthy());
  expect(screen.queryByLabelText(cachedLabel)).toBeNull();
});
