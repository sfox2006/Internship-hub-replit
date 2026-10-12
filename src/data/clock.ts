import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
export const TIMEZONE = "Australia/Sydney";
export const DEFAULT_NOW = "2026-10-08T13:23:00Z";
export const referenceNow = () => {
  const setting = import.meta.env.VITE_REFERENCE_NOW;
  return setting === "live" ? new Date() : new Date(setting || DEFAULT_NOW);
};
export const localFormat = (date: string | Date, pattern = "MMM d, yyyy") =>
  formatInTimeZone(date, TIMEZONE, pattern);
export const localInput = (date: Date) =>
  localFormat(date, "yyyy-MM-dd'T'HH:mm");
export function readingStart(value: string) {
  const d = fromZonedTime(value, TIMEZONE);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}
export function mondayKey(date: string | Date) {
  const ymd = localFormat(date, "yyyy-MM-dd");
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function shiftDay(ymd: string, days: number) {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
