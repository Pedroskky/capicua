// Solo para el menú de desarrollo (preview): prepara una mano en la que tu próxima jugada (asiento 0) provoca un
// tranque o una capicúa. Se buscan jugando manos de verdad con la IA, así que la situación siempre es posible.
import { DEFAULT_RULES, type AiLevel, type DominoRules } from '@/game/config';
import { aiView, chooseMove } from '@/game/ai';
import { createMatch, legalMoves, passTurn, playMove, startNextHand, type MatchState, type Move } from '@/game/engine';

export type DevScenario = 'tranque' | 'capicua';

/** La jugada del asiento 0 que provoca la situación, o null. */
export function scenarioMove(match: MatchState, kind: DevScenario): Move | null {
  if (match.hand.result || match.hand.turn !== 0) return null;
  for (const move of legalMoves(match, 0)) {
    const r = playMove(match, move).hand.result;
    if (kind === 'tranque' && r?.kind === 'tranque') return move;
    if (kind === 'capicua' && r?.capicua) return move;
  }
  return null;
}

/** Busca una mano (parejas) donde te toca y puedes provocar `kind`. Devuelve la partida lista para jugar. */
export function findScenario(kind: DevScenario, rules: DominoRules = DEFAULT_RULES, aiLevel: AiLevel = 'veteran', firstSeed = 1): MatchState | null {
  const searchRules = { ...rules, capicuaBonus: Math.max(rules.capicuaBonus, 1), targetScore: 100000 };
  for (let seed = firstSeed; seed < firstSeed + 400; seed++) {
    let m = createMatch(seed * 15485863, searchRules, { mode: 'partners', aiLevel });
    for (let h = 0; h < 6; h++) {
      while (!m.hand.result) {
        if (scenarioMove(m, kind)) {
          return { ...m, rules, scores: [0, 0], history: [], winnerTeam: null, zapatero: false, hand: { ...m.hand, number: 1 } };
        }
        const move = chooseMove(aiView(m, m.hand.turn, 'plaza'));
        m = move ? playMove(m, move) : passTurn(m);
      }
      m = startNextHand(m);
    }
  }
  return null;
}
