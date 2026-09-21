/** Shared helpers for the real-backend browser runs: static server + /api reverse proxy (adds optional latency). */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".ttf": "font/ttf" };

function serve(root, target, latencyMs = 0) {
  const t = new URL(target);
  return new Promise((resolve) => {
    const srv = http
      .createServer((req, res) => {
        if (req.url.startsWith("/api")) {
          const go = () => {
            const p = http.request({ host: t.hostname, port: t.port, method: req.method, path: req.url, headers: { ...req.headers, host: t.host } }, (r) => {
              res.writeHead(r.statusCode, r.headers);
              r.pipe(res);
            });
            p.on("error", () => { res.writeHead(502); res.end(); });
            req.pipe(p);
          };
          return latencyMs ? setTimeout(go, latencyMs) : go();
        }
        let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
        if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, "index.html");
        res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
        fs.createReadStream(p).pipe(res);
      })
      .listen(0, () => resolve(srv));
  });
}

async function launch() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM || `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
    args: ["--no-sandbox", "--enable-precise-memory-info", "--force-color-profile=srgb"],
  });
}

const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1)] : NaN; };

module.exports = { serve, launch, pct };
