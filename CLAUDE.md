# Capicúa (Capicua Dominoes) — guía para Claude Code

Dominó al estilo venezolano para móvil: por parejas (tú y tu compañero, enfrente, contra dos rivales de la máquina), mano a mano contra la máquina (con pozo) o dos personas en el mismo teléfono. Doble seis, a 100 puntos por defecto. Sin servidor ni base de datos: todo se juega y se guarda en el móvil. El dueño del proyecto habla español; responde en español.

Misma estructura y convenciones que Templo Salvaje y Jaque Épico (protección de arranque copiada de Templo Salvaje).

## Stack
- Expo SDK 57, React Native, TypeScript, expo-router (rutas en `app/`). Vertical y tema oscuro. Paquete `com.pedroskky.capicua`; nombre por idioma en `locales/es.json` («Capicúa») y `locales/en.json` («Capicua Dominoes»). Proyecto de Expo `pedroskky2626s-team`, slug `capicua` (`extra.eas.projectId` en `app.json`).
- Dibujo con `@shopify/react-native-skia` en un solo Canvas por pantalla (en web con `WithSkiaWeb` y `public/canvaskit.wasm`, ver `components/game/SkiaGate*.tsx`).
- Toques: `react-native-gesture-handler` (`Gesture.Tap().runOnJS(true)`), con la ficha tocada calculada en `game/layout.ts` (`hitFan`).
- Sonido `expo-audio`, vibración `expo-haptics`, guardado `@react-native-async-storage/async-storage` (siempre con `lib/storedValue.ts`).
- Idiomas: `expo-localization` + `lib/i18n/es.ts` y `lib/i18n/en.ts` con `t('clave')`. Fuente Lobster (`@expo-google-fonts/lobster`) para títulos.
- Tests: `vitest` (la lógica pura de `game/` y las comprobaciones de arranque de `tests/`).
- Compilación: Expo EAS (`eas.json`: `preview` = APK con `EXPO_PUBLIC_DEV_MENU=1`; `production` = AAB, `autoIncrement`, `appVersionSource: remote`, versión 1.0.0 y `EXPO_PUBLIC_DEV_MENU=0`; lo vigila `tests/production.test.ts`). No tocar `android.versionCode` (lo lleva EAS).

## Reglas del dominó
- 28 fichas, 7 por jugador, 4 jugadores. Asientos: 0 = tú (abajo), 1 = Rafa (derecha), 2 = Carmen (compañera, arriba), 3 = Luis (izquierda). El turno pasa **a la derecha** (0 → 1 → 2 → 3). Parejas 0+2 («Nosotros») contra 1+3 («Ellos»).
- Primera mano: sale quien tiene el doble seis, y sale con él. Siguientes: el jugador que sigue a quien salió antes.
- Se juega por las dos puntas; «paso» solo cuando no se puede jugar (tú pasas solo, con el aviso «¡Paso!»).
- Dominó: la pareja de quien se quedó sin fichas suma los puntos de **todas** las fichas que quedan en las cuatro manos. Capicúa: +25 si la última ficha cabía por las dos puntas (y las puntas eran distintas).
- Tranque (nadie puede jugar; se detecta en cuanto ocurre): gana la pareja con menos puntos en la mano y se lleva la suma de todas. Empate: nadie anota.
- Partida a 100; «zapatero» si la pareja perdedora no anotó.
- **Todo esto está en `DEFAULT_RULES` (`game/config.ts`)**. «Reglas de la casa» en Ajustes (se guardan en `settings.rules` y se aplican al crear una partida; la partida guarda sus reglas): quién sale después de la primera mano (`nextStarter`), qué se cuenta al dominar (`dominoCounts`), valor de la capicúa 0/25/50 (`capicuaBonus`), meta 75/100/150/200 (`targetScore`, opciones en `HOUSE_RULE_OPTIONS`), tranque empatado (`tranqueTie`) y capicúa con puntas iguales (`capicuaNeedsDifferentEnds`: si es `false`, con las dos puntas iguales cuenta cualquier ficha que tenga ese número). Si se añaden reglas: campo nuevo en `DominoRules`, valor por defecto, uso en `engine.ts`, validación en `normalizeRules` (`game/rules.ts`), opción en `app/settings.tsx` y test.
- **Mano a mano** (`mode: 'single'`, y `'hotseat'` para dos personas): 2 jugadores, 7 fichas cada uno y 14 en el pozo. Quien no puede jugar roba (`drawTile`, una a una) hasta poder; con el pozo vacío, pasa. En la primera mano sale el doble más alto que haya en las manos. Tranque = ninguna ficha que quede (en manos o en el pozo) cabe (`isBlocked`). Cada jugador es su propio «equipo» (`teamOf(p, 2) = p`).

## Estructura
- `app/`: `_layout.tsx` (su primer import instala la protección contra cierres, `lib/installCrashHandlers.ts`; raíz con `ErrorBoundary`, aviso del último error y fuentes con plan B), `index.tsx` (inicio: portada Skia con `SkiaGate`, «Continuar partida» si hay una a medias y los tres modos: Parejas, Mano a mano, Dos en el teléfono), `game.tsx` (carga ajustes y partida guardada y luego `components/game/GameScreen` con `SkiaGate`), `result.tsx` (resultado de la partida: marcador, zapatero y mano a mano), `settings.tsx` (sonido, música, vibración, nivel y velocidad de la máquina, contador de fichas, reglas de la casa, idioma y, con `DEV_MENU`: «Ver números de la mesa», «Ver todas las manos», «Forzar un tranque», «Forzar una capicúa», borrar la partida y probar «Algo salió mal»), `+not-found.tsx`.
- `game/` lógica pura **sin React**:
  - `config.ts` — TODOS los números ajustables: reglas (`DEFAULT_RULES`), velocidad de la IA (`AI_DELAY_MS`), tiempos (`TIMING`), pesos de la IA (`AI_WEIGHTS`), colores y volúmenes.
  - `tiles.ts` — las 28 fichas (`TileId` 0–27), puntos, dobles.
  - `engine.ts` — motor inmutable para 2 o 4 jugadores: `createMatch(seed, rules, { mode, aiLevel })`, `legalMoves`, `endsForTile`, `playMove`, `passTurn`, `drawTile`, `canDraw`, `mustPass`, `startNextHand`, `placePiece` (por la izquierda queda [otra mitad | punta], por la derecha [punta | otra mitad]), `isChainValid`, `isBlocked`, `playedByNumber` (contador), resultado de cada mano (`HandResult`: fichas que quedaron por jugador y pareja, puntos, capicúa, total, marcador después) y de la partida (`winnerTeam`, `zapatero`). La fila (`line`) va de izquierda a derecha con el número de cada lado; `origin` es la ficha de salida. `log` = lo que todos vieron (jugadas y pases).
  - `ai.ts` — IA en 4 niveles (`AiLevel`): solo recibe una `AiView` (su mano, puntas, `log` con jugadas, pases y robos, cuántas fichas tiene cada uno y sus jugadas legales), **nunca las manos ajenas**. Principiante: cualquier ficha que quepa (pseudoazar fijo por la vista). Jugador de plaza: fichas gordas y dobles primero, control y variedad. Veterano: además cuenta fichas y recuerda pases/robos (`knownMissing`), tapa los números del rival y no tapa los de su compañero (señales: puntas que dejó cada uno), y tranca cuando sus cuentas dicen que su pareja gana el tranque (`tranqueValue`). Maestro: además estima la probabilidad de que cada jugador tenga cada ficha (`holdProbabilities`) y juega a cerrar al rival y abrirle al compañero. Pesos en `AI_WEIGHTS`. `aiLevelFor`: tu compañero juega siempre al menos como Veterano («compañero inteligente»). `bestMoveHint` = la pista (jugada del Maestro). Desempates fijos: misma vista → misma jugada.
  - `aiMatch.ts` — partidas simuladas entre niveles (`simulateMatch`, `duel` a duplicado: cada reparto dos veces cambiando de lado).
  - `devScenarios.ts` — solo para el menú de desarrollo: busca jugando manos de verdad una situación en la que tu jugada provoca un tranque o una capicúa (`findScenario`, `scenarioMove`).
  - `rules.ts` — `normalizeRules` (reglas leídas de ajustes o de la partida). `language.ts` — `resolveLanguage` (idioma del teléfono; español si no es español ni inglés).
  - `layout.ts` — dónde va cada ficha: la fila de la mesa en unidades (ficha 1 × 2; los dobles atravesados; al llegar a `ROW_HALF_WIDTH` gira y vuelve en «S»: el brazo derecho hacia abajo, el izquierdo hacia arriba; un doble que no cabe con la ficha siguiente hace él de curva, para que una ficha que gira nunca quede pegada al costado de un doble), `fitTable` (escala para que quepa) y el abanico de tu mano (`fanLayout`, `hitFan`). **`tileDrawSpec` dice qué número va arriba/izquierda según dónde está cada mitad: dibujar siempre con ella** (fase 2: en un Android real se veían fichas vecinas que no cuadraban porque se dibujaba siempre la primera mitad arriba/izquierda; fallaba en el brazo izquierdo, en la fila de vuelta tras cada curva y en los tramos verticales). `drawnHalves` = las mitades tal y como quedan dibujadas.
  - `savedMatch.ts` — partida guardada con versión de esquema (`SAVED_MATCH_VERSION` = 2: modo, nivel, pozo, ficha de salida y robos; migra desde la v1 de la fase 1) y `normalizeSavedMatch` (valida todo lo leído, también que la cadena cuadre; si está roto, se descarta sin lanzar).
  - `crashInfo.ts` (informe de error, puro, con tests), `random.ts` (azar con semilla).
- `components/art/` dibujo Skia en código: `paint.ts` (pinceles, `record` → SkPicture, `emptyPicture`), `tiles.ts` (ficha de marfil con puntos negros, línea y remache dorado, resaltado de las jugables, oscurecido de las que no; ficha boca abajo; paño verde con borde de madera, grabado una vez).
- `components/game/`: `GameCanvas.tsx` (mesa, ficha nueva que se desliza desde el asiento de quien la jugó y suena «clac» al llegar, manos de los demás boca abajo o descubiertas, pozo, tu abanico y los sitios resaltados donde caerá la ficha al elegir punta o con la pista —también se pueden tocar—; redibuja una SkPicture solo cuando cambia algo o durante el deslizamiento), `GameScreen.tsx` (turnos, IA con su nivel y velocidad, robar, elegir punta, pista, contador, pasar el teléfono con la mano tapada, «Revisar la mano», avisos, sonido, música y guardado), `PlayerBadge.tsx` (avatar, nombre, fichas, turno y bocadillo «¡Paso!»/«¡Robo!»), `HandSummary.tsx` (resumen de la mano con el detalle de los puntos y «Revisar la mano»), `TableNumbers.tsx` («Ver números de la mesa», solo `DEV_MENU`), `regions.ts` (zonas de la pantalla para 2 o 4 jugadores, `slotOf` y `tableGeometry`, sin Skia).
- `components/home/TitleArt.tsx` portada; `components/ui/` botones, selector, filas de ajustes, cabecera y pantallas de error.
- `lib/`: `settings.ts` (`capicua.settings`: también nivel, reglas de la casa, contador y las opciones de desarrollo), `matchStore.ts` (`capicua.match`), `devForced.ts` (partida forzada pendiente de marcar con la pista), `feedback.ts` (sonidos, música, vibración; todo en try/catch), `i18n/`, `devMenu.ts`, `storedValue.ts` (nunca rechaza: sin almacenamiento el juego sigue), `crashReport.ts` (manejador global de errores y promesas; último error en `capicua.lastError`, solo con `DEV_MENU`).
- `scripts/generate-sounds.mjs` (`npm run sounds`: clac, barajeo, paso, dominó y la música, un rasgueo de cuatro en 3/4) y `scripts/generate-icons.mjs` (`npm run icons`: icono, adaptativo, splash y favicon sin dependencias). Los archivos generados se suben al repo.

## Reglas del proyecto
1. Todos los números ajustables y las reglas en `game/config.ts`.
2. Lógica del juego en `game/` sin React; dibujo en `components/`.
3. Ningún texto visible fijo en el código: siempre en `lib/i18n/es.ts` y `en.ts` (mismas claves; el tipo lo exige).
4. La IA nunca mira manos ajenas: solo `aiView()`. Lo vigila `game/ai.test.ts` (misma información → misma jugada en los 4 niveles, nunca ilegal, roba o pasa solo cuando no puede, y **cada nivel le gana al anterior en 500 partidas simuladas a duplicado**). Si tocas `AI_WEIGHTS`, vuelve a pasarlo.
10. La mesa tiene que cuadrar: `game/chain.test.ts` simula 2.000 manos completas y comprueba tras cada jugada que las fichas vecinas comparten número, y que, tal y como se dibujan, las mitades que se tocan tienen el mismo número. Si tocas `layout.ts` o el dibujo de la mesa, no lo quites.
5. Fluido en un Android de gama media: el paño se graba una vez; la mesa se redibuja en una SkPicture solo cuando cambia el estado o mientras se desliza una ficha; nada de React por fotograma.
6. Solo librerías compatibles con Expo; instalar con `npx expo install`.
7. Antes de terminar una tarea: `npm test`, `npx tsc --noEmit`, `npm run build:web` y `npm run check:android` (export del bundle de Android) deben pasar. **Sin el export de Android no se abre ningún PR.**
8. Claves de guardado: `capicua.settings`, `capicua.match` (partida en curso, `SAVED_MATCH_VERSION` = 2) y `capicua.lastError`. Si cambia el formato de la partida, sube la versión y migra en `normalizeSavedMatch`; cambiar la clave borra la partida de los jugadores.
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

## Estado (16 nov 2026, fase 2)
- Hecho (fase 1): proyecto Expo con la protección de arranque, motor de dominó por parejas con reglas configurables y tests, IA básica, inicio, partida con mesa que se curva sola, abanico con jugables resaltadas, elegir punta, avatares con fichas, avisos, resumen de cada mano y resultado de la partida, ajustes, partida guardada, arte Skia, sonidos y música sintetizados, icono y splash.
- Hecho (fase 2): arreglada la mesa (fichas vecinas que no cuadraban al dibujar) con test de 2.000 manos y de la colocación; resalte del sitio donde caerá la ficha; idioma del teléfono (español por defecto); IA en 4 niveles y compañero inteligente; Mano a mano con pozo y Dos en el teléfono; reglas de la casa; pista, contador de fichas y «Revisar la mano»; herramientas de desarrollo (ver números de la mesa, ver todas las manos, forzar tranque o capicúa).
- Pendiente: probar en un Android real la mesa, los modos nuevos y la fluidez.

## Notas
- Ver la web: `npm run build:web` y servir `dist/` con fallback a `index.html`. Si cambias una variable `EXPO_PUBLIC_*`, exporta con `--clear` (Metro guarda en caché el valor).
- En web el navegador no deja sonar la música hasta el primer toque.
