import { getLocales } from 'expo-localization';
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
  const code = preference === 'auto' ? deviceLanguage : preference;
  return code === 'es' ? es : en;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const template = activeDictionary()[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Nombre de cada asiento (0 = tú, 1 = derecha, 2 = compañero, 3 = izquierda). */
export function playerName(seat: number): string {
  const keys: TranslationKey[] = ['players.you', 'players.right', 'players.partner', 'players.left'];
  return t(keys[seat] ?? 'players.you');
}

export type { TranslationKey };
