// Pantalla de la partida: lleva el turno (tú tocas una ficha, la máquina piensa con su velocidad), los avisos
// («¡Paso!», «¡Capicúa!», «¡Tranca!», «¡Zapatero!»), el sonido y el guardado (tras cada jugada y al ir al fondo).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { AI_DELAY_MS, COLORS, TIMING } from '@/game/config';
import { aiView, chooseMove } from '@/game/ai';
import {
  canPlay,
  createMatch,
  endsForTile,
  legalMoves,
  lineEnds,
  passTurn,
  playMove,
  startNextHand,
  type End,
  type MatchState,
  type Move,
} from '@/game/engine';
import { DOUBLE_SIX, type TileId } from '@/game/tiles';
import { toSavedMatch } from '@/game/savedMatch';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HandSummary } from '@/components/game/HandSummary';
import { PlayerBadge } from '@/components/game/PlayerBadge';
import { computeRegions } from '@/components/game/regions';
import { FONTS, shadowText } from '@/components/ui/theme';
import { useSettings } from '@/hooks/useSettings';
import { createMusic, createSoundBank, vibrate, type MusicPlayer, type SoundBank, type SoundName } from '@/lib/feedback';
import { matchStore } from '@/lib/matchStore';
import { playerName, t } from '@/lib/i18n';
import { DEV_MENU } from '@/lib/devMenu';

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function initialMatch(): MatchState {
  const saved = matchStore.current();
  if (saved && saved.match.winnerTeam === null) return saved.match;
  return createMatch(newSeed());
}

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [match, setMatch] = useState<MatchState>(initialMatch);
  const [pending, setPending] = useState<TileId | null>(null);
  const [passed, setPassed] = useState<number[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const live = useRef({ match, settings });
  live.current = { match, settings };

  // Sonido y música (opcionales: si fallan, la partida sigue).
  const sounds = useRef<SoundBank | null>(null);
  const music = useRef<MusicPlayer | null>(null);
  useEffect(() => {
    try {
      sounds.current = createSoundBank();
      music.current = createMusic();
    } catch {
      sounds.current = null;
      music.current = null;
    }
    return () => {
      sounds.current?.dispose();
      music.current?.dispose();
    };
  }, []);
  useEffect(() => {
    music.current?.setPlaying(settings.music);
  }, [settings.music]);
  const play = useCallback((name: SoundName) => {
    if (live.current.settings.sound) sounds.current?.play(name);
  }, []);
  const buzz = useCallback((pattern: 'tap' | 'medium' | 'success') => {
    if (live.current.settings.vibration) vibrate(pattern);
  }, []);

  // Guardado: tras cada cambio y al mandar la app al fondo.
  useEffect(() => {
    matchStore.save(toSavedMatch(match)).catch(() => undefined);
  }, [match]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') matchStore.save(toSavedMatch(live.current.match)).catch(() => undefined);
      if (live.current.settings.music) music.current?.setPlaying(state === 'active');
    });
    return () => sub.remove();
  }, []);

  // Barajeo al empezar cada mano.
  const handNumber = match.hand.number;
  useEffect(() => {
    if (live.current.match.hand.line.length === 0) play('shuffle');
  }, [handNumber, play]);

  const showPass = useCallback(
    (seat: number) => {
      play('pass');
      setPassed((list) => [...list.filter((s) => s !== seat), seat]);
      setTimeout(() => setPassed((list) => list.filter((s) => s !== seat)), TIMING.passBubbleMs);
    },
    [play],
  );

  const doMove = useCallback((move: Move | null) => {
    const current = live.current.match;
    const seat = current.hand.turn;
    try {
      if (move) setMatch(playMove(current, move));
      else {
        setMatch(passTurn(current));
        showPass(seat);
      }
    } catch (error) {
      // Nunca debería pasar (el motor ya validó); en desarrollo se avisa.
      if (DEV_MENU) console.warn('Jugada rechazada', error);
    }
  }, [showPass]);

  // Quién juega ahora: la máquina tras pensar, tú pasas solo si no puedes jugar, y al final de la mano los avisos.
  useEffect(() => {
    const hand = match.hand;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (hand.result) {
      if (showSummary) return;
      const calls: string[] = [];
      if (hand.result.capicua) calls.push(t('call.capicua'));
      else if (hand.result.kind === 'domino') calls.push(t('call.domino'));
      else calls.push(t('call.tranque'));
      if (match.zapatero) calls.push(t('call.zapatero'));
      let at = TIMING.handEndPauseMs;
      timers.push(
        setTimeout(() => {
          play('domino');
          buzz('success');
        }, at),
      );
      calls.forEach((call) => {
        timers.push(setTimeout(() => setBanner(call), at));
        at += TIMING.bannerMs;
      });
      timers.push(
        setTimeout(() => {
          setBanner(null);
          setShowSummary(true);
        }, at),
      );
    } else if (hand.turn !== 0) {
      timers.push(setTimeout(() => doMove(chooseMove(aiView(match, hand.turn))), AI_DELAY_MS[settings.aiSpeed]));
    } else if (!canPlay(match, 0)) {
      timers.push(setTimeout(() => doMove(null), TIMING.humanAutoPassMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [match, showSummary, settings.aiSpeed, doMove, play, buzz]);

  const myTurn = !match.hand.result && match.hand.turn === 0;
  const playable = useMemo(() => (myTurn ? new Set(legalMoves(match, 0).map((m) => m.tile)) : null), [match, myTurn]);

  const onTapTile = useCallback(
    (tile: TileId) => {
      const current = live.current.match;
      if (current.hand.result || current.hand.turn !== 0) return;
      const ends = endsForTile(current, 0, tile);
      if (ends.length === 0) {
        buzz('medium');
        return;
      }
      buzz('tap');
      if (ends.length === 2) {
        setPending((p) => (p === tile ? null : tile));
        return;
      }
      setPending(null);
      doMove({ tile, end: ends[0] });
    },
    [buzz, doMove],
  );

  const chooseEnd = (end: End) => {
    if (pending === null) return;
    const tile = pending;
    setPending(null);
    doMove({ tile, end });
  };

  const onLanded = useCallback(() => {
    play('clac');
  }, [play]);

  const nextHand = () => {
    if (match.winnerTeam !== null) {
      router.replace('/result');
      return;
    }
    setShowSummary(false);
    setMatch(startNextHand(match));
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.w !== width || size.h !== height) setSize({ w: width, h: height });
  };

  const regions = useMemo(() => (size ? computeRegions(size.w, size.h, insets.top, insets.bottom) : null), [size, insets.top, insets.bottom]);
  const ends = lineEnds(match.hand.line);
  const counts = useMemo(() => match.hand.hands.map((h) => h.length), [match.hand.hands]);

  let status: string;
  if (match.hand.line.length === 0) {
    const name = playerName(match.hand.starter);
    status = match.hand.hands[match.hand.starter].includes(DOUBLE_SIX) && match.hand.number === 1
      ? t('game.opening', { name })
      : t('game.openingAny', { name });
    if (myTurn) status = `${status} · ${t('game.yourTurn')}`;
  } else status = myTurn ? t('game.yourTurn') : t('game.waiting', { name: playerName(match.hand.turn) });

  return (
    <View style={styles.root} onLayout={onLayout}>
      {regions && (
        <>
          <GameCanvas
            regions={regions}
            line={match.hand.line}
            origin={match.hand.origin}
            myHand={match.hand.hands[0]}
            playable={playable}
            pending={pending}
            handCounts={counts}
            onTapTile={onTapTile}
            onLanded={onLanded}
          />
          {[1, 2, 3].map((seat) => (
            <PlayerBadge
              key={seat}
              seat={seat}
              x={regions.seats[seat].x}
              y={regions.seats[seat].y}
              tiles={counts[seat]}
              active={!match.hand.result && match.hand.turn === seat}
              passed={passed.includes(seat)}
            />
          ))}
          <View pointerEvents="none" style={[styles.statusRow, { top: regions.fanTop - 30 }]}>
            <Text style={[styles.status, myTurn && styles.statusMine]}>{status}</Text>
            {passed.includes(0) && <Text style={styles.myPass}>{t('call.pass')}</Text>}
          </View>
        </>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('game.exit')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [styles.exit, pressed && styles.pressed]}
        >
          <X size={20} color={COLORS.text} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.scores}>
          <Text style={[styles.scoreText, { color: COLORS.us }]}>
            {t('team.us')} {match.scores[0]}
          </Text>
          <Text style={styles.scoreSep}>·</Text>
          <Text style={[styles.scoreText, { color: COLORS.them }]}>
            {t('team.them')} {match.scores[1]}
          </Text>
        </View>
        <View style={styles.handInfo}>
          <Text style={styles.handText}>{t('game.hand', { n: match.hand.number })}</Text>
          <Text style={styles.targetText}>{t('game.target', { n: match.rules.targetScore })}</Text>
        </View>
      </View>

      {pending !== null && ends && (
        <View style={[styles.chooser, { top: (regions?.fanTop ?? 500) - 170 }]}>
          <Text style={styles.chooserTitle}>{t('game.chooseEnd')}</Text>
          <View style={styles.chooserRow}>
            <Pressable style={({ pressed }) => [styles.endButton, pressed && styles.pressed]} onPress={() => chooseEnd('left')}>
              <Text style={styles.endText}>{t('game.endLeft', { n: ends[0] })}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.endButton, pressed && styles.pressed]} onPress={() => chooseEnd('right')}>
              <Text style={styles.endText}>{t('game.endRight', { n: ends[1] })}</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setPending(null)} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>{t('game.cancel')}</Text>
          </Pressable>
        </View>
      )}

      {banner && (
        <View pointerEvents="none" style={styles.bannerWrap}>
          <Animated.Text key={banner} entering={ZoomIn.springify()} exiting={FadeOut} style={[styles.banner, shadowText]}>
            {banner}
          </Animated.Text>
        </View>
      )}

      {showSummary && <HandSummary match={match} onNext={nextHand} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  scores: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  scoreSep: {
    color: COLORS.textMuted,
    fontSize: 17,
  },
  handInfo: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
  handText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  targetText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statusRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  statusMine: {
    color: COLORS.playable,
    fontWeight: '900',
  },
  myPass: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.accentText,
    backgroundColor: COLORS.ivoryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  chooser: {
    position: 'absolute',
    left: 24,
    right: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 12,
    alignItems: 'center',
  },
  chooserTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },
  chooserRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  endButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.accentText,
  },
  cancel: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  bannerWrap: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    fontFamily: FONTS.title,
    fontSize: 54,
    color: COLORS.accent,
    textAlign: 'center',
  },
});
