#!/usr/bin/env node
/**
 * Imágenes para la ficha de Google Play de Capicúa / Capicua Dominoes (igual que el script de Templo Salvaje y
 * Jaque Épico, adaptado al dominó).
 *
 * Uso (desde la raíz del repo):
 *   npm run store-shots                 # compila la web en dist-capture/ y genera todo
 *   npm run store-shots -- --skip-build # reutiliza dist-capture/ si el juego no ha cambiado
 *   npm run store-shots -- --only=2,3   # solo esas escenas
 *
 * Necesita Node 22+ (importa la lógica .ts del juego con scripts/store-shots/loader.mjs) y Playwright con Chromium.
 *
 * Qué hace:
 *   1. `expo export --platform web --output-dir dist-capture` (sin herramientas de desarrollo). dist-capture/ no se
 *      sube al repo.
 *   2. Cada escena se prepara desde fuera, sin tocar el juego: antes de cargar la página se guardan en
 *      localStorage unos ajustes, un progreso, estadísticas, logros y, si hace falta, una partida hecha con el motor
 *      (scripts/store-shots/fixtures.mjs). El azar va con semilla fija. Luego se toca lo que haga falta (la ficha de
 *      la capicúa, la pestaña de la tienda…). Se captura a 360×640 con deviceScaleFactor 3.
 *   3. Se compone la imagen final de 1080×1920: paño verde del icono, titular arriba (textos store.shot1…6 de
 *      lib/i18n/es.ts y en.ts) con la ficha del icono, y debajo la pantalla.
 *
 * Salida: store/es-01.png … es-06.png y store/en-01.png … en-06.png.
 * (El icono de 512 px y las imágenes destacadas los genera scripts/generate-icons.mjs.)
 */
import './loader.mjs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Después del loader (los imports dinámicos ya pueden resolver «@/…» y los .ts sin extensión).
const { es } = await import('../../lib/i18n/es.ts');
const { en } = await import('../../lib/i18n/en.ts');
const fixtures = await import('./fixtures.mjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist-capture');
const OUT = path.join(ROOT, 'store');
const IMAGES = path.join(ROOT, 'assets', 'images');
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts/lobster/400Regular/Lobster_400Regular.ttf');
const WIDTH = 1080;
const HEIGHT = 1920;
const BAND = 360;
const SHOT_HEIGHT = 1480;
const VIEWPORT = { width: 360, height: 640 };
const LANGS = { es, en };

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  try {
    ({ chromium } = require('/opt/node-tools/node_modules/playwright'));
  } catch {
    console.error('Falta Playwright: npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }
}

/** Se ejecuta en la página antes que el juego: datos de ejemplo y azar fijo. */
function pageInit({ data }) {
  let seed = 20261117;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  localStorage.clear();
  for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value));
}

/** Toca la única ficha de tu mano (centro del abanico) y, si cabe por las dos puntas, elige la izquierda. */
async function playLastTile(page, dict) {
  await page.mouse.click(VIEWPORT.width / 2, 556);
  await page.waitForTimeout(500);
  const left = page.getByText(new RegExp(`^${dict['game.endLeft'].split(' ')[0]}`));
  if (await left.count()) await left.first().click();
}

/** Desplaza la primera vista desplazable (ScrollView) que contiene ese texto. */
async function scrollNear(page, text, dy) {
  await page.evaluate(
    ({ text, dy }) => {
      const nodes = [...document.querySelectorAll('div')].filter((el) => el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== 'visible');
      const target = nodes.find((el) => el.innerText.includes(text)) ?? nodes[0];
      if (target) target.scrollTop += dy;
    },
    { text, dy },
  );
  await page.waitForTimeout(600);
}

const SCENES = [
  {
    // 1. La mesa a media mano, con tu mano en abanico y las jugables resaltadas.
    shot: 1,
    route: '/game',
    data: () => ({ 'capicua.match': fixtures.saved(fixtures.midHandMatch()) }),
    prepare: async (page) => {
      await page.waitForTimeout(5000);
    },
  },
  {
    // 2. El aviso grande de «¡Capicúa!» con confeti.
    shot: 2,
    route: '/game',
    data: () => ({ 'capicua.match': fixtures.saved(fixtures.capicuaMatch()) }),
    prepare: async (page, dict) => {
      await page.waitForTimeout(4500);
      await playLastTile(page, dict);
      await page.getByText(dict['call.capicua'], { exact: true }).first().waitFor({ timeout: 8000 });
      await page.waitForTimeout(900);
    },
  },
  {
    // 3. El resumen de la mano con los puntos y el marcador.
    shot: 3,
    route: '/game',
    data: () => ({ 'capicua.match': fixtures.saved(fixtures.capicuaMatch()) }),
    prepare: async (page, dict) => {
      await page.waitForTimeout(4500);
      await playLastTile(page, dict);
      await page.getByText(dict['hand.next'], { exact: true }).first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(1200);
      // Que se vean los puntos de la mano y el marcador.
      await scrollNear(page, dict['hand.points'], 120);
    },
  },
  {
    // 4. El torneo del barrio con las parejas rivales.
    shot: 4,
    route: '/tournament',
    prepare: async (page, dict) => {
      await page.waitForTimeout(5000);
      await scrollNear(page, dict['tour.title'], 150);
    },
  },
  {
    // 5. La tienda: mesa de playa con las fichas de neón.
    shot: 5,
    route: '/shop',
    data: () => ({ 'capicua.progress': fixtures.progress({ equipped: { tiles: 'neon', table: 'felt', phrases: 'basic' } }) }),
    prepare: async (page, dict) => {
      await page.waitForTimeout(5000);
      await page.getByText(dict['shop.table'], { exact: true }).first().click();
      await page.waitForTimeout(500);
      await page.getByText(dict['shop.item.beach'], { exact: true }).first().click();
      await page.waitForTimeout(1500);
    },
  },
  {
    // 6. El perfil con la gráfica de ELO y los logros (las estadísticas se ocultan para que quepan los dos).
    shot: 6,
    route: '/profile',
    prepare: async (page, dict) => {
      await page.waitForTimeout(4500);
      await page.evaluate((title) => {
        const cards = [...document.querySelectorAll('div')].filter((el) => el.firstElementChild?.textContent === title);
        const card = cards[cards.length - 1];
        if (card) card.style.display = 'none';
      }, dict['profile.stats'].toUpperCase() === dict['profile.stats'] ? dict['profile.stats'] : dict['profile.stats']);
      await page.waitForTimeout(500);
    },
  },
];

function build() {
  console.log('Compilando la web en dist-capture/…');
  const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-capture', '--clear'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_DEV_MENU: '0', EXPO_NO_TELEMETRY: '1' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const TYPES = {
  '.js': 'application/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.png': 'image/png',
  '.ttf': 'font/ttf', '.wav': 'audio/wav', '.json': 'application/json', '.ico': 'image/x-icon', '.css': 'text/css',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let file = path.join(DIST, decodeURIComponent((req.url ?? '/').split('?')[0]));
      if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const b64 = (file) => fs.readFileSync(file).toString('base64');
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Fuente Lobster, paño verde del icono y titular dorado con contorno oscuro. */
function brandCss(assets) {
  return `
    @font-face { font-family: Lobster; src: url(data:font/ttf;base64,${assets.font}); }
    html, body { margin: 0; overflow: hidden; }
    body { background: #0B2418 url(data:image/png;base64,${assets.background}) center / cover no-repeat; }
    .title { color: #E9C46A; font: 400 96px/1.05 Lobster, serif; -webkit-text-stroke: 12px #0B2418; paint-order: stroke fill;
      text-shadow: 0 8px 20px rgba(0, 0, 0, 0.55); }
  `;
}

function shotHtml(headline, shotBase64, assets) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${brandCss(assets)}
    html, body { width: ${WIDTH}px; height: ${HEIGHT}px; }
    .band { height: ${BAND}px; display: flex; align-items: center; gap: 10px; padding: 0 56px 0 30px; box-sizing: border-box; }
    .hero { width: 260px; height: 260px; flex: none; background: url(data:image/png;base64,${assets.hero}) center / 150% no-repeat; }
    .title { flex: 1; text-align: center; }
    .shot { display: flex; justify-content: center; }
    img { height: ${SHOT_HEIGHT}px; border-radius: 44px; border: 10px solid #E9C46A; box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6); }
  </style></head><body>
    <div class="band"><div class="hero"></div><div class="title">${escape(headline)}</div></div>
    <div class="shot"><img src="data:image/png;base64,${shotBase64}"></div>
  </body></html>`;
}

function pngInfo(file) {
  const buffer = fs.readFileSync(file);
  // Tipo de color del PNG: 2 = RGB (sin transparencia), 6 = RGBA.
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}

/** Pinta HTML en una página del tamaño dado y lo guarda como PNG opaco (con reintentos). */
async function renderHtml(browser, html, width, height, file) {
  for (let attempt = 1; ; attempt++) {
    try {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      // Por archivo y no con setContent: con imágenes grandes en data URI la captura puede fallar.
      const temp = path.join(OUT, `.compose-${process.pid}.html`);
      fs.writeFileSync(temp, html);
      await page.goto(`file://${temp}`);
      fs.rmSync(temp, { force: true });
      await page.evaluate(() => document.fonts.ready);
      try {
        await page.screenshot({ path: file, type: 'png', omitBackground: false });
      } finally {
        await page.close();
      }
      return pngInfo(file);
    } catch (error) {
      if (attempt >= 3) throw error;
      console.warn(`  reintentando ${path.basename(file)}…`);
    }
  }
}

async function main() {
  if (!process.argv.includes('--skip-build') || !fs.existsSync(path.join(DIST, 'index.html'))) build();
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice(7).split(',').map(Number);
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const assets = {
    font: b64(FONT),
    background: b64(path.join(IMAGES, 'adaptive-icon-background.png')),
    hero: b64(path.join(IMAGES, 'adaptive-icon.png')),
  };
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  // Las imágenes finales se componen en otro navegador, sin los lienzos WebGL del juego.
  const composer = await chromium.launch();
  const results = [];
  try {
    for (const [lang, dict] of Object.entries(LANGS)) {
      for (const scene of SCENES) {
        if (only && !only.includes(scene.shot)) continue;
        const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3, locale: lang === 'es' ? 'es-ES' : 'en-US' });
        await context.addInitScript(pageInit, { data: fixtures.baseData(lang, scene.data ? scene.data(lang) : {}) });
        const page = await context.newPage();
        page.on('pageerror', (error) => {
          if (!/supported sources|play\(\)/.test(error.message)) console.warn(`  [${lang}/${scene.shot}] ${error.message}`);
        });
        await page.goto(`${base}${scene.route}`);
        await scene.prepare(page, dict);
        const shot = await page.screenshot({ type: 'png' });
        await context.close();
        const file = path.join(OUT, `${lang}-0${scene.shot}.png`);
        const info = await renderHtml(composer, shotHtml(dict[`store.shot${scene.shot}`], shot.toString('base64'), assets), WIDTH, HEIGHT, file);
        results.push({ file: path.relative(ROOT, file), ...info });
        console.log(`  ${path.relative(ROOT, file)}  ${info.width}×${info.height}`);
      }
    }
  } finally {
    await browser.close();
    await composer.close();
    server.close();
  }
  const wrong = results.filter((r) => r.width !== WIDTH || r.height !== HEIGHT || r.colorType === 6);
  if (wrong.length > 0) {
    console.error('Tamaño incorrecto o con transparencia:', wrong);
    process.exit(1);
  }
  console.log(`Listo: ${results.length} imágenes en store/.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
