// Tienda: fichas, mesas y frases del compañero. Arriba, la vista previa del artículo elegido (Skia: la mesa con
// tres fichas); debajo, la lista. Comprar con monedas y equipar.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { Check, Coins } from 'lucide-react-native';
import { COLORS, PHRASE_MOMENTS, PHRASES_PER_MOMENT, SHOP_ITEMS, type ShopCategory, type TableSkinId, type TileSkinId } from '@/game/config';
import { isEquipped, shopItem } from '@/game/economy';
import { record } from '@/components/art/paint';
import { drawTableSurface, drawTile, drawTileBack } from '@/components/art/tiles';
import { ActionButton } from '@/components/ui/ActionButton';
import { Segmented } from '@/components/ui/Segmented';
import { TabHeader } from '@/components/ui/TabHeader';
import { useProgress } from '@/hooks/useProgress';
import { buyItem, equipItem } from '@/lib/activity';
import { t, type TranslationKey } from '@/lib/i18n';

const PREVIEW_H = 190;

export function phraseSamples(pack: string): string[] {
  const out: string[] = [];
  for (const moment of PHRASE_MOMENTS) {
    for (let i = 0; i < PHRASES_PER_MOMENT[moment]; i++) out.push(t(`phrase.${pack}.${moment}${i}` as TranslationKey));
  }
  return out;
}

export default function ShopScreen() {
  const progress = useProgress();
  const [category, setCategory] = useState<ShopCategory>('tiles');
  const [selected, setSelected] = useState<string>(progress.equipped.tiles);
  const [width, setWidth] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const item = shopItem(selected) ?? SHOP_ITEMS[0];
  const owned = progress.owned.includes(item.id);
  const equipped = isEquipped(progress, item.id);

  const tiles: TileSkinId = item.category === 'tiles' ? (item.id as TileSkinId) : progress.equipped.tiles;
  const table: TableSkinId = item.category === 'table' ? (item.id as TableSkinId) : progress.equipped.table;
  const preview = useMemo(() => {
    if (width === 0) return null;
    return record(width, PREVIEW_H, (canvas) => {
      drawTableSurface(canvas, { x: 12, y: 12, w: width - 24, h: PREVIEW_H - 24 }, table);
      const cy = PREVIEW_H / 2;
      const cx = width / 2;
      drawTile(canvas, cx - 70, cy, 26, false, 6, 3, { skin: tiles });
      drawTile(canvas, cx, cy, 26, true, 3, 3, { skin: tiles });
      drawTile(canvas, cx + 70, cy, 26, false, 3, 5, { skin: tiles });
      drawTileBack(canvas, cx - 50, cy + 52, 16, false, tiles);
      drawTileBack(canvas, cx + 50, cy + 52, 16, false, tiles);
    });
  }, [width, tiles, table]);

  const choose = (next: ShopCategory) => {
    setCategory(next);
    setMessage(null);
    setSelected(next === 'tiles' ? progress.equipped.tiles : next === 'table' ? progress.equipped.table : progress.equipped.phrases);
  };

  const onBuy = () => {
    if (progress.coins < item.price) {
      setMessage(t('shop.notEnough', { n: item.price - progress.coins }));
      return;
    }
    buyItem(item.id)
      .then((r) => {
        if (r) {
          setMessage(t('shop.bought'));
          equipItem(item.id).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <TabHeader title={t('tabs.shop')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>{t('shop.preview')}</Text>
        <View style={styles.preview} onLayout={onLayout}>
          {preview && (
            <Canvas style={{ width, height: PREVIEW_H }}>
              <Picture picture={preview} />
            </Canvas>
          )}
          {item.category === 'phrases' && (
            <View pointerEvents="none" style={styles.bubbleWrap}>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{phraseSamples(item.id)[0]}</Text>
              </View>
            </View>
          )}
        </View>
        <Text style={styles.itemName}>{t(`shop.item.${item.id}` as TranslationKey)}</Text>
        {item.category === 'phrases' && (
          <View style={styles.phrases}>
            <Text style={styles.phrasesTitle}>{t('shop.phrasesSample')}</Text>
            <Text style={styles.phrasesText}>{phraseSamples(item.id).map((p) => `«${p}»`).join('  ')}</Text>
          </View>
        )}
        <View style={styles.action}>
          {!owned ? (
            <ActionButton label={t('shop.buy', { n: item.price })} icon={Coins} onPress={onBuy} />
          ) : equipped ? (
            <ActionButton label={t('shop.equipped')} icon={Check} variant="secondary" disabled onPress={() => undefined} />
          ) : (
            <ActionButton label={t('shop.equip')} onPress={() => equipItem(item.id).catch(() => undefined)} />
          )}
          {message && <Text style={styles.message}>{message}</Text>}
        </View>

        <Segmented<ShopCategory>
          value={category}
          onChange={choose}
          options={[
            { value: 'tiles', label: t('shop.tiles') },
            { value: 'table', label: t('shop.table') },
            { value: 'phrases', label: t('shop.phrases') },
          ]}
        />
        {SHOP_ITEMS.filter((i) => i.category === category).map((i) => {
          const isOwned = progress.owned.includes(i.id);
          const isOn = isEquipped(progress, i.id);
          return (
            <Pressable
              key={i.id}
              accessibilityRole="button"
              onPress={() => {
                setSelected(i.id);
                setMessage(null);
              }}
              style={({ pressed }) => [styles.row, selected === i.id && styles.rowSelected, pressed && styles.pressed]}
            >
              <Text style={styles.rowName}>{t(`shop.item.${i.id}` as TranslationKey)}</Text>
              {isOn ? (
                <Text style={styles.rowOn}>{t('shop.equipped')}</Text>
              ) : isOwned ? (
                <Check size={18} color={COLORS.us} />
              ) : (
                <View style={styles.price}>
                  <Coins size={14} color={COLORS.accent} />
                  <Text style={styles.priceText}>{i.price}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        <Text style={styles.hint}>{t('shop.earnHint')}</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  preview: {
    height: PREVIEW_H,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bubbleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    alignItems: 'center',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.ivoryLight,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.accentText,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  phrases: {
    gap: 4,
  },
  phrasesTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  phrasesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  action: {
    alignItems: 'center',
    gap: 6,
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  rowOn: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.us,
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.accent,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  pressed: {
    opacity: 0.85,
  },
});
