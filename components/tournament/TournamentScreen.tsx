// Torneo del barrio: el camino de las 12 parejas (un solo lienzo Skia con el camino y los medallones; encima, en
// React, el nombre, el estilo, el nivel, las estrellas y el botón). Candados hasta vencer a la anterior, y
// celebración con confeti al ganar el torneo completo.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture, type SkPicture } from '@shopify/react-native-skia';
import { Lock, Star, Trophy } from 'lucide-react-native';
import { COLORS, TOURNAMENT } from '@/game/config';
import { createMatch } from '@/game/engine';
import { toSavedMatch } from '@/game/savedMatch';
import { RIVALS, isChampion, isUnlocked, pairReward } from '@/game/tournament';
import { record, solid, stroke } from '@/components/art/paint';
import { drawPair } from '@/components/art/avatar';
import { ActionButton } from '@/components/ui/ActionButton';
import { Confetti } from '@/components/art/Confetti';
import { ShareButtonImpl } from '@/components/share/ShareButtonImpl';
import { championShareCard } from '@/components/share/cards';
import { TabHeader } from '@/components/ui/TabHeader';
import { FONTS, shadowText } from '@/components/ui/theme';
import { useProgress } from '@/hooks/useProgress';
import { markChampionCelebrated } from '@/lib/activity';
import { matchStore } from '@/lib/matchStore';
import { settingsStore } from '@/lib/settings';
import { levelName, rivalName, t, type TranslationKey } from '@/lib/i18n';

const ROW_H = 132;
const MEDAL_R = 40;
const SIDE = 64;

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export default function TournamentScreen() {
  const router = useRouter();
  const progress = useProgress();
  const [width, setWidth] = useState(0);
  const totalStars = progress.tournamentStars.reduce((a, b) => a + b, 0);
  const champion = isChampion(progress);

  const nodeX = (i: number) => (i % 2 === 0 ? SIDE : width - SIDE);
  const nodeY = (i: number) => ROW_H * i + ROW_H / 2;

  const path = useMemo<SkPicture | null>(() => {
    if (width === 0) return null;
    return record(width, ROW_H * RIVALS.length, (canvas) => {
      for (let i = 0; i + 1 < RIVALS.length; i++) {
        const open = isUnlocked(progress, i + 1);
        const paint = open ? stroke(COLORS.accent, 5, 0.9) : stroke('#FFFFFF', 3, 0.18);
        const x0 = nodeX(i);
        const y0 = nodeY(i);
        const x1 = nodeX(i + 1);
        const y1 = nodeY(i + 1);
        // Tramo curvo a trozos (puntos), para que se vea como un camino.
        const steps = 18;
        for (let s = 0; s < steps; s += open ? 1 : 2) {
          const a = s / steps;
          const b = (s + 0.6) / steps;
          const ease = (u: number) => u * u * (3 - 2 * u);
          canvas.drawLine(x0 + (x1 - x0) * ease(a), y0 + (y1 - y0) * a, x0 + (x1 - x0) * ease(b), y0 + (y1 - y0) * b, paint);
        }
      }
      RIVALS.forEach((r, i) => {
        const unlocked = isUnlocked(progress, i);
        if (progress.tournamentStars[i] > 0) canvas.drawCircle(nodeX(i), nodeY(i), MEDAL_R + 5, solid(COLORS.accent, 0.9));
        drawPair(canvas, nodeX(i), nodeY(i), MEDAL_R, r.color, r.members, !unlocked);
      });
      if (champion) canvas.drawCircle(nodeX(RIVALS.length - 1), nodeY(RIVALS.length - 1), MEDAL_R + 10, stroke('#FFF3B0', 3));
    });
    // nodeX/nodeY dependen de width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, progress, champion]);

  const play = (index: number) => {
    const s = settingsStore.current();
    const rules = { ...(s?.rules ?? createMatch(1).rules), targetScore: TOURNAMENT.targetScore };
    matchStore
      .save(toSavedMatch(createMatch(newSeed(), rules, { mode: 'partners', aiLevel: RIVALS[index].level, tournament: index })))
      .catch(() => undefined)
      .finally(() => router.push('/game'));
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <TabHeader title={t('tabs.tournament')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, shadowText]}>{t('tour.title')}</Text>
        <Text style={styles.subtitle}>{t('tour.subtitle')}</Text>
        <View style={styles.starsRow}>
          <Star size={18} color={COLORS.accent} fill={COLORS.accent} />
          <Text style={styles.starsText}>{t('tour.stars', { n: totalStars })}</Text>
        </View>
        <Text style={styles.help}>{t('tour.starsHelp')}</Text>
        <View style={[styles.path, { height: ROW_H * RIVALS.length }]} onLayout={onLayout}>
          {path && (
            <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height: ROW_H * RIVALS.length }}>
              <Picture picture={path} />
            </Canvas>
          )}
          {width > 0 &&
            RIVALS.map((r, i) => {
              const unlocked = isUnlocked(progress, i);
              const stars = progress.tournamentStars[i];
              const left = i % 2 === 0;
              return (
                <View key={r.id} style={[styles.node, { top: ROW_H * i, left: left ? SIDE + MEDAL_R + 12 : 8, right: left ? 8 : SIDE + MEDAL_R + 12 }]}>
                  {!unlocked && (
                    <View pointerEvents="none" style={[styles.lock, { left: left ? -MEDAL_R - 12 - 10 : undefined, right: left ? undefined : -MEDAL_R - 12 - 10 }]}>
                      <Lock size={22} color={COLORS.text} />
                    </View>
                  )}
                  <Text style={[styles.name, !unlocked && styles.muted, { textAlign: left ? 'left' : 'right' }]} numberOfLines={2}>
                    {i + 1}. {rivalName(r.id)}
                  </Text>
                  <Text style={[styles.meta, { textAlign: left ? 'left' : 'right' }]} numberOfLines={2}>
                    {unlocked ? t(`rival.${r.id}.style` as TranslationKey) : t('tour.locked')}
                  </Text>
                  <Text style={[styles.meta, { textAlign: left ? 'left' : 'right' }]}>
                    {t('tour.level', { level: levelName(r.level) })} · {t('tour.reward', { n: pairReward(i) })}
                  </Text>
                  <View style={[styles.nodeFoot, { justifyContent: left ? 'flex-start' : 'flex-end' }]}>
                    <View style={styles.starIcons}>
                      {[1, 2, 3].map((k) => (
                        <Star key={k} size={16} color={COLORS.accent} fill={stars >= k ? COLORS.accent : 'transparent'} />
                      ))}
                    </View>
                    {unlocked && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => play(i)}
                        style={({ pressed }) => [styles.playBtn, stars > 0 && styles.replayBtn, pressed && styles.pressed]}
                      >
                        <Text style={[styles.playText, stars > 0 && styles.replayText]}>{stars > 0 ? t('tour.replay') : t('tour.play')}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
        </View>
      </ScrollView>
      {champion && !progress.championCelebrated && <Celebration onClose={() => markChampionCelebrated().catch(() => undefined)} />}
    </SafeAreaView>
  );
}

/** Celebración del campeón: confeti que cae y el trofeo. */
function Celebration({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.celebration}>
      <Confetti />
      <Trophy size={80} color={COLORS.accent} strokeWidth={1.6} />
      <Text style={[styles.champTitle, shadowText]}>{t('tour.championTitle')}</Text>
      <Text style={styles.champText}>{t('tour.championText')}</Text>
      <Text style={styles.champBonus}>{t('tour.championBonus', { n: TOURNAMENT.championBonus })}</Text>
      <ActionButton label={t('tour.close')} onPress={onClose} />
      <ShareButtonImpl card={championShareCard()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 8,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 32,
    color: COLORS.accent,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  help: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  path: {
    marginTop: 8,
  },
  node: {
    position: 'absolute',
    height: ROW_H,
    justifyContent: 'center',
    gap: 2,
  },
  lock: {
    position: 'absolute',
    top: ROW_H / 2 - 11,
    width: 22,
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },
  muted: {
    color: COLORS.textMuted,
  },
  meta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  nodeFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  starIcons: {
    flexDirection: 'row',
    gap: 2,
  },
  playBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
  },
  replayBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  playText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.accentText,
  },
  replayText: {
    color: COLORS.accent,
  },
  pressed: {
    opacity: 0.85,
  },
  celebration: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,36,24,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  champTitle: {
    fontFamily: FONTS.title,
    fontSize: 38,
    color: COLORS.accent,
    textAlign: 'center',
  },
  champText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  champBonus: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.accent,
  },
});
