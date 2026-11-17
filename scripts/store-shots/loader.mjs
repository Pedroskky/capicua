// Permite importar la lógica del juego (TypeScript con alias «@/» e imports sin extensión) desde Node 22, que ya
// quita los tipos de los .ts. Solo lo usa scripts/store-shots para preparar las partidas de las capturas.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      import { existsSync } from 'node:fs';
      import { fileURLToPath, pathToFileURL } from 'node:url';
      const ROOT = ${JSON.stringify(new URL('../../', import.meta.url).href)};
      export async function resolve(specifier, context, next) {
        let spec = specifier;
        if (spec.startsWith('@/')) spec = new URL(spec.slice(2), ROOT).href;
        else if (spec.startsWith('.') && context.parentURL) spec = new URL(spec, context.parentURL).href;
        if (spec.startsWith('file:') && !/\\.[cm]?[jt]sx?$/.test(spec)) {
          for (const ext of ['.ts', '.tsx', '/index.ts']) {
            if (existsSync(fileURLToPath(spec + ext))) return next(spec + ext, context);
          }
        }
        return next(spec, context);
      }
    `),
);
