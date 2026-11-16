import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AiSpeed } from '@/game/config';
import { COLORS } from '@/game/config';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Segmented } from '@/components/ui/Segmented';
import { SettingRow } from '@/components/ui/SettingRow';
import { useSettings } from '@/hooks/useSettings';
import { DEV_MENU } from '@/lib/devMenu';
import { matchStore } from '@/lib/matchStore';
import type { LanguagePreference } from '@/lib/settings';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const [crash, setCrash] = useState(false);
  if (crash) throw new Error('Prueba de «Algo salió mal» desde Ajustes');

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('settings.title')} />
        <SettingRow label={t('settings.sound')} value={settings.sound} onToggle={() => updateSettings({ sound: !settings.sound })} />
        <SettingRow label={t('settings.music')} value={settings.music} onToggle={() => updateSettings({ music: !settings.music })} />
        <SettingRow
          label={t('settings.vibration')}
          value={settings.vibration}
          onToggle={() => updateSettings({ vibration: !settings.vibration })}
        />

        <Text style={styles.section}>{t('settings.aiSpeed')}</Text>
        <Segmented<AiSpeed>
          value={settings.aiSpeed}
          onChange={(aiSpeed) => updateSettings({ aiSpeed })}
          options={[
            { value: 'slow', label: t('settings.speedSlow') },
            { value: 'normal', label: t('settings.speedNormal') },
            { value: 'fast', label: t('settings.speedFast') },
          ]}
        />

        <Text style={styles.section}>{t('settings.language')}</Text>
        <Segmented<LanguagePreference>
          value={settings.language}
          onChange={(language) => updateSettings({ language })}
          options={[
            { value: 'auto', label: t('settings.languageAuto') },
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
          ]}
        />

        {DEV_MENU && (
          <View style={styles.dev}>
            <Text style={styles.section}>{t('settings.dev')}</Text>
            <ActionButton
              label={t('settings.devClear')}
              variant="danger"
              onPress={() => {
                matchStore.save(null).catch(() => undefined);
                setDevMessage(t('settings.devCleared'));
              }}
            />
            <ActionButton label={t('settings.devCrash')} variant="secondary" onPress={() => setCrash(true)} />
            {devMessage && <Text style={styles.devMessage}>{devMessage}</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  section: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  dev: {
    marginTop: 16,
    gap: 12,
    alignItems: 'center',
  },
  devMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
