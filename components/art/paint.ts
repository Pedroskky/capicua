// Utilidades de dibujo Skia compartidas (pinceles, degradados, polígonos, azar con semilla).
import { BlurStyle, PaintStyle, Skia, StrokeCap, StrokeJoin, TileMode, type SkPaint, type SkPicture, type SkCanvas } from '@shopify/react-native-skia';

export function solid(color: string, alpha = 1): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  return paint;
}

export function stroke(color: string, width: number, alpha = 1): SkPaint {
  const paint = solid(color, alpha);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  return paint;
}

export function blurred(color: string, sigma: number, alpha = 1): SkPaint {
  const paint = solid(color, alpha);
  paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, sigma, true));
  return paint;
}

export function linearPaint(x0: number, y0: number, x1: number, y1: number, colors: string[], positions: number[] | null = null): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setShader(
    Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors.map((c) => Skia.Color(c)), positions, TileMode.Clamp),
  );
  return paint;
}

export function radialPaint(cx: number, cy: number, r: number, colors: string[], positions: number[] | null = null): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setShader(Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, r, colors.map((c) => Skia.Color(c)), positions, TileMode.Clamp));
  return paint;
}

export function polygon(points: number[]) {
  const builder = Skia.PathBuilder.Make();
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) builder.moveTo(points[i], points[i + 1]);
    else builder.lineTo(points[i], points[i + 1]);
  }
  builder.close();
  return builder.build();
}

export function rect(x: number, y: number, w: number, h: number) {
  return Skia.XYWHRect(x, y, w, h);
}

export function rrect(x: number, y: number, w: number, h: number, r: number) {
  return Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r);
}

/**
 * Imagen vacía para iniciar un lienzo. OJO: en Android/iOS, `finishRecordingAsPicture()` sin `beginRecording()`
 * cierra la app (puntero nulo en Skia nativo, sin mensaje); en web no falla. Usa siempre esta función o `record`.
 */
export function emptyPicture(): SkPicture {
  const recorder = Skia.PictureRecorder();
  recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return recorder.finishRecordingAsPicture();
}

/** Graba un dibujo en una SkPicture (se dibuja luego muchas veces sin coste). */
export function record(width: number, height: number, draw: (canvas: SkCanvas) => void): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(-width, -height, width * 3, height * 3));
  draw(canvas);
  return recorder.finishRecordingAsPicture();
}

export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
