import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Timer, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchFinishedLogs, lastByExercise, exKey } from "@/lib/data";
import { fmtDuration, type WorkoutDay } from "@/lib/training";

export const Route = createFileRoute("/_authenticated/workout/$sessionId")({
  head: () => ({ meta: [{ title: "Workout — Tife's Weight Tracker" }, { name: "description", content: "Workout in progress." }] }),
  component: WorkoutPage,
});

type SetRow = { id: string; exercise_id: string | null; exercise_name: string; set_number: number; weight: number | null; reps: number | null; completed: boolean; exercise_notes: string | null };

function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function WorkoutPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const sessionQ = useQuery({ queryKey: ["session", sessionId], queryFn: async () => { const { data, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single(); if (error) throw error; return data; } });
  const setsQ = useQuery({ queryKey: ["session-sets", sessionId], queryFn: async () => (await supabase.from("set_logs").select("*").eq("session_id", sessionId).order("set_number")).data as SetRow[] });
  const historyQ = useQuery({ queryKey: ["finished-logs"], queryFn: fetchFinishedLogs });
  const [sets, setSets] = useState<SetRow[]>([]);
  const [notes, setNotes] = useState("");
  const [rest, setRest] = useState<{ name: string; endAt: number; total: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const now = useNow();
  const restKey = `rest-${sessionId}`;

  useEffect(() => { if (setsQ.data) setSets(setsQ.data); }, [setsQ.data]);
  useEffect(() => { if (sessionQ.data) setNotes(sessionQ.data.notes ?? ""); }, [sessionQ.data?.id]);
  useEffect(() => { try { const r = JSON.parse(localStorage.getItem(restKey) || "null"); if (r && r.endAt > Date.now()) setRest(r); } catch {} }, [restKey]);

  const last = useMemo(() => lastByExercise(historyQ.data ?? []), [historyQ.data]);
  const day = sessionQ.data?.day_snapshot as unknown as WorkoutDay | undefined;
  const groups = useMemo(() => {
    const order = day?.exercises.map((e) => e.name) ?? [];
    const m = new Map<string, SetRow[]>();
    for (const s of sets) m.set(s.exercise_name, [...(m.get(s.exercise_name) ?? []), s]);
    return [...m.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [sets, day]);

  const restLeft = rest ? Math.ceil((rest.endAt - now) / 1000) : 0;
  useEffect(() => {
    if (!(rest && restLeft <= 0)) return;
    {
      setRest(null); localStorage.removeItem(restKey);
      toast("Rest over — next set!"); navigator.vibrate?.(300);
    }
  }, [restLeft, rest, restKey]);

  function persist(id: string, patch: Partial<SetRow>, immediate = false) {
    clearTimeout(timers.current[id]);
    const run = async () => { const { error } = await supabase.from("set_logs").update(patch).eq("id", id); if (error) toast.error("Couldn't save — check your connection"); };
    if (immediate) run(); else timers.current[id] = setTimeout(run, 500);
  }

  function edit(id: string, patch: Partial<SetRow>, immediate = false) {
    const cur = sets.find((r) => r.id === id);
    if (!cur) return;
    const full = { ...cur, ...patch };
    setSets((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    persist(id, { weight: full.weight, reps: full.reps, completed: full.completed }, immediate);
  }

  function toggle(r: SetRow) {
    const done = !r.completed;
    edit(r.id, { completed: done }, true);
    if (done) {
      const plan = day?.exercises.find((e) => e.name === r.exercise_name);
      const secs = plan?.rest ?? 90;
      if (secs > 0) { const rr = { name: r.exercise_name, endAt: Date.now() + secs * 1000, total: secs }; setRest(rr); localStorage.setItem(restKey, JSON.stringify(rr)); }
    }
  }

  const notesTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function editSessionNotes(v: string) {
    setNotes(v); clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => supabase.from("sessions").update({ notes: v }).eq("id", sessionId).then(), 600);
  }
  const exNoteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function editExNotes(name: string, v: string) {
    setSets((s) => s.map((r) => (r.exercise_name === name ? { ...r, exercise_notes: v } : r)));
    clearTimeout(exNoteTimers.current[name]);
    exNoteTimers.current[name] = setTimeout(() => supabase.from("set_logs").update({ exercise_notes: v }).eq("session_id", sessionId).eq("exercise_name", name).then(), 600);
  }

  async function finish() {
    if (!sessionQ.data) return;
    if (!sets.some((s) => s.completed) && !confirm("No sets are checked off. Finish anyway?")) return;
    setFinishing(true);
    await Promise.all(sets.map((s) => supabase.from("set_logs").update({ weight: s.weight, reps: s.reps, completed: s.completed, exercise_notes: s.exercise_notes }).eq("id", s.id)));
    const end = new Date();
    const duration = Math.round((end.getTime() - new Date(sessionQ.data.started_at).getTime()) / 1000);
    const { error } = await supabase.from("sessions").update({ status: "finished", ended_at: end.toISOString(), duration_seconds: duration, notes }).eq("id", sessionId);
    setFinishing(false);
    if (error) { toast.error(error.message); return; }
    localStorage.removeItem(restKey);
    qc.invalidateQueries();
  }

  async function discard() {
    if (!confirm("Discard this workout? Nothing from it will be saved.")) return;
    await supabase.from("sessions").delete().eq("id", sessionId);
    localStorage.removeItem(restKey); qc.invalidateQueries(); navigate({ to: "/dashboard" });
  }

  const s = sessionQ.data;
  if (!s) return <p className="text-muted-foreground">Loading…</p>;

  if (s.status === "finished") {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow"><Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} /></div>
        <h1 className="mt-6 text-3xl font-black uppercase">Workout complete</h1>
        <p className="mt-2 text-muted-foreground">{s.workout_name}</p>
        <div className="timer-digits mt-6 text-6xl text-primary">{fmtDuration(s.duration_seconds ?? 0)}</div>
        <p className="text-sm text-muted-foreground">total time</p>
        <p className="mt-4">{sets.filter((x) => x.completed).length} sets logged</p>
        <div className="mt-8 flex gap-3">
          <Button asChild variant="hero" size="xl"><Link to="/dashboard">Done</Link></Button>
          <Button asChild variant="secondary" size="xl"><Link to="/history">History</Link></Button>
        </div>
      </div>
    );
  }

  const elapsed = (now - new Date(s.started_at).getTime()) / 1000;

  return (
    <div className="space-y-5 pb-32">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> In progress
            </div>
            <div className="truncate text-lg font-black">{s.workout_name}</div>
          </div>
          <div className="timer-digits text-4xl text-foreground">{fmtDuration(elapsed)}</div>
        </div>
      </div>

      {groups.map(([name, rows]) => {
        const first = rows[0]!;
        const prev = last.get(exKey(first));
        const plan = day?.exercises.find((e) => e.name === name);
        return (
          <section key={name} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">{name}</h2>
              {plan && <span className="text-xs text-muted-foreground">{plan.sets}×{plan.reps} · rest {plan.rest}s</span>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {prev ? <>Last: {prev.sets.map((p) => `${Number(p.weight ?? 0)}`).every((w, _, a) => w === a[0]) ? `${Number(prev.sets[0]!.weight ?? 0)} lb × ${prev.sets.map((p) => p.reps).join(", ")}` : prev.sets.map((p) => `${Number(p.weight ?? 0)}×${p.reps}`).join(", ")}</> : "First time logging this"}
            </p>
            <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_3.5rem] items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <span>Set</span><span>lb</span><span>Reps</span><span />
            </div>
            {rows.map((r) => (
              <div key={r.id} className={`mt-2 grid grid-cols-[2rem_1fr_1fr_3.5rem] items-center gap-2 ${r.completed ? "opacity-70" : ""}`}>
                <span className="text-center text-lg font-bold">{r.set_number}</span>
                <Input inputMode="decimal" value={r.weight ?? ""} onChange={(e) => edit(r.id, { weight: e.target.value === "" ? null : Number(e.target.value) || 0 })} className="h-14 text-center text-xl font-bold" aria-label={`Set ${r.set_number} weight`} />
                <Input inputMode="numeric" value={r.reps ?? ""} onChange={(e) => edit(r.id, { reps: e.target.value === "" ? null : parseInt(e.target.value) || 0 })} className="h-14 text-center text-xl font-bold" aria-label={`Set ${r.set_number} reps`} />
                <button onClick={() => toggle(r)} aria-label={r.completed ? "Mark set not done" : "Mark set done"}
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 transition ${r.completed ? "border-primary bg-primary text-primary-foreground shadow-glow" : "border-border text-muted-foreground hover:border-primary"}`}>
                  <Check className="h-7 w-7" strokeWidth={3} />
                </button>
              </div>
            ))}
            <Textarea placeholder="Exercise notes (optional)" value={first.exercise_notes ?? ""} onChange={(e) => editExNotes(name, e.target.value)} className="mt-3 min-h-10" />
          </section>
        );
      })}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">Session notes</h2>
        <Textarea placeholder="e.g. left shoulder tight" value={notes} onChange={(e) => editSessionNotes(e.target.value)} />
      </section>

      <Button variant="hero" size="xl" className="h-16 w-full text-xl" disabled={finishing} onClick={finish}>{finishing ? "Saving…" : "Finish workout"}</Button>
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={discard}>Discard workout</Button>

      {rest && restLeft > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-50 px-4 md:bottom-6 md:left-56">
          <div className="mx-auto flex max-w-3xl items-center gap-4 rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-glow">
            <Timer className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-widest">Rest · {rest.name}</div>
              <div className="timer-digits text-5xl leading-none">{fmtDuration(restLeft)}</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setRest({ ...rest, endAt: rest.endAt + 30000 })}>+30s</Button>
            <Button variant="secondary" size="icon" aria-label="Skip rest" onClick={() => { setRest(null); localStorage.removeItem(restKey); }}><X /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
