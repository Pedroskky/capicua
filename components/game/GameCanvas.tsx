// Lienzo de la partida: paño, fila de la mesa (con la ficha nueva deslizándose), las manos de los demás (boca
// abajo, o descubiertas al revisar la mano), el pozo y tu mano en abanico con las jugables resaltadas.
// Al elegir punta (o con la pista) se resalta en la mesa el sitio exacto donde caerá la ficha.
// Se redibuja en una sola SkPicture solo cuando algo cambia (o mientras se desliza una ficha).
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, Picture, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { TIMING, type TableSkinId } from '@/game/config';
import { placePiece, type End, type LinePiece, type Move } from '@/game/engine';
import { fanLayout, hitFan, layoutLine, tileDrawSpec, type PlacedTile } from '@/game/layout';
import { tileOf, type TileId } from '@/game/tiles';
import { emptyPicture, record } from '@/components/art/paint';
import { buildFelt, drawTile, drawTileBack } from '@/components/art/tiles';
import { slotOf, tableGeometry, type Regions, type Slot } from '@/components/game/regions';

export interface OtherHand {
  seat: number;
  count: number;
  /** Fichas a la vista (al revisar la mano o con «Ver todas las manos»); null = boca abajo. */
  tiles: TileId[] | null;
}

interface GameCanvasProps {
  regions: Regions;
  /** Mesa equipada en la tienda. */
  tableSkin: TableSkinId;
  line: LinePiece[];
  origin: number;
  viewer: number;
  /** Tu mano; null = oculta (pásale el teléfono). */
  bottomHand: TileId[] | null;
  bottomCount: number;
  /** Fichas que puedes jugar ahora (null si no es tu turno). */
  playable: ReadonlySet<TileId> | null;
  /** Ficha esperando a que elijas punta, o la que marca la pista (va levantada). */
  raised: TileId | null;
  others: OtherHand[];
  boneyardCount: number;
  /** Sitios de la mesa que se resaltan (dónde caerá la ficha). */
  ghosts: Move[];
  onTapTile: (tile: TileId) => void;
  onTapGhost: (end: End) => void;
  /** La ficha nueva llegó a la mesa (para el «clac»). */
  onLanded: () => void;
}

/** Cuánto suben las fichas jugables del abanico. */
const LIFT = 12;
const BACK_SIZE = 9;
const OPEN_SIZE = 11;

interface Slide {
  tile: TileId;
  from: { x: number; y: number };
  start: number;
}

interface GhostSpot {
  end: End;
  x: number;
  y: number;
  w: number;
  h: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function GameCanvas(props: GameCanvasProps) {
  const { regions, tableSkin, line, origin, viewer, bottomHand, bottomCount, playable, raised, others, boneyardCount, ghosts } = props;
  const { width, height, table, players } = regions;
  const felt = useMemo(() => buildFelt(width, height, table, tableSkin), [width, height, table, tableSkin]);
  const empty = useMemo(() => emptyPicture(), []);
  const frame = useSharedValue<SkPicture>(empty);

  const hand = useMemo(() => bottomHand ?? [], [bottomHand]);
  const fan = useMemo(() => fanLayout(hand.length, width, regions.fanBaseY, regions.fanTileW), [hand.length, width, regions.fanBaseY, regions.fanTileW]);
  const lifts = useMemo(() => hand.map((id) => (id === raised ? LIFT * 2 : playable?.has(id) ? LIFT : 0)), [hand, playable, raised]);

  const geo = useMemo(() => tableGeometry(line, origin, table), [line, origin, table]);

  // Sitios resaltados: la fila con la ficha puesta, colocada con la misma escala que la mesa de ahora
  // (las fichas que ya están no se mueven al añadir una por una punta).
  const ghostSpots = useMemo<{ spot: GhostSpot; placed: PlacedTile }[]>(() => {
    const out: { spot: GhostSpot; placed: PlacedTile }[] = [];
    for (const move of ghosts) {
      const next = placePiece(line, origin, move, viewer);
      const placed = layoutLine(next.line, next.origin).tiles.find((t) => t.tile === move.tile);
      if (!placed) continue;
      const w = (placed.vertical ? 1 : 2) * geo.unit;
      const h = (placed.vertical ? 2 : 1) * geo.unit;
      out.push({ spot: { end: move.end, x: geo.ox + placed.cx * geo.unit, y: geo.oy + placed.cy * geo.unit, w, h }, placed });
    }
    return out;
  }, [ghosts, line, origin, viewer, geo]);

  // Detecta la ficha nueva para deslizarla desde el asiento de quien la jugó.
  const prevLine = useRef<LinePiece[]>([]);
  const slide = useRef<Slide | null>(null);
  const live = useRef(props);
  live.current = props;

  useEffect(() => {
    const prev = prevLine.current;
    prevLine.current = line;
    if (line.length === prev.length + 1 && line.length > 0) {
      const piece = prev.length === 0 || line[0].tile !== prev[0].tile ? line[0] : line[line.length - 1];
      const from = regions.origins[slotOf(piece.player, viewer, players)];
      slide.current = { tile: piece.tile, from, start: performance.now() };
    } else if (line.length !== prev.length) {
      slide.current = null;
    }
  }, [line, regions.origins, viewer, players]);

  useEffect(() => {
    let raf = 0;
    let active = true;

    const drawPlaced = (canvas: SkCanvas, t: PlacedTile, x: number, y: number, scale = 1, ghost = false) => {
      // Cada mitad en su sitio: la que coincide con la vecina queda pegada a ella.
      const spec = tileDrawSpec(t);
      drawTile(canvas, x, y, geo.unit * scale, spec.vertical, spec.first, spec.second, ghost ? { ghost: true } : {});
    };

    /** Mano de otro jugador junto a su avatar: boca abajo, o descubierta. */
    const drawOther = (canvas: SkCanvas, slot: Slot, count: number, tiles: TileId[] | null) => {
      const at = regions.slots[slot];
      const size = tiles ? OPEN_SIZE : BACK_SIZE;
      if (slot === 1 || slot === 3) {
        for (let i = 0; i < count; i++) {
          const y = at.y + 60 + i * (size + 2);
          const id = tiles?.[i];
          if (id !== undefined) drawTile(canvas, at.x, y, size, false, tileOf(id).a, tileOf(id).b, { shadow: false });
          else drawTileBack(canvas, at.x, y, size, false);
        }
        return;
      }
      const perRow = Math.max(1, Math.floor((width - 120) / (size + 2)));
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, count - row * perRow);
        const col = i - row * perRow;
        const x = at.x + (col - (inRow - 1) / 2) * (size + 2);
        const y = at.y + 66 + row * (size * 2 + 3);
        const id = tiles?.[i];
        if (id !== undefined) drawTile(canvas, x, y, size, true, tileOf(id).a, tileOf(id).b, { shadow: false });
        else drawTileBack(canvas, x, y, size, true);
      }
    };

    const render = (now: number): boolean => {
      const s = slide.current;
      const progress = s ? Math.min(1, (now - s.start) / TIMING.slideMs) : 1;
      frame.value = record(width, height, (canvas) => {
        canvas.drawPicture(felt);
        // Fila de la mesa.
        for (const t of geo.tiles) {
          if (s && t.tile === s.tile && progress < 1) continue;
          drawPlaced(canvas, t, geo.ox + t.cx * geo.unit, geo.oy + t.cy * geo.unit);
        }
        // Dónde caerá la ficha.
        for (const g of ghostSpots) drawPlaced(canvas, g.placed, g.spot.x, g.spot.y, 1, true);
        // Manos de los demás y pozo.
        for (const o of others) drawOther(canvas, slotOf(o.seat, viewer, players), o.count, o.tiles);
        if (boneyardCount > 0) {
          const b = regions.boneyard;
          for (let i = Math.min(3, boneyardCount) - 1; i >= 0; i--) drawTileBack(canvas, b.x + i * 3, b.y - i * 3, 12, false);
        }
        // Tu mano en abanico (o boca abajo mientras se pasa el teléfono).
        if (bottomHand) {
          fan.forEach((f, i) => {
            const id = hand[i];
            const tile = tileOf(id);
            canvas.save();
            canvas.translate(f.x, f.y - lifts[i]);
            canvas.rotate((f.angle * 180) / Math.PI, 0, 0);
            drawTile(canvas, 0, 0, f.w, true, tile.a, tile.b, {
              highlight: playable?.has(id) === true || id === raised,
              dim: playable !== null && !playable.has(id),
            });
            canvas.restore();
          });
        } else {
          const hidden = fanLayout(bottomCount, width, regions.fanBaseY, regions.fanTileW);
          for (const f of hidden) {
            canvas.save();
            canvas.translate(f.x, f.y);
            canvas.rotate((f.angle * 180) / Math.PI, 0, 0);
            drawTileBack(canvas, 0, 0, f.w, true);
            canvas.restore();
          }
        }
        // La ficha que se desliza va por encima de todo.
        if (s && progress < 1) {
          const target = geo.tiles.find((t) => t.tile === s.tile);
          if (target) {
            const k = easeOut(progress);
            const tx = geo.ox + target.cx * geo.unit;
            const ty = geo.oy + target.cy * geo.unit;
            drawPlaced(canvas, target, s.from.x + (tx - s.from.x) * k, s.from.y + (ty - s.from.y) * k, 1.25 - 0.25 * k);
          }
        }
      });
      if (s && progress >= 1) {
        slide.current = null;
        live.current.onLanded();
        return false;
      }
      return s !== null;
    };

    const loop = (now: number) => {
      if (!active) return;
      if (render(now)) raf = requestAnimationFrame(loop);
    };
    if (render(performance.now())) raf = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [felt, geo, ghostSpots, fan, lifts, hand, bottomHand, bottomCount, playable, raised, others, boneyardCount, regions, viewer, players, width, height, frame]);

  const touch = useRef({ fan, lifts, hand, ghostSpots });
  touch.current = { fan, lifts, hand, ghostSpots };
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((e) => {
          const { fan: f, lifts: l, hand: h, ghostSpots: spots } = touch.current;
          for (const { spot } of spots) {
            if (Math.abs(e.x - spot.x) <= spot.w / 2 + 6 && Math.abs(e.y - spot.y) <= spot.h / 2 + 6) {
              live.current.onTapGhost(spot.end);
              return;
            }
          }
          const index = hitFan(f, e.x, e.y, l);
          if (index >= 0) live.current.onTapTile(h[index]);
        }),
    [],
  );

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <Picture picture={frame} />
      </Canvas>
    </GestureDetector>
  );
}
