// Fichas de marfil con puntos negros y paño verde, dibujados con Skia en código.
// Los pinceles se crean la primera vez que se usan (nunca al cargar el módulo).
import { Skia, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';
import { COLORS } from '@/game/config';
import { blurred, linearPaint, radialPaint, record, rrect, solid, stroke } from '@/components/art/paint';

interface Paints {
  shadow: SkPaint;
  ivory: SkPaint;
  edge: SkPaint;
  line: SkPaint;
  pip: SkPaint;
  rivet: SkPaint;
  glow: SkPaint;
  glowStroke: SkPaint;
  dim: SkPaint;
  back: SkPaint;
  backEdge: SkPaint;
  backMark: SkPaint;
}

let paints: Paints | null = null;

function getPaints(): Paints {
  if (paints) return paints;
  paints = {
    shadow: blurred('#000000', 3, 0.45),
    ivory: solid(COLORS.ivory),
    edge: stroke(COLORS.ivoryShade, 1.2),
    line: stroke(COLORS.tileLine, 1),
    pip: solid(COLORS.pip),
    rivet: solid(COLORS.accent),
    glow: blurred(COLORS.playable, 6, 0.85),
    glowStroke: stroke(COLORS.playable, 2.5),
    dim: solid('#000000', 0.32),
    back: solid(COLORS.tileBack),
    backEdge: stroke(COLORS.tileBackLight, 1.2),
    backMark: stroke(COLORS.accent, 1, 0.7),
  };
  return paints;
}

/** Posición de los puntos en una mitad (de -1 a 1 en cada eje). */
const PIP_LAYOUT: Record<number, [number, number][]> = {
  0: [],
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

function drawPips(canvas: SkCanvas, value: number, cx: number, cy: number, size: number, vertical: boolean, pip: SkPaint): void {
  const r = size * 0.095;
  const spread = size * 0.27;
  for (const [px, py] of PIP_LAYOUT[value] ?? []) {
    // En las fichas tumbadas el seis va en filas a lo largo de la ficha.
    const x = vertical ? px : py;
    const y = vertical ? py : px;
    canvas.drawCircle(cx + x * spread, cy + y * spread, r, pip);
  }
}

export interface TileStyle {
  highlight?: boolean;
  dim?: boolean;
  shadow?: boolean;
}

/**
 * Ficha con centro (cx, cy), lado corto `size`. `first` va arriba (de pie) o a la izquierda (tumbada).
 */
export function drawTile(
  canvas: SkCanvas,
  cx: number,
  cy: number,
  size: number,
  vertical: boolean,
  first: number,
  second: number,
  style: TileStyle = {},
): void {
  const p = getPaints();
  const w = vertical ? size : size * 2;
  const h = vertical ? size * 2 : size;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const radius = size * 0.16;
  if (style.highlight) canvas.drawRRect(rrect(x - 2, y - 2, w + 4, h + 4, radius + 2), p.glow);
  if (style.shadow !== false) canvas.drawRRect(rrect(x + size * 0.06, y + size * 0.1, w, h, radius), p.shadow);
  canvas.drawRRect(rrect(x, y, w, h, radius), p.ivory);
  canvas.drawRRect(rrect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, radius), p.edge);
  if (vertical) canvas.drawLine(x + size * 0.18, cy, x + w - size * 0.18, cy, p.line);
  else canvas.drawLine(cx, y + size * 0.18, cx, y + h - size * 0.18, p.line);
  canvas.drawCircle(cx, cy, size * 0.07, p.rivet);
  if (vertical) {
    drawPips(canvas, first, cx, cy - size / 2, size, true, p.pip);
    drawPips(canvas, second, cx, cy + size / 2, size, true, p.pip);
  } else {
    drawPips(canvas, first, cx - size / 2, cy, size, false, p.pip);
    drawPips(canvas, second, cx + size / 2, cy, size, false, p.pip);
  }
  if (style.highlight) canvas.drawRRect(rrect(x - 1, y - 1, w + 2, h + 2, radius + 1), p.glowStroke);
  if (style.dim) canvas.drawRRect(rrect(x, y, w, h, radius), p.dim);
}

/** Ficha boca abajo (manos de los demás). */
export function drawTileBack(canvas: SkCanvas, cx: number, cy: number, size: number, vertical: boolean): void {
  const p = getPaints();
  const w = vertical ? size : size * 2;
  const h = vertical ? size * 2 : size;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const radius = size * 0.16;
  canvas.drawRRect(rrect(x + 1, y + 2, w, h, radius), p.shadow);
  canvas.drawRRect(rrect(x, y, w, h, radius), p.back);
  canvas.drawRRect(rrect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, radius), p.backEdge);
  canvas.drawCircle(cx, cy, size * 0.18, p.backMark);
}

/** Paño verde con borde de madera (se graba una sola vez por tamaño). */
export function buildFelt(width: number, height: number, table: { x: number; y: number; w: number; h: number }): SkPicture {
  return record(width, height, (canvas) => {
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), solid(COLORS.background));
    const rim = 10;
    canvas.drawRRect(
      rrect(table.x - rim, table.y - rim, table.w + rim * 2, table.h + rim * 2, 28),
      linearPaint(0, table.y - rim, 0, table.y + table.h + rim, [COLORS.feltEdgeLight, COLORS.feltEdge]),
    );
    canvas.drawRRect(
      rrect(table.x, table.y, table.w, table.h, 20),
      radialPaint(table.x + table.w / 2, table.y + table.h * 0.45, Math.max(table.w, table.h) * 0.75, [
        COLORS.feltLight,
        COLORS.felt,
        COLORS.feltDark,
      ], [0, 0.55, 1]),
    );
    // Textura del paño: puntitos con azar fijo.
    let s = 7;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const fleck = solid('#FFFFFF', 0.035);
    const dark = solid('#000000', 0.05);
    for (let i = 0; i < 900; i++) {
      const fx = table.x + 6 + rnd() * (table.w - 12);
      const fy = table.y + 6 + rnd() * (table.h - 12);
      canvas.drawCircle(fx, fy, 0.6 + rnd() * 0.8, i % 2 === 0 ? fleck : dark);
    }
    canvas.drawRRect(rrect(table.x + 1, table.y + 1, table.w - 2, table.h - 2, 19), stroke('#000000', 2, 0.25));
  });
}
