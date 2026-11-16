// Dibuja el icono, el icono adaptativo, el splash y el favicon (una ficha de marfil sobre paño verde).
// Sin dependencias: rasterizado propio con suavizado y PNG con zlib. Uso: npm run icons → assets/images/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

mkdirSync('assets/images', { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(path, size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const FELT = hex('#17603C');
const FELT_DARK = hex('#0E4128');
const IVORY = hex('#F3EAD3');
const IVORY_SHADE = hex('#D9CCAA');
const PIP = hex('#141414');
const LINE = hex('#8C7D5C');
const GOLD = hex('#E9C46A');

/** Distancia con signo a un rectángulo redondeado centrado en el origen. */
function sdRoundRect(x, y, hw, hh, r) {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

const PIP_LAYOUT = {
  0: [],
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

/**
 * Color (RGBA 0–1) en un punto (coordenadas 0–1 del lienzo).
 * La ficha va de pie y algo inclinada, con el 6 arriba y el 6 abajo (doble seis).
 */
function scene(u, v, { background, tileScale, tile = true }) {
  let color = background ? [...FELT, 1] : [0, 0, 0, 0];
  if (background) {
    const d = Math.hypot(u - 0.5, v - 0.45);
    const k = Math.min(1, d * 1.4);
    color = [FELT[0] * (1 - k) + FELT_DARK[0] * k, FELT[1] * (1 - k) + FELT_DARK[1] * k, FELT[2] * (1 - k) + FELT_DARK[2] * k, 1];
  }
  if (!tile) return color;
  const angle = -0.26;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toLocal = (ox, oy) => {
    const x = (u - 0.5 - ox) / tileScale;
    const y = (v - 0.5 - oy) / tileScale;
    return [x * cos - y * sin, x * sin + y * cos];
  };
  const hw = 0.2;
  const hh = 0.4;
  const blend = (c, rgb, a) => {
    const out = [c[0] * (1 - a) + rgb[0] * a, c[1] * (1 - a) + rgb[1] * a, c[2] * (1 - a) + rgb[2] * a, Math.max(c[3], a)];
    if (c[3] < 1 && c[3] < a) {
      // Sobre transparente: no mezclar con negro.
      const total = a + c[3] * (1 - a);
      return [
        (rgb[0] * a + c[0] * c[3] * (1 - a)) / total,
        (rgb[1] * a + c[1] * c[3] * (1 - a)) / total,
        (rgb[2] * a + c[2] * c[3] * (1 - a)) / total,
        total,
      ];
    }
    return out;
  };
  // Sombra.
  {
    const [x, y] = toLocal(0.025, 0.035);
    const d = sdRoundRect(x, y, hw, hh, 0.05);
    const a = Math.max(0, Math.min(1, -d / 0.06 + 0.4)) * 0.45;
    if (a > 0) color = blend(color, [0, 0, 0], a);
  }
  const [x, y] = toLocal(0, 0);
  const d = sdRoundRect(x, y, hw, hh, 0.05);
  if (d < 0) {
    const edge = Math.min(1, -d / 0.025);
    const shade = [IVORY_SHADE[0] * (1 - edge) + IVORY[0] * edge, IVORY_SHADE[1] * (1 - edge) + IVORY[1] * edge, IVORY_SHADE[2] * (1 - edge) + IVORY[2] * edge];
    color = blend(color, shade, 1);
    // Línea del centro con remache dorado.
    if (Math.abs(y) < 0.008 && Math.abs(x) < hw * 0.78) color = blend(color, LINE, 1);
    if (Math.hypot(x, y) < 0.022) color = blend(color, GOLD, 1);
    for (const half of [-1, 1]) {
      for (const [px, py] of PIP_LAYOUT[6]) {
        const cx = px * hw * 0.52;
        const cy = half * hh * 0.5 + py * hh * 0.3;
        if (Math.hypot(x - cx, y - cy) < 0.034) color = blend(color, PIP, 1);
      }
    }
  }
  return color;
}

function render(size, options, samples = 3) {
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = scene((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size, options);
          r += c[0] * c[3];
          g += c[1] * c[3];
          b += c[2] * c[3];
          a += c[3];
        }
      }
      const i = (py * size + px) * 4;
      const n = samples * samples;
      out[i] = a > 0 ? Math.round(r / a) : 0;
      out[i + 1] = a > 0 ? Math.round(g / a) : 0;
      out[i + 2] = a > 0 ? Math.round(b / a) : 0;
      out[i + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

writePng('assets/images/icon.png', 1024, render(1024, { background: true, tileScale: 1 }));
writePng('assets/images/adaptive-icon.png', 1024, render(1024, { background: false, tileScale: 0.72 }));
writePng('assets/images/adaptive-icon-background.png', 512, render(512, { background: true, tileScale: 1, tile: false }, 1));
writePng('assets/images/splash-icon.png', 512, render(512, { background: false, tileScale: 1 }));
writePng('assets/images/favicon.png', 64, render(64, { background: true, tileScale: 1 }, 4));
console.log('Iconos generados en assets/images/');
