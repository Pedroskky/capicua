// Zonas de la pantalla de juego (sin Skia ni React): mesa, abanico, asientos. Las comparten el lienzo y los avatares.
import type { Point } from '@/game/layout';

export interface Regions {
  width: number;
  height: number;
  /** Rectángulo del paño. */
  table: { x: number; y: number; w: number; h: number };
  /** Base del abanico de tu mano. */
  fanBaseY: number;
  /** Alto máximo de las fichas del abanico (de pie). */
  fanTileW: number;
  /** Arriba del abanico (para el texto «Te toca»). */
  fanTop: number;
  /** Centro de cada avatar (0 = tú, 1 = derecha, 2 = compañero, 3 = izquierda). */
  seats: Point[];
  /** De dónde sale la ficha que juega cada asiento. */
  origins: Point[];
}

export const SIDE_MARGIN = 46;

export function computeRegions(width: number, height: number, insetTop: number, insetBottom: number): Regions {
  const topBar = insetTop + 54;
  const fanTileW = Math.min(54, (width - 24) / 7 / 0.92);
  const fanBaseY = height - insetBottom - 20;
  const fanTop = fanBaseY - fanTileW * 2 - 16;
  const tableY = topBar + 100;
  const table = { x: SIDE_MARGIN, y: tableY, w: width - SIDE_MARGIN * 2, h: Math.max(120, fanTop - 34 - tableY) };
  const midY = table.y + table.h / 2;
  const seats = [
    { x: 40, y: fanTop - 14 },
    { x: width - SIDE_MARGIN / 2, y: midY - 70 },
    { x: width / 2, y: topBar + 26 },
    { x: SIDE_MARGIN / 2, y: midY - 70 },
  ];
  const origins = [
    { x: width / 2, y: fanBaseY - fanTileW },
    { x: width + 20, y: midY },
    { x: width / 2, y: topBar + 40 },
    { x: -20, y: midY },
  ];
  return { width, height, table, fanBaseY, fanTileW, fanTop, seats, origins };
}
