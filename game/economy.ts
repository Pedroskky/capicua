// Monedas, tienda y progreso del torneo (clave `capicua.progress`, con `PROGRESS_VERSION`). TypeScript puro.
import {
  ECONOMY,
  SHOP_ITEMS,
  TOURNAMENT,
  type AiLevel,
  type PhrasePackId,
  type ShopCategory,
  type ShopItem,
  type TableSkinId,
  type TileSkinId,
} from '@/game/config';

export const PROGRESS_VERSION = 1;

export interface Equipped {
  tiles: TileSkinId;
  table: TableSkinId;
  phrases: PhrasePackId;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  coins: number;
  /** Monedas ganadas en total (para un logro). */
  earned: number;
  owned: string[];
  equipped: Equipped;
  /** Estrellas conseguidas contra cada pareja del torneo (0 = sin vencer). */
  tournamentStars: number[];
  /** Solo herramientas de desarrollo: todas las parejas abiertas. */
  tournamentUnlockedAll: boolean;
  /** Ya se enseñó la celebración del campeón. */
  championCelebrated: boolean;
}

export const FREE_ITEMS = SHOP_ITEMS.filter((i) => i.price === 0).map((i) => i.id);

export const INITIAL_PROGRESS: Progress = {
  version: PROGRESS_VERSION,
  coins: 0,
  earned: 0,
  owned: FREE_ITEMS,
  equipped: { tiles: 'ivory', table: 'felt', phrases: 'basic' },
  tournamentStars: new Array<number>(TOURNAMENT.pairs).fill(0),
  tournamentUnlockedAll: false,
  championCelebrated: false,
};

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function equippedOk(category: ShopCategory, id: unknown, owned: string[]): boolean {
  const item = typeof id === 'string' ? shopItem(id) : undefined;
  return !!item && item.category === category && owned.includes(item.id);
}

/** Valida el progreso guardado (puede venir roto o de otra versión). */
export function normalizeProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return INITIAL_PROGRESS;
  const p = raw as Partial<Progress> & Record<string, unknown>;
  const owned = [...new Set([...FREE_ITEMS, ...(Array.isArray(p.owned) ? p.owned.filter((id): id is string => typeof id === 'string' && !!shopItem(id)) : [])])];
  const eq = (p.equipped ?? {}) as Partial<Equipped>;
  const stars = Array.isArray(p.tournamentStars) ? p.tournamentStars : [];
  return {
    version: PROGRESS_VERSION,
    coins: isInt(p.coins, 0, 1e9) ? p.coins : 0,
    earned: isInt(p.earned, 0, 1e9) ? p.earned : 0,
    owned,
    equipped: {
      tiles: equippedOk('tiles', eq.tiles, owned) ? (eq.tiles as TileSkinId) : 'ivory',
      table: equippedOk('table', eq.table, owned) ? (eq.table as TableSkinId) : 'felt',
      phrases: equippedOk('phrases', eq.phrases, owned) ? (eq.phrases as PhrasePackId) : 'basic',
    },
    tournamentStars: Array.from({ length: TOURNAMENT.pairs }, (_, i) => (isInt(stars[i], 0, 3) ? (stars[i] as number) : 0)),
    tournamentUnlockedAll: p.tournamentUnlockedAll === true,
    championCelebrated: p.championCelebrated === true,
  };
}

export function addCoins(progress: Progress, amount: number): Progress {
  if (amount <= 0) return progress;
  return { ...progress, coins: progress.coins + amount, earned: progress.earned + amount };
}

export type BuyResult = { ok: true; progress: Progress } | { ok: false; reason: 'unknown' | 'owned' | 'coins' };

export function buy(progress: Progress, id: string): BuyResult {
  const item = shopItem(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (progress.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (progress.coins < item.price) return { ok: false, reason: 'coins' };
  return { ok: true, progress: { ...progress, coins: progress.coins - item.price, owned: [...progress.owned, id] } };
}

export function equip(progress: Progress, id: string): Progress | null {
  const item = shopItem(id);
  if (!item || !progress.owned.includes(id)) return null;
  const key = item.category === 'tiles' ? 'tiles' : item.category === 'table' ? 'table' : 'phrases';
  return { ...progress, equipped: { ...progress.equipped, [key]: id } };
}

export function isEquipped(progress: Progress, id: string): boolean {
  return progress.equipped.tiles === id || progress.equipped.table === id || progress.equipped.phrases === id;
}

/** Monedas de una mano: si la gana tu pareja, más el extra de capicúa. */
export function handCoins(won: boolean, capicua: boolean): number {
  if (!won) return 0;
  return ECONOMY.handWon + (capicua ? ECONOMY.capicua : 0);
}

/** Monedas de una partida: si la ganas, según el nivel, más el extra de zapatero. */
export function matchCoins(won: boolean, level: AiLevel, zapatero: boolean): number {
  if (!won) return 0;
  return ECONOMY.matchWon[level] + (zapatero ? ECONOMY.zapatero : 0);
}
