import { getLocales } from 'expo-localization';
import { createStoredValue } from '@/lib/storedValue';
import { normalizeAdConsent, startupConsent, type AdConsent, type StartupConsent } from '@/game/adConsent';

/** Elección de anuncios personalizados. */
export const adConsentStore = createStoredValue<AdConsent | null>('capicua.adConsent', null, normalizeAdConsent);

/** Región del móvil (ajustes de idioma y región), no la ubicación. */
export function deviceRegion(): string | null {
  for (const locale of getLocales()) {
    if (locale.regionCode) return locale.regionCode;
  }
  return null;
}

export async function loadStartupConsent(): Promise<StartupConsent> {
  const saved = await adConsentStore.load();
  return startupConsent(saved, deviceRegion());
}

export function saveAdConsent(personalized: boolean): Promise<void> {
  return adConsentStore.save({ personalized, decidedAt: Date.now() });
}
