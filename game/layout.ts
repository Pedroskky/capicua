// Dónde va cada ficha (lógica pura, sin Skia): la fila de la mesa y el abanico de tu mano.
// La mesa se mide en «unidades»: una ficha mide 1 × 2. La ficha de salida va en el centro; el brazo derecho
// avanza a la derecha y, al llegar al borde, gira hacia abajo y vuelve hacia la izquierda (una «S»);
// el brazo izquierdo hace lo mismo hacia arriba. Los dobles van atravesados.
import type { LinePiece } from '@/game/engine';
import { isDouble } from '@/game/tiles';

export interface Point {
  x: number;
  y: number;
}

/** Una mitad de ficha (cuadrado de 1 × 1) con su número. */
export interface TileHalf extends Point {
  value: number;
}

export interface PlacedTile {
  /** Posición en `line`. */
  index: number;
  tile: number;
  /** Centro de la ficha. */
  cx: number;
  cy: number;
  vertical: boolean;
  halves: [TileHalf, TileHalf];
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface TableLayout {
  tiles: PlacedTile[];
  bounds: Bounds;
}

/** Media anchura de la fila antes de girar (unidades): caben ≈ 5 fichas de lado a lado. */
export const ROW_HALF_WIDTH = 5;

const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k });

function makeTile(index: number, tile: number, h1: Point, v1: number, h2: Point, v2: number): PlacedTile {
  return {
    index,
    tile,
    cx: (h1.x + h2.x) / 2,
    cy: (h1.y + h2.y) / 2,
    vertical: Math.abs(h1.x - h2.x) < 1e-6,
    halves: [
      { x: h1.x, y: h1.y, value: v1 },
      { x: h2.x, y: h2.y, value: v2 },
    ],
  };
}

interface ArmPiece {
  index: number;
  tile: number;
  inner: number;
  outer: number;
}

/** Coloca un brazo. `sign` = 1 (derecha, gira hacia abajo) o -1 (izquierda, gira hacia arriba). */
function layoutArm(pieces: ArmPiece[], start: Point, sign: 1 | -1, halfWidth: number): PlacedTile[] {
  const out: PlacedTile[] = [];
  let p = start;
  let dir: Point = { x: sign, y: 0 };
  const turnDir: Point = { x: 0, y: sign };
  let nextHorizontal: Point = { x: -sign, y: 0 };
  let pendingTurn = false;

  /** Ficha que gira: su lado corto pega con la punta y se alarga hacia `b`. */
  const placeTurning = (piece: ArmPiece, a: Point, b: Point) => {
    const base = add(p, a, 0.5);
    const h1 = base;
    const h2 = add(base, b, 1);
    out.push(makeTile(piece.index, piece.tile, h1, piece.inner, h2, piece.outer));
    p = add(base, b, 1.5);
    dir = b;
  };

  for (const piece of pieces) {
    if (pendingTurn) {
      const back = nextHorizontal;
      placeTurning(piece, dir, back);
      nextHorizontal = { x: -back.x, y: 0 };
      pendingTurn = false;
      continue;
    }
    // Un doble atravesado necesita sitio para él y para la ficha siguiente: si no lo hay, gira ya (el doble hace
    // de curva). Así una ficha que gira nunca queda pegada al costado de un doble con su otra mitad.
    const reach = isDouble(piece.tile) ? 3 : 2;
    if (Math.abs(p.x + dir.x * reach) > halfWidth) {
      placeTurning(piece, dir, turnDir);
      pendingTurn = true;
      continue;
    }
    if (isDouble(piece.tile)) {
      const c = add(p, dir, 0.5);
      const perp = { x: -dir.y, y: dir.x };
      out.push(makeTile(piece.index, piece.tile, add(c, perp, -0.5), piece.inner, add(c, perp, 0.5), piece.outer));
      p = add(p, dir, 1);
    } else {
      out.push(makeTile(piece.index, piece.tile, add(p, dir, 0.5), piece.inner, add(p, dir, 1.5), piece.outer));
      p = add(p, dir, 2);
    }
  }
  return out;
}

/** Cómo dibujar una ficha: `first` va arriba (de pie) o a la izquierda (tumbada), según dónde está cada mitad. */
export interface TileDrawSpec {
  tile: number;
  cx: number;
  cy: number;
  vertical: boolean;
  first: number;
  second: number;
}

export function tileDrawSpec(t: PlacedTile): TileDrawSpec {
  const [h1, h2] = t.halves;
  const h1First = t.vertical ? h1.y <= h2.y : h1.x <= h2.x;
  return {
    tile: t.tile,
    cx: t.cx,
    cy: t.cy,
    vertical: t.vertical,
    first: h1First ? h1.value : h2.value,
    second: h1First ? h2.value : h1.value,
  };
}

/** Las dos mitades tal y como quedan dibujadas (para tests y para «Ver números de la mesa»). */
export function drawnHalves(spec: TileDrawSpec): [TileHalf, TileHalf] {
  return spec.vertical
    ? [
        { x: spec.cx, y: spec.cy - 0.5, value: spec.first },
        { x: spec.cx, y: spec.cy + 0.5, value: spec.second },
      ]
    : [
        { x: spec.cx - 0.5, y: spec.cy, value: spec.first },
        { x: spec.cx + 0.5, y: spec.cy, value: spec.second },
      ];
}

export function layoutLine(line: readonly LinePiece[], origin: number, halfWidth = ROW_HALF_WIDTH): TableLayout {
  const tiles: PlacedTile[] = [];
  if (line.length > 0) {
    const first = line[origin];
    const double = isDouble(first.tile);
    if (double) tiles.push(makeTile(origin, first.tile, { x: 0, y: -0.5 }, first.left, { x: 0, y: 0.5 }, first.right));
    else tiles.push(makeTile(origin, first.tile, { x: -0.5, y: 0 }, first.left, { x: 0.5, y: 0 }, first.right));
    const reach = double ? 0.5 : 1;
    const right: ArmPiece[] = line.slice(origin + 1).map((p, i) => ({ index: origin + 1 + i, tile: p.tile, inner: p.left, outer: p.right }));
    const left: ArmPiece[] = line
      .slice(0, origin)
      .map((p, i) => ({ index: i, tile: p.tile, inner: p.right, outer: p.left }))
      .reverse();
    tiles.push(...layoutArm(right, { x: reach, y: 0 }, 1, halfWidth));
    tiles.push(...layoutArm(left, { x: -reach, y: 0 }, -1, halfWidth));
  }
  tiles.sort((a, b) => a.index - b.index);
  return { tiles, bounds: boundsOf(tiles) };
}

export function boundsOf(tiles: readonly PlacedTile[]): Bounds {
  if (tiles.length === 0) return { minX: -1, maxX: 1, minY: -0.5, maxY: 0.5 };
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const t of tiles) {
    for (const h of t.halves) {
      b.minX = Math.min(b.minX, h.x - 0.5);
      b.maxX = Math.max(b.maxX, h.x + 0.5);
      b.minY = Math.min(b.minY, h.y - 0.5);
      b.maxY = Math.max(b.maxY, h.y + 0.5);
    }
  }
  return b;
}

/** ¿Se pisan dos fichas? (para los tests: la fila nunca se monta sobre sí misma). */
export function overlaps(a: PlacedTile, b: PlacedTile): boolean {
  for (const ha of a.halves) {
    for (const hb of b.halves) {
      if (Math.abs(ha.x - hb.x) < 0.999 && Math.abs(ha.y - hb.y) < 0.999) return true;
    }
  }
  return false;
}

/** Escala (px por unidad) y centro para que toda la fila quepa en el área de la mesa. */
export function fitTable(bounds: Bounds, width: number, height: number, maxUnit: number): { unit: number; offsetX: number; offsetY: number } {
  // Siempre se reserva la fila completa a lo ancho, para que la mesa no cambie de tamaño a cada ficha.
  const spanX = Math.max(ROW_HALF_WIDTH * 2 + 2, bounds.maxX - bounds.minX + 0.5);
  const spanY = Math.max(6, bounds.maxY - bounds.minY + 0.5);
  const unit = Math.min(maxUnit, width / spanX, height / spanY);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return { unit, offsetX: width / 2 - cx * unit, offsetY: height / 2 - cy * unit };
}

// --- Abanico de tu mano -------------------------------------------------------------------------------------

export interface FanTile {
  /** Centro de la ficha en pantalla. */
  x: number;
  y: number;
  /** Giro en radianes. */
  angle: number;
  /** Tamaño de la ficha (de pie: ancho × alto). */
  w: number;
  h: number;
}

/** Abanico centrado en `centerX`, con la base de las fichas en `baseY`. */
export function fanLayout(count: number, width: number, baseY: number, maxTileW = 54): FanTile[] {
  if (count === 0) return [];
  const w = Math.min(maxTileW, (width - 24) / Math.max(count, 4) / 0.92);
  const h = w * 2;
  const step = w * 0.92;
  const spreadDeg = 4.5;
  const out: FanTile[] = [];
  for (let i = 0; i < count; i++) {
    const k = i - (count - 1) / 2;
    const angle = (k * spreadDeg * Math.PI) / 180;
    out.push({
      x: width / 2 + k * step,
      y: baseY - h / 2 + Math.abs(k) * Math.abs(k) * w * 0.035,
      angle,
      w,
      h,
    });
  }
  return out;
}

/** Qué ficha del abanico hay bajo el dedo (la de encima gana). -1 si ninguna. */
export function hitFan(fan: readonly FanTile[], x: number, y: number, lift: readonly number[] = []): number {
  for (let i = fan.length - 1; i >= 0; i--) {
    const t = fan[i];
    const dy0 = y - (t.y - (lift[i] ?? 0));
    const dx0 = x - t.x;
    const cos = Math.cos(-t.angle);
    const sin = Math.sin(-t.angle);
    const lx = dx0 * cos - dy0 * sin;
    const ly = dx0 * sin + dy0 * cos;
    if (Math.abs(lx) <= t.w / 2 + 2 && Math.abs(ly) <= t.h / 2 + 4) return i;
  }
  return -1;
}
