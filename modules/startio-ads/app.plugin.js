// Config plugin del módulo de Start.io: escribe el App ID en el AndroidManifest de la app.
//
// Por qué hace falta: el SDK de Start.io trae un ContentProvider (StartAppInitProvider) que lo arranca
// solo al abrirse la app, antes de que exista JavaScript, y en ese momento lee el App ID de la meta-data
// `com.startapp.sdk.APPLICATION_ID`. Sin ella, el SDK sale con el App ID «undefined» y el panel de
// Start.io no cuenta los pedidos de anuncios de este juego (ni impresiones ni ingresos).
//
// Uso en app.json: ["./modules/startio-ads/app.plugin.js", { "appId": "210380064" }]
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const APP_ID_KEY = 'com.startapp.sdk.APPLICATION_ID';
// El juego tiene su propio aviso de consentimiento (lib/ads/consent.ts): nunca el diálogo de Start.io.
const CONSENT_KEY = 'com.startapp.sdk.CONSENT_ENABLED';

/** Un App ID de Start.io son solo cifras (p. ej. "210380064"). Si no, la compilación se para. */
function validAppId(appId) {
  const id = typeof appId === 'number' ? String(appId) : appId;
  if (typeof id !== 'string' || !/^\d{6,12}$/.test(id.trim())) {
    throw new Error(
      `[startio-ads] Falta el App ID de Start.io o no es válido (${JSON.stringify(appId)}). ` +
        'Ponlo en app.json: ["./modules/startio-ads/app.plugin.js", { "appId": "<App ID>" }].',
    );
  }
  return id.trim();
}

/** Añade (o sustituye) la meta-data del App ID en el <application> del manifiesto. */
function setStartioMetaData(androidManifest, appId) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, APP_ID_KEY, validAppId(appId));
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, CONSENT_KEY, 'false');
  return androidManifest;
}

function withStartioAds(config, props = {}) {
  const appId = validAppId(props.appId);
  return withAndroidManifest(config, (mod) => {
    mod.modResults = setStartioMetaData(mod.modResults, appId);
    return mod;
  });
}

module.exports = withStartioAds;
module.exports.setStartioMetaData = setStartioMetaData;
module.exports.validAppId = validAppId;
module.exports.APP_ID_KEY = APP_ID_KEY;
module.exports.CONSENT_KEY = CONSENT_KEY;
