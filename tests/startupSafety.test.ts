// Arranque seguro en Android: comprobaciones estáticas del código para fallos que en la web no se ven
// (ver «Arranque seguro en Android» en CLAUDE.md). Si una falla, el APK puede cerrarse solo al abrirse.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const SOURCE_DIRS = ['app', 'components', 'lib', 'hooks', 'game'];

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
  }
  return out;
}

const files = SOURCE_DIRS.flatMap((d) => listFiles(join(ROOT, d))).map((full) => ({
  path: relative(ROOT, full),
  isWeb: /\.web\.tsx?$/.test(full),
  text: readFileSync(full, 'utf8'),
}));

/** Código sin comentarios (para no avisar por un comentario que explica la regla). */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

let tracked: Set<string> | null = null;
try {
  tracked = new Set(execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));
} catch {
  tracked = null; // Sin git (p. ej. en EAS) basta con que el archivo exista.
}

function inRepo(relPath: string): boolean {
  if (!existsSync(join(ROOT, relPath))) return false;
  return tracked === null || tracked.size === 0 || tracked.has(relPath);
}

describe('arranque seguro en Android', () => {
  it('Skia: nunca terminar una grabación sin empezarla (cierra la app en nativo, en web no falla)', () => {
    for (const file of files) {
      const src = code(file.text);
      expect(src, file.path).not.toMatch(/PictureRecorder\(\)\s*\.finishRecordingAsPicture/);
      const recorders = (src.match(/PictureRecorder\(\)/g) ?? []).length;
      const begins = (src.match(/\.beginRecording\(/g) ?? []).length;
      expect(begins, `${file.path}: cada PictureRecorder() necesita su beginRecording()`).toBeGreaterThanOrEqual(recorders);
    }
  });

  it('nada de APIs solo web fuera de los archivos .web.ts(x), salvo comprobando antes que existen', () => {
    const webOnly = /\b(document\.|localStorage|sessionStorage|AudioContext|webkitAudioContext|navigator\.)/;
    for (const file of files) {
      if (file.isWeb) continue;
      code(file.text)
        .split('\n')
        .forEach((line, i) => {
          expect(webOnly.test(line), `${file.path}:${i + 1}: ${line.trim()}`).toBe(false);
          if (/\bwindow\./.test(line)) {
            expect(/typeof window/.test(line) || /window\.(addEventListener|frameworkReady)/.test(line) && /typeof window/.test(file.text), `${file.path}:${i + 1}: usa window sin comprobar typeof window`).toBe(true);
          }
        });
    }
  });

  it('todo archivo que se carga con require() existe y está subido al repo (los sonidos generados también)', () => {
    for (const file of files) {
      for (const match of code(file.text).matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const spec = match[1];
        if (!spec.startsWith('@/') && !spec.startsWith('.')) continue;
        const rel = spec.startsWith('@/') ? spec.slice(2) : relative(ROOT, resolve(dirname(join(ROOT, file.path)), spec));
        expect(inRepo(rel), `${file.path}: require('${spec}') → ${rel} no está en el repo`).toBe(true);
      }
    }
  });

  it('los iconos y el splash de app.json existen y están subidos', () => {
    const json = readFileSync(join(ROOT, 'app.json'), 'utf8');
    const paths = [...json.matchAll(/"\.\/(assets\/[^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(3);
    for (const p of paths) expect(inRepo(p), p).toBe(true);
  });

  it('la protección contra cierres es lo primero que carga el layout raíz', () => {
    // Punto de entrada estándar: uno propio (index.ts) rompe en la web la carga por partes de SkiaGate.
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { main: string };
    expect(pkg.main).toBe('expo-router/entry');
    const layout = readFileSync(join(ROOT, 'app/_layout.tsx'), 'utf8');
    const firstImport = layout.split('\n').find((line) => line.startsWith('import '));
    expect(firstImport).toBe("import '@/lib/installCrashHandlers';");
    expect(layout).toContain('<ErrorBoundary>');
  });

  it('el audio se crea siempre dentro de try/catch', () => {
    const feedback = readFileSync(join(ROOT, 'lib/feedback.ts'), 'utf8');
    const creates = (feedback.match(/createAudioPlayer\(/g) ?? []).length;
    expect(creates).toBe(1);
    expect(feedback).toMatch(/try\s*\{\s*const player = createAudioPlayer\(/);
  });

  it('ninguna pantalla carga Skia sin SkiaGate (ni por un import de otro archivo)', () => {
    // Imports estáticos (no `import type` ni `import()`), resueltos a archivos del proyecto.
    const byPath = new Map(files.map((f) => [f.path, f]));
    const resolveImport = (from: string, spec: string): string | null => {
      const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? join(dirname(from), spec) : null;
      if (base === null) return null;
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const candidate = relative(ROOT, join(ROOT, base + ext));
        if (byPath.has(candidate)) return candidate;
      }
      return null;
    };
    const staticImports = (text: string): string[] =>
      [...code(text).matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
    const routes = files.filter((f) => f.path.startsWith('app/') && !f.isWeb);
    for (const route of routes) {
      const seen = new Set<string>();
      const stack = [route.path];
      while (stack.length) {
        const current = stack.pop() as string;
        if (seen.has(current)) continue;
        seen.add(current);
        for (const spec of staticImports(byPath.get(current)?.text ?? '')) {
          expect(spec === '@shopify/react-native-skia', `${route.path} → ${current} importa Skia sin SkiaGate`).toBe(false);
          const next = resolveImport(current, spec);
          if (next) stack.push(next);
        }
      }
    }
  });

  it('las fuentes tienen un plan B si no cargan', () => {
    const layout = readFileSync(join(ROOT, 'app/_layout.tsx'), 'utf8');
    expect(layout).toMatch(/fontError/);
    expect(layout).toMatch(/FONT_TIMEOUT_MS/);
  });
  it('el Canvas de Skia recibe el estilo como objeto, nunca como array (en la web rompe)', () => {
    for (const file of files) expect(code(file.text), file.path).not.toMatch(/<Canvas[^>]*style=\{\[/);
  });

  it('el almacenamiento nunca rompe el juego (lecturas y escrituras dentro de try/catch)', () => {
    const stored = readFileSync(join(ROOT, 'lib/storedValue.ts'), 'utf8');
    expect(stored).toMatch(/try\s*\{\s*const raw = await AsyncStorage\.getItem/);
    expect(stored).toMatch(/try\s*\{\s*await AsyncStorage\.setItem/);
    for (const file of files) {
      if (file.path === 'lib/storedValue.ts' || file.path === 'lib/crashReport.ts') continue;
      expect(code(file.text), `${file.path}: usa createStoredValue en vez de AsyncStorage directamente`).not.toMatch(/AsyncStorage\./);
    }
  });

  it('la partida guardada tiene versión de esquema', () => {
    const saved = readFileSync(join(ROOT, 'game/savedMatch.ts'), 'utf8');
    expect(saved).toMatch(/export const SAVED_MATCH_VERSION = \d+;/);
    const store = readFileSync(join(ROOT, 'lib/matchStore.ts'), 'utf8');
    expect(store).toContain("'capicua.match'");
    expect(store).toContain('normalizeSavedMatch');
  });
});
