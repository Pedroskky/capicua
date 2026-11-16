// Sonidos, música y vibración. Nada de esto puede romper la partida: todo va protegido.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { SOUND_VOLUME } from '@/game/config';

const SOUND_SOURCES = {
  clac: require('@/assets/sounds/clac.wav'),
  shuffle: require('@/assets/sounds/shuffle.wav'),
  pass: require('@/assets/sounds/pass.wav'),
  domino: require('@/assets/sounds/domino.wav'),
} as const;

const MUSIC_SOURCE: number = require('@/assets/sounds/music.wav');

export type SoundName = keyof typeof SOUND_SOURCES;

/** Varios reproductores para el «clac»: dos fichas seguidas no se cortan entre sí. */
const VOICES: Partial<Record<SoundName, number>> = { clac: 3 };

function safely(action: () => unknown): void {
  try {
    const result = action();
    if (result instanceof Promise) result.catch(() => undefined);
  } catch {
    // El sonido y la vibración son opcionales.
  }
}

function createPlayer(source: number, volume: number): AudioPlayer | null {
  try {
    const player = createAudioPlayer(source);
    player.volume = volume;
    return player;
  } catch {
    return null;
  }
}

export interface SoundBank {
  play: (name: SoundName) => void;
  dispose: () => void;
}

export function createSoundBank(): SoundBank {
  safely(() => setAudioModeAsync({ playsInSilentMode: true }));
  const voices = new Map<SoundName, AudioPlayer[]>();
  (Object.keys(SOUND_SOURCES) as SoundName[]).forEach((name) => {
    const list: AudioPlayer[] = [];
    for (let i = 0; i < (VOICES[name] ?? 1); i++) {
      const player = createPlayer(SOUND_SOURCES[name], SOUND_VOLUME[name]);
      if (player) list.push(player);
    }
    voices.set(name, list);
  });
  const next = new Map<SoundName, number>();
  let disposed = false;
  return {
    play(name) {
      if (disposed) return;
      const list = voices.get(name);
      if (!list || list.length === 0) return;
      const index = (next.get(name) ?? 0) % list.length;
      next.set(name, index + 1);
      const player = list[index];
      safely(() => player.seekTo(0));
      safely(() => player.play());
    },
    dispose() {
      disposed = true;
      voices.forEach((list) => list.forEach((player) => safely(() => player.remove())));
      voices.clear();
    },
  };
}

export interface MusicPlayer {
  setPlaying: (playing: boolean) => void;
  dispose: () => void;
}

/** Música de fondo en bucle. */
export function createMusic(): MusicPlayer {
  const player = createPlayer(MUSIC_SOURCE, SOUND_VOLUME.music);
  if (player) safely(() => (player.loop = true));
  let playing = false;
  return {
    setPlaying(value) {
      if (!player) return;
      // En web el navegador bloquea el sonido hasta el primer toque: se reintenta si no está sonando.
      if (value === playing && (!value || player.playing)) return;
      playing = value;
      safely(() => (value ? player.play() : player.pause()));
    },
    dispose() {
      if (player) safely(() => player.remove());
    },
  };
}

export function vibrate(pattern: 'tap' | 'medium' | 'success'): void {
  if (Platform.OS === 'web') return;
  if (pattern === 'success') {
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    return;
  }
  const style = pattern === 'tap' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium;
  safely(() => Haptics.impactAsync(style));
}
