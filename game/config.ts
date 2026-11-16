// TODOS los números ajustables del juego: reglas, tiempos, colores y volúmenes.
// Las reglas van en un objeto (`DEFAULT_RULES`) para poder ofrecer «Reglas de la casa» en la fase 2.

/** Reglas de una partida de dominó por parejas (estilo venezolano). */
export interface DominoRules {
  /** Fichas de cada jugador al repartir. */
  handSize: number;
  /** Puntos para ganar la partida. */
  targetScore: number;
  /** Bono por ganar con capicúa (la última ficha cabe por las dos puntas). 0 = sin capicúa. */
  capicuaBonus: number;
  /** Para que haya capicúa, las dos puntas tienen que ser números distintos. */
  capicuaNeedsDifferentEnds: boolean;
  /** En la primera mano sale quien tiene el doble seis, y sale con él. */
  firstHandOpensWithDoubleSix: boolean;
  /** Quién sale en las manos siguientes: el que sigue al que salió antes, o el que ganó la mano. */
  nextStarter: 'nextPlayer' | 'handWinner';
  /** Fin por dominó: se suman las fichas de las cuatro manos (`all`) o solo las de la pareja rival (`opponents`). */
  dominoCounts: 'all' | 'opponents';
  /** Tranque: se compara la suma de cada pareja (`team`) o el jugador con menos puntos (`player`). */
  tranqueCompare: 'team' | 'player';
  /** Tranque: puntos que se lleva el ganador (`all` = todas las manos, `opponents` = solo la pareja rival). */
  tranqueCounts: 'all' | 'opponents';
  /** Tranque empatado: nadie anota (`none`) o gana la pareja de quien trancó (`blocker`). */
  tranqueTie: 'none' | 'blocker';
  /** Avisar de «zapatero» si la pareja perdedora termina la partida sin anotar. */
  zapatero: boolean;
}

export const DEFAULT_RULES: DominoRules = {
  handSize: 7,
  targetScore: 100,
  capicuaBonus: 25,
  capicuaNeedsDifferentEnds: true,
  firstHandOpensWithDoubleSix: true,
  nextStarter: 'nextPlayer',
  dominoCounts: 'all',
  tranqueCompare: 'team',
  tranqueCounts: 'all',
  tranqueTie: 'none',
  zapatero: true,
};

/** Número mayor de las fichas (doble seis). */
export const MAX_PIP = 6;
export const PLAYERS = 4;

/** Velocidad de la IA (milisegundos que «piensa» cada jugador de la máquina). */
export type AiSpeed = 'slow' | 'normal' | 'fast';
export const AI_DELAY_MS: Record<AiSpeed, number> = { slow: 1500, normal: 900, fast: 380 };

export const TIMING = {
  /** Lo que tarda una ficha en deslizarse hasta la mesa. */
  slideMs: 280,
  /** Pausa antes de pasar solo cuando no puedes jugar. */
  humanAutoPassMs: 900,
  /** Lo que se ve el aviso de «¡Paso!». */
  passBubbleMs: 1100,
  /** Lo que se ve un aviso grande («¡Capicúa!», «¡Tranca!»…) antes del resumen de la mano. */
  bannerMs: 1500,
  /** Pausa tras la última ficha antes del resumen de la mano. */
  handEndPauseMs: 700,
} as const;

/** Pesos de la IA básica. */
export const AI_WEIGHTS = {
  /** Por cada punto de la ficha (soltar primero las gordas). */
  pips: 1,
  /** Soltar dobles pronto (cuestan de colocar). */
  double: 3,
  /** Dejar una punta que el siguiente rival sabe que no tiene (por sus pases). */
  blockNextOpponent: 6,
  /** Lo mismo para el otro rival. */
  blockOtherOpponent: 3,
  /** Dejar una punta que el compañero no tiene. */
  blockPartner: -3,
  /** Por cada ficha propia que sigue pudiendo jugar por las puntas que quedan (control). */
  keepControl: 0.8,
  /** Ganar la mano ya. */
  domino: 1000,
} as const;

export const COLORS = {
  background: '#0B2418',
  felt: '#17603C',
  feltLight: '#1F7A4C',
  feltDark: '#0E4128',
  feltEdge: '#5A3A1E',
  feltEdgeLight: '#7B5230',
  surface: '#123524',
  surfaceBorder: '#1F4A35',
  text: '#F4EFE1',
  textMuted: '#A9BFAF',
  accent: '#E9C46A',
  accentText: '#2A1D05',
  danger: '#E76F51',
  ivory: '#F3EAD3',
  ivoryLight: '#FFFBF0',
  ivoryShade: '#D9CCAA',
  pip: '#141414',
  tileLine: '#8C7D5C',
  tileBack: '#7A2E2E',
  tileBackLight: '#A6463F',
  playable: '#FFD166',
  us: '#7FD1AE',
  them: '#F4A261',
} as const;

export const SOUND_VOLUME = {
  clac: 0.9,
  shuffle: 0.8,
  pass: 0.7,
  domino: 0.9,
  music: 0.32,
} as const;
