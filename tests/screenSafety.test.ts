// Fallo visto en un Android real (fase 3): en el inicio no se podía desplazar y el botón de Ajustes quedaba debajo
// de la barra de navegación de Android. La app va de borde a borde, así que cada pantalla tiene que respetar la
// zona segura (barra de estado arriba, barra de navegación abajo) y las largas tienen que poder desplazarse.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (/\.tsx?$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
  }
  return out;
}

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** Archivos del proyecto a los que llega una ruta (imports normales y los `import()` de SkiaGate). */
function reachable(from: string): Set<string> {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    const text = read(current);
    const specs = [...text.matchAll(/(?:from\s+|import\(\s*)'(@\/[^']+|\.[^']+)'/g)].map((m) => m[1]);
    for (const spec of specs) {
      const base = spec.startsWith('@/') ? spec.slice(2) : relative(ROOT, resolve(dirname(join(ROOT, current)), spec));
      for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
        if (existsSync(join(ROOT, base + ext))) {
          stack.push(base + ext);
          break;
        }
      }
    }
  }
  return seen;
}

const routes = listFiles(join(ROOT, 'app'))
  .map((f) => relative(ROOT, f))
  .filter((f) => !f.endsWith('_layout.tsx') && !/\.web\.tsx?$/.test(f));

const usesSafeArea = (files: Set<string>) => [...files].some((f) => /SafeAreaView|useSafeAreaInsets/.test(read(f)));
const scrolls = (files: Set<string>) => [...files].some((f) => /<ScrollView|<FlatList/.test(read(f)));

describe('pantallas: zona segura y desplazamiento', () => {
  it('hay pantallas que comprobar (también las pestañas)', () => {
    expect(routes).toEqual(expect.arrayContaining(['app/(tabs)/index.tsx', 'app/(tabs)/tournament.tsx', 'app/(tabs)/shop.tsx', 'app/(tabs)/profile.tsx', 'app/settings.tsx', 'app/result.tsx', 'app/game.tsx']));
  });

  for (const route of routes) {
    it(`${route} respeta la zona segura`, () => {
      expect(usesSafeArea(reachable(route)), `${route} no usa SafeAreaView ni useSafeAreaInsets`).toBe(true);
    });
  }

  const LONG = ['app/(tabs)/index.tsx', 'app/settings.tsx', 'app/result.tsx', 'app/(tabs)/tournament.tsx', 'app/(tabs)/shop.tsx', 'app/(tabs)/profile.tsx', 'components/game/HandSummary.tsx', 'app/tutorial.tsx'];
  for (const screen of LONG) {
    it(`${screen} se puede desplazar`, () => {
      expect(scrolls(reachable(screen)), `${screen} no tiene ScrollView`).toBe(true);
    });
  }

  it('las pantallas fuera de las pestañas no quitan la zona segura de abajo', () => {
    for (const route of routes.filter((r) => !r.startsWith('app/(tabs)/'))) {
      for (const f of reachable(route)) {
        for (const m of read(f).matchAll(/<SafeAreaView[^>]*edges=\{\[([^\]]*)\]\}/g)) {
          expect(m[1], `${f}: SafeAreaView sin 'bottom'`).toContain('bottom');
        }
      }
    }
  });

  it('la barra de pestañas deja sitio a la barra de navegación de Android', () => {
    const tabs = read('app/(tabs)/_layout.tsx');
    expect(tabs).toMatch(/useSafeAreaInsets/);
    expect(tabs).toMatch(/insets\.bottom/);
  });

  it('las pestañas usan la zona segura de arriba (la de abajo la lleva la barra de pestañas)', () => {
    for (const route of routes.filter((r) => r.startsWith('app/(tabs)/'))) {
      const files = reachable(route);
      const text = [...files].map(read).join('\n');
      expect(text, route).toMatch(/edges=\{\['top'/);
    }
  });

  it('el inicio no tiene el botón de Ajustes al final: va en el engranaje de la cabecera', () => {
    const home = read('app/(tabs)/index.tsx');
    expect(home).not.toMatch(/router\.push\('\/settings'\)/);
    expect(home).toMatch(/<TabHeader/);
    expect(read('components/ui/TabHeader.tsx')).toMatch(/router\.push\('\/settings'\)/);
  });

  it('en pantallas bajas el título del inicio se encoge', () => {
    expect(read('app/(tabs)/index.tsx')).toMatch(/titleArtSize\(height\)/);
  });
});
