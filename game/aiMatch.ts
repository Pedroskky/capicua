// Partidas simuladas entre niveles de IA (para los tests de fuerza y para ajustar los pesos).
import type { AiLevel, DominoRules } from '@/game/config';
import { aiView, chooseMove } from '@/game/ai';
import { canDraw, createMatch, drawTile, passTurn, playMove, startNextHand, teamOf, type GameMode, type Team } from '@/game/engine';

/** Juega una partida entera; `levels[equipo]` es el nivel de cada pareja. Devuelve el equipo ganador. */
export function simulateMatch(seed: number, levels: [AiLevel, AiLevel], mode: GameMode = 'partners', rules?: DominoRules): Team {
  let m = createMatch(seed, rules, { mode });
  const players = mode === 'partners' ? 4 : 2;
  let guard = 0;
  while (m.winnerTeam === null) {
    while (!m.hand.result) {
      const p = m.hand.turn;
      const move = chooseMove(aiView(m, p, levels[teamOf(p, players)]));
      m = move ? playMove(m, move) : canDraw(m) ? drawTile(m) : passTurn(m);
      if (++guard > 100000) throw new Error('partida infinita');
    }
    if (m.winnerTeam === null) m = startNextHand(m);
  }
  return m.winnerTeam;
}

/**
 * Enfrenta dos niveles en `matches` partidas «a duplicado»: cada reparto se juega dos veces cambiando de lado,
 * para que la suerte del reparto se compense. Devuelve cuántas gana `strong`.
 */
export function duel(strong: AiLevel, weak: AiLevel, matches: number, mode: GameMode = 'partners', firstSeed = 1): number {
  let wins = 0;
  for (let i = 0; i < matches / 2; i++) {
    const seed = (firstSeed + i) * 2654435761;
    if (simulateMatch(seed, [strong, weak], mode) === 0) wins++;
    if (simulateMatch(seed, [weak, strong], mode) === 1) wins++;
  }
  return wins;
}
