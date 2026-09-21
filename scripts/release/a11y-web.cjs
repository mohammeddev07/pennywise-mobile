/**
 * Web accessibility audit on the deterministic mock build (same fixtures as the screenshots).
 *   NODE_PATH=... node scripts/release/a11y-web.cjs <web export dir> <out json> [shots dir]
 * Checks per screen: 44px targets, accessible names, WCAG AA text contrast (computed from rendered colours),
 * non-colour income/expense/selection cues, tab order vs reading order, focus ring, sheet focus containment and
 * return, reduced motion (running animations), text scaling (zoom 1.3/1.5/2: overflow + hard clipping).
 * It is an automated web proxy: it does NOT replace VoiceOver / TalkBack passes (see docs/release-checklist.md).
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright-core");
const pageInit = require("../ui-shots/fixture.cjs");

const [root, outFile, shotsDir] = process.argv.slice(2);
const FIXED_NOW = "2026-06-18T10:00:00Z";
const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".ttf": "font/ttf" };

/** Runs in the page. Returns findings for the currently visible screen. */
function audit() {
  // Visible = laid out, on screen AND not covered: inactive tab screens stay mounted behind the active one, and
  // the sheet/dock overlap content, so a hit test at the centre decides whether an element is really on top.
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!(r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth)) return false; const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, innerHeight - r.top - 1))); const hit = document.elementFromPoint(x, y); return !!hit && (el.contains(hit) || hit.contains(el)); };
  const name = (el) => (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const interactive = [...document.querySelectorAll('button, [role=button], a[href], input, textarea, select, [tabindex="0"]')].filter(vis);
  // a tabindex wrapper around a role=button child is one control: keep the outermost
  const top = interactive.filter((el) => !interactive.some((o) => o !== el && o.contains(el)));
  // a text input is tapped through its bordered field box (FormField focuses the input on press)
  const box = (el) => { if (!/^(INPUT|TEXTAREA)$/.test(el.tagName)) return el; for (let n = el.parentElement; n; n = n.parentElement) if (parseFloat(getComputedStyle(n).borderTopWidth) > 0) return n; return el; };
  const small = top.map((el) => { const r = box(el).getBoundingClientRect(); return { name: name(el), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 44 || x.h < 44);
  const unnamed = top.filter((el) => !name(el)).map((el) => ({ tag: el.tagName, role: el.getAttribute("role"), w: Math.round(el.getBoundingClientRect().width) }));

  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x)); return { r, g, b, a }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => { let layers = []; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== "none") return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 11, g: 13, b: 15, a: 1 }; for (const l of layers.reverse()) base = over(l, base); return base; };
  const contrastFails = [], unknownBg = [];
  let checked = 0;
  for (const el of document.querySelectorAll("body *")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const fg0 = parse(cs.color); const bg = bgOf(el);
    if (!bg) { unknownBg.push(name(el)); continue; }
    const fg = over({ ...fg0, a: fg0.a * (+cs.opacity || 1) }, bg);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 600 || /Bold|SemiBold|ExtraBold/i.test(cs.fontFamily);
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const cr = ratio(fg, bg); checked++;
    if (cr < need) contrastFails.push({ text: name(el), ratio: +cr.toFixed(2), need, size });
  }

  const money = [...document.querySelectorAll("*")].filter((el) => el.children.length === 0 && vis(el) && /^[+−-]?\$?¥?₹?[\d,]+(\.\d{2})?$/.test(el.innerText?.trim() || "") && /\d/.test(el.innerText));
  const signed = money.filter((el) => /^[+−-]/.test(el.innerText.trim())).length;
  const cues = { moneyFigures: money.length, withExplicitSign: signed, unsignedExamples: money.filter((el) => !/^[+−-]/.test(el.innerText.trim())).slice(0, 3).map((el) => el.innerText.trim()), selected: document.querySelectorAll('[aria-selected="true"]').length,
    // colour-only amounts: a red/green figure with no + or - sign
    colouredWithoutSign: money.filter((el) => !/^[+−-]/.test(el.innerText.trim()) && !el.closest('[aria-label^="Expense"],[aria-label^="Income"]') && /^rgb\((81, 217, 155|255, 107, 103)\)$/.test(getComputedStyle(el).color)).map((el) => el.innerText.trim()).slice(0, 5) };
  const scroll = document.scrollingElement;
  return { small, unnamed, contrastFails: contrastFails.slice(0, 8), contrastChecked: checked, unknownBackgrounds: unknownBg.length, cues, overflowX: scroll.scrollWidth - innerWidth };
}

(async () => {
  const srv = await new Promise((resolve) => { const s = http.createServer((req, res) => { let p = path.join(root, decodeURIComponent(req.url.split("?")[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, "index.html"); res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res); }).listen(0, () => resolve(s)); });
  const base = `http://localhost:${srv.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`, args: ["--no-sandbox", "--force-color-profile=srgb"] });
  const report = { screens: {}, keyboard: {}, motion: {}, scaling: {} };
  const vis = (loc) => loc.filter({ visible: true });
  const open = async (ctx, loggedIn = true) => { const page = await ctx.newPage(); ctx.setDefaultTimeout(8000); await page.addInitScript(pageInit, { fixedNow: FIXED_NOW, loggedIn, currency: "USD" }); await page.goto(base + "/"); await page.waitForTimeout(2500); return page; };
  const tab = (page, n) => vis(page.getByRole("button", { name: n, exact: true })).first().click();

  for (const vp of [{ n: "phone", width: 390, height: 844 }, { n: "wide", width: 1280, height: 800 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", reducedMotion: "reduce" });
    const screens = {
      login: async () => { const p = await open(ctx, false); await p.getByText("Log in", { exact: true }).first().click(); await p.waitForTimeout(800); return p; },
      home: async () => open(ctx),
      activity: async () => { const p = await open(ctx); await tab(p, "Activity"); await p.getByText(/Showing \d+ of/).waitFor(); await p.getByText("All", { exact: true }).filter({ visible: true }).first().click(); await p.waitForTimeout(900); return p; },
      insights: async () => { const p = await open(ctx); await tab(p, "Insights"); await p.getByText(/NET · \d+/).waitFor(); await p.waitForTimeout(600); return p; },
      profile: async () => { const p = await open(ctx); await tab(p, "Profile"); await p.waitForTimeout(800); return p; },
      details: async () => { const p = await open(ctx); await tab(p, "Activity"); await p.getByText(/Showing \d+ of/).waitFor(); await p.getByText("Ristorante", { exact: true }).filter({ visible: true }).last().click(); await vis(p.getByText("NOTE")).first().waitFor(); return p; },
      edit: async () => { const p = await screens.details(); await vis(p.getByRole("button", { name: "Edit", exact: true })).first().click(); await vis(p.locator("input")).first().waitFor(); await p.waitForTimeout(500); return p; },
      "add-amount": async () => { const p = await open(ctx); await p.getByRole("button", { name: "Add transaction" }).first().click(); await p.waitForTimeout(900); return p; },
      "sheet-categories": async () => { const p = await screens.activity(); await vis(p.getByText("Categories", { exact: true })).first().click(); await p.getByText("EXPENSE", { exact: true }).waitFor(); return p; },
    };
    for (const [name, go] of Object.entries(screens)) {
      try {
        const page = await go();
        const key = `${vp.n}/${name}`;
        report.screens[key] = await page.evaluate(audit);
        if (shotsDir && vp.n === "phone") { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: path.join(shotsDir, `a11y-${name}.png`) }); }
        // text scaling: zoom the page and look for overflow / hard clipping
        if (vp.n === "phone" && ["activity", "details", "insights", "edit"].includes(name)) {
          report.scaling[name] = {};
          for (const z of [1.3, 1.5, 2]) {
            await page.evaluate((zz) => { document.documentElement.style.zoom = zz; }, z);
            await page.waitForTimeout(500);
            report.scaling[name][z] = await page.evaluate((zz) => {
              const clipped = [...document.querySelectorAll("body *")].filter((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && el.scrollWidth > el.clientWidth + 2 && cs.overflowX === "hidden" && cs.textOverflow !== "ellipsis" && r.top < innerHeight; }).map((el) => el.innerText.trim().slice(0, 30));
              const ellipsized = [...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 2 && el.getBoundingClientRect().top < innerHeight).length;
              return { overflowX: document.scrollingElement.scrollWidth - innerWidth, hardClipped: clipped.slice(0, 5), ellipsized, smallTargets: [...document.querySelectorAll('button,[role=button],input')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && (r.height < 44 * zz - 1) && (r.height < 44); }).length };
            }, z);
            if (shotsDir && z === 2) await page.screenshot({ path: path.join(shotsDir, `a11y-zoom200-${name}.png`) });
          }
        }
        await page.close();
      } catch (e) { report.screens[`${vp.n}/${name}`] = { error: String(e.message).split("\n")[0] }; }
    }

    if (vp.n === "phone") {
      // keyboard: tab order vs reading order, visible focus ring, sheet containment + return
      const page = await screens.activity();
      await page.mouse.click(5, 5);
      const seq = [];
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press("Tab");
        seq.push(await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { n: (a.getAttribute("aria-label") || a.innerText || a.tagName).trim().slice(0, 28), y: Math.round(r.top), x: Math.round(r.left), ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 }; }));
      }
      const got = seq.filter(Boolean);
      let inversions = 0; for (let i = 1; i < got.length; i++) if (got[i].y < got[i - 1].y - 6) inversions++;
      report.keyboard.activity = { focusStops: got.length, reachedFirst30: got.map((g) => g.n), yInversions: inversions, focusRingShownOn: `${got.filter((g) => g.ring).length}/${got.length}` };
      const trigger = vis(page.getByRole("button", { name: "Categories", exact: true })).first();
      await page.mouse.click(5, 5);
      await trigger.focus(); await trigger.press("Enter");
      await page.getByText("EXPENSE", { exact: true }).waitFor();
      let escaped = 0;
      for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); if (!(await page.evaluate(() => !!document.activeElement?.closest('[aria-modal="true"]')))) escaped++; }
      await page.keyboard.press("Escape"); await page.waitForTimeout(600);
      const back = await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.innerText || "").trim().slice(0, 30));
      report.keyboard.sheet = { tabsOutsideSheet: escaped, of: 40, focusAfterEscape: back, sheetClosed: (await page.getByText("EXPENSE", { exact: true }).count()) === 0 };
      await page.close();
    }
    await ctx.close();
  }

  // reduced motion: running animations on Insights, with and without the OS preference
  for (const rm of ["reduce", "no-preference"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm, locale: "en-US", timezoneId: "UTC" });
    const p = await open(ctx); await tab(p, "Insights"); await p.getByText(/NET · \d+/).waitFor();
    const counts = [];
    for (let t = 0; t < 4; t++) { await p.waitForTimeout(120); counts.push(await p.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)); }
    report.motion[rm] = { matchMedia: await p.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), runningAnimationsRightAfterOpen: counts };
    await ctx.close();
  }

  fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  await browser.close(); srv.close();
})();
