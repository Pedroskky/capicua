// Las 28 fichas del doble seis. Cada ficha es un número (`TileId`, 0–27) que apunta a `TILES`.
import { MAX_PIP } from '@/game/config';

export type TileId = number;

export interface Tile {
  id: TileId;
  /** Número menor. */
  a: number;
  /** Número mayor. */
  b: number;
}

function buildTiles(): Tile[] {
  const out: Tile[] = [];
  for (let a = 0; a <= MAX_PIP; a++) {
    for (let b = a; b <= MAX_PIP; b++) out.push({ id: out.length, a, b });
  }
  return out;
}

export const TILES: readonly Tile[] = buildTiles();
export const TILE_COUNT = TILES.length;

export function tileOf(id: TileId): Tile {
  const tile = TILES[id];
  if (!tile) throw new Error(`Ficha inexistente: ${id}`);
  return tile;
}

export function tileId(a: number, b: number): TileId {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const found = TILES.find((t) => t.a === lo && t.b === hi);
  if (!found) throw new Error(`Ficha inexistente: ${a}-${b}`);
  return found.id;
}

export const DOUBLE_SIX = tileId(MAX_PIP, MAX_PIP);

export function isDouble(id: TileId): boolean {
  const t = tileOf(id);
  return t.a === t.b;
}

export function pips(id: TileId): number {
  const t = tileOf(id);
  return t.a + t.b;
}

export function hasNumber(id: TileId, n: number): boolean {
  const t = tileOf(id);
  return t.a === n || t.b === n;
}

/** El otro número de la ficha (si se juega por `n`). */
export function otherSide(id: TileId, n: number): number {
  const t = tileOf(id);
  if (t.a === n) return t.b;
  if (t.b === n) return t.a;
  throw new Error(`La ficha ${t.a}-${t.b} no tiene ${n}`);
}

export function handPips(hand: readonly TileId[]): number {
  return hand.reduce((sum, id) => sum + pips(id), 0);
}
