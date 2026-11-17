// Dibujo de cada paso del tutorial (Skia): la mesa vista desde arriba con unas fichas de ejemplo.
import { useMemo } from 'react';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { COLORS } from '@/game/config';
import { record, solid, stroke } from '@/components/art/paint';
import { drawTableSurface, drawTile, drawTileBack } from '@/components/art/tiles';

export function TutorialArt({ step, width, height }: { step: number; width: number; height: number }) {
  const picture = useMemo(
    () =>
      record(width, height, (canvas) => {
        const table = { x: 10, y: 10, w: width - 20, h: height - 20 };
        drawTableSurface(canvas, table, 'felt');
        const cx = width / 2;
        const cy = height / 2;
        const u = Math.min(26, width / 14);
        const seat = (x: number, y: number, color: string) => {
          canvas.drawCircle(x, y, u * 0.8, solid(COLORS.surface));
          canvas.drawCircle(x, y, u * 0.8, stroke(color, 3));
        };
        if (step === 0) {
          // Cuatro asientos: tú abajo y tu compañera enfrente (verde); los rivales a los lados (naranja).
          seat(cx, height - 30, COLORS.us);
          seat(cx, 30, COLORS.us);
          seat(30, cy, COLORS.them);
          seat(width - 30, cy, COLORS.them);
          drawTile(canvas, cx, cy, u, true, 6, 6);
          for (let i = 0; i < 3; i++) drawTileBack(canvas, cx - 30 + i * 30, cy + u * 1.8, u * 0.5, true);
        } else if (step === 1 || step === 2) {
          // Fila 3|5 · 5|5 · 5|1 con puntas 3 y 1.
          drawTile(canvas, cx - u * 2, cy, u, false, 3, 5);
          drawTile(canvas, cx - u * 0.5, cy, u, true, 5, 5);
          drawTile(canvas, cx + u, cy, u, false, 5, 1);
          if (step === 1) {
            canvas.drawCircle(cx - u * 3.4, cy, u * 0.5, stroke(COLORS.playable, 3));
            canvas.drawCircle(cx + u * 2.4, cy, u * 0.5, stroke(COLORS.playable, 3));
          } else {
            // La ficha 1|3 cabe por las dos puntas: los dos sitios brillan.
            drawTile(canvas, cx - u * 4, cy, u, false, 1, 3, { ghost: true });
            drawTile(canvas, cx + u * 3, cy, u, false, 1, 3, { ghost: true });
          }
        } else if (step === 3) {
          // Mesa trancada: puntas 4 y 4 y ya no queda ningún 4.
          drawTile(canvas, cx - u * 2, cy, u, false, 4, 2);
          drawTile(canvas, cx, cy, u, false, 2, 6);
          drawTile(canvas, cx + u * 2, cy, u, false, 6, 4);
          canvas.drawLine(cx - u * 4, cy - u, cx + u * 4, cy + u, stroke(COLORS.danger, 4));
        } else {
          // Los puntos: las fichas que quedan en las manos se suman.
          drawTile(canvas, cx - u * 2.4, cy, u, true, 6, 4);
          drawTile(canvas, cx - u * 0.8, cy, u, true, 3, 2);
          drawTile(canvas, cx + u * 0.8, cy, u, true, 5, 5);
          drawTile(canvas, cx + u * 2.4, cy, u, true, 1, 0);
        }
      }),
    [step, width, height],
  );
  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
