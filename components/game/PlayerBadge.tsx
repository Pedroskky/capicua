// Avatar de un jugador: círculo con la inicial del asiento, color de su pareja, nombre y fichas que le quedan.
// Brilla cuando le toca y enseña el bocadillo «¡Paso!».
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/game/config';
import { teamOf } from '@/game/engine';
import { playerName, t } from '@/lib/i18n';

interface PlayerBadgeProps {
  seat: number;
  x: number;
  y: number;
  tiles: number;
  active: boolean;
  passed: boolean;
}

const SIZE = 40;
const WIDTH = 84;

export function PlayerBadge({ seat, x, y, tiles, active, passed }: PlayerBadgeProps) {
  const color = teamOf(seat) === 0 ? COLORS.us : COLORS.them;
  const name = playerName(seat);
  return (
    <View pointerEvents="none" style={[styles.root, { left: x - WIDTH / 2, top: y - SIZE / 2 }]}>
      <View style={[styles.avatar, { borderColor: active ? COLORS.playable : color }, active && styles.active]}>
        <Text style={[styles.initial, { color }]}>{name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.count}>{tiles === 1 ? t('players.tile') : t('players.tiles', { n: tiles })}</Text>
      {passed && (
        <View style={[styles.bubble, seat === 2 ? styles.bubbleBelow : seat === 1 ? styles.bubbleLeft : styles.bubbleRight]}>
          <Text style={styles.bubbleText}>{t('call.pass')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    width: WIDTH,
    alignItems: 'center',
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    shadowColor: COLORS.playable,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  initial: {
    fontSize: 18,
    fontWeight: '900',
  },
  name: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: WIDTH,
  },
  count: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  bubble: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.ivoryLight,
  },
  bubbleBelow: {
    top: SIZE + 46,
  },
  bubbleLeft: {
    top: 6,
    right: 52,
  },
  bubbleRight: {
    top: 6,
    left: 52,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.accentText,
  },
});
