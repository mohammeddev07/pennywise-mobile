/**
 * Builds side-by-side before | after PNGs from docs/ui-polish/{before,after}.
 *   node scripts/ui-shots/compare.cjs [p22]   (dir under docs/ui-polish; same NODE_PATH / LD_LIBRARY_PATH as shots.cjs)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "../../docs/ui-polish", process.argv[2] || ".");
const out = path.join(root, "compare");
fs.mkdirSync(out, { recursive: true });
const WIDTH = { phone: 390, tablet: 480, wide: 760, small: 360, zoom: 300 }; // css px per image

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
    args: ["--no-sandbox"],
  });
  const files = fs.readdirSync(path.join(root, "before")).filter((f) => f.endsWith(".png"));
  for (const f of files) {
    const after = path.join(root, "after", f);
    if (!fs.existsSync(after)) continue;
    const vp = f.split("-")[0];
    const w = WIDTH[vp];
    const b64 = (p) => "data:image/png;base64," + fs.readFileSync(p).toString("base64");
    const html = `<body style="margin:0;background:#000;font:600 13px system-ui;color:#98A2AD">
      <div style="display:flex;gap:16px;padding:12px;width:${w * 2 + 40}px;box-sizing:border-box">
        ${[["BEFORE", path.join(root, "before", f)], ["AFTER", after]]
          .map(([l, p]) => `<div><div style="padding:0 0 6px">${l}</div><img src="${b64(p)}" style="width:${w}px;display:block;border:1px solid #222"></div>`)
          .join("")}
      </div></body>`;
    const page = await browser.newPage({ viewport: { width: w * 2 + 40, height: 400 } });
    await page.setContent(html);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, f), fullPage: true });
    await page.close();
    console.log("compare", f);
  }
  await browser.close();
})();
