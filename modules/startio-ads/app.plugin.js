// Config plugin de Start.io: conserva el App ID para diagnóstico y usa un único inicio manual.
// Retira las entradas de inicio automático del SDK. El módulo Kotlin activa el modo de prueba
// antes de initParams y reporta el consentimiento tras el callback, antes de cargar anuncios.
//
// Uso en app.json: ["./modules/startio-ads/app.plugin.js", { "appId": "210753000" }]
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

/** Marca un componente heredado del SDK para que el merger lo retire. */
function removeSdkComponent(components, name, attributes = {}) {
  let component = components.find((item) => item.$?.['android:name'] === name);
  if (!component) {
    component = { $: {} };
    components.push(component);
  }
  component.$ = { ...component.$, ...attributes, 'android:name': name, 'tools:node': 'remove' };
}

/** Añade (o sustituye) la meta-data del App ID en el <application> del manifiesto. */
function setStartioMetaData(androidManifest, appId) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  // Usamos inicio manual para que el SDK arranque con la configuración del juego.
  // El proveedor y el receptor de reinicio del AAR llaman al mismo inicio automático.
  androidManifest.manifest.$ ??= {};
  androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  removeSdkComponent(app.provider ??= [], 'com.startapp.sdk.adsbase.StartAppInitProvider', {
    'android:authorities': '${applicationId}.startappinitprovider',
  });
  removeSdkComponent(app.receiver ??= [], 'com.startapp.sdk.adsbase.remoteconfig.BootCompleteListener');
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, APP_ID_KEY, validAppId(appId));
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, CONSENT_KEY, 'false');
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'com.startapp.sdk.RETURN_ADS_ENABLED', 'false');
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'com.startapp.sdk.SPLASH_ENABLED', 'false');
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
