// Ganchos de React para los almacenes de la fase 3 (se refrescan solos cuando cambian).
import { EMPTY_DAILY } from '@/game/challenges';
import { INITIAL_PROGRESS } from '@/game/economy';
import { INITIAL_STATS } from '@/game/stats';
import { EMPTY_STREAK } from '@/game/streak';
import { useStoredValue } from '@/hooks/useStoredValue';
import { achievementsStore, dailyStore, progressStore, statsStore, streakStore } from '@/lib/progress';

export const useProgress = () => useStoredValue(progressStore, INITIAL_PROGRESS)[0];
export const useDaily = () => useStoredValue(dailyStore, EMPTY_DAILY)[0];
export const useStreak = () => useStoredValue(streakStore, EMPTY_STREAK)[0];
export const useStats = () => useStoredValue(statsStore, INITIAL_STATS)[0];
export const useAchievements = () => useStoredValue(achievementsStore, [] as string[])[0];
