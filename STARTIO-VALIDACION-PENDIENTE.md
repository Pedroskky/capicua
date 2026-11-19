# Start.io: adaptación pendiente de validación local

Fecha: 19 de noviembre de 2026. Juego: capicua. App ID: 210753000.

## Alcance
Un solo inicio manual; consentimiento pendiente hasta callback; sin precarga tras fallo o timeout; intentos simultáneos compartidos. Fuente: Office Smash 7380774, probado por Pedro en APK preview. Esto no acredita monetización en los otros juegos.

Se mantienen las recompensas y frecuencias de este juego y sus perfiles EAS. Preview usa anuncios de prueba; production debe usar EXPO_PUBLIC_USE_TEST_ADS=0. No reutilizar IDs de otros juegos.

## Continuación en WSL
1. Revisar cambios locales y checkout de esta rama sin sobrescribir trabajo.
2. npm ci, npm test, npx tsc --noEmit, npm run build:web y export Android limpio (npm run check:android si existe; si no, npx expo export --platform android --clear --output-dir dist-android).
3. Generar manifiesto y comprobar App ID 210753000, tools:node=remove para ambos componentes automáticos y ausencia de esos componentes en el manifiesto fusionado del binario.
4. Compilar un solo APK preview local con SDK/NDK y firma existentes. Probar inicio, rechazo/aceptación del consentimiento, intersticial, cierre y recompensa única al completar vídeo. No usar anuncios reales para pruebas repetitivas.
5. Tras validación, generar AAB production local con incremento remoto de versionCode, misma firma y anuncios de prueba desactivados. Verificar bundle y actualizar Alpha conservando participantes.

No se han ejecutado aquí la suite completa, TypeScript semántico, exportaciones ni compilación Kotlin/Android. No se ha fusionado, publicado ni pedido un build en la nube.

## Comprobaciones parciales realizadas aquí
Se aprobaron las seis pruebas puras de inicialización usando Node 24. También se verificaron, con el módulo nativo simulado, fallo sin precarga, intento compartido, reintento, huecos propios y ausencia de precargas duplicadas en los cinco backends. El plugin se probó dos veces sobre un manifiesto simulado: conserva el ID propio, retira ambos arranques automáticos y no duplica componentes. Se comprobó sintaxis TypeScript. Esto no sustituye la suite del repositorio ni Android/Kotlin reales.
