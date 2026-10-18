/**
 * Ora ISO 8601 con fuso locale, per esempio 2026-10-17T09:30:00+02:00.
 * Mai date ambigue tipo 17/10/26 nei registri.
 */
export function oraIso(d: Date = new Date()): string {
  const p2 = (n: number): string => String(n).padStart(2, "0");
  const offsetMin = -d.getTimezoneOffset();
  const segno = offsetMin >= 0 ? "+" : "-";
  const offH = p2(Math.floor(Math.abs(offsetMin) / 60));
  const offM = p2(Math.abs(offsetMin) % 60);
  const data = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const ora = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  return `${data}T${ora}${segno}${offH}:${offM}`;
}

/** Durata in millisecondi interi fra due istanti di performance.now() o Date.now(). */
export function durataMs(inizio: number, fine: number = Date.now()): number {
  return Math.max(0, Math.round(fine - inizio));
}
