export type PlanExercise = { id: string; exerciseId: string | null; name: string; sets: number; reps: number; rest: number };
export type WorkoutDay = { id: string; name: string; weekday: number | null; exercises: PlanExercise[] };
export type PlanSnapshot = { days_per_week: number; weekdays: number[]; days: WorkoutDay[] };

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Normalizes an exercise name so "Bench Press", "bench  press " match the same saved exercise. */
export function nameKey(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Epley estimated one-rep max: weight × (1 + reps/30). */
export function epley(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

export function volume(weight: number | null, reps: number | null) {
  return (Number(weight) || 0) * (Number(reps) || 0);
}

/** True when at least ~one month (30 days) has passed since the last bodyweight entry, or none exists. */
export function bodyweightDue(lastDate: string | null | undefined, now = new Date()) {
  if (!lastDate) return true;
  const last = new Date(lastDate + "T00:00:00");
  return now.getTime() - last.getTime() >= 30 * 86400000;
}

export function fmtDuration(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function uid() {
  return crypto.randomUUID();
}

export function localDate(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
