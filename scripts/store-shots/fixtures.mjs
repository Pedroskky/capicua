// Datos de ejemplo de cada captura (partidas de verdad, hechas con el motor del juego).
import { DEFAULT_RULES } from '../../game/config.ts';
import { aiView, chooseMove } from '../../game/ai.ts';
import { canDraw, createMatch, drawTile, legalMoves, passTurn, playMove } from '../../game/engine.ts';
import { findScenario } from '../../game/devScenarios.ts';
import { toSavedMatch } from '../../game/savedMatch.ts';
import { INITIAL_PROGRESS } from '../../game/economy.ts';
import { INITIAL_STATS } from '../../game/stats.ts';
import { localDateKey } from '../../game/dates.ts';

/** 1. La mesa a media mano: unas 10 fichas en la mesa, te toca y tienes varias jugables en el abanico. */
export function midHandMatch() {
  for (let seed = 1; seed < 500; seed++) {
    let m = createMatch(seed * 7919, DEFAULT_RULES, { mode: 'partners', aiLevel: 'plaza' });
    for (let guard = 0; guard < 80 && !m.hand.result; guard++) {
      const h = m.hand;
      if (h.turn === 0 && h.line.length >= 9 && h.line.length <= 11 && h.hands[0].length >= 4 && legalMoves(m, 0).length >= 2) {
        return { ...m, scores: [42, 31], history: [] };
      }
      const mv = chooseMove(aiView(m, h.turn));
      m = mv ? playMove(m, mv) : canDraw(m) ? drawTile(m) : passTurn(m);
    }
  }
  throw new Error('No se encontró una mesa a media mano');
}

/** 2 y 3. Una mano en la que tu última ficha hace capicúa (y la partida sigue: sin zapatero ni final). */
export function capicuaMatch() {
  for (let first = 1; first < 50; first++) {
    const m = findScenario('capicua', DEFAULT_RULES, 'plaza', first * 37);
    if (m && m.hand.hands[0].length === 1) return { ...m, scores: [48, 36] };
  }
  throw new Error('No se encontró una capicúa');
}

export function progress(extra = {}) {
  return {
    ...INITIAL_PROGRESS,
    coins: 2350,
    earned: 4100,
    owned: [...INITIAL_PROGRESS.owned, 'wood', 'neon', 'gold', 'patio', 'beach', 'barrio'],
    tournamentStars: [3, 3, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0],
    ...extra,
  };
}

export function stats() {
  const history = [1000, 1018, 1031, 1022, 1040, 1057, 1069, 1061, 1080, 1098, 1112, 1104, 1125, 1141, 1160, 1152, 1173, 1190, 1211, 1203, 1228, 1246, 1262, 1281, 1302];
  return {
    ...INITIAL_STATS,
    matchesPlayed: 41,
    matchesWon: 27,
    handsPlayed: 238,
    handsWon: 141,
    capicuas: 6,
    zapateros: 3,
    tranques: 22,
    tranquesWon: 13,
    dominoesSelf: 38,
    pointsScored: 3120,
    winStreak: 4,
    bestWinStreak: 7,
    elo: { rating: 1302, history },
    eloBest: 1302,
  };
}

export const ACHIEVEMENTS = ['firstWin', 'wins10', 'hands25', 'hands100', 'firstCapicua', 'firstZapatero', 'firstTranque', 'tranque10', 'singleWin', 'winStreak3', 'tourFirst', 'streak3', 'streak7', 'coins1000', 'firstPurchase', 'elo1300'];

/** Lo que se guarda en localStorage para todas las escenas (más lo propio de cada una). */
export function baseData(lang, extra = {}) {
  return {
    'capicua.settings': { sound: false, music: false, vibration: false, aiSpeed: 'slow', language: lang, aiLevel: 'plaza', tutorialSeen: true },
    'capicua.progress': progress(),
    'capicua.stats': stats(),
    'capicua.achievements': ACHIEVEMENTS,
    'capicua.streak': { days: 5, best: 9, lastDate: localDateKey() },
    ...extra,
  };
}

export const saved = (match) => toSavedMatch(match);
