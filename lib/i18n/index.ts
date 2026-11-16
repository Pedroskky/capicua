import { getLocales } from 'expo-localization';
import { resolveLanguage } from '@/game/language';
import type { LanguagePreference } from '@/lib/settings';
import { en } from './en';
import { es, type TranslationKey } from './es';

function detectDeviceLanguage(): string | undefined {
  try {
    return getLocales()[0]?.languageCode ?? undefined;
  } catch {
    return undefined;
  }
}

const deviceLanguage = detectDeviceLanguage();
let preference: LanguagePreference = 'auto';

export function setLanguagePreference(value: LanguagePreference): void {
  preference = value;
}

function activeDictionary() {
  return resolveLanguage(preference, deviceLanguage) === 'en' ? en : es;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const template = activeDictionary()[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

type Mode = 'partners' | 'single' | 'hotseat';

/** Nombre de cada asiento. Parejas: 0 = tú, 1 = Rafa, 2 = Carmen, 3 = Luis. Mano a mano: tú y Rafa. Dos en el teléfono: Jugador 1 y 2. */
export function playerName(seat: number, mode: Mode = 'partners'): string {
  if (mode === 'hotseat') return t(seat === 0 ? 'players.player1' : 'players.player2');
  const keys: TranslationKey[] = ['players.you', 'players.right', 'players.partner', 'players.left'];
  return t(keys[seat] ?? 'players.you');
}

/** Nombre de cada equipo («Nosotros/Ellos» en parejas; en mano a mano, el de cada jugador). */
export function teamName(team: number, mode: Mode = 'partners'): string {
  if (mode === 'partners') return t(team === 0 ? 'team.us' : 'team.them');
  if (mode === 'single') return team === 0 ? t('team.you') : playerName(1, mode);
  return playerName(team, mode);
}

export function levelName(level: 'beginner' | 'plaza' | 'veteran' | 'master', short = false): string {
  return t(`level.${level}${short ? 'Short' : ''}` as TranslationKey);
}

export type { TranslationKey };
