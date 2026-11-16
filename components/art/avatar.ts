// Avatares de las parejas del torneo, dibujados con Skia en código: cara, pelo, sombrero, lentes, bigote y camisa.
import { ClipOp, Skia, type SkCanvas } from '@shopify/react-native-skia';
import type { AvatarSpec } from '@/game/tournament';
import { solid, stroke } from '@/components/art/paint';

function oval(cx: number, cy: number, rx: number, ry: number) {
  return Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2);
}

/** Persona de busto centrada en (cx, cy) con radio r (cabe en un círculo de radio r). */
export function drawPerson(canvas: SkCanvas, cx: number, cy: number, r: number, spec: AvatarSpec): void {
  const skin = solid(spec.skin);
  const hair = solid(spec.hair);
  const hat = solid(spec.hatColor);
  const ink = solid('#1B1B1B');
  // Camisa (hombros).
  canvas.drawOval(oval(cx, cy + r * 0.95, r * 0.85, r * 0.55), solid(spec.shirt));
  // Cuello y cara.
  canvas.drawRect(Skia.XYWHRect(cx - r * 0.14, cy + r * 0.2, r * 0.28, r * 0.25), skin);
  const headY = cy - r * 0.1;
  // Pelo de atrás (largo o moño).
  if (spec.hairStyle === 'long') canvas.drawOval(oval(cx, headY + r * 0.15, r * 0.5, r * 0.55), hair);
  if (spec.hairStyle === 'bun') canvas.drawCircle(cx, headY - r * 0.52, r * 0.2, hair);
  canvas.drawOval(oval(cx, headY, r * 0.4, r * 0.46), skin);
  // Orejas.
  canvas.drawCircle(cx - r * 0.4, headY + r * 0.02, r * 0.08, skin);
  canvas.drawCircle(cx + r * 0.4, headY + r * 0.02, r * 0.08, skin);
  // Pelo de arriba.
  if (spec.hairStyle === 'short' || spec.hairStyle === 'long' || spec.hairStyle === 'bun') {
    canvas.drawOval(oval(cx, headY - r * 0.3, r * 0.42, r * 0.22), hair);
  } else if (spec.hairStyle === 'curly') {
    for (let k = -2; k <= 2; k++) canvas.drawCircle(cx + k * r * 0.16, headY - r * 0.36 + Math.abs(k) * r * 0.05, r * 0.14, hair);
  } else {
    // Calvo: un poco de pelo a los lados.
    canvas.drawOval(oval(cx - r * 0.36, headY - r * 0.08, r * 0.08, r * 0.14), hair);
    canvas.drawOval(oval(cx + r * 0.36, headY - r * 0.08, r * 0.08, r * 0.14), hair);
  }
  // Ojos, cejas y sonrisa.
  canvas.drawCircle(cx - r * 0.15, headY, r * 0.045, ink);
  canvas.drawCircle(cx + r * 0.15, headY, r * 0.045, ink);
  const smile = Skia.PathBuilder.Make();
  smile.moveTo(cx - r * 0.14, headY + r * 0.2);
  smile.quadTo(cx, headY + r * 0.3, cx + r * 0.14, headY + r * 0.2);
  canvas.drawPath(smile.build(), stroke('#5A2E1C', Math.max(1, r * 0.045)));
  if (spec.mustache) canvas.drawOval(oval(cx, headY + r * 0.14, r * 0.17, r * 0.05), hair);
  if (spec.glasses) {
    const frame = stroke('#222222', Math.max(1, r * 0.04));
    canvas.drawCircle(cx - r * 0.15, headY, r * 0.11, frame);
    canvas.drawCircle(cx + r * 0.15, headY, r * 0.11, frame);
    canvas.drawLine(cx - r * 0.04, headY, cx + r * 0.04, headY, frame);
  }
  // Sombreros.
  if (spec.hat === 'cap') {
    canvas.drawOval(oval(cx, headY - r * 0.3, r * 0.44, r * 0.24), hat);
    canvas.drawOval(oval(cx + r * 0.28, headY - r * 0.2, r * 0.3, r * 0.08), hat);
  } else if (spec.hat === 'straw') {
    canvas.drawOval(oval(cx, headY - r * 0.28, r * 0.7, r * 0.12), hat);
    canvas.drawOval(oval(cx, headY - r * 0.42, r * 0.36, r * 0.2), hat);
    canvas.drawRect(Skia.XYWHRect(cx - r * 0.36, headY - r * 0.36, r * 0.72, r * 0.06), solid('#7A3B1C'));
  } else if (spec.hat === 'beret') {
    canvas.drawOval(oval(cx - r * 0.06, headY - r * 0.36, r * 0.46, r * 0.18), hat);
  } else if (spec.hat === 'bandana') {
    canvas.drawOval(oval(cx, headY - r * 0.3, r * 0.43, r * 0.2), hat);
    canvas.drawCircle(cx + r * 0.4, headY - r * 0.22, r * 0.08, hat);
  }
}

/** Medallón de una pareja: fondo de su color y las dos personas. */
export function drawPair(canvas: SkCanvas, cx: number, cy: number, r: number, color: string, members: [AvatarSpec, AvatarSpec], locked = false): void {
  canvas.drawCircle(cx, cy, r, solid(color));
  canvas.drawCircle(cx, cy, r, stroke('#FFFFFF', 2, 0.6));
  canvas.save();
  canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), r, r), ClipOp.Intersect, true);
  drawPerson(canvas, cx - r * 0.38, cy + r * 0.12, r * 0.62, members[0]);
  drawPerson(canvas, cx + r * 0.38, cy + r * 0.12, r * 0.62, members[1]);
  canvas.restore();
  if (locked) canvas.drawCircle(cx, cy, r, solid('#000000', 0.55));
}
