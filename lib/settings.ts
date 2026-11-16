import type { AiSpeed } from '@/game/config';
import { createStoredValue } from '@/lib/storedValue';

export type LanguagePreference = 'auto' | 'es' | 'en';

export interface GameSettings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  /** Lo que tarda en jugar cada jugador de la máquina. */
  aiSpeed: AiSpeed;
  language: LanguagePreference;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
  music: true,
  vibration: true,
  aiSpeed: 'normal',
  language: 'auto',
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
  };
}

export const settingsStore = createStoredValue<GameSettings>('capicua.settings', DEFAULT_SETTINGS, normalizeSettings);
