// Perfiles de EAS: production (Google Play) = AAB, versión llevada por EAS y sin herramientas de prueba;
// preview = APK con herramientas de prueba.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const eas = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8'));
const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo;

describe('EAS y Google Play', () => {
  it('production: AAB, autoIncrement, versión remota y sin herramientas de prueba', () => {
    const prod = eas.build.production;
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(prod.autoIncrement).toBe(true);
    expect(prod.android.buildType).toBe('app-bundle');
    expect(prod.env.EXPO_PUBLIC_DEV_MENU).toBe('0');
    expect(prod.developmentClient).toBeUndefined();
  });

  it('preview: APK con herramientas de prueba', () => {
    const preview = eas.build.preview;
    expect(preview.android.buildType).toBe('apk');
    expect(preview.env.EXPO_PUBLIC_DEV_MENU).toBe('1');
  });

  it('proyecto de Expo, paquete y nombre por idioma', () => {
    expect(app.owner).toBe('pedroskky2626s-team');
    expect(app.slug).toBe('capicua');
    expect(app.extra.eas.projectId).toBe('ae7ab5ca-35fc-4851-988d-82f817673387');
    expect(app.orientation).toBe('portrait');
    expect(app.version).toBe('1.0.0');
    expect(app.android.package).toBe('com.pedroskky.capicua');
    expect(app.android.versionCode).toBeUndefined();
    const es = JSON.parse(readFileSync(join(ROOT, app.locales.es), 'utf8'));
    const en = JSON.parse(readFileSync(join(ROOT, app.locales.en), 'utf8'));
    expect(es.android.app_name).toBe('Capicúa');
    expect(en.android.app_name).toBe('Capicua Dominoes');
  });

  it('las herramientas de prueba solo existen con DEV_MENU', () => {
    const devMenu = readFileSync(join(ROOT, 'lib/devMenu.ts'), 'utf8');
    expect(devMenu).toMatch(/EXPO_PUBLIC_DEV_MENU === '1'/);
    const settings = readFileSync(join(ROOT, 'app/settings.tsx'), 'utf8');
    const devBlock = settings.indexOf('{DEV_MENU && (');
    expect(devBlock).toBeGreaterThan(0);
    for (const tool of ['devClear', 'devCrash']) expect(settings.indexOf(tool, devBlock), tool).toBeGreaterThan(devBlock);
  });
});
