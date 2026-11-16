// Tamaño del dibujo del título según la altura de la pantalla (sin Skia: lo usa también la pantalla de inicio).
const BASE_W = 300;
const BASE_H = 170;

/** En móviles bajos (o con barra de navegación grande) el título se encoge. */
export function titleArtSize(screenHeight: number): { width: number; height: number; scale: number; titleFont: number; compact: boolean } {
  const scale = screenHeight < 640 ? 0.45 : screenHeight < 760 ? 0.62 : screenHeight < 860 ? 0.8 : 1;
  return {
    width: Math.round(BASE_W * scale),
    height: Math.round(BASE_H * scale),
    scale,
    titleFont: Math.round(30 + 26 * scale),
    compact: screenHeight < 760,
  };
}
