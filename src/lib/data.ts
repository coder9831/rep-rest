import { supabase } from "@/integrations/supabase/client";
import { nameKey, type PlanSnapshot } from "./training";

export async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function fetchPlan(): Promise<(PlanSnapshot & { version: number }) | null> {
  const { data, error } = await supabase.from("plans").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { days_per_week: data.days_per_week, weekdays: data.weekdays, days: (data.days as any) ?? [], version: data.version };
}

export async function fetchExercises() {
  const { data, error } = await supabase.from("exercises").select("id,name,name_key").order("name");
  if (error) throw error;
  return data;
}

/** Find-or-create an exercise in the saved list by normalized name. */
export async function ensureExercise(name: string) {
  const key = nameKey(name);
  const { data: existing } = await supabase.from("exercises").select("id,name").eq("name_key", key).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from("exercises").insert({ name: name.trim(), name_key: key }).select("id,name").single();
  if (error) throw error;
  return data;
}

/** Saves the plan and records the saved state as a new version. */
export async function savePlan(plan: PlanSnapshot) {
  const user_id = await getUserId();
  const current = await fetchPlan();
  const version = (current?.version ?? 0) + 1;
  for (const d of plan.days)
    for (const ex of d.exercises) {
      const e = await ensureExercise(ex.name);
      ex.exerciseId = e.id;
      ex.name = e.name;
    }
  const snapshot = { days_per_week: plan.days_per_week, weekdays: plan.weekdays, days: plan.days };
  const { error } = await supabase.from("plans").upsert({ user_id, ...snapshot, days: snapshot.days as any, version, updated_at: new Date().toISOString() });
  if (error) throw error;
  const { error: e2 } = await supabase.from("plan_versions").insert({ user_id, version, snapshot: snapshot as any });
  if (e2) throw e2;
  return version;
}

export type LogRow = {
  id: string; session_id: string; exercise_id: string | null; exercise_name: string; set_number: number;
  weight: number | null; reps: number | null; completed: boolean; exercise_notes: string | null;
  sessions: { started_at: string; status: string; session_date: string; workout_name: string };
};

export async function fetchFinishedLogs(): Promise<LogRow[]> {
  const { data, error } = await supabase
    .from("set_logs")
    .select("*, sessions!inner(started_at,status,session_date,workout_name)")
    .eq("sessions.status", "finished")
    .eq("completed", true)
    .order("set_number")
    .limit(5000);
  if (error) throw error;
  return (data as any) ?? [];
}

export function exKey(r: { exercise_id: string | null; exercise_name: string }) {
  return r.exercise_id ?? nameKey(r.exercise_name);
}

/** Most recent finished session's sets per exercise key. */
export function lastByExercise(logs: LogRow[]) {
  const latest = new Map<string, { started: string; sets: LogRow[] }>();
  for (const r of logs) {
    const k = exKey(r);
    const cur = latest.get(k);
    if (!cur || r.sessions.started_at > cur.started) latest.set(k, { started: r.sessions.started_at, sets: [r] });
    else if (r.sessions.started_at === cur.started) cur.sets.push(r);
  }
  for (const v of latest.values()) v.sets.sort((a, b) => a.set_number - b.set_number);
  return latest;
}

export async function startSession(day: import("./training").WorkoutDay, planVersion: number) {
  const logs = await fetchFinishedLogs();
  const last = lastByExercise(logs);
  const { localDate } = await import("./training");
  const { data: s, error } = await supabase
    .from("sessions")
    .insert({ workout_day_id: day.id, workout_name: day.name, plan_version: planVersion, session_date: localDate(), day_snapshot: day as any })
    .select("id")
    .single();
  if (error) throw error;
  const rows = day.exercises.flatMap((ex) => {
    const prev = last.get(ex.exerciseId ?? "")?.sets ?? [];
    return Array.from({ length: ex.sets }, (_, i) => ({
      session_id: s.id, exercise_id: ex.exerciseId, exercise_name: ex.name, set_number: i + 1,
      reps: ex.reps, weight: prev[i]?.weight ?? prev[prev.length - 1]?.weight ?? null, completed: false,
    }));
  });
  if (rows.length) {
    const { error: e2 } = await supabase.from("set_logs").insert(rows);
    if (e2) throw e2;
  }
  return s.id;
}
