import { describe, expect, it } from 'vitest';
import { resolveLanguage } from './language';

describe('idioma', () => {
  it('sale en el idioma del teléfono, y en español si no es español ni inglés', () => {
    expect(resolveLanguage('auto', 'es')).toBe('es');
    expect(resolveLanguage('auto', 'en')).toBe('en');
    expect(resolveLanguage('auto', 'fr')).toBe('es');
    expect(resolveLanguage('auto', 'pt')).toBe('es');
    expect(resolveLanguage('auto', undefined)).toBe('es');
  });
  it('se puede cambiar en Ajustes', () => {
    expect(resolveLanguage('en', 'es')).toBe('en');
    expect(resolveLanguage('es', 'en')).toBe('es');
  });
});
