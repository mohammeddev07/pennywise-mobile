/**
 * Deterministic screenshot harness for the mock-API web build (see build-web.sh).
 *
 *   NODE_PATH=<dir with playwright-core/node_modules> \
 *   LD_LIBRARY_PATH=<dir with libnspr4/libnss3/libasound> \
 *   node scripts/ui-shots/shots.cjs <web-export-dir> <out-dir> [phone|tablet|wide ...]
 *
 * Determinism: the browser clock is pinned to FIXED_NOW (it still ticks, so timers work), the
 * session is pre-authenticated through localStorage, and FIXTURE rows are injected into the mock
 * backend synchronously at module load - before the first query. Same build in, same pixels out.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const [root, outDir, ...only] = process.argv.slice(2);
if (!root || !outDir) throw new Error("usage: shots.cjs <exportDir> <outDir> [viewport...]");
fs.mkdirSync(outDir, { recursive: true });

const FIXED_NOW = "2026-06-18T10:00:00Z";
const VIEWPORTS = {
  phone: { width: 390, height: 844 }, // compact phone
  tablet: { width: 820, height: 1180 }, // iPad portrait
  wide: { width: 1280, height: 800 }, // desktop web
  small: { width: 360, height: 740 }, // small phone
  // Large-text proxy: browser zoom 1.3 == a 300px-wide layout with everything 1.3x. Harsher than OS
  // font scaling (which does not scale boxes), so if it fits here it fits there.
  zoom: { width: 300, height: 650, deviceScaleFactor: 2.6 },
};
const CURRENCY = process.env.CURRENCY || "USD"; // USD | JPY | INR - sets the book currency
const TAG = CURRENCY === "USD" ? "" : `${CURRENCY}-`;

const pageInit = require("./fixture.cjs");

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".ttf": "font/ttf" };
function serve() {
  return new Promise((resolve) => {
    const srv = http
      .createServer((req, res) => {
        let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
        if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, "index.html");
        res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
        fs.createReadStream(p).pipe(res);
      })
      .listen(0, () => resolve(srv));
  });
}

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function run() {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
    args: ["--no-sandbox", "--force-color-profile=srgb", "--font-render-hinting=none"],
  });

  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    if (only.length && !only.includes(vpName)) continue;
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor || 2, locale: "en-US", timezoneId: "UTC", reducedMotion: "reduce" });
    ctx.setDefaultTimeout(8000);
    const shot = async (page, name) => {
      await settle(page);
      await page.screenshot({ path: path.join(outDir, `${vpName}-${TAG}${name}.png`) });
      console.log("shot", vpName, name);
    };
    const open = async (loggedIn = true) => {
      const page = await ctx.newPage();
      page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
      await page.addInitScript(pageInit, { fixedNow: FIXED_NOW, loggedIn, currency: CURRENCY });
      await page.goto(base + "/");
      await settle(page, 2500);
      return page;
    };
    const tab = (page, name) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).first().click();
    const tryStep = async (label, fn) => {
      if (process.env.STEPS && !process.env.STEPS.split(",").includes(label)) return;
      try {
        await fn();
      } catch (e) {
        console.log("STEP FAILED", vpName, label, String(e.message).split("\n").slice(0, 14).join(" | "));
      }
    };

    // --- signed out -----------------------------------------------------------------
    {
      const page = await open(false);
      await tryStep("login", async () => {
        await page.getByText("Log in", { exact: true }).filter({ visible: true }).first().click();
        await settle(page);
        await shot(page, "login");
        await page.locator("input").filter({ visible: true }).first().click();
        await shot(page, "login-focus");
        await page.getByText("Continue", { exact: true }).click();
        await shot(page, "login-errors");
      });
      await page.close();
    }

    // --- signed in ------------------------------------------------------------------
    const page = await open(true);
    await tryStep("home", async () => shot(page, "home"));

    await tryStep("activity", async () => {
      await tab(page, "Activity");
      await settle(page, 1500);
      await shot(page, "activity");
      await page.getByText("Month", { exact: true }).filter({ visible: true }).first().click();
      await page.getByText("Expenses", { exact: true }).filter({ visible: true }).first().click();
      await shot(page, "activity-filtered");
      await page.getByText("Categories", { exact: true }).filter({ visible: true }).first().click();
      await shot(page, "sheet-categories");
      await page.getByRole("button", { name: "Close", exact: true }).filter({ visible: true }).last().click();
      await settle(page, 500);
      await page.getByText("Amount", { exact: true }).filter({ visible: true }).first().click();
      await page.locator("input").filter({ visible: true }).first().click();
      await shot(page, "sheet-amount");
      await page.getByRole("button", { name: "Close", exact: true }).filter({ visible: true }).last().click();
      await settle(page, 500);
      await page.getByText("Advanced", { exact: true }).filter({ visible: true }).first().click();
      await shot(page, "sheet-advanced");
      await page.getByRole("button", { name: "Close", exact: true }).filter({ visible: true }).last().click().catch(() => {});
      await settle(page, 500);
    });

    await tryStep("insights", async () => {
      await tab(page, "Insights");
      await settle(page, 1500);
      await shot(page, "insights");
    });

    await page.close();

    await tryStep("details", async () => {
      const p2 = await open(true);
      await tab(p2, "Activity");
      await p2.getByText(/Showing \d+ of/).waitFor();
      if (process.env.DEBUG_TEXT) console.log((await p2.innerText("body")).replace(/\n+/g, " | ").slice(0, 600));
      await p2.getByText("Ristorante", { exact: true }).filter({ visible: true }).last().click();
      await shot(p2, "details");
      if (process.env.DEBUG_HTML) console.log((await p2.locator("[tabindex=\"0\"]").filter({ visible: true }).first().evaluate((e) => e.outerHTML + " || " + getComputedStyle(e).borderTopWidth + " " + getComputedStyle(e).backgroundColor)).slice(0, 700));
      const direct = p2.getByRole("button", { name: "Edit", exact: true }).filter({ visible: true });
      if (await direct.count()) await direct.first().click(); // P2.2+: Edit is the header action
      else {
        await p2.getByRole("button", { name: "More actions" }).filter({ visible: true }).first().click();
        await settle(p2, 600);
        await p2.getByText("Edit", { exact: true }).filter({ visible: true }).last().click();
      }
      await shot(p2, "edit");
      await p2.locator("input").filter({ visible: true }).first().click();
      await shot(p2, "edit-focus");
      await p2.close();
    });

    await tryStep("states", async () => {
      const p4 = await open(true);
      await tab(p4, "Activity");
      await p4.getByText(/Showing \d+ of/).waitFor();
      // no matches: a search that finds nothing keeps the chrome and explains
      await p4.getByRole("button", { name: "Search transactions" }).filter({ visible: true }).first().click();
      await p4.locator("input").filter({ visible: true }).first().fill("zzzz-no-such-thing");
      await p4.getByText("No matches").waitFor();
      await shot(p4, "state-nomatches");
      await p4.getByRole("button", { name: "Close search" }).filter({ visible: true }).first().click();
      // stale: rows on screen, then the connection drops and a refresh fails
      const hasHook = await p4.evaluate(() => globalThis.__pennywiseMockBackend && "offline" in globalThis.__pennywiseMockBackend);
      if (hasHook) {
        await p4.evaluate(() => { globalThis.__pennywiseMockBackend.offline = true; });
        await p4.getByText("All", { exact: true }).filter({ visible: true }).first().click(); // new query -> fails, no cache
        await p4.getByText("Couldn’t load transactions").waitFor();
        await shot(p4, "state-error");
        await p4.evaluate(() => { globalThis.__pennywiseMockBackend.offline = false; });
        await p4.getByText("Retry", { exact: true }).filter({ visible: true }).first().click();
        await p4.getByText(/Showing \d+ of/).waitFor();
        // cache a query online, leave it, then come back offline: rows come from cache, the refresh fails
        await p4.getByText("Expenses", { exact: true }).filter({ visible: true }).first().click();
        await p4.getByText(/Showing \d+ of/).waitFor();
        await p4.getByText("Expenses", { exact: true }).filter({ visible: true }).first().click();
        await p4.getByText(/Showing \d+ of/).waitFor();
        await settle(p4, 11000); // past the 10s staleTime, so coming back refetches
        await p4.evaluate(() => { globalThis.__pennywiseMockBackend.offline = true; });
        await p4.getByText("Expenses", { exact: true }).filter({ visible: true }).first().click();
        await settle(p4, 2500);
        await shot(p4, "state-stale");
      }
      await p4.close();
    });

    await tryStep("overlay", async () => {
      // Escape closes a sheet, focus returns to the control that opened it, and one Escape closes one layer.
      const p5 = await open(true);
      await tab(p5, "Activity");
      await p5.getByText(/Showing \d+ of/).waitFor();
      const chip = p5.getByRole("button", { name: "Categories" }).filter({ visible: true }).first();
      await chip.focus();
      await chip.click();
      await p5.getByText("EXPENSE", { exact: true }).waitFor();
      await p5.keyboard.press("Escape");
      await settle(p5, 700);
      const sheetGone = (await p5.getByText("EXPENSE", { exact: true }).count()) === 0;
      const focusName = await p5.evaluate(() => document.activeElement && (document.activeElement.getAttribute("aria-label") || document.activeElement.textContent || document.activeElement.tagName));
      console.log("OVERLAY escape closes sheet:", sheetGone, "| focus returns to:", JSON.stringify(focusName), "| still on Activity:", (await p5.getByText(/Showing \d+ of/).count()) > 0);
      await p5.close();
    });

    await tryStep("add", async () => {
      const p3 = await open(true);
      await p3.getByRole("button", { name: "Add transaction" }).filter({ visible: true }).first().click();
      await settle(p3, 1200);
      await shot(p3, "add-amount");
      for (const k of ["1", "2", "5", "0"]) await p3.getByRole("button", { name: k, exact: true }).filter({ visible: true }).first().click();
      await p3.getByText("Next", { exact: true }).filter({ visible: true }).first().click();
      await shot(p3, "add-details");
      await p3.close();
    });

    await ctx.close();
  }
  await browser.close();
  srv.close();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
