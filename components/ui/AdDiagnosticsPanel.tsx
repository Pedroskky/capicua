import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clapperboard, Download, Megaphone } from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { appIdProblems } from '@/game/adDiagnostics';
import { devLoadTestAd, devShowTestAd, getAdDiagnostics, isTestAdReady, subscribeAds, type AdTestSlot } from '@/lib/ads';
import { t } from '@/lib/i18n';
import { ActionButton } from './ActionButton';
import { FONTS } from './theme';

const REFRESH_MS = 1000;

/** Ajustes → Desarrollo (solo con DEV_MENU): qué App ID recibe Start.io y cómo va el último anuncio. */
export function AdDiagnosticsPanel() {
  const [diag, setDiag] = useState(getAdDiagnostics);
  const [ready, setReady] = useState({ interstitial: false, rewarded: false });

  const refresh = useCallback(() => {
    setDiag(getAdDiagnostics());
    setReady({ interstitial: isTestAdReady('interstitial'), rewarded: isTestAdReady('rewarded') });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAds(refresh);
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [refresh]);

  const problems = appIdProblems(diag);
  const yesNo = (value: boolean | null) => (value === null ? t('dev.ads.unknown') : value ? t('dev.ads.yes') : t('dev.ads.no'));
  const lastResult =
    diag.lastAdResult === 'loaded'
      ? t('dev.ads.loaded', { key: diag.lastAdKey ?? '' })
      : diag.lastAdResult === 'failed'
        ? t('dev.ads.failed', { key: diag.lastAdKey ?? '', message: diag.lastAdMessage ?? '' })
        : t('dev.ads.none');

  const loadOrShow = (slot: AdTestSlot) => {
    const action = ready[slot] ? devShowTestAd(slot) : devLoadTestAd(slot);
    Promise.resolve(action)
      .catch(() => undefined)
      .finally(refresh);
  };

  const rows: [string, string, boolean?][] = [
    [t('dev.ads.supported'), yesNo(diag.supported)],
    [t('dev.ads.expected'), diag.expectedAppId],
    [t('dev.ads.manifest'), diag.manifestAppId ?? '—', diag.supported ? !problems.includes('manifest') : undefined],
    [t('dev.ads.received'), diag.initAppId ?? '—', diag.initAppId === null ? undefined : !problems.includes('init')],
    [t('dev.ads.initialized'), yesNo(diag.initialized), diag.supported ? diag.initialized : undefined],
    [t('dev.ads.testMode'), yesNo(diag.testMode)],
    [t('dev.ads.last'), lastResult, diag.lastAdResult === null ? undefined : diag.lastAdResult === 'loaded'],
  ];
  if (diag.initError) rows.push([t('dev.ads.error'), diag.initError, false]);

  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <Megaphone size={16} color={COLORS.accent} />
        <Text style={styles.title}>{t('dev.ads.title')}</Text>
      </View>
      {rows.map(([label, value, ok]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, ok === true && styles.ok, ok === false && styles.bad]} selectable>
            {value}
          </Text>
        </View>
      ))}
      {!diag.supported && <Text style={styles.hint}>{t('dev.ads.unsupported')}</Text>}
      <ActionButton
        variant="secondary"
        compact
        icon={ready.interstitial ? Megaphone : Download}
        label={ready.interstitial ? t('dev.ads.showInterstitial') : t('dev.ads.loadInterstitial')}
        disabled={!diag.supported}
        onPress={() => loadOrShow('interstitial')}
      />
      <ActionButton
        variant="secondary"
        compact
        icon={ready.rewarded ? Clapperboard : Download}
        label={ready.rewarded ? t('dev.ads.showVideo') : t('dev.ads.loadVideo')}
        disabled={!diag.supported}
        onPress={() => loadOrShow('rewarded')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  value: {
    flexShrink: 1,
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'right',
  },
  ok: {
    color: COLORS.success,
  },
  bad: {
    color: COLORS.danger,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
});
