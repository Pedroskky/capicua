// Partida en curso guardada (clave `capicua.match`). Lógica pura: valida lo leído del almacenamiento, que puede
// venir roto o de otra versión. Si cambia el formato, sube `SAVED_MATCH_VERSION` y migra en `normalizeSavedMatch`.
import { DEFAULT_RULES, PLAYERS, type DominoRules } from '@/game/config';
import type { HandResult, HandState, LinePiece, MatchState, PublicEvent, Team } from '@/game/engine';
import { TILE_COUNT } from '@/game/tiles';

export const SAVED_MATCH_VERSION = 1;

export interface SavedMatch {
  version: typeof SAVED_MATCH_VERSION;
  match: MatchState;
  /** Fecha ISO. */
  savedAt: string;
}

export function toSavedMatch(match: MatchState, now = new Date()): SavedMatch {
  return { version: SAVED_MATCH_VERSION, match, savedAt: now.toISOString() };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isPip = (v: unknown): v is number => isInt(v, 0, 6);
const isTile = (v: unknown): v is number => isInt(v, 0, TILE_COUNT - 1);
const isPlayer = (v: unknown): v is number => isInt(v, 0, PLAYERS - 1);
const isEnd = (v: unknown) => v === 'left' || v === 'right';
const isEnds = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && isPip(v[0]) && isPip(v[1]);
const isTeam = (v: unknown): v is Team => v === 0 || v === 1;
const isPair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every((n) => isInt(n, 0, 100000));

function normalizeRules(raw: unknown): DominoRules {
  const data = isObj(raw) ? raw : {};
  const out: Obj = { ...DEFAULT_RULES };
  for (const key of Object.keys(DEFAULT_RULES) as (keyof DominoRules)[]) {
    if (typeof data[key] === typeof DEFAULT_RULES[key]) out[key] = data[key];
  }
  const rules = out as unknown as DominoRules;
  if (!isInt(rules.handSize, 1, 7)) rules.handSize = DEFAULT_RULES.handSize;
  if (!isInt(rules.targetScore, 1, 10000)) rules.targetScore = DEFAULT_RULES.targetScore;
  if (!isInt(rules.capicuaBonus, 0, 1000)) rules.capicuaBonus = DEFAULT_RULES.capicuaBonus;
  if (!['nextPlayer', 'handWinner'].includes(rules.nextStarter)) rules.nextStarter = DEFAULT_RULES.nextStarter;
  if (!['all', 'opponents'].includes(rules.dominoCounts)) rules.dominoCounts = DEFAULT_RULES.dominoCounts;
  if (!['team', 'player'].includes(rules.tranqueCompare)) rules.tranqueCompare = DEFAULT_RULES.tranqueCompare;
  if (!['all', 'opponents'].includes(rules.tranqueCounts)) rules.tranqueCounts = DEFAULT_RULES.tranqueCounts;
  if (!['none', 'blocker'].includes(rules.tranqueTie)) rules.tranqueTie = DEFAULT_RULES.tranqueTie;
  return rules;
}

function normalizeResult(raw: unknown): HandResult | null {
  if (!isObj(raw)) return null;
  const r = raw;
  if (r.kind !== 'domino' && r.kind !== 'tranque') return null;
  if (r.winnerTeam !== null && !isTeam(r.winnerTeam)) return null;
  if (r.winnerPlayer !== null && !isPlayer(r.winnerPlayer)) return null;
  if (!Array.isArray(r.handPips) || r.handPips.length !== PLAYERS || !r.handPips.every((n) => isInt(n, 0, 200))) return null;
  if (!isPair(r.teamPips) || !isPair(r.scoresAfter)) return null;
  for (const key of ['points', 'bonus', 'total'] as const) if (!isInt(r[key], 0, 10000)) return null;
  if (typeof r.capicua !== 'boolean') return null;
  return r as unknown as HandResult;
}

function normalizeLog(raw: unknown): PublicEvent[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PublicEvent[] = [];
  for (const e of raw) {
    if (!isObj(e) || !isPlayer(e.player)) return null;
    if (e.type === 'play' && isTile(e.tile) && isEnd(e.end) && (e.endsBefore === null || isEnds(e.endsBefore))) {
      out.push({ type: 'play', player: e.player, tile: e.tile, end: e.end as 'left' | 'right', endsBefore: e.endsBefore as [number, number] | null });
    } else if (e.type === 'pass' && isEnds(e.ends)) {
      out.push({ type: 'pass', player: e.player, ends: e.ends });
    } else return null;
  }
  return out;
}

function normalizeHand(raw: unknown): HandState | null {
  if (!isObj(raw)) return null;
  const h = raw;
  if (!isInt(h.number, 1, 1000) || !isPlayer(h.starter) || !isPlayer(h.turn)) return null;
  if (!Array.isArray(h.hands) || h.hands.length !== PLAYERS) return null;
  const hands: number[][] = [];
  for (const hand of h.hands) {
    if (!Array.isArray(hand) || !hand.every(isTile)) return null;
    hands.push([...hand]);
  }
  if (!Array.isArray(h.line)) return null;
  const line: LinePiece[] = [];
  for (const p of h.line) {
    if (!isObj(p) || !isTile(p.tile) || !isPip(p.left) || !isPip(p.right) || !isPlayer(p.player)) return null;
    line.push({ tile: p.tile, left: p.left, right: p.right, player: p.player });
  }
  for (let i = 0; i + 1 < line.length; i++) if (line[i].right !== line[i + 1].left) return null;
  const ids = [...hands.flat(), ...line.map((p) => p.tile)];
  if (new Set(ids).size !== ids.length) return null;
  const origin = line.length === 0 ? 0 : h.origin;
  if (!isInt(origin, 0, Math.max(0, line.length - 1))) return null;
  const log = normalizeLog(h.log);
  if (!log) return null;
  const result = h.result === null ? null : normalizeResult(h.result);
  if (h.result !== null && !result) return null;
  return { number: h.number, starter: h.starter, hands, line, origin, turn: h.turn, log, result };
}

/** Devuelve la partida guardada lista para seguir, o null si no hay o está rota. */
export function normalizeSavedMatch(raw: unknown): SavedMatch | null {
  if (!isObj(raw) || raw.version !== SAVED_MATCH_VERSION || !isObj(raw.match)) return null;
  const m = raw.match;
  const hand = normalizeHand(m.hand);
  if (!hand || !isPair(m.scores) || !isInt(m.seed, -2147483648, 4294967295)) return null;
  if (!Array.isArray(m.history)) return null;
  const history: HandResult[] = [];
  for (const r of m.history) {
    const ok = normalizeResult(r);
    if (!ok) return null;
    history.push(ok);
  }
  if (m.winnerTeam !== null && !isTeam(m.winnerTeam)) return null;
  const match: MatchState = {
    rules: normalizeRules(m.rules),
    seed: m.seed,
    scores: [m.scores[0], m.scores[1]],
    hand,
    history,
    winnerTeam: m.winnerTeam as Team | null,
    zapatero: m.zapatero === true,
  };
  return { version: SAVED_MATCH_VERSION, match, savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '' };
}
