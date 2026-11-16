// Fichas (marfil, madera, neón, oro, piedra del templo) y mesas (paño verde, madera de patio, playa), dibujadas con
// Skia en código.
// Los pinceles se crean la primera vez que se usan (nunca al cargar el módulo).
import { ClipOp, Skia, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';
import { COLORS, type TableSkinId, type TileSkinId } from '@/game/config';
import { blurred, linearPaint, radialPaint, record, rrect, solid, stroke } from '@/components/art/paint';

/** Colores de cada diseño de ficha de la tienda (datos; los pinceles se crean al dibujar). */
interface TileSkin {
  face: string;
  /** Segundo color de la cara (degradado del oro). */
  face2?: string;
  edge: string;
  line: string;
  pip: string;
  rivet: string;
  back: string;
  backLight: string;
  /** Vetas de la madera. */
  grain?: string;
  /** Motas de la piedra. */
  speckle?: string;
  /** Puntos que brillan (neón). */
  glowPips?: boolean;
}

export const TILE_SKINS: Record<TileSkinId, TileSkin> = {
  ivory: { face: COLORS.ivory, edge: COLORS.ivoryShade, line: COLORS.tileLine, pip: COLORS.pip, rivet: COLORS.accent, back: COLORS.tileBack, backLight: COLORS.tileBackLight },
  wood: { face: '#B9824B', edge: '#7A4E26', line: '#5A3518', pip: '#FBEFD5', rivet: '#E2B65A', back: '#5A3518', backLight: '#8A5A2E', grain: '#94602F' },
  neon: { face: '#16121F', edge: '#FF2BD6', line: '#3D3159', pip: '#2BF3FF', rivet: '#FF2BD6', back: '#1E1A2E', backLight: '#2BF3FF', glowPips: true },
  gold: { face: '#F6D776', face2: '#C9971E', edge: '#8C6A10', line: '#7A5A0A', pip: '#2B1D05', rivet: '#FFF6C4', back: '#8C6A10', backLight: '#F6D776' },
  temple: { face: '#A3AA9E', edge: '#6C756A', line: '#4B524B', pip: '#1E3B2A', rivet: '#D4A24C', back: '#4B524B', backLight: '#86907F', speckle: '#7D857A' },
};

interface Paints {
  shadow: SkPaint;
  face: SkPaint;
  edge: SkPaint;
  line: SkPaint;
  pip: SkPaint;
  pipGlow: SkPaint | null;
  rivet: SkPaint;
  grain: SkPaint | null;
  speckle: SkPaint | null;
  glow: SkPaint;
  glowStroke: SkPaint;
  dim: SkPaint;
  ghostFill: SkPaint;
  ghostStroke: SkPaint;
  back: SkPaint;
  backEdge: SkPaint;
  backMark: SkPaint;
}

const paintCache = new Map<TileSkinId, Paints>();
let currentSkin: TileSkinId = 'ivory';

/** Diseño de ficha equipado (la partida lo pone al empezar). */
export function setTileSkin(skin: TileSkinId): void {
  currentSkin = skin;
}

function getPaints(skinId: TileSkinId = currentSkin): Paints {
  const cached = paintCache.get(skinId);
  if (cached) return cached;
  const skin = TILE_SKINS[skinId];
  const made: Paints = {
    shadow: blurred('#000000', 3, 0.45),
    face: solid(skin.face),
    edge: stroke(skin.edge, 1.2),
    line: stroke(skin.line, 1),
    pip: solid(skin.pip),
    pipGlow: skin.glowPips ? blurred(skin.pip, 2.5, 0.9) : null,
    rivet: solid(skin.rivet),
    grain: skin.grain ? stroke(skin.grain, 0.8, 0.8) : null,
    speckle: skin.speckle ? solid(skin.speckle, 0.9) : null,
    glow: blurred(COLORS.playable, 6, 0.85),
    glowStroke: stroke(COLORS.playable, 2.5),
    dim: solid('#000000', 0.32),
    ghostFill: solid(COLORS.playable, 0.28),
    ghostStroke: stroke(COLORS.playable, 3),
    back: solid(skin.back),
    backEdge: stroke(skin.backLight, 1.2),
    backMark: stroke(skin.backLight, 1, 0.7),
  };
  paintCache.set(skinId, made);
  return made;
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

function drawPips(canvas: SkCanvas, value: number, cx: number, cy: number, size: number, vertical: boolean, pip: SkPaint, glow: SkPaint | null): void {
  const r = size * 0.095;
  const spread = size * 0.27;
  for (const [px, py] of PIP_LAYOUT[value] ?? []) {
    // En las fichas tumbadas el seis va en filas a lo largo de la ficha.
    const x = vertical ? px : py;
    const y = vertical ? py : px;
    if (glow) canvas.drawCircle(cx + x * spread, cy + y * spread, r * 1.6, glow);
    canvas.drawCircle(cx + x * spread, cy + y * spread, r, pip);
  }
}

export interface TileStyle {
  highlight?: boolean;
  dim?: boolean;
  shadow?: boolean;
  /** Sitio donde caerá la ficha: se ve la ficha con un velo dorado y un borde que brilla. */
  ghost?: boolean;
  /** Diseño concreto (vista previa de la tienda); si no, el equipado. */
  skin?: TileSkinId;
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
  const skinId = style.skin ?? currentSkin;
  const p = getPaints(skinId);
  const skin = TILE_SKINS[skinId];
  const w = vertical ? size : size * 2;
  const h = vertical ? size * 2 : size;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const radius = size * 0.16;
  if (style.highlight || style.ghost) canvas.drawRRect(rrect(x - 2, y - 2, w + 4, h + 4, radius + 2), p.glow);
  if (style.shadow !== false) canvas.drawRRect(rrect(x + size * 0.06, y + size * 0.1, w, h, radius), p.shadow);
  canvas.drawRRect(rrect(x, y, w, h, radius), skin.face2 ? linearPaint(x, y, x + w, y + h, [skin.face, skin.face2]) : p.face);
  if (p.grain) {
    // Vetas de la madera a lo largo de la ficha.
    for (let k = 1; k < 4; k++) {
      if (vertical) canvas.drawLine(x + (w * k) / 4, y + 2, x + (w * k) / 4 + size * 0.06, y + h - 2, p.grain);
      else canvas.drawLine(x + 2, y + (h * k) / 4, x + w - 2, y + (h * k) / 4 + size * 0.06, p.grain);
    }
  }
  if (p.speckle) {
    const seeds = [0.13, 0.71, 0.37, 0.88, 0.52, 0.24, 0.64, 0.92, 0.08, 0.45];
    for (let k = 0; k < seeds.length - 1; k++) canvas.drawCircle(x + seeds[k] * w, y + seeds[k + 1] * h, size * 0.035, p.speckle);
  }
  canvas.drawRRect(rrect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, radius), p.edge);
  if (vertical) canvas.drawLine(x + size * 0.18, cy, x + w - size * 0.18, cy, p.line);
  else canvas.drawLine(cx, y + size * 0.18, cx, y + h - size * 0.18, p.line);
  canvas.drawCircle(cx, cy, size * 0.07, p.rivet);
  if (vertical) {
    drawPips(canvas, first, cx, cy - size / 2, size, true, p.pip, p.pipGlow);
    drawPips(canvas, second, cx, cy + size / 2, size, true, p.pip, p.pipGlow);
  } else {
    drawPips(canvas, first, cx - size / 2, cy, size, false, p.pip, p.pipGlow);
    drawPips(canvas, second, cx + size / 2, cy, size, false, p.pip, p.pipGlow);
  }
  if (style.highlight) canvas.drawRRect(rrect(x - 1, y - 1, w + 2, h + 2, radius + 1), p.glowStroke);
  if (style.dim) canvas.drawRRect(rrect(x, y, w, h, radius), p.dim);
  if (style.ghost) {
    canvas.drawRRect(rrect(x, y, w, h, radius), p.ghostFill);
    canvas.drawRRect(rrect(x - 1.5, y - 1.5, w + 3, h + 3, radius + 1.5), p.ghostStroke);
  }
}

/** Ficha boca abajo (manos de los demás). */
export function drawTileBack(canvas: SkCanvas, cx: number, cy: number, size: number, vertical: boolean, skin?: TileSkinId): void {
  const p = getPaints(skin);
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

/** Mesa (paño verde, madera de patio o playa) con su borde; se graba una sola vez por tamaño y diseño. */
export function buildFelt(
  width: number,
  height: number,
  table: { x: number; y: number; w: number; h: number },
  skin: TableSkinId = 'felt',
): SkPicture {
  return record(width, height, (canvas) => {
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), solid(COLORS.background));
    drawTableSurface(canvas, table, skin);
  });
}

/** Solo la mesa (también para la vista previa de la tienda). */
export function drawTableSurface(canvas: SkCanvas, table: { x: number; y: number; w: number; h: number }, skin: TableSkinId): void {
  const rim = 10;
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const rimColors =
    skin === 'beach' ? ['#3FC1C9', '#1C8A99'] : skin === 'patio' ? ['#5B3A1E', '#3A2412'] : [COLORS.feltEdgeLight, COLORS.feltEdge];
  canvas.drawRRect(rrect(table.x - rim, table.y - rim, table.w + rim * 2, table.h + rim * 2, 28), linearPaint(0, table.y - rim, 0, table.y + table.h + rim, rimColors));
  const inner = rrect(table.x, table.y, table.w, table.h, 20);
  canvas.save();
  canvas.clipRRect(inner, ClipOp.Intersect, true);
  if (skin === 'patio') {
    // Tablones de madera con vetas.
    canvas.drawRect(Skia.XYWHRect(table.x, table.y, table.w, table.h), linearPaint(table.x, 0, table.x + table.w, 0, ['#B57B45', '#9C6535', '#B57B45']));
    const plank = 34;
    const seam = stroke('#5C3A1C', 2, 0.8);
    const grain = stroke('#7E4F27', 1, 0.45);
    for (let y = table.y; y < table.y + table.h; y += plank) {
      canvas.drawLine(table.x, y, table.x + table.w, y, seam);
      for (let k = 0; k < 3; k++) {
        const gy = y + 6 + rnd() * (plank - 12);
        canvas.drawLine(table.x, gy, table.x + table.w, gy + (rnd() - 0.5) * 6, grain);
      }
      const joint = table.x + rnd() * table.w;
      canvas.drawLine(joint, y, joint, y + plank, seam);
    }
  } else if (skin === 'beach') {
    // Arena con conchas y una orilla de espuma.
    canvas.drawRect(Skia.XYWHRect(table.x, table.y, table.w, table.h), radialPaint(table.x + table.w / 2, table.y + table.h / 2, Math.max(table.w, table.h) * 0.75, ['#F6E2AE', '#EBCB86', '#D9B46C'], [0, 0.6, 1]));
    const grainPaint = solid('#B8935A', 0.35);
    for (let i = 0; i < 700; i++) canvas.drawCircle(table.x + rnd() * table.w, table.y + rnd() * table.h, 0.5 + rnd() * 0.9, grainPaint);
    const shell = solid('#FFF4E0', 0.9);
    const shellLine = stroke('#E0A37A', 1, 0.8);
    for (let i = 0; i < 7; i++) {
      const sx = table.x + 20 + rnd() * (table.w - 40);
      const sy = table.y + 20 + rnd() * (table.h - 40);
      canvas.drawCircle(sx, sy, 5, shell);
      canvas.drawCircle(sx, sy, 5, shellLine);
    }
    canvas.drawRect(Skia.XYWHRect(table.x, table.y, table.w, 14), solid('#FFFFFF', 0.35));
  } else {
    canvas.drawRect(
      Skia.XYWHRect(table.x, table.y, table.w, table.h),
      radialPaint(table.x + table.w / 2, table.y + table.h * 0.45, Math.max(table.w, table.h) * 0.75, [COLORS.feltLight, COLORS.felt, COLORS.feltDark], [0, 0.55, 1]),
    );
    // Textura del paño: puntitos con azar fijo.
    const fleck = solid('#FFFFFF', 0.035);
    const dark = solid('#000000', 0.05);
    for (let i = 0; i < 900; i++) {
      const fx = table.x + 6 + rnd() * (table.w - 12);
      const fy = table.y + 6 + rnd() * (table.h - 12);
      canvas.drawCircle(fx, fy, 0.6 + rnd() * 0.8, i % 2 === 0 ? fleck : dark);
    }
  }
  canvas.restore();
  canvas.drawRRect(rrect(table.x + 1, table.y + 1, table.w - 2, table.h - 2, 19), stroke('#000000', 2, 0.25));
}
