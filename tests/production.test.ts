// Perfiles de EAS: production (Google Play) = AAB, versión llevada por EAS y sin herramientas de prueba;
// preview = APK con herramientas de prueba.
import { existsSync, readFileSync } from 'node:fs';
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
    expect(prod.env.EXPO_PUBLIC_USE_TEST_ADS).toBe('0');
    expect(prod.developmentClient).toBeUndefined();
  });

  it('preview: APK con herramientas de prueba', () => {
    const preview = eas.build.preview;
    expect(preview.android.buildType).toBe('apk');
    expect(preview.env.EXPO_PUBLIC_DEV_MENU).toBe('1');
    expect(preview.env.EXPO_PUBLIC_USE_TEST_ADS).toBe('1');
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
    for (const tool of ['devTableNumbers', 'devShowHands', "force('tranque')", "force('capicua')", 'devGiveCoins(5000)', 'devUnlockTournament()', 'devResetChallenges()', 'devClear', 'devCrash', 'AdDiagnosticsPanel />']) expect(settings.indexOf(tool, devBlock), tool).toBeGreaterThan(devBlock);
  });

  it('anuncios de prueba solo fuera de production', () => {
    const ads = readFileSync(join(ROOT, 'lib/ads/index.ts'), 'utf8');
    expect(ads).toMatch(/EXPO_PUBLIC_USE_TEST_ADS === '1'/);
  });

  it('política de privacidad publicada en pedroskky.github.io', () => {
    const config = readFileSync(join(ROOT, 'game/config.ts'), 'utf8');
    expect(config).toContain("PRIVACY_POLICY_URL = 'https://pedroskky.github.io/capicua/privacy.html'");
  });

  it('icono, splash e imágenes de Google Play', () => {
    for (const f of ['assets/images/icon.png', 'assets/images/adaptive-icon.png', 'assets/images/splash-icon.png', 'store/play-icon-512.png', 'store/feature-graphic.png']) {
      expect(existsSync(join(ROOT, f)), f).toBe(true);
    }
  });

  it('capturas de Google Play: 6 por idioma de 1080×1920 y la imagen destacada en inglés (npm run store-shots)', () => {
    const size = (f: string) => {
      const b = readFileSync(join(ROOT, f));
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
    };
    for (const lang of ['es', 'en']) {
      for (let n = 1; n <= 6; n++) {
        const f = `store/${lang}-0${n}.png`;
        expect(existsSync(join(ROOT, f)), f).toBe(true);
        expect(size(f), f).toEqual({ w: 1080, h: 1920, colorType: 2 });
      }
    }
    expect(size('store/feature-graphic-en.png')).toMatchObject({ w: 1024, h: 500 });
    const es = readFileSync(join(ROOT, 'lib/i18n/es.ts'), 'utf8');
    expect(es).toContain("'store.shot1': \"Dominó venezolano por parejas\"");
  });
});
