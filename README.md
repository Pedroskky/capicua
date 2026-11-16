# Capicúa

Capicúa: dominó por parejas al estilo venezolano (Expo + React Native + Skia).

- Doble seis, 4 jugadores en parejas (tu compañero enfrente), turno a la derecha, partida a 100 puntos.
- Dominó, tranque, capicúa (+25) y zapatero. Reglas en `game/config.ts` (`DEFAULT_RULES`).
- Todo dibujado con Skia y sonidos sintetizados.

## Desarrollo

```bash
npm install
npm run dev
```

Antes de cada PR: `npm test`, `npx tsc --noEmit`, `npm run build:web` y `npm run check:android`. Más detalles en `CLAUDE.md`.
