# Capicúa (Capicua Dominoes) — guía para Claude Code

Dominó por parejas al estilo venezolano para móvil: tú y tu compañero (enfrente) contra dos rivales de la máquina, doble seis, a 100 puntos. Sin servidor ni base de datos: todo se juega y se guarda en el móvil. El dueño del proyecto habla español; responde en español.

Misma estructura y convenciones que Templo Salvaje y Jaque Épico (protección de arranque copiada de Templo Salvaje).

## Stack
- Expo SDK 57, React Native, TypeScript, expo-router (rutas en `app/`). Vertical y tema oscuro. Paquete `com.pedroskky.capicua`; nombre por idioma en `locales/es.json` («Capicúa») y `locales/en.json` («Capicua Dominoes»). Proyecto de Expo `pedroskky2626s-team`, slug `capicua` (`extra.eas.projectId` en `app.json`).
- Dibujo con `@shopify/react-native-skia` en un solo Canvas por pantalla (en web con `WithSkiaWeb` y `public/canvaskit.wasm`, ver `components/game/SkiaGate*.tsx`).
- Toques: `react-native-gesture-handler` (`Gesture.Tap().runOnJS(true)`), con la ficha tocada calculada en `game/layout.ts` (`hitFan`).
- Sonido `expo-audio`, vibración `expo-haptics`, guardado `@react-native-async-storage/async-storage` (siempre con `lib/storedValue.ts`).
- Idiomas: `expo-localization` + `lib/i18n/es.ts` y `lib/i18n/en.ts` con `t('clave')`. Fuente Lobster (`@expo-google-fonts/lobster`) para títulos.
- Tests: `vitest` (la lógica pura de `game/` y las comprobaciones de arranque de `tests/`).
- Compilación: Expo EAS (`eas.json`: `preview` = APK con `EXPO_PUBLIC_DEV_MENU=1`; `production` = AAB, `autoIncrement`, `appVersionSource: remote`, versión 1.0.0 y `EXPO_PUBLIC_DEV_MENU=0`; lo vigila `tests/production.test.ts`). No tocar `android.versionCode` (lo lleva EAS).

## Reglas del dominó (fase 1)
- 28 fichas, 7 por jugador, 4 jugadores. Asientos: 0 = tú (abajo), 1 = Rafa (derecha), 2 = Carmen (compañera, arriba), 3 = Luis (izquierda). El turno pasa **a la derecha** (0 → 1 → 2 → 3). Parejas 0+2 («Nosotros») contra 1+3 («Ellos»).
- Primera mano: sale quien tiene el doble seis, y sale con él. Siguientes: el jugador que sigue a quien salió antes.
- Se juega por las dos puntas; «paso» solo cuando no se puede jugar (tú pasas solo, con el aviso «¡Paso!»).
- Dominó: la pareja de quien se quedó sin fichas suma los puntos de **todas** las fichas que quedan en las cuatro manos. Capicúa: +25 si la última ficha cabía por las dos puntas (y las puntas eran distintas).
- Tranque (nadie puede jugar; se detecta en cuanto ocurre): gana la pareja con menos puntos en la mano y se lleva la suma de todas. Empate: nadie anota.
- Partida a 100; «zapatero» si la pareja perdedora no anotó.
- **Todo esto está en `DEFAULT_RULES` (`game/config.ts`)**, con opciones alternativas ya implementadas en el motor (quién sale, qué se cuenta, tranque por jugador, empate para quien trancó…), pensado para las «Reglas de la casa» de la fase 2. Si se añaden reglas: campo nuevo en `DominoRules`, valor por defecto, uso en `engine.ts`, validación en `normalizeRules` (`game/savedMatch.ts`) y test.

## Estructura
- `app/`: `_layout.tsx` (su primer import instala la protección contra cierres, `lib/installCrashHandlers.ts`; raíz con `ErrorBoundary`, aviso del último error y fuentes con plan B), `index.tsx` (inicio: portada Skia con `SkiaGate`, «Continuar partida» si hay una a medias, «Nueva partida», «Ajustes»), `game.tsx` (carga ajustes y partida guardada y luego `components/game/GameScreen` con `SkiaGate`), `result.tsx` (resultado de la partida: marcador, zapatero y mano a mano), `settings.tsx` (sonido, música, vibración, velocidad de la máquina, idioma y, con `DEV_MENU`, borrar la partida y probar «Algo salió mal»), `+not-found.tsx`.
- `game/` lógica pura **sin React**:
  - `config.ts` — TODOS los números ajustables: reglas (`DEFAULT_RULES`), velocidad de la IA (`AI_DELAY_MS`), tiempos (`TIMING`), pesos de la IA (`AI_WEIGHTS`), colores y volúmenes.
  - `tiles.ts` — las 28 fichas (`TileId` 0–27), puntos, dobles.
  - `engine.ts` — motor inmutable: `createMatch(seed, rules)`, `legalMoves`, `endsForTile`, `playMove`, `passTurn`, `startNextHand`, resultado de cada mano (`HandResult`: fichas que quedaron por jugador y pareja, puntos, capicúa, total, marcador después) y de la partida (`winnerTeam`, `zapatero`). La fila (`line`) va de izquierda a derecha con el número de cada lado; `origin` es la ficha de salida. `log` = lo que todos vieron (jugadas y pases).
  - `ai.ts` — IA básica: solo recibe una `AiView` (su mano, puntas, `log`, cuántas fichas tiene cada uno y sus jugadas legales), **nunca las manos ajenas**. Suelta primero las fichas de más puntos y los dobles, evita dejar puntas que el rival puede jugar (por sus pases sabe qué números le faltan; también cuenta las fichas vistas) y no bloquea a su compañero. Desempates fijos: misma vista → misma jugada.
  - `layout.ts` — dónde va cada ficha: la fila de la mesa en unidades (ficha 1 × 2; los dobles atravesados; al llegar a `ROW_HALF_WIDTH` gira y vuelve en «S»: el brazo derecho hacia abajo, el izquierdo hacia arriba), `fitTable` (escala para que quepa) y el abanico de tu mano (`fanLayout`, `hitFan`).
  - `savedMatch.ts` — partida guardada con versión de esquema (`SAVED_MATCH_VERSION` = 1) y `normalizeSavedMatch` (valida todo lo leído; si está roto, se descarta sin lanzar).
  - `crashInfo.ts` (informe de error, puro, con tests), `random.ts` (azar con semilla).
- `components/art/` dibujo Skia en código: `paint.ts` (pinceles, `record` → SkPicture, `emptyPicture`), `tiles.ts` (ficha de marfil con puntos negros, línea y remache dorado, resaltado de las jugables, oscurecido de las que no; ficha boca abajo; paño verde con borde de madera, grabado una vez).
- `components/game/`: `GameCanvas.tsx` (mesa, ficha nueva que se desliza desde el asiento de quien la jugó y suena «clac» al llegar, manos boca abajo de los demás y tu abanico; redibuja una SkPicture solo cuando cambia algo o durante el deslizamiento), `GameScreen.tsx` (turnos, IA con su velocidad, elegir punta, avisos, sonido, música y guardado), `PlayerBadge.tsx` (avatar, nombre, fichas, turno y bocadillo «¡Paso!»), `HandSummary.tsx` (resumen de la mano con el detalle de los puntos), `regions.ts` (zonas de la pantalla, sin Skia).
- `components/home/TitleArt.tsx` portada; `components/ui/` botones, selector, filas de ajustes, cabecera y pantallas de error.
- `lib/`: `settings.ts` (`capicua.settings`), `matchStore.ts` (`capicua.match`), `feedback.ts` (sonidos, música, vibración; todo en try/catch), `i18n/`, `devMenu.ts`, `storedValue.ts` (nunca rechaza: sin almacenamiento el juego sigue), `crashReport.ts` (manejador global de errores y promesas; último error en `capicua.lastError`, solo con `DEV_MENU`).
- `scripts/generate-sounds.mjs` (`npm run sounds`: clac, barajeo, paso, dominó y la música, un rasgueo de cuatro en 3/4) y `scripts/generate-icons.mjs` (`npm run icons`: icono, adaptativo, splash y favicon sin dependencias). Los archivos generados se suben al repo.

## Reglas del proyecto
1. Todos los números ajustables y las reglas en `game/config.ts`.
2. Lógica del juego en `game/` sin React; dibujo en `components/`.
3. Ningún texto visible fijo en el código: siempre en `lib/i18n/es.ts` y `en.ts` (mismas claves; el tipo lo exige).
4. La IA nunca mira manos ajenas: solo `aiView()`. Lo vigila `game/ai.test.ts` (misma información → misma jugada, nunca ilegal, siempre pasa cuando no puede).
5. Fluido en un Android de gama media: el paño se graba una vez; la mesa se redibuja en una SkPicture solo cuando cambia el estado o mientras se desliza una ficha; nada de React por fotograma.
6. Solo librerías compatibles con Expo; instalar con `npx expo install`.
7. Antes de terminar una tarea: `npm test`, `npx tsc --noEmit`, `npm run build:web` y `npm run check:android` (export del bundle de Android) deben pasar. **Sin el export de Android no se abre ningún PR.**
8. Claves de guardado: `capicua.settings`, `capicua.match` (partida en curso, `SAVED_MATCH_VERSION` = 1) y `capicua.lastError`. Si cambia el formato de la partida, sube la versión y migra en `normalizeSavedMatch`; cambiar la clave borra la partida de los jugadores.
9. Las herramientas de desarrollo solo existen con `DEV_MENU`; nunca en `production`.

## Arranque seguro en Android
La web no avisa de muchos fallos que en el APK cierran la app al abrirla **sin ningún mensaje** (pasó en todos los juegos anteriores). Antes de abrir cada PR:
1. `npm run check:android` (= `npx expo export --platform android`) termina sin errores.
2. `npm test` incluye `tests/startupSafety.test.ts`. No lo desactives; si hace falta, amplíalo.
3. Lista de comprobación de todo lo que se ejecuta al cargar los módulos o al montar la primera pantalla:
   - **Skia**: nunca `finishRecordingAsPicture()` sin `beginRecording()` (en nativo es un puntero nulo y el proceso muere; en web devuelve una imagen vacía). Usa `emptyPicture()` o `record()` de `components/art/paint.ts`. Los pinceles de `components/art/tiles.ts` se crean la primera vez que se dibuja, nunca al cargar el módulo.
   - **`Canvas` de Skia**: `style` como objeto, nunca como array (en la web rompe con «Failed to set an indexed property on CSSStyleDeclaration»).
   - **APIs solo web** (`window`, `document`, `localStorage`, `AudioContext`, `navigator`): solo en archivos `.web.ts(x)` o detrás de `typeof window !== 'undefined'`.
   - **`require()` de recursos** (sonidos, imágenes): el archivo debe estar subido al repo (EAS compila desde git).
   - **Fuentes**: si fallan o tardan más de `FONT_TIMEOUT_MS`, se sigue con la del sistema.
   - **Audio y almacenamiento**: siempre dentro de try/catch; sin sonido o sin guardado el juego sigue. Nada de `AsyncStorage` fuera de `lib/storedValue.ts` y `lib/crashReport.ts` (lo vigila el test).
   - **Promesas**: siempre con `.catch`.
   - **Código a nivel de módulo**: nada que pueda lanzar en módulos que se cargan antes de `SkiaGate`. Ninguna ruta importa Skia sin `SkiaGate` (lo vigila el test).
4. Protección permanente (no quitarla): el primer import de `app/_layout.tsx` instala `lib/crashReport.ts`; `ErrorBoundary` en la raíz. Un error de JavaScript nunca cierra la app: sale «Algo salió mal» con «Reintentar». En el APK preview se ven el mensaje y la pila, y al volver a abrir se enseña el último error guardado.

## Estado (16 nov 2026, fase 1)
- Hecho: proyecto Expo con la protección de arranque, motor de dominó por parejas con reglas configurables y tests, IA básica, inicio, partida con mesa que se curva sola, abanico con jugables resaltadas, elegir punta, avatares con fichas, avisos («¡Paso!», «¡Dominó!», «¡Capicúa!», «¡Tranca!», «¡Zapatero!»), resumen de cada mano y resultado de la partida con el detalle de los puntos, ajustes (sonido, música, vibración, velocidad de la máquina, idioma), partida guardada, arte Skia, sonidos y música sintetizados, icono y splash.
- Pendiente (fase 2): «Reglas de la casa» (las opciones ya existen en `DominoRules`), niveles de IA, estadísticas y probar en un Android real.

## Notas
- Ver la web: `npm run build:web` y servir `dist/` con fallback a `index.html`. Si cambias una variable `EXPO_PUBLIC_*`, exporta con `--clear` (Metro guarda en caché el valor).
- En web el navegador no deja sonar la música hasta el primer toque.
