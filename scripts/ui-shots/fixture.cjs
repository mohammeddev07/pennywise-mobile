/** Page-init script shared by the screenshot and accessibility runs (self-contained: it is serialised into the page). */
/** Runs in the page before app code. Everything is derived from FIXED_NOW - no randomness. */
function pageInit({ fixedNow, loggedIn, currency }) {
  const FIXED = new Date(fixedNow).getTime();
  const T0 = performance.now();
  const RealDate = Date;
  const now = () => FIXED + (performance.now() - T0);
  class FixedDate extends RealDate {
    constructor(...a) {
      if (a.length === 0) super(now());
      else super(...a);
    }
    static now() {
      return now();
    }
  }
  globalThis.Date = FixedDate;

  try {
    if (loggedIn) {
      localStorage.setItem("ss:access_token", "mock-access-token");
      localStorage.setItem(
        "pennywise_demo_auth_v1",
        JSON.stringify({
          state: {
            user: { id: "mock-user-1", email: "demo@pennywise.local", defaultCurrencyCode: "USD", createdAt: fixedNow },
            unlocked: true,
            onboardingCompleted: true,
          },
          version: 2,
        })
      );
    }
  } catch {}

  // FIXTURE: extra history for the mock backend, injected the moment it registers itself.
  let backend;
  Object.defineProperty(globalThis, "__pennywiseMockBackend", {
    configurable: true,
    get: () => backend,
    set(v) {
      backend = v;
      const st = v.state;
      const book = st.books[0];
      book.currencyCode = currency;
      // JPY has no minor unit: 12480.50 USD-cents-scale figures would read 100x too large, so scale down.
      const scale = currency === "JPY" ? 0.01 : 1;
      st.categories.push({
        id: "cat_long", bookId: book.id, type: "EXPENSE", name: "Household and family supplies (bulk purchases and subscriptions)",
        icon: "home", color: "#B49CFF", isDisabled: false, version: 1, createdAt: fixedNow, updatedAt: fixedNow, deletedAt: null,
      });
      const cat = (n) => st.categories.find((c) => c.name === n);
      let seedN = 7;
      const rnd = () => ((seedN = (seedN * 48271) % 2147483647) / 2147483647);
      const add = (i, name, title, minor, ymd, pay) => {
        const c = cat(name);
        st.transactions.push({
          id: `fx_${String(i).padStart(4, "0")}`,
          bookId: book.id,
          type: c.type,
          amountMinor: Math.max(1, Math.round(minor * scale)),
          occurredOn: ymd,
          occurredAt: `${ymd}T12:00:00.000Z`,
          title,
          categoryId: c.id,
          category: { id: c.id, name: c.name, type: c.type },
          categoryName: c.name,
          paymentMethod: pay,
          note: null,
          externalId: null,
          version: 1,
          createdAt: fixedNow,
          updatedAt: fixedNow,
          deletedAt: null,
        });
      };
      let i = 0;
      const plan = [
        ["Salary", "Monthly salary", 450000, 1, null],
        ["Rent", "Rent", 150000, 2, "CARD"],
        ["Groceries", "Whole Foods", 6800, 6, "CARD"],
        ["Groceries", "Trader Joe's", 5100, 13, null],
        ["Groceries", "Farmers market", 3300, 20, "CASH"],
        ["Dining Out", "Dinner with friends", 4200, 9, "CARD"],
        ["Dining Out", "Coffee", 650, 15, "CASH"],
        ["Transport", "Rideshare", 2400, 11, "CARD"],
        ["Utilities", "Electric bill", 9100, 17, null],
      ];
      for (let m = 1; m <= 8; m++) {
        const d = new RealDate(RealDate.UTC(2026, 5 - m, 1));
        const ym = d.toISOString().slice(0, 7);
        for (const [name, title, minor, day, pay] of plan) {
          const jitter = name === "Salary" || name === "Rent" ? 0 : Math.round(rnd() * 3000 - 1500);
          add(i++, name, title, Math.max(500, minor + jitter), `${ym}-${String(day).padStart(2, "0")}`, pay);
        }
      }
      // Stress rows on today's page: long title + large amount.
      add(i++, "Freelance", "Reimbursement from the client dinner at the harbour restaurant", 1248050, "2026-06-18", "CARD");
      add(i++, "Dining Out", "Ristorante", 1250, "2026-06-18", null);
      add(i++, "Household and family supplies (bulk purchases and subscriptions)", "Costco run: paper towels, detergent, and everything else on the very long list", 18990, "2026-06-18", "CARD");
      for (let m = 1; m <= 8; m++) add(i++, "Household and family supplies (bulk purchases and subscriptions)", "Bulk supplies", 9000 + m * 700, new RealDate(RealDate.UTC(2026, 5 - m, 5)).toISOString().slice(0, 10), "CARD");
    },
  });
}

module.exports = pageInit;
