// Portada: tres fichas sobre el paño, la del centro un doble seis (Skia). En pantallas bajas se dibuja más pequeña
// (`titleArtSize`), para que los botones principales se vean sin desplazar.
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { record } from '@/components/art/paint';
import { drawTile } from '@/components/art/tiles';
import { titleArtSize } from '@/components/home/titleSize';

export default function TitleArt() {
  const { height } = useWindowDimensions();
  const { width: W, height: H, scale } = titleArtSize(height);
  const picture = useMemo(
    () =>
      record(W, H, (canvas) => {
        canvas.scale(scale, scale);
        canvas.save();
        canvas.rotate(-14, 84, 98);
        drawTile(canvas, 84, 98, 34, true, 3, 5);
        canvas.restore();
        canvas.save();
        canvas.rotate(12, 216, 98);
        drawTile(canvas, 216, 98, 34, true, 1, 3);
        canvas.restore();
        drawTile(canvas, 150, 86, 40, true, 6, 6);
      }),
    [W, H, scale],
  );
  return (
    <Canvas style={{ width: W, height: H }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
