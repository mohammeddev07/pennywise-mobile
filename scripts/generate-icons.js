/**
 * PennyWise app icon generator.
 *
 * Pure-JS rasterizer (pngjs only) because this environment has no sharp /
 * ImageMagick / PIL. Shapes are described analytically in normalized units and
 * sampled with 4x4 supersampling for anti-aliasing, so every output size is
 * rendered from the vector description rather than resampled from a bitmap.
 *
 * Mark: a white coin on the PennyWise green, with a geometric "P" and a milled
 * inner groove. Built from primitives (disc, annulus, rounded rect) so it stays
 * crisp at 48px launcher size.
 */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const GREEN_TOP = [0x12, 0xd6, 0x2a];
const GREEN_BOTTOM = [0x00, 0xa0, 0x0d];
const WHITE = [0xff, 0xff, 0xff];

const SS = 4; // supersampling factor per axis

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

// ---- shape predicates, all in normalized [0,1] canvas space --------------
const inDisc = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const inAnnulus = (x, y, cx, cy, ro, ri) => {
  const d2 = (x - cx) ** 2 + (y - cy) ** 2;
  return d2 <= ro * ro && d2 >= ri * ri;
};

function inRoundedRect(x, y, rx, ry, w, h, r) {
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  const qx = Math.max(rx + r - x, 0, x - (rx + w - r));
  const qy = Math.max(ry + r - y, 0, y - (ry + h - r));
  return qx * qx + qy * qy <= r * r;
}

/**
 * The "P": a rounded stem plus the right half of a thick annulus for the bowl.
 * `R` is the coin radius; every measurement is a ratio of it so the glyph
 * scales with the coin.
 */
function inGlyphP(x, y, cx, cy, R) {
  const stemW = 0.19 * R;
  const bowlRo = 0.42 * R;
  // Nudged right so the glyph is optically centred in the coin: the bowl only
  // extends to one side, so a stem on the geometric centre reads left-heavy.
  const stemX = cx - 0.2525 * R;
  const stemTop = cy - 0.62 * R;
  const stemH = 1.24 * R;
  if (inRoundedRect(x, y, stemX, stemTop, stemW, stemH, stemW / 2)) return true;

  const bowlRi = bowlRo - stemW;
  const bowlCx = stemX + stemW / 2;
  const bowlCy = stemTop + bowlRo;
  return x >= bowlCx && inAnnulus(x, y, bowlCx, bowlCy, bowlRo, bowlRi);
}

/**
 * @param {number} size          output edge in px
 * @param {number} coinR         coin radius as a fraction of the canvas
 * @param {"gradient"|"rounded"|"none"} ground
 * @param {"coin"|"mono"} style  mono = flat white silhouette for Android 13 themed icons
 */
function render(size, coinR, ground, style) {
  const png = new PNG({ width: size, height: size });
  const cx = 0.5;
  const cy = 0.5;
  const grooveRo = 0.88 * coinR;
  const grooveRi = 0.825 * coinR;

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

          let c = null;
          let alpha = 0;

          const onCoin = inDisc(x, y, cx, cy, coinR);

          if (style === "mono") {
            // Themed icons are re-tinted by the launcher, so ship one flat
            // silhouette: coin minus the P and the groove, fully opaque.
            if (onCoin && !inGlyphP(x, y, cx, cy, coinR) && !inAnnulus(x, y, cx, cy, grooveRo, grooveRi)) {
              c = WHITE;
              alpha = 255;
            }
          } else if (onCoin) {
            const cut = inGlyphP(x, y, cx, cy, coinR) || inAnnulus(x, y, cx, cy, grooveRo, grooveRi);
            c = cut ? mix(GREEN_TOP, GREEN_BOTTOM, y) : WHITE;
            alpha = 255;
          } else if (ground === "gradient") {
            c = mix(GREEN_TOP, GREEN_BOTTOM, x * 0.35 + y * 0.65);
            alpha = 255;
          } else if (ground === "rounded" && inRoundedRect(x, y, 0.08, 0.08, 0.84, 0.84, 0.22)) {
            // Splash sits on the app's dark ground, so the mark carries its own
            // green tile: a white coin alone would float unanchored there.
            c = mix(GREEN_TOP, GREEN_BOTTOM, x * 0.35 + y * 0.65);
            alpha = 255;
          }

          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += alpha;
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
  { file: "icon.png", size: 1024, coinR: 0.335, ground: "gradient", style: "coin" },
  // Android adaptive foreground: 108dp canvas where only the inner 72dp (66%)
  // is guaranteed visible, so the mark sits well inside that safe circle.
  { file: "adaptive-icon.png", size: 1024, coinR: 0.26, ground: "none", style: "coin" },
  // Android 13+ themed icon: flat silhouette the launcher re-tints.
  { file: "adaptive-icon-monochrome.png", size: 1024, coinR: 0.26, ground: "none", style: "mono" },
  // Splash: rendered on the app's dark background, so it carries its own
  // rounded green tile rather than relying on the splash backgroundColor.
  { file: "splash-icon.png", size: 1024, coinR: 0.28, ground: "rounded", style: "coin" },
  { file: "favicon.png", size: 48, coinR: 0.42, ground: "gradient", style: "coin" },
];

for (const t of targets) {
  const png = render(t.size, t.coinR, t.ground, t.style);
  const dest = path.join(assets, t.file);
  fs.writeFileSync(dest, PNG.sync.write(png));
  console.log("wrote", dest, `${t.size}x${t.size}`);
}
