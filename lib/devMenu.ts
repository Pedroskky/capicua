// Menú de desarrollo (borrar la partida, probar la pantalla de error): en `expo start` y en el APK del perfil `preview`
// (EXPO_PUBLIC_DEV_MENU=1 en eas.json). Nunca en el perfil `production`.
export const DEV_MENU = __DEV__ || process.env.EXPO_PUBLIC_DEV_MENU === '1';
