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
  /** Para que haya capicúa, las dos puntas tienen que ser números distintos (si no, con puntas iguales también cuenta). */
  capicuaNeedsDifferentEnds: boolean;
  /** En la primera mano sale quien tiene el doble seis (en mano a mano, el doble más alto), y sale con él. */
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
/** Jugadores en parejas (en mano a mano son 2). */
export const PLAYERS = 4;

/** Velocidad de la IA (milisegundos que «piensa» cada jugador de la máquina). */
export type AiSpeed = 'slow' | 'normal' | 'fast';
export const AI_DELAY_MS: Record<AiSpeed, number> = { slow: 1500, normal: 900, fast: 380 };

/** Niveles de la máquina, de menos a más fuerte. */
export type AiLevel = 'beginner' | 'plaza' | 'veteran' | 'master';
export const AI_LEVELS: AiLevel[] = ['beginner', 'plaza', 'veteran', 'master'];

/** Opciones de las «Reglas de la casa» que se ofrecen en Ajustes. */
export const HOUSE_RULE_OPTIONS = {
  capicuaBonus: [0, 25, 50],
  targetScore: [75, 100, 150, 200],
} as const;

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

/** Pesos de la IA (Jugador de plaza usa los primeros; Veterano y Maestro, todos). */
export const AI_WEIGHTS = {
  /** Por cada punto de la ficha (soltar primero las gordas). */
  pips: 1,
  /** Soltar dobles pronto (cuestan de colocar). */
  double: 3,
  /** Por cada ficha propia que sigue pudiendo jugar por las puntas que quedan (control). */
  keepControl: 0.8,
  /** Por cada número distinto que me queda en la mano. */
  variety: 0.6,
  /** Veterano: dejar puntas que el siguiente rival seguro que no tiene (por sus pases o porque no quedan). */
  blockNextOpponent: 6,
  /** Lo mismo para el otro rival. */
  blockOtherOpponent: 3,
  /** Dejar puntas que el compañero seguro que no tiene. */
  blockPartner: -5,
  /** Maestro: probabilidad de que el siguiente rival pueda jugar (resta). */
  probNextOpponent: 8,
  probOtherOpponent: 4,
  /** Maestro: probabilidad de que el compañero pueda jugar (suma). */
  probPartner: 5,
  /** Multiplica lo anterior si a ese jugador le quedan 2 fichas o menos. */
  urgency: 2,
  /** Tapar una punta que puso el rival (su número). */
  coverOpponentNumber: 1.5,
  /** Tapar una punta que puso el compañero (su número: «no le tapes la punta»). */
  coverPartnerNumber: 3,
  /** Dejar abierta una punta con un número del compañero. */
  openPartnerNumber: 1.2,
  /** Dejar abierta una punta con un número del rival. */
  openOpponentNumber: 1,
  /** Valor de trancar (por cada punto que se gana o se pierde en el tranque). */
  tranque: 0.5,
  /** Ganar la mano ya. */
  domino: 1000,
} as const;

export const AI_TUNING = {
  /** Para trancar, mi pareja tiene que tener al menos esto menos que la rival (cuentas estimadas). */
  tranqueMargin: 3,
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

// --- Fase 3: monedas, tienda, torneo, retos, racha, ELO y logros ---------------------------------------------

/** Monedas que se ganan jugando contra la máquina (Dos en el teléfono no da monedas). */
export const ECONOMY = {
  /** Por cada mano que gana tu pareja (o tú, en mano a mano). */
  handWon: 5,
  /** Por partida ganada, según el nivel de la máquina. */
  matchWon: { beginner: 20, plaza: 30, veteran: 45, master: 60 } as Record<AiLevel, number>,
  /** Extra por cada capicúa de tu pareja. */
  capicua: 15,
  /** Extra por dar zapatero. */
  zapatero: 40,
} as const;

export type ShopCategory = 'tiles' | 'table' | 'phrases';
export type TileSkinId = 'ivory' | 'wood' | 'neon' | 'gold' | 'temple';
export type TableSkinId = 'felt' | 'patio' | 'beach';
export type PhrasePackId = 'basic' | 'barrio' | 'compadre';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  price: number;
}

/** Catálogo de la tienda (los nombres en `shop.item.<id>`). Lo gratis viene ya comprado. */
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'ivory', category: 'tiles', price: 0 },
  { id: 'wood', category: 'tiles', price: 300 },
  { id: 'neon', category: 'tiles', price: 600 },
  { id: 'gold', category: 'tiles', price: 1500 },
  { id: 'temple', category: 'tiles', price: 900 },
  { id: 'felt', category: 'table', price: 0 },
  { id: 'patio', category: 'table', price: 400 },
  { id: 'beach', category: 'table', price: 700 },
  { id: 'basic', category: 'phrases', price: 0 },
  { id: 'barrio', category: 'phrases', price: 250 },
  { id: 'compadre', category: 'phrases', price: 450 },
];

/** Frases de cada paquete por momento (claves `phrase.<paquete>.<momento><n>` en es.ts/en.ts). */
export const PHRASE_MOMENTS = ['play', 'domino', 'tranque', 'capicua', 'pass'] as const;
export type PhraseMoment = (typeof PHRASE_MOMENTS)[number];
export const PHRASES_PER_MOMENT: Record<PhraseMoment, number> = { play: 3, domino: 2, tranque: 2, capicua: 1, pass: 2 };
/** Probabilidad de que Carmen diga algo al poner una ficha (en el resto de momentos siempre habla). */
export const PHRASE_PLAY_CHANCE = 0.35;

/** Torneo del barrio: 12 parejas. Monedas por ganarle a cada una (la primera vez cuenta el premio entero). */
export const TOURNAMENT = {
  pairs: 12,
  /** Premio por vencer a la pareja i: base + paso · i. Repetir una ya vencida da la mitad. */
  rewardBase: 60,
  rewardStep: 20,
  /** Estrellas según el margen (puntos nuestros − suyos): ≥ dos estrellas, ≥ tres estrellas (o zapatero). */
  twoStarMargin: 30,
  threeStarMargin: 60,
  /** Premio extra por ganar el torneo completo. */
  championBonus: 500,
  targetScore: 100,
} as const;

export type ChallengeKind =
  | 'winMatches'
  | 'winHands'
  | 'capicua'
  | 'tranqueWin'
  | 'dominoSelf'
  | 'zapatero'
  | 'playMatches'
  | 'winVeteranPlus'
  | 'tournamentWin'
  | 'scorePoints'
  | 'winSingle';

/** Plantillas de los retos diarios: objetivo y monedas por dificultad. */
export const CHALLENGE_TEMPLATES: { kind: ChallengeKind; targets: number[]; rewards: number[] }[] = [
  { kind: 'winMatches', targets: [1, 2, 3], rewards: [40, 70, 100] },
  { kind: 'winHands', targets: [3, 5, 8], rewards: [30, 50, 80] },
  { kind: 'capicua', targets: [1], rewards: [80] },
  { kind: 'tranqueWin', targets: [1, 2], rewards: [50, 90] },
  { kind: 'dominoSelf', targets: [2, 4], rewards: [40, 70] },
  { kind: 'zapatero', targets: [1], rewards: [120] },
  { kind: 'playMatches', targets: [1, 2, 3], rewards: [25, 45, 65] },
  { kind: 'winVeteranPlus', targets: [1], rewards: [80] },
  { kind: 'tournamentWin', targets: [1], rewards: [60] },
  { kind: 'scorePoints', targets: [100, 200, 300], rewards: [40, 70, 100] },
  { kind: 'winSingle', targets: [1, 2], rewards: [40, 70] },
];
export const DAILY_CHALLENGE_COUNT = 3;
/** Días que se recuerdan los retos cobrados (para que cambiar la hora no dé premios dobles). */
export const CHALLENGE_HISTORY_DAYS = 7;

/** Premio de la racha según los días seguidos (a partir del último, se repite). */
export const STREAK_REWARDS = [20, 30, 40, 50, 60, 80, 100];

/** ELO contra la máquina (fórmula de Elo). */
export const ELO_START = 1000;
export const ELO_K = 32;
export const ELO_HISTORY = 60;
export const LEVEL_ELO: Record<AiLevel, number> = { beginner: 800, plaza: 1100, veteran: 1400, master: 1700 };
