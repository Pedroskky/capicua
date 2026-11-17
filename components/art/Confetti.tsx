// Confeti que cae (Skia): en la celebración del campeón del torneo y con el aviso de «¡Capicúa!» o «¡Zapatero!».
// Solo anima mientras está montado; ocupa todo su contenedor y no recibe toques.
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Picture, type SkPicture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { emptyPicture, record, solid } from '@/components/art/paint';

const COLORS = ['#E9C46A', '#E76F51', '#2A9D8F', '#F4A261', '#FFFFFF', '#7FD1AE'];

export function Confetti({ pieces = 90 }: { pieces?: number }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const empty = useMemo(() => emptyPicture(), []);
  const frame = useSharedValue<SkPicture>(empty);
  useEffect(() => {
    if (size.w === 0) return;
    const bits = Array.from({ length: pieces }, (_, i) => ({
      x: (i * 97) % size.w,
      // Repartido por todo el alto desde el principio (también por encima), para que se vea en cuanto sale.
      y: ((i * 53) % Math.round(size.h * 1.4)) - size.h * 0.4,
      v: 60 + ((i * 31) % 90),
      s: 4 + (i % 5),
      c: i % COLORS.length,
      spin: (i % 7) / 7,
    }));
    const paints = COLORS.map((c) => solid(c));
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame.value = record(size.w, size.h, (canvas) => {
        for (const b of bits) {
          b.y += b.v * dt;
          b.x += Math.sin((now / 400) * (1 + b.spin)) * 0.6;
          if (b.y > size.h + 10) b.y = -10;
          canvas.drawRect({ x: b.x, y: b.y, width: b.s, height: b.s * 0.6 }, paints[b.c]);
        }
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, frame, pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && (
        <Canvas style={{ position: 'absolute', left: 0, top: 0, width: size.w, height: size.h }}>
          <Picture picture={frame} />
        </Canvas>
      )}
    </View>
  );
}
