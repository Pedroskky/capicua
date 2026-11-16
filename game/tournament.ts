// Torneo del barrio: 12 parejas cada vez más fuertes (las primeras como Principiante, las últimas como Maestro).
// Ganarle a una da monedas y abre la siguiente; las estrellas dependen del margen. TypeScript puro.
import { TOURNAMENT, type AiLevel } from '@/game/config';
import type { Progress } from '@/game/economy';

/** Cómo se dibuja a cada persona (Skia, `components/art/avatar.ts`). */
export interface AvatarSpec {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'bald' | 'curly' | 'bun';
  hat: 'none' | 'cap' | 'straw' | 'beret' | 'bandana';
  hatColor: string;
  glasses: boolean;
  mustache: boolean;
  shirt: string;
}

export interface Rival {
  /** Nombre en `rival.<id>`, estilo en `rival.<id>.style` y los dos jugadores en `rival.<id>.a` / `.b`. */
  id: string;
  level: AiLevel;
  members: [AvatarSpec, AvatarSpec];
  /** Color de la pareja (fondo del medallón). */
  color: string;
}

const SKIN = ['#F1C9A5', '#D9A47A', '#B5794E', '#8D5634', '#6B3F25'];
const p = (s: Partial<AvatarSpec> & Pick<AvatarSpec, 'skin' | 'shirt'>): AvatarSpec => ({
  hair: '#2B1B12',
  hairStyle: 'short',
  hat: 'none',
  hatColor: '#C0392B',
  glasses: false,
  mustache: false,
  ...s,
});

export const RIVALS: Rival[] = [
  { id: 'bodega', level: 'beginner', color: '#8E5B3A', members: [p({ skin: SKIN[1], shirt: '#E67E22', mustache: true, hat: 'cap', hatColor: '#2C3E50' }), p({ skin: SKIN[2], shirt: '#16A085', hairStyle: 'curly' })] },
  { id: 'tias', level: 'beginner', color: '#B03A6B', members: [p({ skin: SKIN[0], shirt: '#9B59B6', hairStyle: 'bun', hair: '#5D4037', glasses: true }), p({ skin: SKIN[2], shirt: '#E91E63', hairStyle: 'long', hair: '#1B1B1B' })] },
  { id: 'primos', level: 'beginner', color: '#2E7D9A', members: [p({ skin: SKIN[3], shirt: '#F1C40F', hat: 'cap', hatColor: '#C0392B' }), p({ skin: SKIN[2], shirt: '#3498DB', hairStyle: 'curly' })] },
  { id: 'kiosco', level: 'plaza', color: '#C0832A', members: [p({ skin: SKIN[1], shirt: '#ECF0F1', mustache: true, hairStyle: 'bald' }), p({ skin: SKIN[0], shirt: '#27AE60', hairStyle: 'long', hair: '#8D6E63' })] },
  { id: 'panaderos', level: 'plaza', color: '#D4A24C', members: [p({ skin: SKIN[2], shirt: '#FFFFFF', hat: 'beret', hatColor: '#FFFFFF', mustache: true }), p({ skin: SKIN[1], shirt: '#F5CBA7', hairStyle: 'bun', hair: '#3E2723' })] },
  { id: 'taxistas', level: 'plaza', color: '#F1C40F', members: [p({ skin: SKIN[3], shirt: '#F39C12', glasses: true, hat: 'cap', hatColor: '#F1C40F' }), p({ skin: SKIN[1], shirt: '#34495E', mustache: true })] },
  { id: 'abuelos', level: 'veteran', color: '#6D8B74', members: [p({ skin: SKIN[0], shirt: '#BDC3C7', hairStyle: 'bald', hair: '#ECEFF1', glasses: true, mustache: true }), p({ skin: SKIN[1], shirt: '#7F8C8D', hat: 'straw', hatColor: '#E3C16F', hair: '#ECEFF1' })] },
  { id: 'maestras', level: 'veteran', color: '#5B6BBF', members: [p({ skin: SKIN[2], shirt: '#2980B9', hairStyle: 'long', glasses: true }), p({ skin: SKIN[0], shirt: '#C0392B', hairStyle: 'bun', hair: '#6D4C41' })] },
  { id: 'pescadores', level: 'veteran', color: '#1F7A8C', members: [p({ skin: SKIN[3], shirt: '#1ABC9C', hat: 'straw', hatColor: '#D9B65D' }), p({ skin: SKIN[4], shirt: '#2C3E50', hat: 'bandana', hatColor: '#E74C3C', mustache: true })] },
  { id: 'peloteros', level: 'master', color: '#B03A2E', members: [p({ skin: SKIN[2], shirt: '#C0392B', hat: 'cap', hatColor: '#1A237E' }), p({ skin: SKIN[4], shirt: '#1A237E', hat: 'cap', hatColor: '#C0392B', hairStyle: 'curly' })] },
  { id: 'gaiteros', level: 'master', color: '#7D3C98', members: [p({ skin: SKIN[1], shirt: '#F4D03F', hat: 'straw', hatColor: '#F5DEB3', mustache: true }), p({ skin: SKIN[2], shirt: '#AF7AC5', hairStyle: 'long', hair: '#2B1B12' })] },
  { id: 'campeones', level: 'master', color: '#B7950B', members: [p({ skin: SKIN[3], shirt: '#212121', glasses: true, hat: 'beret', hatColor: '#212121', mustache: true }), p({ skin: SKIN[0], shirt: '#B7950B', hairStyle: 'short', hair: '#9E9E9E', glasses: true })] },
];

export function rival(index: number): Rival {
  return RIVALS[Math.max(0, Math.min(RIVALS.length - 1, index))];
}

export function isUnlocked(progress: Progress, index: number): boolean {
  if (index < 0 || index >= RIVALS.length) return false;
  return progress.tournamentUnlockedAll || index === 0 || progress.tournamentStars[index - 1] > 0;
}

/** Estrellas según el margen de victoria (0 si se pierde). Zapatero = tres. */
export function starsFor(won: boolean, margin: number, zapatero: boolean): number {
  if (!won) return 0;
  if (zapatero || margin >= TOURNAMENT.threeStarMargin) return 3;
  if (margin >= TOURNAMENT.twoStarMargin) return 2;
  return 1;
}

export function pairReward(index: number): number {
  return TOURNAMENT.rewardBase + TOURNAMENT.rewardStep * index;
}

export function isChampion(progress: Progress): boolean {
  return progress.tournamentStars.every((s) => s > 0);
}

export interface TournamentResult {
  progress: Progress;
  stars: number;
  /** Monedas de esta victoria (premio entero la primera vez, la mitad al repetir; más el del campeón). */
  coins: number;
  /** Se acaba de ganar el torneo completo. */
  champion: boolean;
  /** Se abrió la pareja siguiente. */
  unlockedNext: boolean;
}

export function applyTournamentResult(progress: Progress, index: number, won: boolean, margin: number, zapatero: boolean): TournamentResult {
  const stars = starsFor(won, margin, zapatero);
  if (!won) return { progress, stars: 0, coins: 0, champion: false, unlockedNext: false };
  const firstWin = progress.tournamentStars[index] === 0;
  const wasChampion = isChampion(progress);
  const tournamentStars = progress.tournamentStars.map((s, i) => (i === index ? Math.max(s, stars) : s));
  const next: Progress = { ...progress, tournamentStars };
  const champion = !wasChampion && isChampion(next);
  const coins = (firstWin ? pairReward(index) : Math.floor(pairReward(index) / 2)) + (champion ? TOURNAMENT.championBonus : 0);
  return { progress: next, stars, coins, champion, unlockedNext: firstWin && index + 1 < RIVALS.length };
}
