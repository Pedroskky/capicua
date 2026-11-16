import { AI_LEVELS, DEFAULT_RULES, type AiLevel, type AiSpeed, type DominoRules } from '@/game/config';
import { normalizeRules } from '@/game/rules';
import { createStoredValue } from '@/lib/storedValue';

export type LanguagePreference = 'auto' | 'es' | 'en';

export interface GameSettings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  /** Lo que tarda en jugar cada jugador de la máquina. */
  aiSpeed: AiSpeed;
  language: LanguagePreference;
  /** Nivel de los jugadores de la máquina en las partidas nuevas. */
  aiLevel: AiLevel;
  /** Reglas de la casa (se aplican al empezar una partida nueva). */
  rules: DominoRules;
  /** Ayuda: contador de fichas jugadas por número. */
  tileCounter: boolean;
  /** Solo con DEV_MENU: escribir el número sobre cada mitad de la mesa y enseñar las puntas. */
  devTableNumbers: boolean;
  /** Solo con DEV_MENU: ver las manos de todos. */
  devShowHands: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
  music: true,
  vibration: true,
  aiSpeed: 'normal',
  language: 'auto',
  aiLevel: 'plaza',
  rules: DEFAULT_RULES,
  tileCounter: false,
  devTableNumbers: false,
  devShowHands: false,
};

const LANGUAGES: LanguagePreference[] = ['auto', 'es', 'en'];
const SPEEDS: AiSpeed[] = ['slow', 'normal', 'fast'];

export function normalizeSettings(raw: unknown): GameSettings {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<GameSettings>;
  return {
    sound: typeof data.sound === 'boolean' ? data.sound : DEFAULT_SETTINGS.sound,
    music: typeof data.music === 'boolean' ? data.music : DEFAULT_SETTINGS.music,
    vibration: typeof data.vibration === 'boolean' ? data.vibration : DEFAULT_SETTINGS.vibration,
    aiSpeed: data.aiSpeed && SPEEDS.includes(data.aiSpeed) ? data.aiSpeed : DEFAULT_SETTINGS.aiSpeed,
    language: data.language && LANGUAGES.includes(data.language) ? data.language : DEFAULT_SETTINGS.language,
    aiLevel: data.aiLevel && AI_LEVELS.includes(data.aiLevel) ? data.aiLevel : DEFAULT_SETTINGS.aiLevel,
    rules: normalizeRules(data.rules),
    tileCounter: data.tileCounter === true,
    devTableNumbers: data.devTableNumbers === true,
    devShowHands: data.devShowHands === true,
  };
}

export const settingsStore = createStoredValue<GameSettings>('capicua.settings', DEFAULT_SETTINGS, normalizeSettings);
