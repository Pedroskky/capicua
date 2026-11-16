// Zonas de la pantalla de juego (sin Skia ni React): mesa, abanico, asientos y geometría de la fila.
// Las comparten el lienzo, los avatares y la capa de «Ver números de la mesa».
import type { LinePiece } from '@/game/engine';
import { fitTable, layoutLine, type PlacedTile, type Point } from '@/game/layout';

/** Posición en pantalla: 0 = abajo (quien mira), 1 = derecha, 2 = arriba, 3 = izquierda. */
export type Slot = 0 | 1 | 2 | 3;

export interface Regions {
  width: number;
  height: number;
  players: number;
  /** Rectángulo del paño. */
  table: { x: number; y: number; w: number; h: number };
  /** Base del abanico de tu mano. */
  fanBaseY: number;
  /** Ancho de las fichas del abanico (de pie). */
  fanTileW: number;
  /** Arriba del abanico (para el texto «Te toca»). */
  fanTop: number;
  /** Centro de cada avatar por posición en pantalla. */
  slots: Record<Slot, Point>;
  /** De dónde sale la ficha que juega cada posición. */
  origins: Record<Slot, Point>;
  /** Montón del pozo (mano a mano). */
  boneyard: Point;
}

export const SIDE_MARGIN = 46;

export function computeRegions(width: number, height: number, insetTop: number, insetBottom: number, players = 4): Regions {
  const topBar = insetTop + 54;
  const fanTileW = Math.min(54, (width - 24) / 7 / 0.92);
  const fanBaseY = height - insetBottom - 20;
  const fanTop = fanBaseY - fanTileW * 2 - 16;
  const tableY = topBar + 100;
  const side = players === 4 ? SIDE_MARGIN : 14;
  const table = { x: side, y: tableY, w: width - side * 2, h: Math.max(120, fanTop - 34 - tableY) };
  const midY = table.y + table.h / 2;
  const slots: Record<Slot, Point> = {
    0: { x: 40, y: fanTop - 14 },
    1: { x: width - SIDE_MARGIN / 2, y: midY - 70 },
    2: { x: width / 2, y: topBar + 26 },
    3: { x: SIDE_MARGIN / 2, y: midY - 70 },
  };
  const origins: Record<Slot, Point> = {
    0: { x: width / 2, y: fanBaseY - fanTileW },
    1: { x: width + 20, y: midY },
    2: { x: width / 2, y: topBar + 40 },
    3: { x: -20, y: midY },
  };
  return { width, height, players, table, fanBaseY, fanTileW, fanTop, slots, origins, boneyard: { x: width - 40, y: topBar + 26 } };
}

/** Posición en pantalla de un asiento según quién mira (en mano a mano el rival va arriba). */
export function slotOf(seat: number, viewer: number, players: number): Slot {
  const rel = (seat - viewer + players) % players;
  if (players === 2) return rel === 0 ? 0 : 2;
  return rel as Slot;
}

export interface TableGeometry {
  tiles: PlacedTile[];
  /** Píxeles por unidad (una ficha mide 1 × 2 unidades). */
  unit: number;
  ox: number;
  oy: number;
}

export const MAX_UNIT = 30;
const TABLE_PAD = 8;

/** Dónde se dibuja cada ficha de la fila, en píxeles: centro = (ox + cx·unit, oy + cy·unit). */
export function tableGeometry(line: readonly LinePiece[], origin: number, table: Regions['table']): TableGeometry {
  const lay = layoutLine(line, origin);
  const fit = fitTable(lay.bounds, table.w - TABLE_PAD * 2, table.h - TABLE_PAD * 2, MAX_UNIT);
  return { tiles: lay.tiles, unit: fit.unit, ox: table.x + TABLE_PAD + fit.offsetX, oy: table.y + TABLE_PAD + fit.offsetY };
}
