// Retos diarios (como en Jaque Épico). TypeScript puro: nada de React.
import { CHALLENGE_HISTORY_DAYS, CHALLENGE_TEMPLATES, DAILY_CHALLENGE_COUNT, type ChallengeKind } from '@/game/config';
import { daysBetween } from '@/game/dates';
import type { ActivityEvent } from '@/game/events';
import { mulberry32 } from '@/game/random';

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  target: number;
  reward: number;
  progress: number;
  claimed: boolean;
}

export interface DailyChallenges {
  /** Fecha local AAAAMMDD a la que pertenecen los retos. */
  date: string;
  challenges: Challenge[];
  /** Ids de retos ya cobrados en los últimos días (sobrevive a los cambios de día y de hora). */
  claimedHistory: string[];
}

export const EMPTY_DAILY: DailyChallenges = { date: '', challenges: [], claimedHistory: [] };

/** Los mismos 3 retos para todo el día: se eligen con la fecha como semilla. */
export function generateDailyChallenges(date: string, claimedHistory: readonly string[] = []): DailyChallenges {
  const rng = mulberry32(Number(date) || 0);
  const pool = CHALLENGE_TEMPLATES.slice();
  const challenges: Challenge[] = [];
  while (challenges.length < DAILY_CHALLENGE_COUNT && pool.length > 0) {
    const [template] = pool.splice(Math.floor(rng() * pool.length), 1);
    const tier = Math.floor(rng() * template.targets.length);
    const id = `${date}-${template.kind}`;
    const claimed = claimedHistory.includes(id);
    challenges.push({
      id,
      kind: template.kind,
      target: template.targets[tier],
      reward: template.rewards[tier],
      progress: claimed ? template.targets[tier] : 0,
      claimed,
    });
  }
  return { date, challenges, claimedHistory: [...claimedHistory] };
}

/** Retos para `today` a partir de los guardados (si la hora va hacia atrás, se siguen usando los guardados). */
export function challengesForToday(stored: DailyChallenges, today: string): DailyChallenges {
  if (stored.date === today && stored.challenges.length > 0) return stored;
  if (stored.date && daysBetween(stored.date, today) < 0) return stored;
  const history = stored.claimedHistory.filter((id) => {
    const age = daysBetween(id.slice(0, 8), today);
    return Number.isFinite(age) && age < CHALLENGE_HISTORY_DAYS;
  });
  return generateDailyChallenges(today, history);
}

export function isComplete(challenge: Challenge): boolean {
  return challenge.progress >= challenge.target;
}

/** Cuánto suma un evento a un reto. */
export function eventContribution(kind: ChallengeKind, event: ActivityEvent): number {
  if (event.type === 'hotseat') return 0;
  if (event.type === 'hand') {
    switch (kind) {
      case 'winHands':
        return event.won ? 1 : 0;
      case 'capicua':
        return event.capicua ? 1 : 0;
      case 'tranqueWin':
        return event.won && event.kind === 'tranque' ? 1 : 0;
      case 'dominoSelf':
        return event.dominoSelf ? 1 : 0;
      case 'scorePoints':
        return event.points;
      default:
        return 0;
    }
  }
  switch (kind) {
    case 'winMatches':
      return event.won ? 1 : 0;
    case 'playMatches':
      return 1;
    case 'zapatero':
      return event.zapatero ? 1 : 0;
    case 'winVeteranPlus':
      return event.won && (event.level === 'veteran' || event.level === 'master') ? 1 : 0;
    case 'tournamentWin':
      return event.won && event.tournament !== null ? 1 : 0;
    case 'winSingle':
      return event.won && event.mode === 'single' ? 1 : 0;
    default:
      return 0;
  }
}

/** Suma un evento a los retos. Devuelve los retos nuevos y los que se acaban de completar. */
export function applyEvent(daily: DailyChallenges, event: ActivityEvent): { daily: DailyChallenges; completed: Challenge[] } {
  const completed: Challenge[] = [];
  const challenges = daily.challenges.map((challenge) => {
    if (isComplete(challenge)) return challenge;
    const value = eventContribution(challenge.kind, event);
    if (value <= 0) return challenge;
    const next = { ...challenge, progress: Math.min(challenge.target, challenge.progress + value) };
    if (isComplete(next)) completed.push(next);
    return next;
  });
  return { daily: { ...daily, challenges }, completed };
}

/** Marca un reto como cobrado. null si no existe, no está completo o ya se cobró. */
export function claim(daily: DailyChallenges, id: string): { daily: DailyChallenges; reward: number } | null {
  const challenge = daily.challenges.find((entry) => entry.id === id);
  if (!challenge || challenge.claimed || !isComplete(challenge) || daily.claimedHistory.includes(id)) return null;
  return {
    reward: challenge.reward,
    daily: {
      ...daily,
      challenges: daily.challenges.map((entry) => (entry.id === id ? { ...entry, claimed: true } : entry)),
      claimedHistory: [...daily.claimedHistory, id],
    },
  };
}

export function claimableCount(daily: DailyChallenges): number {
  return daily.challenges.filter((challenge) => isComplete(challenge) && !challenge.claimed).length;
}

/** Valida los retos guardados. */
export function normalizeDaily(raw: unknown): DailyChallenges {
  if (!raw || typeof raw !== 'object') return EMPTY_DAILY;
  const d = raw as Partial<DailyChallenges>;
  const kinds = new Set(CHALLENGE_TEMPLATES.map((c) => c.kind));
  const challenges = Array.isArray(d.challenges)
    ? d.challenges.filter(
        (c): c is Challenge =>
          !!c && typeof c.id === 'string' && kinds.has(c.kind) && Number.isFinite(c.target) && Number.isFinite(c.reward) && Number.isFinite(c.progress),
      )
    : [];
  return {
    date: typeof d.date === 'string' ? d.date : '',
    challenges: challenges.map((c) => ({ ...c, claimed: c.claimed === true })),
    claimedHistory: Array.isArray(d.claimedHistory) ? d.claimedHistory.filter((id): id is string => typeof id === 'string') : [],
  };
}
