import { describe, expect, it } from 'vitest';
import { normalizeCrashInfo, toCrashInfo, withComponentStack } from './crashInfo';

describe('informe de error', () => {
  const now = new Date('2026-11-15T10:00:00Z');

  it('lee un Error normal', () => {
    const info = toCrashInfo(new TypeError('x is undefined'), 'global', true, now);
    expect(info.message).toBe('TypeError: x is undefined');
    expect(info.stack).toContain('x is undefined');
    expect(info).toMatchObject({ fatal: true, source: 'global', at: '2026-11-15T10:00:00.000Z' });
  });

  it('acepta textos, objetos y valores vacíos sin romperse', () => {
    expect(toCrashInfo('boom', 'promise', false, now).message).toBe('boom');
    expect(toCrashInfo({ message: 'raro', stack: 'pila' }, 'promise', false, now)).toMatchObject({ message: 'raro', stack: 'pila' });
    expect(toCrashInfo({ code: 7 }, 'promise', false, now).message).toBe('{"code":7}');
    expect(toCrashInfo(undefined, 'global', true, now).message).toBe('Unknown error');
    expect(toCrashInfo(null, 'global', true, now).message).toBe('Unknown error');
  });

  it('no se rompe con un error cuyas propiedades lanzan', () => {
    const evil = new Error('ok');
    Object.defineProperty(evil, 'stack', {
      get() {
        throw new Error('nope');
      },
    });
    expect(toCrashInfo(evil, 'render', true, now).stack).toBe('');
  });

  it('recorta pilas enormes y añade la de componentes', () => {
    const err = new Error('big');
    err.stack = 'x'.repeat(10000);
    const info = toCrashInfo(err, 'render', true, now);
    expect(info.stack.length).toBe(4000);
    expect(withComponentStack(info, '\n  in HomeScreen').stack).toContain('in HomeScreen');
    expect(withComponentStack(info, null)).toBe(info);
  });

  it('valida lo leído del almacenamiento', () => {
    const info = toCrashInfo(new Error('guardado'), 'global', true, now);
    expect(normalizeCrashInfo(JSON.parse(JSON.stringify(info)))).toEqual(info);
    expect(normalizeCrashInfo(null)).toBeNull();
    expect(normalizeCrashInfo({ message: '' })).toBeNull();
    expect(normalizeCrashInfo({ message: 'm', source: 'otro' })?.source).toBe('global');
  });
});
