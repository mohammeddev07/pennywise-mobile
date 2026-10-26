/**
 * PennyWise app icon generator.
 *
 * Pure-JS rasterizer (pngjs only) because this environment has no sharp /
 * ImageMagick / PIL. Shapes are described analytically and sampled with 4x4
 * supersampling for anti-aliasing, so every output size is rendered from the
 * vector description rather than resampled from a bitmap.
 *
 * Mark ("Coin P"): a white P whose bowl is a thick ring holding a gold coin,
 * with a slanted foot on the stem, on a deep-green tile. Same geometry as the
 * web app's public/app-icon.svg (pennywise-ui), drawn on a 100-unit grid.
 */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const TILE_TOP = [0x23, 0x66, 0x4f];
const TILE_BOTTOM = [0x12, 0x3b, 0x30];
const COIN_TOP = [0xf9, 0xc9, 0x5c];
const COIN_BOTTOM = [0xe9, 0xa2, 0x3b];
const WHITE = [0xff, 0xff, 0xff];

const SS = 4; // supersampling factor per axis

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

function inRoundedRect(x, y, rx, ry, w, h, r) {
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  const qx = Math.max(rx + r - x, 0, x - (rx + w - r));
  const qy = Math.max(ry + r - y, 0, y - (ry + h - r));
  return qx * qx + qy * qy <= r * r;
}

// ---- the mark, in its own 100-unit grid (bounding box x 16..84, y 6..95) ----
const BOWL_X = 50;
const BOWL_Y = 40;
const RING_OUTER = 34;
const RING_INNER = 18;
const COIN_R = 14;

/** "p" = white P, "coin" = gold coin, null = empty. */
function markAt(mx, my) {
  const d2 = (mx - BOWL_X) ** 2 + (my - BOWL_Y) ** 2;
  if (d2 <= COIN_R * COIN_R) return "coin";
  if (d2 <= RING_OUTER * RING_OUTER && d2 >= RING_INNER * RING_INNER) return "p";
  // Stem: from the ring's left edge down, its foot cut on a slant (lower on the left).
  if (mx >= 16 && mx <= 32 && my >= BOWL_Y && my <= 95 - (mx - 16) * 0.75) return "p";
  return null;
}

/**
 * @param {number} size          output edge in px
 * @param {number} unit          one mark unit as a fraction of the canvas
 * @param {"gradient"|"rounded"|"none"} ground
 * @param {"color"|"mono"} style mono = flat white silhouette for Android 13 themed icons
 */
function render(size, unit, ground, style) {
  const png = new PNG({ width: size, height: size });
  // Centre the mark's bounding box (50, 50.5) on the canvas.
  const ox = 0.5 - 50 * unit;
  const oy = 0.5 - 50.5 * unit;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const my = (y - oy) / unit;
          const part = markAt((x - ox) / unit, my);

          let c = null;
          if (style === "mono") {
            // Themed icons are re-tinted by the launcher: one flat silhouette.
            // The gap between ring and coin keeps them readable as two shapes.
            if (part) c = WHITE;
          } else if (part === "p") {
            c = WHITE;
          } else if (part === "coin") {
            c = mix(COIN_TOP, COIN_BOTTOM, (my - (BOWL_Y - COIN_R)) / (2 * COIN_R));
          } else if (ground === "gradient" || (ground === "rounded" && inRoundedRect(x, y, 0.08, 0.08, 0.84, 0.84, 0.21))) {
            // Splash sits on the app's dark ground, so the mark carries its own
            // green tile there.
            c = mix(TILE_TOP, TILE_BOTTOM, x * 0.35 + y * 0.65);
          }

          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }

      const n = SS * SS;
      const cov = a / (255 * n);
      const idx = (size * py + px) << 2;
      // Premultiply-safe: average color over covered samples only, so edges of
      // a transparent-ground icon do not fringe toward black.
      png.data[idx] = cov > 0 ? Math.round(r / (cov * n)) : 0;
      png.data[idx + 1] = cov > 0 ? Math.round(g / (cov * n)) : 0;
      png.data[idx + 2] = cov > 0 ? Math.round(b / (cov * n)) : 0;
      png.data[idx + 3] = Math.round(a / n);
    }
  }
  return png;
}

const assets = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "..", "assets");

const targets = [
  // iOS + Android legacy launcher icon: full bleed, no transparency, no rounded
  // corners (the OS applies its own mask).
  { file: "icon.png", size: 1024, unit: 0.00625, ground: "gradient", style: "color" },
  // Android adaptive foreground: 108dp canvas where only the inner 72dp (66%)
  // is guaranteed visible. The mark's farthest point (the stem foot) is 56 units
  // from centre, so 56 * unit must stay under 0.333.
  { file: "adaptive-icon.png", size: 1024, unit: 0.0057, ground: "none", style: "color" },
  // Android 13+ themed icon: flat silhouette the launcher re-tints.
  { file: "adaptive-icon-monochrome.png", size: 1024, unit: 0.0057, ground: "none", style: "mono" },
  // Splash: rendered on the app's dark background, so it carries its own
  // rounded green tile rather than relying on the splash backgroundColor.
  { file: "splash-icon.png", size: 1024, unit: 0.0058, ground: "rounded", style: "color" },
  { file: "favicon.png", size: 48, unit: 0.0072, ground: "gradient", style: "color" },
];

for (const t of targets) {
  const png = render(t.size, t.unit, t.ground, t.style);
  const dest = path.join(assets, t.file);
  fs.writeFileSync(dest, PNG.sync.write(png));
  console.log("wrote", dest, `${t.size}x${t.size}`);
}
