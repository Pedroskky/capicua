// Logros (más de 20). Cada uno se comprueba con las estadísticas, el progreso y la racha. TypeScript puro.
import type { Progress } from '@/game/economy';
import type { StreakState } from '@/game/streak';
import type { Stats } from '@/game/stats';
import { isChampion } from '@/game/tournament';

export interface AchievementContext {
  stats: Stats;
  progress: Progress;
  streak: StreakState;
}

/** Icono de lucide-react-native por logro (el nombre y la descripción van en `ach.<id>` y `ach.<id>.desc`). */
export type AchievementIcon =
  | 'trophy'
  | 'medal'
  | 'crown'
  | 'star'
  | 'flame'
  | 'zap'
  | 'lock'
  | 'coins'
  | 'shopping'
  | 'target'
  | 'users'
  | 'user'
  | 'smartphone'
  | 'trending'
  | 'calendar'
  | 'sparkles';

export interface Achievement {
  id: string;
  icon: AchievementIcon;
  check: (ctx: AchievementContext) => boolean;
}

const stars = (p: Progress) => p.tournamentStars.reduce((a, b) => a + b, 0);
const beaten = (p: Progress) => p.tournamentStars.filter((s) => s > 0).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'firstWin', icon: 'trophy', check: ({ stats }) => stats.matchesWon >= 1 },
  { id: 'wins10', icon: 'medal', check: ({ stats }) => stats.matchesWon >= 10 },
  { id: 'wins50', icon: 'crown', check: ({ stats }) => stats.matchesWon >= 50 },
  { id: 'hands25', icon: 'target', check: ({ stats }) => stats.handsWon >= 25 },
  { id: 'hands100', icon: 'target', check: ({ stats }) => stats.handsWon >= 100 },
  { id: 'firstCapicua', icon: 'sparkles', check: ({ stats }) => stats.capicuas >= 1 },
  { id: 'capicua10', icon: 'sparkles', check: ({ stats }) => stats.capicuas >= 10 },
  { id: 'firstZapatero', icon: 'zap', check: ({ stats }) => stats.zapateros >= 1 },
  { id: 'zapatero5', icon: 'zap', check: ({ stats }) => stats.zapateros >= 5 },
  { id: 'firstTranque', icon: 'lock', check: ({ stats }) => stats.tranquesWon >= 1 },
  { id: 'tranque10', icon: 'lock', check: ({ stats }) => stats.tranquesWon >= 10 },
  { id: 'domino25', icon: 'user', check: ({ stats }) => stats.dominoesSelf >= 25 },
  { id: 'beatMaster', icon: 'crown', check: ({ stats }) => stats.masterWins >= 1 },
  { id: 'singleWin', icon: 'user', check: ({ stats }) => stats.singleWins >= 1 },
  { id: 'hotseat', icon: 'smartphone', check: ({ stats }) => stats.hotseatMatches >= 1 },
  { id: 'winStreak3', icon: 'flame', check: ({ stats }) => stats.bestWinStreak >= 3 },
  { id: 'tourFirst', icon: 'users', check: ({ progress }) => beaten(progress) >= 1 },
  { id: 'tourHalf', icon: 'users', check: ({ progress }) => beaten(progress) >= 6 },
  { id: 'champion', icon: 'trophy', check: ({ progress }) => isChampion(progress) },
  { id: 'allStars', icon: 'star', check: ({ progress }) => stars(progress) >= 36 },
  { id: 'streak3', icon: 'calendar', check: ({ streak }) => streak.best >= 3 },
  { id: 'streak7', icon: 'calendar', check: ({ streak }) => streak.best >= 7 },
  { id: 'elo1300', icon: 'trending', check: ({ stats }) => stats.eloBest >= 1300 },
  { id: 'elo1600', icon: 'trending', check: ({ stats }) => stats.eloBest >= 1600 },
  { id: 'coins1000', icon: 'coins', check: ({ progress }) => progress.earned >= 1000 },
  { id: 'firstPurchase', icon: 'shopping', check: ({ stats }) => stats.purchases >= 1 },
  { id: 'challenges10', icon: 'target', check: ({ stats }) => stats.challengesClaimed >= 10 },
];

/** Logros que se cumplen ahora y aún no estaban desbloqueados. */
export function newlyUnlocked(ctx: AchievementContext, unlocked: readonly string[]): string[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.check(ctx)).map((a) => a.id);
}

export function normalizeAchievements(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && ids.has(id)))];
}
