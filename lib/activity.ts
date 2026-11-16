// Apunta manos y partidas (monedas, torneo, retos, racha, ELO, estadísticas y logros), cobra retos, compra y equipa.
// La lógica está en game/activity.ts; aquí solo se cargan y guardan los almacenes. Nunca lanza.
import { applyActivity, claimChallenge, purchase, type ActivityReport, type ActivityState } from '@/game/activity';
import { challengesForToday, generateDailyChallenges } from '@/game/challenges';
import { localDateKey } from '@/game/dates';
import { addCoins, equip } from '@/game/economy';
import type { ActivityEvent } from '@/game/events';
import { achievementsStore, dailyStore, progressStore, statsStore, streakStore } from '@/lib/progress';

async function loadState(): Promise<ActivityState> {
  const [progress, daily, streak, stats, achievements] = await Promise.all([
    progressStore.load(),
    dailyStore.load(),
    streakStore.load(),
    statsStore.load(),
    achievementsStore.load(),
  ]);
  return { progress, daily: challengesForToday(daily, localDateKey()), streak, stats, achievements };
}

async function saveState(state: ActivityState): Promise<void> {
  await Promise.all([
    progressStore.save(state.progress),
    dailyStore.save(state.daily),
    streakStore.save(state.streak),
    statsStore.save(state.stats),
    achievementsStore.save(state.achievements),
  ]);
}

/** Apunta una mano o una partida una sola vez (quien llama guarda en la partida que ya se apuntó). */
export async function recordActivity(event: ActivityEvent): Promise<ActivityReport | null> {
  try {
    const { state, report } = applyActivity(await loadState(), event, localDateKey());
    await saveState(state);
    return report;
  } catch {
    return null;
  }
}

/** Retos de hoy (los genera si cambió el día) y los guarda. */
export async function loadTodayChallenges() {
  try {
    const daily = challengesForToday(await dailyStore.load(), localDateKey());
    if (daily !== dailyStore.current()) await dailyStore.save(daily);
    return daily;
  } catch {
    return null;
  }
}

export async function claimDailyChallenge(id: string): Promise<{ reward: number; newAchievements: string[] } | null> {
  try {
    const r = claimChallenge(await loadState(), id, localDateKey());
    if (!r) return null;
    await saveState(r.state);
    return { reward: r.reward, newAchievements: r.newAchievements };
  } catch {
    return null;
  }
}

export async function buyItem(id: string): Promise<{ newAchievements: string[] } | null> {
  try {
    const r = purchase(await loadState(), id);
    if (!r) return null;
    await saveState(r.state);
    return { newAchievements: r.newAchievements };
  } catch {
    return null;
  }
}

export async function equipItem(id: string): Promise<boolean> {
  try {
    const next = equip(await progressStore.load(), id);
    if (!next) return false;
    await progressStore.save(next);
    return true;
  } catch {
    return false;
  }
}

/** Marca que ya se enseñó la celebración del campeón. */
export async function markChampionCelebrated(): Promise<void> {
  try {
    const p = await progressStore.load();
    await progressStore.save({ ...p, championCelebrated: true });
  } catch {
    // Sin guardado se volverá a enseñar; no pasa nada.
  }
}

// --- Solo herramientas de desarrollo (DEV_MENU) ---

export async function devGiveCoins(amount: number): Promise<void> {
  try {
    await progressStore.save(addCoins(await progressStore.load(), amount));
  } catch {
    // Opcional.
  }
}

export async function devUnlockTournament(): Promise<void> {
  try {
    const p = await progressStore.load();
    await progressStore.save({ ...p, tournamentUnlockedAll: true });
  } catch {
    // Opcional.
  }
}

/** Retos del día como nuevos (sin progreso ni cobro). */
export async function devResetChallenges(): Promise<void> {
  try {
    const today = localDateKey();
    const stored = await dailyStore.load();
    await dailyStore.save(generateDailyChallenges(today, stored.claimedHistory.filter((id) => !id.startsWith(today))));
  } catch {
    // Opcional.
  }
}
