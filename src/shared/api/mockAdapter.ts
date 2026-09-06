import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type {
  AuthResponse,
  BalanceResponse,
  BookResponse,
  BudgetResponse,
  CategoryResponse,
  MeResponse,
  MonthlySummaryCategory,
  MonthlySummaryResponse,
  TransactionResponse,
} from "@/shared/types/api";

/**
 * In-memory fake backend used when EXPO_PUBLIC_MOCK_API=true. Lets the app
 * run on a device/simulator with no network access to a real API server.
 */

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function currentMonth() {
  return nowIso().slice(0, 7);
}

const state = {
  user: {
    id: "mock-user-1",
    email: "demo@pennywise.local",
    defaultCurrencyCode: "USD",
    createdAt: nowIso(),
  } as MeResponse,
  books: [] as BookResponse[],
  categories: [] as CategoryResponse[],
  transactions: [] as TransactionResponse[],
  budgets: [] as BudgetResponse[],
};

function seed() {
  const bookId = uid("book");
  state.books.push({
    id: bookId,
    name: "Personal",
    currencyCode: "USD",
    timezone: "America/New_York",
    openingBalanceMinor: 500000,
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
  });

  const categorySeeds: Array<{ type: CategoryResponse["type"]; name: string; icon: string; color: string }> = [
    { type: "INCOME", name: "Salary", icon: "cash", color: "#22C55E" },
    { type: "INCOME", name: "Freelance", icon: "laptop", color: "#3B82F6" },
    { type: "EXPENSE", name: "Groceries", icon: "cart", color: "#F59E0B" },
    { type: "EXPENSE", name: "Rent", icon: "home", color: "#EF4444" },
    { type: "EXPENSE", name: "Transport", icon: "car", color: "#8B5CF6" },
    { type: "EXPENSE", name: "Dining Out", icon: "restaurant", color: "#EC4899" },
    { type: "EXPENSE", name: "Utilities", icon: "flash", color: "#14B8A6" },
  ];

  const categories = categorySeeds.map((c) => ({
    id: uid("cat"),
    bookId,
    type: c.type,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isDisabled: false,
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
  }));
  state.categories.push(...categories);

  const byName = (name: string) => categories.find((c) => c.name === name)!;
  const month = currentMonth();
  const day = (n: number) => `${month}-${String(n).padStart(2, "0")}`;

  const txSeeds: Array<{
    category: CategoryResponse;
    amountMinor: number;
    title: string;
    dayOfMonth: number;
  }> = [
    { category: byName("Salary"), amountMinor: 450000, title: "Monthly salary", dayOfMonth: 1 },
    { category: byName("Rent"), amountMinor: 150000, title: "Rent", dayOfMonth: 2 },
    { category: byName("Groceries"), amountMinor: 6200, title: "Whole Foods", dayOfMonth: 4 },
    { category: byName("Transport"), amountMinor: 2500, title: "Gas", dayOfMonth: 5 },
    { category: byName("Dining Out"), amountMinor: 3400, title: "Dinner with friends", dayOfMonth: 7 },
    { category: byName("Groceries"), amountMinor: 5400, title: "Trader Joe's", dayOfMonth: 10 },
    { category: byName("Utilities"), amountMinor: 8900, title: "Electric bill", dayOfMonth: 12 },
    { category: byName("Freelance"), amountMinor: 30000, title: "Side project", dayOfMonth: 15 },
    { category: byName("Dining Out"), amountMinor: 1800, title: "Coffee", dayOfMonth: 16 },
    { category: byName("Transport"), amountMinor: 4000, title: "Rideshare", dayOfMonth: 18 },
  ];

  for (const t of txSeeds) {
    const occurredOn = day(t.dayOfMonth);
    state.transactions.push({
      id: uid("tx"),
      bookId,
      type: t.category.type,
      amountMinor: t.amountMinor,
      occurredOn,
      occurredAt: `${occurredOn}T12:00:00.000Z`,
      title: t.title,
      categoryId: t.category.id,
      category: { id: t.category.id, name: t.category.name, type: t.category.type },
      categoryName: t.category.name,
      paymentMethod: "CARD",
      note: null,
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    });
  }

  const budgetSeeds: Array<{ category: CategoryResponse; amountMinor: number }> = [
    { category: byName("Groceries"), amountMinor: 40000 },
    { category: byName("Dining Out"), amountMinor: 15000 },
    { category: byName("Transport"), amountMinor: 10000 },
  ];

  for (const b of budgetSeeds) {
    state.budgets.push({
      id: uid("budget"),
      bookId,
      categoryId: b.category.id,
      categoryName: b.category.name,
      month,
      amountMinor: b.amountMinor,
      spentMinor: 0,
      remainingMinor: b.amountMinor,
      currencyCode: "USD",
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}

seed();

function spentForCategoryMonth(bookId: string, categoryId: string, month: string) {
  return state.transactions
    .filter(
      (t) =>
        t.bookId === bookId &&
        t.categoryId === categoryId &&
        t.type === "EXPENSE" &&
        !t.deletedAt &&
        t.occurredOn.startsWith(month)
    )
    .reduce((sum, t) => sum + t.amountMinor, 0);
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
    request: {},
  };
}

function fail(config: InternalAxiosRequestConfig, status: number, message: string): Promise<never> {
  const error = Object.assign(new Error(message), {
    isAxiosError: true,
    config,
    response: {
      data: { message },
      status,
      statusText: message,
      headers: {},
      config,
    },
    toJSON: () => ({ message }),
  });
  return Promise.reject(error);
}

function parseBody(config: AxiosRequestConfig): Record<string, unknown> {
  if (!config.data) return {};
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data as Record<string, unknown>;
}

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("?")[0].split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (p !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? "get").toUpperCase();
  const url = config.url ?? "";
  const params = (config.params ?? {}) as Record<string, unknown>;
  const body = parseBody(config);

  const route = (pattern: string, verb: string) => {
    if (verb !== method) return null;
    return matchPath(pattern, url);
  };

  let m: Record<string, string> | null;

  // Auth
  if ((m = route("/v1/auth/signup", "POST"))) {
    const { email, defaultCurrencyCode } = body as { email?: string; defaultCurrencyCode?: string };
    state.user = {
      ...state.user,
      email: email ?? state.user.email,
      defaultCurrencyCode: defaultCurrencyCode ?? state.user.defaultCurrencyCode,
    };
    const res: AuthResponse = {
      accessToken: "mock-access-token",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      user: state.user,
    };
    return ok(config, res, 201);
  }

  if ((m = route("/v1/auth/login", "POST"))) {
    const { email } = body as { email?: string };
    if (email) state.user = { ...state.user, email };
    const res: AuthResponse = {
      accessToken: "mock-access-token",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      user: state.user,
    };
    return ok(config, res);
  }

  if ((m = route("/v1/me", "GET"))) {
    return ok(config, state.user);
  }

  if ((m = route("/v1/me", "PATCH"))) {
    state.user = { ...state.user, ...body };
    return ok(config, state.user);
  }

  // Books
  if ((m = route("/v1/books", "GET"))) {
    return ok(config, { items: state.books.filter((b) => !b.deletedAt) });
  }

  if ((m = route("/v1/books", "POST"))) {
    const { name, currencyCode, timezone, openingBalanceMinor } = body as Partial<BookResponse>;
    const book: BookResponse = {
      id: uid("book"),
      name: name ?? "New Book",
      currencyCode: currencyCode ?? "USD",
      timezone: timezone ?? "UTC",
      openingBalanceMinor: openingBalanceMinor ?? 0,
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    };
    state.books.push(book);
    return ok(config, book, 201);
  }

  if ((m = route("/v1/books/:id", "PATCH"))) {
    const book = state.books.find((b) => b.id === m!.id);
    if (!book) return fail(config, 404, "Book not found");
    book.name = (body.name as string) ?? book.name;
    book.version += 1;
    book.updatedAt = nowIso();
    return ok(config, book);
  }

  if ((m = route("/v1/books/:id", "DELETE"))) {
    const book = state.books.find((b) => b.id === m!.id);
    if (!book) return fail(config, 404, "Book not found");
    book.deletedAt = nowIso();
    return ok(config, undefined, 204);
  }

  // Categories
  if ((m = route("/v1/books/:bookId/categories", "GET"))) {
    return ok(config, {
      items: state.categories.filter((c) => c.bookId === m!.bookId && !c.deletedAt),
    });
  }

  if ((m = route("/v1/books/:bookId/categories", "POST"))) {
    const { type, name, icon, color } = body as Partial<CategoryResponse>;
    const category: CategoryResponse = {
      id: uid("cat"),
      bookId: m!.bookId,
      type: type ?? "EXPENSE",
      name: name ?? "New Category",
      icon: icon ?? "pricetag",
      color: color ?? "#64748B",
      isDisabled: false,
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    };
    state.categories.push(category);
    return ok(config, category, 201);
  }

  if ((m = route("/v1/books/:bookId/categories/:categoryId", "PATCH"))) {
    const category = state.categories.find((c) => c.id === m!.categoryId && c.bookId === m!.bookId);
    if (!category) return fail(config, 404, "Category not found");
    Object.assign(category, body);
    category.version += 1;
    category.updatedAt = nowIso();
    return ok(config, category);
  }

  if ((m = route("/v1/books/:bookId/categories/:categoryId", "DELETE"))) {
    const category = state.categories.find((c) => c.id === m!.categoryId && c.bookId === m!.bookId);
    if (!category) return fail(config, 404, "Category not found");
    category.deletedAt = nowIso();
    return ok(config, undefined, 204);
  }

  // Transactions
  if ((m = route("/v1/books/:bookId/transactions", "GET"))) {
    let items = state.transactions.filter((t) => t.bookId === m!.bookId && !t.deletedAt);
    const { from, to, type, categoryId, q, limit } = params as {
      from?: string;
      to?: string;
      type?: string;
      categoryId?: string;
      q?: string;
      limit?: number;
    };
    if (from) items = items.filter((t) => t.occurredOn >= from);
    if (to) items = items.filter((t) => t.occurredOn <= to);
    if (type) items = items.filter((t) => t.type === type);
    if (categoryId) items = items.filter((t) => t.categoryId === categoryId);
    if (q) items = items.filter((t) => (t.title ?? "").toLowerCase().includes(String(q).toLowerCase()));
    items = [...items].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    if (limit) items = items.slice(0, Number(limit));
    return ok(config, { page: { items, nextCursor: null } });
  }

  if ((m = route("/v1/books/:bookId/transactions", "POST"))) {
    const payload = body as Record<string, unknown>;
    const category = state.categories.find((c) => c.id === payload.categoryId);
    const occurredOn = (payload.occurredOn as string) ?? nowIso().slice(0, 10);
    const tx: TransactionResponse = {
      id: uid("tx"),
      bookId: m!.bookId,
      type: (payload.type as TransactionResponse["type"]) ?? "EXPENSE",
      amountMinor: Number(payload.amountMinor) || 0,
      occurredOn,
      occurredAt: (payload.occurredAt as string) ?? `${occurredOn}T12:00:00.000Z`,
      title: (payload.title as string) ?? null,
      categoryId: payload.categoryId as string,
      category: category ? { id: category.id, name: category.name, type: category.type } : null,
      categoryName: category?.name,
      paymentMethod: (payload.paymentMethod as TransactionResponse["paymentMethod"]) ?? null,
      note: (payload.note as string) ?? null,
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    };
    state.transactions.push(tx);
    return ok(config, tx, 201);
  }

  if ((m = route("/v1/books/:bookId/transactions/:txId", "PATCH"))) {
    const tx = state.transactions.find((t) => t.id === m!.txId && t.bookId === m!.bookId);
    if (!tx) return fail(config, 404, "Transaction not found");
    Object.assign(tx, body);
    if (body.categoryId) {
      const category = state.categories.find((c) => c.id === body.categoryId);
      tx.category = category ? { id: category.id, name: category.name, type: category.type } : null;
      tx.categoryName = category?.name;
    }
    tx.version += 1;
    tx.updatedAt = nowIso();
    return ok(config, tx);
  }

  if ((m = route("/v1/books/:bookId/transactions/:txId", "DELETE"))) {
    const tx = state.transactions.find((t) => t.id === m!.txId && t.bookId === m!.bookId);
    if (!tx) return fail(config, 404, "Transaction not found");
    tx.deletedAt = nowIso();
    return ok(config, undefined, 204);
  }

  // Budgets
  if ((m = route("/v1/books/:bookId/budgets", "GET"))) {
    const month = (params.month as string) ?? currentMonth();
    const items = state.budgets
      .filter((b) => b.bookId === m!.bookId && b.month === month)
      .map((b) => {
        const spentMinor = spentForCategoryMonth(b.bookId, b.categoryId, month);
        return { ...b, spentMinor, remainingMinor: b.amountMinor - spentMinor };
      });
    return ok(config, { items });
  }

  if ((m = route("/v1/books/:bookId/budgets/:categoryId", "PUT"))) {
    const month = (params.month as string) ?? currentMonth();
    const amountMinor = Number((body as { amountMinor?: number }).amountMinor) || 0;
    const category = state.categories.find((c) => c.id === m!.categoryId);
    let budget = state.budgets.find(
      (b) => b.bookId === m!.bookId && b.categoryId === m!.categoryId && b.month === month
    );
    if (budget) {
      budget.amountMinor = amountMinor;
      budget.version += 1;
      budget.updatedAt = nowIso();
    } else {
      budget = {
        id: uid("budget"),
        bookId: m!.bookId,
        categoryId: m!.categoryId,
        categoryName: category?.name ?? "",
        month,
        amountMinor,
        spentMinor: 0,
        remainingMinor: amountMinor,
        currencyCode: "USD",
        version: 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      state.budgets.push(budget);
    }
    const spentMinor = spentForCategoryMonth(m!.bookId, m!.categoryId, month);
    const res: BudgetResponse = { ...budget, spentMinor, remainingMinor: budget.amountMinor - spentMinor };
    return ok(config, res);
  }

  if ((m = route("/v1/books/:bookId/budgets/:categoryId", "DELETE"))) {
    const month = (params.month as string) ?? currentMonth();
    state.budgets = state.budgets.filter(
      (b) => !(b.bookId === m!.bookId && b.categoryId === m!.categoryId && b.month === month)
    );
    return ok(config, undefined, 204);
  }

  // Summary
  if ((m = route("/v1/books/:bookId/balance", "GET"))) {
    const book = state.books.find((b) => b.id === m!.bookId);
    if (!book) return fail(config, 404, "Book not found");
    const net = state.transactions
      .filter((t) => t.bookId === m!.bookId && !t.deletedAt)
      .reduce((sum, t) => sum + (t.type === "INCOME" ? t.amountMinor : -t.amountMinor), 0);
    const res: BalanceResponse = {
      bookId: book.id,
      currencyCode: book.currencyCode,
      balanceMinor: book.openingBalanceMinor + net,
    };
    return ok(config, res);
  }

  if ((m = route("/v1/books/:bookId/summary/monthly", "GET"))) {
    const book = state.books.find((b) => b.id === m!.bookId);
    if (!book) return fail(config, 404, "Book not found");
    const month = (params.month as string) ?? currentMonth();
    const monthTx = state.transactions.filter(
      (t) => t.bookId === m!.bookId && !t.deletedAt && t.occurredOn.startsWith(month)
    );
    const incomeTotalMinor = monthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountMinor, 0);
    const expenseTotalMinor = monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountMinor, 0);

    const byCategoryMap = new Map<string, MonthlySummaryCategory>();
    for (const t of monthTx) {
      const category = state.categories.find((c) => c.id === t.categoryId);
      const existing = byCategoryMap.get(t.categoryId);
      if (existing) {
        existing.totalMinor += t.amountMinor;
      } else {
        const budget = state.budgets.find((b) => b.bookId === m!.bookId && b.categoryId === t.categoryId && b.month === month);
        byCategoryMap.set(t.categoryId, {
          categoryId: t.categoryId,
          categoryName: category?.name ?? t.categoryName ?? "Unknown",
          type: t.type,
          totalMinor: t.amountMinor,
          budgetMinor: budget?.amountMinor ?? null,
        });
      }
    }

    const res: MonthlySummaryResponse = {
      bookId: book.id,
      month,
      currencyCode: book.currencyCode,
      incomeTotalMinor,
      expenseTotalMinor,
      byCategory: Array.from(byCategoryMap.values()),
    };
    return ok(config, res);
  }

  return fail(config, 404, `Mock adapter: no route for ${method} ${url}`);
};
