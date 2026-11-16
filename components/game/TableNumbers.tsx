// Solo en preview (Ajustes → Desarrollo → «Ver números de la mesa»): escribe sobre cada mitad de la mesa el número
// que se ha dibujado ahí, y enseña las dos puntas. Sirve para comprobar a ojo que la cadena cuadra.
import { StyleSheet, Text, View } from 'react-native';
import type { LinePiece } from '@/game/engine';
import { drawnHalves, tileDrawSpec } from '@/game/layout';
import { tableGeometry, type Regions } from '@/components/game/regions';
import { t } from '@/lib/i18n';

export function TableNumbers({ line, origin, regions }: { line: LinePiece[]; origin: number; regions: Regions }) {
  if (line.length === 0) return null;
  const geo = tableGeometry(line, origin, regions.table);
  const size = Math.max(14, geo.unit * 0.8);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {geo.tiles.flatMap((tile) =>
        drawnHalves(tileDrawSpec(tile)).map((h, i) => (
          <Text
            key={`${tile.tile}-${i}`}
            style={[
              styles.num,
              { left: geo.ox + h.x * geo.unit - size / 2, top: geo.oy + h.y * geo.unit - size / 2, width: size, height: size, lineHeight: size, fontSize: size * 0.7 },
            ]}
          >
            {h.value}
          </Text>
        )),
      )}
      <Text style={[styles.ends, { top: regions.table.y + 52, left: regions.table.x + 10 }]}>
        {t('game.ends', { a: line[0].left, b: line[line.length - 1].right })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  num: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(200,30,60,0.75)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ends: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(200,30,60,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
