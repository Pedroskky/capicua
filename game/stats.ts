// Estadísticas del perfil y ELO contra la máquina (clave `capicua.stats`). TypeScript puro.
import { ELO_START } from '@/game/config';
import { applyEloGame, INITIAL_ELO, type EloState } from '@/game/elo';
import type { ActivityEvent } from '@/game/events';

export interface Stats {
  matchesPlayed: number;
  matchesWon: number;
  handsPlayed: number;
  handsWon: number;
  capicuas: number;
  zapateros: number;
  /** Manos que terminaron en tranque. */
  tranques: number;
  tranquesWon: number;
  /** Veces que dominaste tú. */
  dominoesSelf: number;
  pointsScored: number;
  /** Partidas ganadas seguidas ahora y la mejor racha de victorias. */
  winStreak: number;
  bestWinStreak: number;
  singleWins: number;
  masterWins: number;
  hotseatMatches: number;
  challengesClaimed: number;
  purchases: number;
  elo: EloState;
  eloBest: number;
  /** Partidas terminadas hoy (`todayDate`, AAAAMMDD): para no poner un intersticial en la primera del día. */
  todayDate: string;
  gamesToday: number;
}

export const INITIAL_STATS: Stats = {
  matchesPlayed: 0,
  matchesWon: 0,
  handsPlayed: 0,
  handsWon: 0,
  capicuas: 0,
  zapateros: 0,
  tranques: 0,
  tranquesWon: 0,
  dominoesSelf: 0,
  pointsScored: 0,
  winStreak: 0,
  bestWinStreak: 0,
  singleWins: 0,
  masterWins: 0,
  hotseatMatches: 0,
  challengesClaimed: 0,
  purchases: 0,
  elo: INITIAL_ELO,
  eloBest: ELO_START,
  todayDate: '',
  gamesToday: 0,
};

/** Cuenta una partida terminada hoy. */
export function countGameToday(stats: Stats, today: string): Stats {
  return { ...stats, todayDate: today, gamesToday: stats.todayDate === today ? stats.gamesToday + 1 : 1 };
}

export function applyStats(stats: Stats, event: ActivityEvent): Stats {
  if (event.type === 'hotseat') return { ...stats, hotseatMatches: stats.hotseatMatches + 1 };
  if (event.type === 'hand') {
    return {
      ...stats,
      handsPlayed: stats.handsPlayed + 1,
      handsWon: stats.handsWon + (event.won ? 1 : 0),
      capicuas: stats.capicuas + (event.capicua ? 1 : 0),
      tranques: stats.tranques + (event.kind === 'tranque' ? 1 : 0),
      tranquesWon: stats.tranquesWon + (event.kind === 'tranque' && event.won ? 1 : 0),
      dominoesSelf: stats.dominoesSelf + (event.dominoSelf ? 1 : 0),
      pointsScored: stats.pointsScored + event.points,
    };
  }
  const winStreak = event.won ? stats.winStreak + 1 : 0;
  const elo = applyEloGame(stats.elo, event.level, event.won ? 1 : 0);
  return {
    ...stats,
    matchesPlayed: stats.matchesPlayed + 1,
    matchesWon: stats.matchesWon + (event.won ? 1 : 0),
    zapateros: stats.zapateros + (event.zapatero ? 1 : 0),
    winStreak,
    bestWinStreak: Math.max(stats.bestWinStreak, winStreak),
    singleWins: stats.singleWins + (event.won && event.mode === 'single' ? 1 : 0),
    masterWins: stats.masterWins + (event.won && event.level === 'master' ? 1 : 0),
    elo,
    eloBest: Math.max(stats.eloBest, elo.rating),
  };
}

const num = (v: unknown, d = 0) => (Number.isFinite(v) && (v as number) >= 0 ? Math.floor(v as number) : d);

export function normalizeStats(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return INITIAL_STATS;
  const s = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(INITIAL_STATS) as (keyof Stats)[]) {
    if (key === 'elo' || key === 'todayDate') continue;
    out[key] = num(s[key], INITIAL_STATS[key] as number);
  }
  const e = (s.elo ?? {}) as Partial<EloState>;
  const elo: EloState = {
    rating: Number.isFinite(e.rating) ? Math.round(e.rating as number) : ELO_START,
    history: Array.isArray(e.history) ? e.history.filter((v): v is number => Number.isFinite(v)).slice(-200) : [],
  };
  return {
    ...(out as unknown as Stats),
    elo,
    eloBest: Math.max(num(s.eloBest, ELO_START), elo.rating),
    todayDate: typeof s.todayDate === 'string' ? s.todayDate : '',
  };
}
