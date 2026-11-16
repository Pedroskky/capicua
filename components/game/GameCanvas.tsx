// Lienzo de la partida: paño, fila de la mesa (con la ficha nueva deslizándose), manos boca abajo de los demás y
// tu mano en abanico con las jugables resaltadas. Se redibuja en una sola SkPicture solo cuando algo cambia
// (o mientras se desliza una ficha); tocar una ficha la juega.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, Picture, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { TIMING } from '@/game/config';
import type { LinePiece } from '@/game/engine';
import { fanLayout, fitTable, hitFan, layoutLine, type PlacedTile } from '@/game/layout';
import { tileOf, type TileId } from '@/game/tiles';
import { emptyPicture, record } from '@/components/art/paint';
import { buildFelt, drawTile, drawTileBack } from '@/components/art/tiles';
import type { Regions } from '@/components/game/regions';

interface GameCanvasProps {
  regions: Regions;
  line: LinePiece[];
  origin: number;
  myHand: TileId[];
  /** Fichas que puedes jugar ahora (null si no es tu turno). */
  playable: ReadonlySet<TileId> | null;
  /** Ficha esperando a que elijas punta (va levantada). */
  pending: TileId | null;
  handCounts: number[];
  onTapTile: (tile: TileId) => void;
  /** La ficha nueva llegó a la mesa (para el «clac»). */
  onLanded: () => void;
}

/** Cuánto suben las fichas jugables del abanico. */
const LIFT = 12;
const MAX_UNIT = 30;
const BACK_SIZE = 9;

interface Slide {
  tile: TileId;
  from: { x: number; y: number };
  start: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function GameCanvas({ regions, line, origin, myHand, playable, pending, handCounts, onTapTile, onLanded }: GameCanvasProps) {
  const { width, height, table } = regions;
  const felt = useMemo(() => buildFelt(width, height, table), [width, height, table]);
  const empty = useMemo(() => emptyPicture(), []);
  const frame = useSharedValue<SkPicture>(empty);

  const fan = useMemo(() => fanLayout(myHand.length, width, regions.fanBaseY, regions.fanTileW), [myHand.length, width, regions.fanBaseY, regions.fanTileW]);
  const lifts = useMemo(
    () => myHand.map((id) => (id === pending ? LIFT * 2 : playable?.has(id) ? LIFT : 0)),
    [myHand, playable, pending],
  );

  const layout = useMemo(() => {
    const lay = layoutLine(line, origin);
    const fit = fitTable(lay.bounds, table.w - 16, table.h - 16, MAX_UNIT);
    return { tiles: lay.tiles, unit: fit.unit, ox: table.x + 8 + fit.offsetX, oy: table.y + 8 + fit.offsetY };
  }, [line, origin, table]);

  // Detecta la ficha nueva para deslizarla desde el asiento de quien la jugó.
  const prevLine = useRef<LinePiece[]>([]);
  const slide = useRef<Slide | null>(null);
  const live = useRef({ onLanded, onTapTile });
  live.current = { onLanded, onTapTile };

  useEffect(() => {
    const prev = prevLine.current;
    prevLine.current = line;
    if (line.length === prev.length + 1 && line.length > 0) {
      const piece = prev.length === 0 || line[0].tile !== prev[0].tile ? line[0] : line[line.length - 1];
      slide.current = { tile: piece.tile, from: regions.origins[piece.player] ?? regions.origins[0], start: performance.now() };
    } else if (line.length !== prev.length) {
      slide.current = null;
    }
  }, [line, regions.origins]);

  useEffect(() => {
    let raf = 0;
    let active = true;

    const drawPlaced = (canvas: SkCanvas, t: PlacedTile, x: number, y: number, scale = 1) => {
      const [h1, h2] = t.halves;
      drawTile(canvas, x, y, layout.unit * scale, t.vertical, h1.value, h2.value);
    };

    const render = (now: number): boolean => {
      const s = slide.current;
      const progress = s ? Math.min(1, (now - s.start) / TIMING.slideMs) : 1;
      frame.value = record(width, height, (canvas) => {
        canvas.drawPicture(felt);
        // Fila de la mesa.
        for (const t of layout.tiles) {
          if (s && t.tile === s.tile && progress < 1) continue;
          drawPlaced(canvas, t, layout.ox + t.cx * layout.unit, layout.oy + t.cy * layout.unit);
        }
        // Manos boca abajo de los demás.
        const right = regions.seats[1];
        const left = regions.seats[3];
        const top = regions.seats[2];
        for (let i = 0; i < handCounts[1]; i++) drawTileBack(canvas, right.x, right.y + 60 + i * (BACK_SIZE + 2), BACK_SIZE, false);
        for (let i = 0; i < handCounts[3]; i++) drawTileBack(canvas, left.x, left.y + 60 + i * (BACK_SIZE + 2), BACK_SIZE, false);
        const n2 = handCounts[2];
        for (let i = 0; i < n2; i++) drawTileBack(canvas, top.x + (i - (n2 - 1) / 2) * (BACK_SIZE + 2), top.y + 66, BACK_SIZE, true);
        // Tu mano en abanico.
        fan.forEach((f, i) => {
          const id = myHand[i];
          const tile = tileOf(id);
          canvas.save();
          canvas.translate(f.x, f.y - lifts[i]);
          canvas.rotate((f.angle * 180) / Math.PI, 0, 0);
          drawTile(canvas, 0, 0, f.w, true, tile.a, tile.b, {
            highlight: playable?.has(id) === true || id === pending,
            dim: playable !== null && !playable.has(id),
          });
          canvas.restore();
        });
        // La ficha que se desliza va por encima de todo.
        if (s && progress < 1) {
          const target = layout.tiles.find((t) => t.tile === s.tile);
          if (target) {
            const k = easeOut(progress);
            const tx = layout.ox + target.cx * layout.unit;
            const ty = layout.oy + target.cy * layout.unit;
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
  }, [felt, layout, fan, lifts, myHand, playable, pending, handCounts, regions, width, height, frame]);

  const live2 = useRef({ fan, lifts, myHand });
  live2.current = { fan, lifts, myHand };
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((e) => {
          const { fan: f, lifts: l, myHand: hand } = live2.current;
          const index = hitFan(f, e.x, e.y, l);
          if (index >= 0) live.current.onTapTile(hand[index]);
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
