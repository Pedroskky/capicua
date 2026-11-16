// Portada: tres fichas de marfil sobre el paño, la del centro un doble seis (Skia).
import { useMemo } from 'react';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { record } from '@/components/art/paint';
import { drawTile } from '@/components/art/tiles';

const W = 300;
const H = 170;

export default function TitleArt() {
  const picture = useMemo(
    () =>
      record(W, H, (canvas) => {
        canvas.save();
        canvas.rotate(-14, 84, 98);
        drawTile(canvas, 84, 98, 34, true, 3, 5);
        canvas.restore();
        canvas.save();
        canvas.rotate(12, 216, 98);
        drawTile(canvas, 216, 98, 34, true, 1, 3);
        canvas.restore();
        drawTile(canvas, W / 2, 86, 40, true, 6, 6);
      }),
    [],
  );
  return (
    <Canvas style={{ width: W, height: H }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
