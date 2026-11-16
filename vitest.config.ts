import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Los tests cubren la lógica pura de game/ y las comprobaciones de arranque de tests/ (sin React ni módulos nativos).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['game/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
  },
});
