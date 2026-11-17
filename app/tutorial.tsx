// Tutorial corto (la primera vez y desde Ajustes): parejas, jugar por las puntas, elegir punta, paso y tranque,
// y cómo se cuentan los puntos. «Ya sé jugar» lo salta. Se puede desplazar y respeta la zona segura.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/game/config';
import { TUTORIAL_STEPS } from '@/game/tutorial';
import { SkiaGate } from '@/components/game/SkiaGate';
import { ActionButton } from '@/components/ui/ActionButton';
import { FONTS } from '@/components/ui/theme';
import { useSettings } from '@/hooks/useSettings';
import { t, type TranslationKey } from '@/lib/i18n';

export default function TutorialScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { updateSettings } = useSettings();
  const [step, setStep] = useState(0);
  const artW = Math.min(width - 40, 380);
  const artH = Math.round(artW * 0.6);

  const finish = () => {
    updateSettings({ tutorialSeen: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('tutorial.title')}</Text>
        <View style={{ width: artW, height: artH, alignSelf: 'center' }}>
          <SkiaGate
            key={step}
            getComponent={() =>
              import('@/components/tutorial/TutorialArt').then((module) => ({
                default: function Art() {
                  return <module.TutorialArt step={step} width={artW} height={artH} />;
                },
              }))
            }
          />
        </View>
        <Text style={styles.stepTitle}>{t(`tutorial.step${step}.title` as TranslationKey)}</Text>
        <Text style={styles.text}>{t(`tutorial.step${step}.text` as TranslationKey)}</Text>
        <View style={styles.dots}>
          {Array.from({ length: TUTORIAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.buttons}>
          {step < TUTORIAL_STEPS - 1 ? (
            <ActionButton label={t('tutorial.next')} onPress={() => setStep(step + 1)} />
          ) : (
            <ActionButton label={t('tutorial.start')} onPress={finish} />
          )}
          {step > 0 && <ActionButton variant="secondary" label={t('tutorial.back')} onPress={() => setStep(step - 1)} />}
          {step < TUTORIAL_STEPS - 1 && <ActionButton variant="secondary" label={t('tutorial.skip')} onPress={finish} />}
        </View>
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
    gap: 14,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 34,
    color: COLORS.accent,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    lineHeight: 23,
    color: COLORS.text,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.surfaceBorder,
  },
  dotOn: {
    backgroundColor: COLORS.accent,
  },
  buttons: {
    alignItems: 'center',
    gap: 10,
  },
});
