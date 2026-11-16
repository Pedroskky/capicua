import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AI_LEVELS, COLORS, DEFAULT_RULES, HOUSE_RULE_OPTIONS, type AiLevel, type AiSpeed, type DominoRules } from '@/game/config';
import { findScenario, type DevScenario } from '@/game/devScenarios';
import { toSavedMatch } from '@/game/savedMatch';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Segmented } from '@/components/ui/Segmented';
import { SettingRow } from '@/components/ui/SettingRow';
import { useSettings } from '@/hooks/useSettings';
import { DEV_MENU } from '@/lib/devMenu';
import { setForcedScenario } from '@/lib/devForced';
import { matchStore } from '@/lib/matchStore';
import type { LanguagePreference } from '@/lib/settings';
import { levelName, t } from '@/lib/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const [crash, setCrash] = useState(false);
  if (crash) throw new Error('Prueba de «Algo salió mal» desde Ajustes');

  const rules = settings.rules;
  const setRule = (patch: Partial<DominoRules>) => updateSettings({ rules: { ...rules, ...patch } });

  const force = (kind: DevScenario) => {
    const match = findScenario(kind, rules, settings.aiLevel);
    if (!match) {
      setDevMessage(t('settings.devForceFail'));
      return;
    }
    setForcedScenario(kind);
    matchStore
      .save(toSavedMatch(match))
      .catch(() => undefined)
      .finally(() => router.push('/game'));
  };

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

        <Text style={styles.section}>{t('settings.level')}</Text>
        <Segmented<AiLevel>
          value={settings.aiLevel}
          onChange={(aiLevel) => updateSettings({ aiLevel })}
          options={AI_LEVELS.map((level) => ({ value: level, label: levelName(level, true) }))}
        />
        <Text style={styles.note}>{t('settings.levelNote')}</Text>

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

        <Text style={styles.section}>{t('settings.help')}</Text>
        <SettingRow label={t('settings.tileCounter')} value={settings.tileCounter} onToggle={() => updateSettings({ tileCounter: !settings.tileCounter })} />

        <Text style={styles.section}>{t('settings.houseRules')}</Text>
        <Text style={styles.note}>{t('settings.houseRulesNote')}</Text>
        <Text style={styles.label}>{t('settings.ruleStarter')}</Text>
        <Segmented<DominoRules['nextStarter']>
          value={rules.nextStarter}
          onChange={(nextStarter) => setRule({ nextStarter })}
          options={[
            { value: 'nextPlayer', label: t('settings.ruleStarterNext') },
            { value: 'handWinner', label: t('settings.ruleStarterWinner') },
          ]}
        />
        <Text style={styles.label}>{t('settings.ruleCounts')}</Text>
        <Segmented<DominoRules['dominoCounts']>
          value={rules.dominoCounts}
          onChange={(dominoCounts) => setRule({ dominoCounts })}
          options={[
            { value: 'all', label: t('settings.ruleCountsAll') },
            { value: 'opponents', label: t('settings.ruleCountsOpp') },
          ]}
        />
        <Text style={styles.label}>{t('settings.ruleCapicua')}</Text>
        <Segmented<string>
          value={String(rules.capicuaBonus)}
          onChange={(v) => setRule({ capicuaBonus: Number(v) })}
          options={HOUSE_RULE_OPTIONS.capicuaBonus.map((n) => ({ value: String(n), label: String(n) }))}
        />
        <Text style={styles.label}>{t('settings.ruleTarget')}</Text>
        <Segmented<string>
          value={String(rules.targetScore)}
          onChange={(v) => setRule({ targetScore: Number(v) })}
          options={HOUSE_RULE_OPTIONS.targetScore.map((n) => ({ value: String(n), label: String(n) }))}
        />
        <Text style={styles.label}>{t('settings.ruleTie')}</Text>
        <Segmented<DominoRules['tranqueTie']>
          value={rules.tranqueTie}
          onChange={(tranqueTie) => setRule({ tranqueTie })}
          options={[
            { value: 'none', label: t('settings.ruleTieNone') },
            { value: 'blocker', label: t('settings.ruleTieBlocker') },
          ]}
        />
        <Text style={styles.label}>{t('settings.ruleSameEnds')}</Text>
        <Segmented<'no' | 'yes'>
          value={rules.capicuaNeedsDifferentEnds ? 'no' : 'yes'}
          onChange={(v) => setRule({ capicuaNeedsDifferentEnds: v === 'no' })}
          options={[
            { value: 'no', label: t('settings.ruleSameEndsNo') },
            { value: 'yes', label: t('settings.ruleSameEndsYes') },
          ]}
        />
        <View style={styles.center}>
          <ActionButton compact label={t('settings.rulesReset')} variant="secondary" onPress={() => updateSettings({ rules: DEFAULT_RULES })} />
        </View>

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
            <SettingRow
              label={t('settings.devTableNumbers')}
              value={settings.devTableNumbers}
              onToggle={() => updateSettings({ devTableNumbers: !settings.devTableNumbers })}
            />
            <SettingRow label={t('settings.devShowHands')} value={settings.devShowHands} onToggle={() => updateSettings({ devShowHands: !settings.devShowHands })} />
            <View style={styles.center}>
              <ActionButton label={t('settings.devForceTranque')} variant="secondary" onPress={() => force('tranque')} />
              <ActionButton label={t('settings.devForceCapicua')} variant="secondary" onPress={() => force('capicua')} />
              <Text style={styles.note}>{t('settings.devForceHint')}</Text>
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
    paddingBottom: 48,
  },
  section: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  note: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  dev: {
    marginTop: 16,
    gap: 12,
  },
  devMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
