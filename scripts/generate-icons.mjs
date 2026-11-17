// Icono, icono adaptativo, splash, favicon, icono de Google Play (512) e imagen destacada (1024×500).
// Una ficha doble seis con brillo sobre paño verde. Se dibuja con canvas 2D en Chromium (Playwright, como en
// Templo Salvaje) para poder usar la fuente Lobster en la imagen destacada.
// Uso: npm run icons → assets/images/*.png y store/*.png (se suben al repo).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node-tools/node_modules/playwright'));
}

mkdirSync('assets/images', { recursive: true });
mkdirSync('store', { recursive: true });
const lobster = readFileSync('node_modules/@expo-google-fonts/lobster/400Regular/Lobster_400Regular.ttf').toString('base64');

const page = `<!doctype html><html><head><style>
@font-face { font-family: Lobster; src: url(data:font/ttf;base64,${lobster}); }
body { margin: 0; background: transparent; }
</style></head><body><canvas id="c"></canvas><script>
const FELT = ['#22874F', '#17603C', '#0B3A23'];
const IVORY = '#F6EEDA';
const PIPS = { 6: [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]], 5: [[-1,-1],[1,-1],[0,0],[-1,1],[1,1]], 3: [[-1,-1],[0,0],[1,1]], 1: [[0,0]], 4: [[-1,-1],[1,-1],[-1,1],[1,1]], 2: [[-1,-1],[1,1]] };

function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function felt(ctx, w, h) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  g.addColorStop(0, FELT[0]); g.addColorStop(0.55, FELT[1]); g.addColorStop(1, FELT[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const r = rnd(7);
  for (let i = 0; i < (w * h) / 900; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.arc(r() * w, r() * h, 0.6 + r() * 1.4, 0, Math.PI * 2); ctx.fill();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Ficha de pie centrada en (cx, cy) de ancho s (alto 2s), girada \`angle\` radianes, con brillo opcional. */
function tile(ctx, cx, cy, s, angle, a, b, glow) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  const w = s, h = s * 2, r = s * 0.16;
  if (glow) { ctx.shadowColor = 'rgba(255, 214, 102, 0.95)'; ctx.shadowBlur = s * 0.6; }
  else { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = s * 0.12; ctx.shadowOffsetY = s * 0.06; }
  roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = IVORY; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const face = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  face.addColorStop(0, '#FFFDF6'); face.addColorStop(1, '#E7DCBF');
  roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = face; ctx.fill();
  ctx.lineWidth = s * 0.025; ctx.strokeStyle = '#CDBF99'; ctx.stroke();
  ctx.strokeStyle = '#8C7D5C'; ctx.lineWidth = s * 0.03;
  ctx.beginPath(); ctx.moveTo(-w * 0.34, 0); ctx.lineTo(w * 0.34, 0); ctx.stroke();
  ctx.fillStyle = '#E9C46A'; ctx.beginPath(); ctx.arc(0, 0, s * 0.07, 0, Math.PI * 2); ctx.fill();
  if (glow) {
    // Brillo: una franja de luz en diagonal sobre la cara.
    ctx.save(); roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.clip();
    const shine = ctx.createLinearGradient(-w, -h * 0.6, w, h * 0.2);
    shine.addColorStop(0.35, 'rgba(255,255,255,0)'); shine.addColorStop(0.5, 'rgba(255,255,255,0.55)'); shine.addColorStop(0.62, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine; ctx.fillRect(-w, -h, w * 2, h * 2); ctx.restore();
  }
  ctx.fillStyle = '#141414';
  for (const [half, v] of [[-1, a], [1, b]]) {
    for (const [px, py] of PIPS[v] || []) {
      ctx.beginPath(); ctx.arc(px * s * 0.27, half * s * 0.5 + py * s * 0.27, s * 0.095, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Destellos dorados alrededor de la ficha. */
function sparkles(ctx, cx, cy, size) {
  ctx.fillStyle = 'rgba(255, 236, 170, 0.95)';
  for (const [dx, dy, k] of [[-0.62, -0.7, 1], [0.66, -0.4, 0.7], [0.55, 0.75, 0.8], [-0.7, 0.55, 0.6]]) {
    const x = cx + dx * size, y = cy + dy * size, r = size * 0.06 * k;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const ang = (i * Math.PI) / 4; const rr = i % 2 ? r * 0.3 : r; ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
    ctx.closePath(); ctx.fill();
  }
}

window.draw = (kind, w, h) => {
  const c = document.getElementById('c'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  if (kind === 'icon' || kind === 'play' || kind === 'favicon') {
    felt(ctx, w, h); tile(ctx, w / 2, h / 2, w * 0.36, -0.26, 6, 6, true); sparkles(ctx, w / 2, h / 2, w * 0.5);
  } else if (kind === 'adaptive') {
    // Todo dentro del círculo seguro (66 % central).
    tile(ctx, w / 2, h / 2, w * 0.25, -0.26, 6, 6, true); sparkles(ctx, w / 2, h / 2, w * 0.34);
  } else if (kind === 'adaptiveBg') {
    felt(ctx, w, h);
  } else if (kind === 'splash') {
    tile(ctx, w / 2, h / 2, w * 0.34, -0.26, 6, 6, true); sparkles(ctx, w / 2, h / 2, w * 0.46);
  } else if (kind === 'feature') {
    felt(ctx, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 6; roundRect(ctx, 14, 14, w - 28, h - 28, 30); ctx.stroke();
    tile(ctx, w * 0.13, h * 0.5, 104, -0.3, 6, 6, true);
    tile(ctx, w * 0.88, h * 0.5, 84, 0.3, 6, 3, false);
    tile(ctx, w * 0.53, h * 0.9, 34, Math.PI / 2 + 0.06, 3, 5, false);
    sparkles(ctx, w * 0.13, h * 0.5, 145);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '150px Lobster'; ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText('Capicúa', w * 0.51 + 5, h * 0.4 + 7);
    ctx.fillStyle = '#E9C46A'; ctx.fillText('Capicúa', w * 0.51, h * 0.4);
    ctx.font = 'bold 32px sans-serif'; ctx.fillStyle = '#F4EFE1'; ctx.fillText('Dominó venezolano por parejas', w * 0.51, h * 0.7);
  }
  return c.toDataURL('image/png').split(',')[1];
};
</script></body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage();
await tab.setContent(page);
await tab.evaluate(() => document.fonts.load('150px Lobster'));
async function out(path, kind, w, h) {
  const b64 = await tab.evaluate(([k, ww, hh]) => window.draw(k, ww, hh), [kind, w, h]);
  writeFileSync(path, Buffer.from(b64, 'base64'));
}
await out('assets/images/icon.png', 'icon', 1024, 1024);
await out('assets/images/adaptive-icon.png', 'adaptive', 1024, 1024);
await out('assets/images/adaptive-icon-background.png', 'adaptiveBg', 1024, 1024);
await out('assets/images/splash-icon.png', 'splash', 512, 512);
await out('assets/images/favicon.png', 'favicon', 64, 64);
await out('store/play-icon-512.png', 'play', 512, 512);
await out('store/feature-graphic.png', 'feature', 1024, 500);
await browser.close();
console.log('Iconos e imágenes de la tienda generados.');
