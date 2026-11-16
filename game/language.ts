// Idioma del juego (puro, con tests).
export type LanguageChoice = 'auto' | 'es' | 'en';

/** El elegido en Ajustes o, en automático, el del teléfono; si el teléfono no está en español ni en inglés, español. */
export function resolveLanguage(pref: LanguageChoice, device: string | null | undefined): 'es' | 'en' {
  if (pref !== 'auto') return pref;
  return device?.toLowerCase() === 'en' ? 'en' : 'es';
}
