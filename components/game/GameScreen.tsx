// Pantalla de la partida: lleva el turno (tú tocas una ficha, la máquina piensa con su nivel y su velocidad), robar
// del pozo (mano a mano), pasar el teléfono (dos en el teléfono), pista, contador de fichas, «Revisar la mano», los
// avisos («¡Paso!», «¡Capicúa!», «¡Tranca!», «¡Zapatero!»), el sonido y el guardado (tras cada jugada y al ir al fondo).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Lightbulb, X } from 'lucide-react-native';
import { AI_DELAY_MS, COLORS, TIMING } from '@/game/config';
import { aiLevelFor, aiView, bestMoveHint, chooseMove } from '@/game/ai';
import {
  canDraw,
  createMatch,
  drawTile,
  endsForTile,
  isHumanSeat,
  legalMoves,
  lineEnds,
  mustPass,
  passTurn,
  playedByNumber,
  playMove,
  startNextHand,
  teamOf,
  type End,
  type MatchState,
  type Move,
} from '@/game/engine';
import { scenarioMove } from '@/game/devScenarios';
import { handEvent, matchEvent } from '@/game/events';
import { rival } from '@/game/tournament';
import type { ActivityReport } from '@/game/activity';
import { PHRASE_PLAY_CHANCE, PHRASES_PER_MOMENT, type PhraseMoment } from '@/game/config';
import { setTileSkin } from '@/components/art/tiles';
import { recordActivity } from '@/lib/activity';
import { progressStore } from '@/lib/progress';
import { setLastMatchReport } from '@/lib/lastReport';
import type { TileId } from '@/game/tiles';
import { toSavedMatch } from '@/game/savedMatch';
import { GameCanvas, type OtherHand } from '@/components/game/GameCanvas';
import { HandSummary } from '@/components/game/HandSummary';
import { PlayerBadge } from '@/components/game/PlayerBadge';
import { TableNumbers } from '@/components/game/TableNumbers';
import { computeRegions, slotOf } from '@/components/game/regions';
import { ActionButton } from '@/components/ui/ActionButton';
import { FONTS, shadowText } from '@/components/ui/theme';
import { useSettings } from '@/hooks/useSettings';
import { createMusic, createSoundBank, vibrate, type MusicPlayer, type SoundBank, type SoundName } from '@/lib/feedback';
import { matchStore } from '@/lib/matchStore';
import { playerName, t, teamName, type TranslationKey } from '@/lib/i18n';
import { DEV_MENU } from '@/lib/devMenu';
import { takeForcedScenario } from '@/lib/devForced';

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
  // Diseños equipados en la tienda (la ruta ya cargó el progreso antes de montar esta pantalla).
  const [equipped] = useState(() => {
    const e = progressStore.current()?.equipped ?? { tiles: 'ivory' as const, table: 'felt' as const, phrases: 'basic' as const };
    setTileSkin(e.tiles);
    return e;
  });
  const rivalId = match.tournament !== null ? rival(match.tournament).id : null;
  const nameOf = useCallback((seat: number) => playerName(seat, match.mode, rivalId), [match.mode, rivalId]);
  const [handReport, setHandReport] = useState<ActivityReport | null>(null);
  const players = match.hand.hands.length;
  const hotseat = match.mode === 'hotseat';
  /** Quién mira la pantalla (su mano va abajo). En dos en el teléfono cambia con cada turno. */
  const [viewer, setViewer] = useState(() => (hotseat ? match.hand.turn : 0));
  /** Mano oculta mientras se pasa el teléfono. */
  const [covered, setCovered] = useState(() => hotseat && !match.hand.result);
  const [pending, setPending] = useState<TileId | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [bubbles, setBubbles] = useState<Record<number, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const live = useRef({ match, settings });
  live.current = { match, settings };

  // Partida forzada desde el menú de desarrollo: la pista marca la jugada que provoca el tranque o la capicúa.
  useEffect(() => {
    const kind = DEV_MENU ? takeForcedScenario() : null;
    if (kind) setHint(scenarioMove(live.current.match, kind));
  }, []);

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

  const showBubble = useCallback((seat: number, text: string, ms: number = TIMING.passBubbleMs) => {
    setBubbles((b) => ({ ...b, [seat]: text }));
    setTimeout(
      () =>
        setBubbles((b) => {
          const next = { ...b };
          delete next[seat];
          return next;
        }),
      ms,
    );
  }, []);

  /** Frase de Carmen (tu compañera, asiento 2) con el paquete equipado. */
  const carmenSays = useCallback(
    (moment: PhraseMoment) => {
      const current = live.current.match;
      if (current.mode !== 'partners') return false;
      if (moment === 'play' && Math.random() > PHRASE_PLAY_CHANCE) return false;
      const n = Math.floor(Math.random() * PHRASES_PER_MOMENT[moment]);
      showBubble(2, t(`phrase.${equipped.phrases}.${moment}${n}` as TranslationKey), 1800);
      return true;
    },
    [equipped.phrases, showBubble],
  );

  /** Apunta la mano (y la partida, si terminó) una sola vez: monedas, retos, racha, ELO, estadísticas y logros. */
  const recordEnd = useCallback((next: MatchState): MatchState => {
    if (!next.hand.result || next.recordedHands >= next.hand.number) return next;
    const marked: MatchState = { ...next, recordedHands: next.hand.number, recordedMatch: next.winnerTeam !== null || next.recordedMatch };
    const hEvent = handEvent(next);
    const mEvent = next.winnerTeam !== null && !next.recordedMatch ? matchEvent(next) : null;
    setHandReport(null);
    setLastMatchReport(null);
    (async () => {
      const h = hEvent ? await recordActivity(hEvent) : null;
      setHandReport(h);
      if (mEvent) setLastMatchReport(await recordActivity(mEvent));
    })().catch(() => undefined);
    return marked;
  }, []);

  /** Juega, roba o pasa el jugador del turno. `move` null = robar si se puede, si no pasar. */
  const doMove = useCallback(
    (move: Move | null) => {
      const current = live.current.match;
      const seat = current.hand.turn;
      setPending(null);
      setHint(null);
      try {
        if (move) {
          const next = playMove(current, move);
          setMatch(recordEnd(next));
          const r = next.hand.result;
          if (r && r.winnerTeam === 0 && current.mode === 'partners') carmenSays(r.capicua ? 'capicua' : r.kind === 'tranque' ? 'tranque' : 'domino');
          else if (!r && seat === 2) carmenSays('play');
        } else if (canDraw(current)) {
          setMatch(drawTile(current));
          play('clac');
          if (!isHumanSeat(current, seat)) showBubble(seat, t('call.draw'));
        } else {
          setMatch(passTurn(current));
          play('pass');
          if (!(seat === 2 && carmenSays('pass'))) showBubble(seat, t('call.pass'));
        }
      } catch (error) {
        // Nunca debería pasar (el motor ya validó); en desarrollo se avisa.
        if (DEV_MENU) console.warn('Jugada rechazada', error);
      }
    },
    [play, showBubble, carmenSays, recordEnd],
  );

  // Dos en el teléfono: cuando le toca a la otra persona, se tapa la mano hasta que coja el teléfono.
  const turn = match.hand.turn;
  const handOver = match.hand.result !== null;
  useEffect(() => {
    if (!hotseat || handOver || turn === viewer) return;
    const timer = setTimeout(() => setCovered(true), TIMING.slideMs + 250);
    return () => clearTimeout(timer);
  }, [hotseat, handOver, turn, viewer]);

  // Quién juega ahora: la máquina tras pensar, tú pasas solo si no puedes jugar ni robar, y al final de la mano los avisos.
  useEffect(() => {
    const hand = match.hand;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (hand.result) {
      if (showSummary || reviewing) return;
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
    } else if (!isHumanSeat(match, hand.turn)) {
      const delay = AI_DELAY_MS[settings.aiSpeed] * (canDraw(match) ? 0.5 : 1);
      timers.push(setTimeout(() => doMove(chooseMove(aiView(match, hand.turn, aiLevelFor(match, hand.turn)))), delay));
    } else if (hand.turn === viewer && !covered && mustPass(match)) {
      timers.push(setTimeout(() => doMove(null), TIMING.humanAutoPassMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [match, showSummary, reviewing, settings.aiSpeed, doMove, play, buzz, viewer, covered]);

  const myTurn = !match.hand.result && !covered && match.hand.turn === viewer && isHumanSeat(match, viewer);
  const playable = useMemo(() => (myTurn ? new Set(legalMoves(match, viewer).map((m) => m.tile)) : null), [match, myTurn, viewer]);
  const drawable = myTurn && canDraw(match);

  const onTapTile = useCallback(
    (tile: TileId) => {
      const current = live.current.match;
      if (current.hand.result || current.hand.turn !== viewer || covered) return;
      const ends = endsForTile(current, viewer, tile);
      if (ends.length === 0) {
        buzz('medium');
        return;
      }
      buzz('tap');
      if (ends.length === 2) {
        setHint(null);
        setPending((p) => (p === tile ? null : tile));
        return;
      }
      doMove({ tile, end: ends[0] });
    },
    [buzz, doMove, viewer, covered],
  );

  const chooseEnd = useCallback(
    (end: End) => {
      const current = live.current.match;
      if (pending !== null) {
        doMove({ tile: pending, end });
        return;
      }
      // Tocar en la mesa el sitio que marca la pista también juega.
      if (hint && hint.end === end && current.hand.turn === viewer) doMove(hint);
    },
    [pending, hint, doMove, viewer],
  );

  const askHint = () => {
    const best = bestMoveHint(match, viewer);
    setPending(null);
    setHint(best);
    buzz('tap');
  };

  const onLanded = useCallback(() => {
    play('clac');
  }, [play]);

  const nextHand = () => {
    if (match.winnerTeam !== null) {
      router.replace('/result');
      return;
    }
    const next = startNextHand(match);
    setHandReport(null);
    setShowSummary(false);
    setReviewing(false);
    if (hotseat) {
      setViewer(next.hand.turn);
      setCovered(true);
    }
    setMatch(next);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.w !== width || size.h !== height) setSize({ w: width, h: height });
  };

  const regions = useMemo(
    () => (size ? computeRegions(size.w, size.h, insets.top, insets.bottom, players) : null),
    [size, insets.top, insets.bottom, players],
  );
  const ends = lineEnds(match.hand.line);
  const hands = match.hand.hands;
  const reveal = reviewing || (DEV_MENU && settings.devShowHands);
  const others = useMemo<OtherHand[]>(
    () =>
      hands
        .map((h, seat) => ({ seat, count: h.length, tiles: reveal ? h : null }))
        .filter((o) => o.seat !== viewer),
    [hands, viewer, reveal],
  );
  const ghosts = useMemo<Move[]>(() => {
    if (pending !== null) return endsForTile(match, viewer, pending).map((end) => ({ tile: pending, end }));
    if (hint && match.hand.line.length > 0) return [hint];
    return [];
  }, [pending, hint, match, viewer]);
  const counts = playedByNumber(match.hand.line);

  let status: string;
  const starterName = nameOf(match.hand.starter);
  if (match.hand.line.length === 0) {
    status = match.hand.opening !== null && match.hand.number === 1 ? t('game.opening', { name: starterName }) : t('game.openingAny', { name: starterName });
    if (myTurn) status = `${status} · ${t('game.yourTurn')}`;
  } else if (match.hand.result) status = '';
  else status = myTurn ? t('game.yourTurn') : t('game.waiting', { name: nameOf(match.hand.turn) });

  return (
    <View style={styles.root} onLayout={onLayout}>
      {regions && (
        <>
          <GameCanvas
            regions={regions}
            tableSkin={equipped.table}
            line={match.hand.line}
            origin={match.hand.origin}
            viewer={viewer}
            bottomHand={covered ? null : hands[viewer]}
            bottomCount={hands[viewer].length}
            playable={reviewing ? null : playable}
            raised={pending ?? hint?.tile ?? null}
            others={others}
            boneyardCount={match.hand.boneyard.length}
            ghosts={reviewing ? [] : ghosts}
            onTapTile={onTapTile}
            onTapGhost={chooseEnd}
            onLanded={onLanded}
          />
          {DEV_MENU && settings.devTableNumbers && <TableNumbers line={match.hand.line} origin={match.hand.origin} regions={regions} />}
          {hands.map((h, seat) =>
            seat === viewer ? null : (
              <PlayerBadge
                key={seat}
                slot={slotOf(seat, viewer, players)}
                name={nameOf(seat)}
                team={teamOf(seat, players)}
                x={regions.slots[slotOf(seat, viewer, players)].x}
                y={regions.slots[slotOf(seat, viewer, players)].y}
                tiles={h.length}
                active={!match.hand.result && match.hand.turn === seat}
                bubble={bubbles[seat] ?? null}
              />
            ),
          )}
          {players === 2 && match.hand.boneyard.length > 0 && (
            <Text pointerEvents="none" style={[styles.boneyard, { left: regions.boneyard.x - 40, top: regions.boneyard.y + 14 }]}>
              {t('game.boneyard', { n: match.hand.boneyard.length })}
            </Text>
          )}
          {settings.tileCounter && (
            <View pointerEvents="none" style={[styles.counter, { top: regions.table.y + 4, left: regions.table.x + 8, right: regions.width - regions.table.x - regions.table.w + 8 }]}>
              {counts.map((n, pip) => (
                <Text key={pip} style={[styles.counterChip, n === 7 && styles.counterDone]}>
                  {pip}: {n}/7
                </Text>
              ))}
            </View>
          )}
          {!reviewing && (
            <View style={[styles.statusRow, { top: regions.fanTop - 34 }]} pointerEvents="box-none">
              <Text style={[styles.status, myTurn && styles.statusMine]}>{status}</Text>
              {bubbles[viewer] && <Text style={styles.myPass}>{bubbles[viewer]}</Text>}
              {myTurn && !drawable && (playable?.size ?? 0) > 0 && (
                <Pressable accessibilityRole="button" accessibilityLabel={t('game.hint')} onPress={askHint} style={({ pressed }) => [styles.hint, pressed && styles.pressed]}>
                  <Lightbulb size={16} color={COLORS.accentText} strokeWidth={2.4} />
                  <Text style={styles.hintText}>{t('game.hint')}</Text>
                </Pressable>
              )}
            </View>
          )}
          {drawable && (
            <View style={[styles.drawRow, { top: regions.fanTop - 84 }]}>
              <ActionButton compact label={t('game.draw', { n: match.hand.boneyard.length })} onPress={() => doMove(null)} />
            </View>
          )}
          {reviewing && (
            <View style={[styles.reviewBar, { top: regions.fanTop - 60 }]}>
              <Text style={styles.reviewTitle}>{t('hand.reviewTitle')}</Text>
              <ActionButton
                compact
                label={t('hand.reviewBack')}
                onPress={() => {
                  setReviewing(false);
                  setShowSummary(true);
                }}
              />
            </View>
          )}
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
          <Text style={[styles.scoreText, { color: COLORS.us }]} numberOfLines={1}>
            {teamName(0, match.mode)} {match.scores[0]}
          </Text>
          <Text style={styles.scoreSep}>·</Text>
          <Text style={[styles.scoreText, { color: COLORS.them }]} numberOfLines={1}>
            {teamName(1, match.mode)} {match.scores[1]}
          </Text>
        </View>
        <View style={styles.handInfo}>
          <Text style={styles.handText}>{t('game.hand', { n: match.hand.number })}</Text>
          <Text style={styles.targetText}>{t('game.target', { n: match.rules.targetScore })}</Text>
        </View>
      </View>

      {pending !== null && ends && (
        <View style={[styles.chooser, { top: (regions?.fanTop ?? 500) - 30 }]}>
          <Text style={styles.chooserTitle}>{t('game.chooseEnd')}</Text>
          <View style={styles.chooserRow}>
            <Pressable style={({ pressed }) => [styles.endButton, pressed && styles.pressed]} onPress={() => chooseEnd('left')}>
              <Text style={styles.endText}>{t('game.endLeft', { n: ends[0] })}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.endButton, pressed && styles.pressed]} onPress={() => chooseEnd('right')}>
              <Text style={styles.endText}>{t('game.endRight', { n: ends[1] })}</Text>
            </Pressable>
          </View>
          <Text style={styles.chooserNote}>{t('game.tapGhost')}</Text>
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

      {covered && !match.hand.result && (
        <View style={styles.cover}>
          <Text style={styles.coverTitle}>{t('game.coverTitle', { name: nameOf(match.hand.turn) })}</Text>
          <Text style={styles.coverText}>{t('game.coverText')}</Text>
          <ActionButton
            label={t('game.coverButton')}
            onPress={() => {
              setViewer(live.current.match.hand.turn);
              setCovered(false);
            }}
          />
        </View>
      )}

      {showSummary && (
        <HandSummary
          match={match}
          report={handReport}
          onNext={nextHand}
          onReview={() => {
            setShowSummary(false);
            setReviewing(true);
          }}
        />
      )}
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
  chooserNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.accentText,
  },
  drawRow: {
    position: 'absolute',
    left: 60,
    right: 60,
    alignItems: 'center',
    flexDirection: 'row',
  },
  boneyard: {
    position: 'absolute',
    width: 80,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  counter: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  counterChip: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  counterDone: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  reviewBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 6,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.accent,
  },
  cover: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  coverTitle: {
    fontFamily: FONTS.title,
    fontSize: 36,
    color: COLORS.accent,
    textAlign: 'center',
  },
  coverText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
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
