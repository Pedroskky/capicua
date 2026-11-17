package expo.modules.startioads

import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import com.startapp.sdk.adsbase.Ad
import com.startapp.sdk.adsbase.StartAppAd
import com.startapp.sdk.adsbase.StartAppSDK
import com.startapp.sdk.adsbase.adlisteners.AdDisplayListener
import com.startapp.sdk.adsbase.adlisteners.AdEventListener
import com.startapp.sdk.adsbase.adlisteners.VideoListener
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Envuelve el SDK de Start.io para que el juego decida cuándo sale cada anuncio.
 * - Sin anuncio de bienvenida (splash) ni «return ads»: solo los anuncios que pide el juego.
 * - Sin el diálogo de consentimiento de Start.io: el juego tiene el suyo y llama a setConsent.
 * - Cada anuncio va en un «hueco» con nombre (p. ej. "interstitial", "doubleCoins"), así un juego
 *   puede tener varios anuncios cargados a la vez.
 */
class StartioAdsModule : Module() {
  private val ads = mutableMapOf<String, StartAppAd>()
  private var initialized = false

  // Diagnóstico (Ajustes → Desarrollo → «Diagnóstico de anuncios»).
  private var initAppId: String? = null
  private var initTestMode: Boolean? = null
  private var initError: String? = null
  private var lastAdKey: String? = null
  private var lastAdResult: String? = null
  private var lastAdMessage: String? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  /** Para enseñar un anuncio a pantalla completa es mejor la Activity actual. */
  private val adContext: Context
    get() = appContext.currentActivity ?: context

  override fun definition() = ModuleDefinition {
    Name("StartioAds")

    Events("onAdLoaded", "onAdFailed", "onAdClosed", "onRewardEarned")

    // Consentimiento GDPR para anuncios personalizados ("pas"). Se llama antes de init y cada vez que cambia.
    Function("setConsent") { personalized: Boolean ->
      StartAppSDK.setUserConsent(context, "pas", System.currentTimeMillis(), personalized)
    }

    AsyncFunction("init") { appId: String, testMode: Boolean, promise: Promise ->
      if (initialized) {
        promise.resolve(true)
        return@AsyncFunction
      }
      // El SDK ya se arrancó solo con el App ID del manifiesto (app.plugin.js); aquí se usa el mismo.
      // Si JS no manda nada válido, se usa el del manifiesto: nunca se inicia con un App ID vacío.
      val manifestId = manifestAppId()
      val fromJs = appId.trim().takeIf { it.isNotEmpty() && it.all(Char::isDigit) }
      val id = fromJs ?: manifestId?.trim()?.takeIf { it.isNotEmpty() && it.all(Char::isDigit) } ?: ""
      initAppId = id.ifEmpty { appId }
      initTestMode = testMode
      if (id.isEmpty()) {
        initError = "App ID vacío"
        promise.resolve(false)
        return@AsyncFunction
      }
      if (manifestId != null && manifestId != id) initError = "App ID distinto del manifiesto ($manifestId)"
      try {
        StartAppSDK.setTestAdsEnabled(testMode)
        StartAppAd.disableSplash()
        StartAppAd.disableAutoInterstitial()
        StartAppSDK.enableReturnAds(false)
        StartAppSDK.enableConsent(context, false)
        StartAppSDK.initParams(context, id)
          .setReturnAdsEnabled(false)
          .setCallback {
            initialized = true
            promise.resolve(true)
          }
          .init()
      } catch (error: Throwable) {
        initError = error.message ?: error.javaClass.simpleName
        promise.resolve(false)
      }
    }.runOnQueue(Queues.MAIN)

    // Lo que sabe el módulo del SDK, para la pantalla de diagnóstico de los APK de prueba.
    Function("getDiagnostics") {
      Bundle().apply {
        putString("manifestAppId", manifestAppId())
        putString("initAppId", initAppId)
        putBoolean("initialized", initialized)
        if (initTestMode != null) putBoolean("testMode", initTestMode == true)
        putString("initError", initError)
        putString("lastAdKey", lastAdKey)
        putString("lastAdResult", lastAdResult)
        putString("lastAdMessage", lastAdMessage)
      }
    }

    // Carga un anuncio en un hueco. rewarded = vídeo con recompensa; si no, intersticial.
    AsyncFunction("load") { key: String, rewarded: Boolean ->
      val ad = StartAppAd(adContext)
      ads[key] = ad
      if (rewarded) {
        // Solo se avisa cuando el vídeo se ha visto entero: entonces se da la recompensa.
        ad.setVideoListener(VideoListener { sendEvent("onRewardEarned", eventBody(key)) })
      }
      val mode = if (rewarded) StartAppAd.AdMode.REWARDED_VIDEO else StartAppAd.AdMode.AUTOMATIC
      ad.loadAd(mode, object : AdEventListener {
        override fun onReceiveAd(loaded: Ad) {
          lastAd(key, "loaded", null)
          if (ads[key] === ad) sendEvent("onAdLoaded", eventBody(key))
        }

        override fun onFailedToReceiveAd(failed: Ad?) {
          val message = failed?.errorMessage ?: "sin mensaje"
          lastAd(key, "failed", message)
          if (ads[key] === ad) sendEvent("onAdFailed", eventBody(key).apply { putString("message", message) })
        }
      })
    }.runOnQueue(Queues.MAIN)

    Function("isReady") { key: String ->
      ads[key]?.isReady == true
    }

    // Enseña el anuncio del hueco. Devuelve false si no había ninguno listo.
    AsyncFunction("show") { key: String ->
      val ad = ads[key]
      if (ad == null || !ad.isReady) return@AsyncFunction false
      ad.showAd(object : AdDisplayListener {
        override fun adHidden(shown: Ad?) {
          sendEvent("onAdClosed", eventBody(key, displayed = true))
        }

        override fun adDisplayed(shown: Ad?) {}

        override fun adClicked(shown: Ad?) {}

        override fun adNotDisplayed(shown: Ad?) {
          sendEvent("onAdClosed", eventBody(key, displayed = false))
        }
      })
    }.runOnQueue(Queues.MAIN)
  }

  private fun lastAd(key: String, result: String, message: String?) {
    lastAdKey = key
    lastAdResult = result
    lastAdMessage = message
  }

  /** El App ID que el config plugin escribió en el AndroidManifest (el que lee el SDK al arrancar). */
  private fun manifestAppId(): String? =
    try {
      val ctx = appContext.reactContext ?: return null
      val info = ctx.packageManager.getApplicationInfo(ctx.packageName, PackageManager.GET_META_DATA)
      info.metaData?.get("com.startapp.sdk.APPLICATION_ID")?.toString()
    } catch (error: Throwable) {
      null
    }

  private fun eventBody(key: String, displayed: Boolean? = null): Bundle =
    Bundle().apply {
      putString("key", key)
      if (displayed != null) putBoolean("displayed", displayed)
    }
}
