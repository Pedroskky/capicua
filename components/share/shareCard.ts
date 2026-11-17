// Imagen para compartir (Skia fuera de pantalla): paño, las fichas finales de la mesa, el aviso («¡Capicúa!»,
// «¡Zapatero!», «¡Campeones del barrio!»), el marcador y el nombre del juego.
import { BlurStyle, Skia, type SkCanvas, type SkFont } from '@shopify/react-native-skia';
import { COLORS, SHARE_IMAGE, type TableSkinId, type TileSkinId } from '@/game/config';
import type { LinePiece } from '@/game/engine';
import { fitTable, layoutLine, tileDrawSpec } from '@/game/layout';
import { drawTableSurface, drawTile } from '@/components/art/tiles';

export interface ShareFonts {
  title: SkFont;
  line: SkFont;
  footer: SkFont;
}

export interface ShareCard {
  title: string;
  /** Marcador y otras líneas (p. ej. «Nosotros 112 · Ellos 0»). */
  lines: string[];
  footer: string;
  line: LinePiece[];
  origin: number;
  tiles: TileSkinId;
  table: TableSkinId;
}

function drawCenteredText(canvas: SkCanvas, text: string, font: SkFont, x: number, y: number, color: string, maxWidth: number): void {
  if (!text) return;
  // En la web no hay measureText: getTextWidth funciona en los dos.
  const width = font.getTextWidth(text);
  const fit = Math.min(1, maxWidth / Math.max(1, width));
  canvas.save();
  canvas.translate(x, y);
  canvas.scale(fit, fit);
  const shadow = Skia.Paint();
  shadow.setColor(Skia.Color('#000000'));
  shadow.setAlphaf(0.75);
  shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 6, false));
  canvas.drawText(text, -width / 2 + 3, 4, shadow, font);
  const fill = Skia.Paint();
  fill.setAntiAlias(true);
  fill.setColor(Skia.Color(color));
  canvas.drawText(text, -width / 2, 0, fill, font);
  canvas.restore();
}

export function drawShareCard(canvas: SkCanvas, card: ShareCard, fonts: ShareFonts): void {
  const { width, height } = SHARE_IMAGE;
  const bg = Skia.Paint();
  bg.setColor(Skia.Color(COLORS.background));
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), bg);
  const table = { x: 60, y: 230, w: width - 120, h: 560 };
  drawTableSurface(canvas, table, card.table);
  // Las fichas finales de la mesa, tal y como quedaron (cada mitad pegada a su vecina).
  if (card.line.length > 0) {
    const lay = layoutLine(card.line, card.origin);
    const fit = fitTable(lay.bounds, table.w - 40, table.h - 40, 70);
    for (const t of lay.tiles) {
      const spec = tileDrawSpec(t);
      drawTile(canvas, table.x + 20 + fit.offsetX + t.cx * fit.unit, table.y + 20 + fit.offsetY + t.cy * fit.unit, fit.unit, spec.vertical, spec.first, spec.second, { skin: card.tiles });
    }
  }
  drawCenteredText(canvas, card.title, fonts.title, width / 2, 170, COLORS.accent, width - 120);
  let y = 880;
  for (const line of card.lines) {
    drawCenteredText(canvas, line, fonts.line, width / 2, y, COLORS.text, width - 120);
    y += SHARE_IMAGE.lineSize * 1.3;
  }
  drawCenteredText(canvas, card.footer, fonts.footer, width / 2, height - 50, COLORS.accent, width - 120);
}

/** Dibuja en una superficie en memoria y devuelve el PNG en base64 (null si no se puede). */
export function renderShareImage(draw: (canvas: SkCanvas) => void): string | null {
  try {
    const surface = Skia.Surface.Make(SHARE_IMAGE.width, SHARE_IMAGE.height);
    if (!surface) return null;
    draw(surface.getCanvas());
    surface.flush();
    return surface.makeImageSnapshot().encodeToBase64();
  } catch {
    return null;
  }
}
