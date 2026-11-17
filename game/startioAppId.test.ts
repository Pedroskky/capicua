import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STARTIO_APP_ID } from './config';
import { appIdProblems, isValidStartioAppId, type AdDiagnostics } from './adDiagnostics';

/** App ID de Start.io de Capicúa (panel de Start.io). Si no coincide, los anuncios no cuentan. */
const CAPICUA_APP_ID = '210753000';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const plugin = require('../modules/startio-ads/app.plugin.js');
const appJson = JSON.parse(readFileSync(`${root}app.json`, 'utf8'));

type PluginEntry = string | [string, Record<string, unknown>];
const startioPlugin = (appJson.expo.plugins as PluginEntry[]).find(
  (entry) => Array.isArray(entry) && entry[0] === './modules/startio-ads/app.plugin.js',
) as [string, { appId?: unknown }] | undefined;

function emptyManifest() {
  return { manifest: { $: {}, application: [{ $: { 'android:name': '.MainApplication' } }] } };
}

describe('App ID de Start.io', () => {
  it('es el de este juego y no está vacío', () => {
    expect(STARTIO_APP_ID).toBe(CAPICUA_APP_ID);
    expect(isValidStartioAppId(STARTIO_APP_ID)).toBe(true);
  });

  it('app.json registra el config plugin con el mismo App ID', () => {
    expect(startioPlugin).toBeDefined();
    expect(startioPlugin?.[1].appId).toBe(STARTIO_APP_ID);
  });

  it('el config plugin lo escribe en el AndroidManifest (lo lee el SDK al arrancar)', () => {
    const result = plugin.setStartioMetaData(emptyManifest(), STARTIO_APP_ID);
    const meta = result.manifest.application[0]['meta-data'] as { $: Record<string, string> }[];
    const value = (name: string) => meta.find((item) => item.$['android:name'] === name)?.$['android:value'];
    expect(value('com.startapp.sdk.APPLICATION_ID')).toBe(CAPICUA_APP_ID);
    expect(value('com.startapp.sdk.CONSENT_ENABLED')).toBe('false');
  });

  it('el config plugin para la compilación si el App ID falta o no vale', () => {
    for (const bad of [undefined, null, '', 'undefined', '  ', 'abc']) {
      expect(() => plugin.validAppId(bad)).toThrow(/App ID/);
    }
    expect(plugin.validAppId(' 210753000 ')).toBe(CAPICUA_APP_ID);
  });

  it('el diagnóstico avisa si el SDK usa otro App ID', () => {
    const ok: AdDiagnostics = {
      supported: true,
      expectedAppId: STARTIO_APP_ID,
      manifestAppId: CAPICUA_APP_ID,
      initAppId: CAPICUA_APP_ID,
      initialized: true,
      testMode: true,
      initError: null,
      lastAdKey: null,
      lastAdResult: null,
      lastAdMessage: null,
    };
    expect(appIdProblems(ok)).toEqual([]);
    expect(appIdProblems({ ...ok, manifestAppId: null })).toEqual(['manifest']);
    expect(appIdProblems({ ...ok, initAppId: 'undefined' })).toEqual(['init']);
    expect(appIdProblems({ ...ok, manifestAppId: '210333794' })).toEqual(['manifest']);
    expect(appIdProblems(ok, '')).toContain('expected');
  });
});
