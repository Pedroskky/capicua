let dateOverride: string | null = null;

/** Solo para tests y capturas: fija «hoy» a una fecha AAAAMMDD. */
export function setDateOverride(key: string | null): void {
  dateOverride = key;
}

/** Fecha local del móvil como AAAAMMDD (no UTC: el día cambia a medianoche del jugador). */
export function localDateKey(date?: Date): string {
  if (!date && dateOverride) return dateOverride;
  date = date ?? new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
}

/** Milisegundos que faltan para la próxima medianoche local. */
export function msUntilNextDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

function keyToDate(key: string): Date | null {
  if (!/^\d{8}$/.test(key)) return null;
  return new Date(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8)));
}

/** Días de calendario de `from` a `to` (AAAAMMDD). Negativo si `to` es anterior. NaN si no son fechas. */
export function daysBetween(from: string, to: string): number {
  const a = keyToDate(from);
  const b = keyToDate(to);
  if (!a || !b) return Number.NaN;
  // Redondeo para que los cambios de horario de verano (días de 23 o 25 h) no descuadren.
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
