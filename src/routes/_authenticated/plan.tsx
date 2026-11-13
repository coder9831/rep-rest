import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { fetchExercises, fetchPlan, savePlan } from "@/lib/data";
import { WEEKDAYS, nameKey, uid, type PlanSnapshot, type WorkoutDay, type PlanExercise } from "@/lib/training";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({ meta: [{ title: "Plan — Tife's Weight Tracker" }, { name: "description", content: "Edit your weekly workout plan." }] }),
  component: PlanPage,
});

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d; if (j < 0 || j >= arr.length) return arr;
  const c = [...arr]; [c[i], c[j]] = [c[j]!, c[i]!]; return c;
}

function PlanPage() {
  const qc = useQueryClient();
  const planQ = useQuery({ queryKey: ["plan"], queryFn: fetchPlan });
  const exQ = useQuery({ queryKey: ["exercises"], queryFn: fetchExercises });
  const versions = useQuery({ queryKey: ["plan-versions"], queryFn: async () => (await supabase.from("plan_versions").select("*").order("version", { ascending: false })).data ?? [] });
  const [plan, setPlan] = useState<PlanSnapshot>({ days_per_week: 3, weekdays: [], days: [] });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<any>(null);

  useEffect(() => {
    if (!planQ.data || dirty) return;
    if (planQ.data) setPlan(structuredClone({ days_per_week: planQ.data.days_per_week, weekdays: planQ.data.weekdays, days: planQ.data.days }));
  }, [planQ.data]);

  const update = (p: PlanSnapshot) => { setPlan(p); setDirty(true); };
  const setDays = (days: WorkoutDay[]) => update({ ...plan, days });
  const setDay = (i: number, d: WorkoutDay) => setDays(plan.days.map((x, k) => (k === i ? d : x)));

  function toggleWeekday(w: number) {
    let wd = plan.weekdays.includes(w) ? plan.weekdays.filter((x) => x !== w) : [...plan.weekdays, w].sort();
    if (wd.length > plan.days_per_week) { toast.error(`You chose ${plan.days_per_week} days per week`); return; }
    update({ ...plan, weekdays: wd, days: plan.days.map((d) => (d.weekday !== null && !wd.includes(d.weekday) ? { ...d, weekday: null } : d)) });
  }

  async function save() {
    for (const d of plan.days) {
      if (!d.name.trim()) { toast.error("Every workout day needs a name"); return; }
      for (const e of d.exercises) if (!e.name.trim()) { toast.error(`An exercise in ${d.name} has no name`); return; }
    }
    setSaving(true);
    try {
      const copy = structuredClone(plan);
      const v = await savePlan(copy);
      setPlan(copy); setDirty(false);
      toast.success(`Plan saved (version ${v})`);
      qc.invalidateQueries({ queryKey: ["plan"] }); qc.invalidateQueries({ queryKey: ["plan-versions"] }); qc.invalidateQueries({ queryKey: ["exercises"] });
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  const exNames = exQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Plan" sub={planQ.data ? `Version ${planQ.data.version}` : "Build your week"}
        action={<Button variant="hero" size="xl" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save plan"}</Button>} />

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Weekly schedule</h2>
        <label className="mt-3 block text-sm text-muted-foreground">Days per week</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Button key={n} variant={plan.days_per_week === n ? "default" : "secondary"} className="h-11 w-11 text-base font-bold"
              onClick={() => update({ ...plan, days_per_week: n, weekdays: plan.weekdays.slice(0, n) })}>{n}</Button>
          ))}
        </div>
        <label className="mt-4 block text-sm text-muted-foreground">Workout days ({plan.weekdays.length}/{plan.days_per_week})</label>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <Button key={w} variant={plan.weekdays.includes(i) ? "default" : "secondary"} className="h-11 px-0 font-bold" onClick={() => toggleWeekday(i)}>{w}</Button>
          ))}
        </div>
      </section>

      <datalist id="ex-names">{exNames.map((e) => <option key={e.id} value={e.name} />)}</datalist>

      {plan.days.map((d, i) => (
        <section key={d.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={d.name} placeholder="Workout name (e.g. Push Day)" onChange={(e) => setDay(i, { ...d, name: e.target.value })} className="h-12 min-w-0 flex-1 text-lg font-bold" />
            <select value={d.weekday ?? ""} onChange={(e) => setDay(i, { ...d, weekday: e.target.value === "" ? null : Number(e.target.value) })}
              className="h-12 rounded-md border border-input bg-background px-3">
              <option value="">Any day</option>
              {plan.weekdays.map((w) => <option key={w} value={w}>{WEEKDAYS[w]}</option>)}
            </select>
            <div className="flex">
              <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => setDays(move(plan.days, i, -1))}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => setDays(move(plan.days, i, 1))}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" aria-label="Duplicate day" onClick={() => { const c = structuredClone(d); c.id = uid(); c.name += " (copy)"; c.weekday = null; c.exercises.forEach((e) => (e.id = uid())); const days = [...plan.days]; days.splice(i + 1, 0, c); setDays(days); }}><Copy /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete day" onClick={() => confirm(`Delete ${d.name || "this day"}?`) && setDays(plan.days.filter((_, k) => k !== i))}><Trash2 className="text-destructive" /></Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {d.exercises.map((ex, j) => {
              const setEx = (e: PlanExercise) => setDay(i, { ...d, exercises: d.exercises.map((x, k) => (k === j ? e : x)) });
              const match = ex.name && exNames.find((n) => nameKey(n.name) === nameKey(ex.name) && n.name !== ex.name);
              return (
                <div key={ex.id} className="rounded-xl bg-secondary p-3">
                  <div className="flex items-center gap-2">
                    <Input list="ex-names" value={ex.name} placeholder="Exercise name" onChange={(e) => setEx({ ...ex, name: e.target.value, exerciseId: null })} className="h-11 flex-1 bg-background font-semibold" />
                    <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => setDay(i, { ...d, exercises: move(d.exercises, j, -1) })}><ArrowUp /></Button>
                    <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => setDay(i, { ...d, exercises: move(d.exercises, j, 1) })}><ArrowDown /></Button>
                    <Button size="icon" variant="ghost" aria-label="Duplicate exercise" onClick={() => { const ex2 = d.exercises.slice(); ex2.splice(j + 1, 0, { ...ex, id: uid() }); setDay(i, { ...d, exercises: ex2 }); }}><Copy /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete exercise" onClick={() => setDay(i, { ...d, exercises: d.exercises.filter((_, k) => k !== j) })}><Trash2 className="text-destructive" /></Button>
                  </div>
                  {match && (
                    <button className="mt-1 text-sm text-primary underline" onClick={() => setEx({ ...ex, name: match.name, exerciseId: match.id })}>Use saved “{match.name}”</button>
                  )}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    {([["sets", "Sets"], ["reps", "Reps"], ["rest", "Rest (sec)"]] as const).map(([k, label]) => (
                      <label key={k}>{label}
                        <Input type="number" min={k === "rest" ? 0 : 1} inputMode="numeric" value={ex[k]} onChange={(e) => setEx({ ...ex, [k]: Math.max(0, parseInt(e.target.value) || 0) })} className="mt-1 h-11 bg-background text-base text-foreground" />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            <Button variant="secondary" className="w-full" onClick={() => setDay(i, { ...d, exercises: [...d.exercises, { id: uid(), exerciseId: null, name: "", sets: 3, reps: 8, rest: 90 }] })}>
              <Plus /> Add exercise
            </Button>
          </div>
        </section>
      ))}

      <Button variant="outline" size="xl" className="w-full" onClick={() => setDays([...plan.days, { id: uid(), name: "", weekday: null, exercises: [] }])}><Plus /> Add workout day</Button>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><History className="h-5 w-5 text-primary" /> Version history</h2>
        {versions.data?.length === 0 && <p className="text-sm text-muted-foreground">No saved versions yet.</p>}
        <ul className="divide-y divide-border">
          {versions.data?.map((v) => (
            <li key={v.id}>
              <button className="flex w-full justify-between py-3 text-left hover:text-primary" onClick={() => setViewing(v)}>
                <span className="font-semibold">Version {v.version}{v.version === planQ.data?.version ? " (current)" : ""}</span>
                <span className="text-sm text-muted-foreground">{new Date(v.saved_at).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Version {viewing?.version} — {viewing && new Date(viewing.saved_at).toLocaleString()}</DialogTitle></DialogHeader>
          {viewing && <PlanView snap={viewing.snapshot} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanView({ snap }: { snap: PlanSnapshot }) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">{snap.days_per_week} days/week · {snap.weekdays.map((w) => WEEKDAYS[w]).join(", ") || "no days selected"}</p>
      {snap.days.map((d) => (
        <div key={d.id}>
          <div className="font-bold">{d.name} {d.weekday !== null && <span className="text-muted-foreground">· {WEEKDAYS[d.weekday]}</span>}</div>
          <ul className="mt-1 space-y-0.5">
            {d.exercises.map((e) => <li key={e.id}>{e.name} — {e.sets}×{e.reps}, rest {e.rest}s</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
