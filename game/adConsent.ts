/**
 * Regiones donde hay que pedir permiso antes de mostrar anuncios personalizados:
 * Espacio Económico Europeo (UE + Islandia, Liechtenstein y Noruega), Reino Unido y Suiza.
 */
export const CONSENT_REGIONS: readonly string[] = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
  'GB', 'CH',
];

/** ¿Hay que preguntar por los anuncios personalizados en esta región (código ISO de 2 letras)? */
export function needsAdConsent(regionCode: string | null | undefined): boolean {
  if (!regionCode) return false;
  return CONSENT_REGIONS.includes(regionCode.toUpperCase());
}

export interface AdConsent {
  /** true = acepta anuncios personalizados; false = solo no personalizados. */
  personalized: boolean;
  /** Momento de la elección (ms). */
  decidedAt: number;
}

export function normalizeAdConsent(raw: unknown): AdConsent | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<AdConsent>;
  if (typeof data.personalized !== 'boolean') return null;
  return { personalized: data.personalized, decidedAt: typeof data.decidedAt === 'number' ? data.decidedAt : 0 };
}

export type StartupConsent = { kind: 'ready'; personalized: boolean } | { kind: 'ask' };

/**
 * Qué hacer al arrancar: si ya eligió, se usa su elección; si no eligió y está en una región con
 * consentimiento, hay que preguntar antes de iniciar los anuncios; si no, anuncios normales.
 */
export function startupConsent(saved: AdConsent | null, regionCode: string | null | undefined): StartupConsent {
  if (saved) return { kind: 'ready', personalized: saved.personalized };
  if (needsAdConsent(regionCode)) return { kind: 'ask' };
  return { kind: 'ready', personalized: true };
}
