import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Scale, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { fetchPlan, startSession } from "@/lib/data";
import { WEEKDAYS, bodyweightDue, localDate, type WorkoutDay } from "@/lib/training";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Train — Tife's Weight Tracker" }, { name: "description", content: "Start today's workout." }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const plan = useQuery({ queryKey: ["plan"], queryFn: fetchPlan });
  const active = useQuery({
    queryKey: ["active-session"],
    queryFn: async () => (await supabase.from("sessions").select("id,workout_name,started_at").eq("status", "in_progress").order("started_at", { ascending: false }).limit(1)).data?.[0] ?? null,
  });
  const bw = useQuery({
    queryKey: ["bodyweights"],
    queryFn: async () => (await supabase.from("bodyweights").select("*").order("entry_date", { ascending: false })).data ?? [],
  });
  const [weight, setWeight] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const today = new Date().getDay();
  const lastBw = bw.data?.[0];
  const due = bw.isSuccess && bodyweightDue(lastBw?.entry_date);

  async function start(day: WorkoutDay) {
    if (active.data) { toast.error("Finish or resume your current workout first."); return; }
    setStarting(day.id);
    try {
      const id = await startSession(day, plan.data?.version ?? 0);
      navigate({ to: "/workout/$sessionId", params: { sessionId: id } });
    } catch (e: any) { toast.error(e.message); setStarting(null); }
  }

  async function saveBw() {
    const w = parseFloat(weight);
    if (!w || w <= 0 || w > 1000) { toast.error("Enter a valid weight in lb"); return; }
    const { error } = await supabase.from("bodyweights").insert({ weight: w, entry_date: localDate() });
    if (error) { toast.error(error.message); return; }
    setWeight(""); toast.success("Bodyweight saved"); qc.invalidateQueries({ queryKey: ["bodyweights"] });
  }

  const days = plan.data?.days ?? [];
  const sorted = [...days].sort((a, b) => Number(b.weekday === today) - Number(a.weekday === today));

  return (
    <div className="space-y-6">
      <PageHeader title="Train" sub={`${WEEKDAYS[today]}day${days.some((d) => d.weekday === today) ? " — you have a workout scheduled" : ""}`} />

      {active.data && (
        <Link to="/workout/$sessionId" params={{ sessionId: active.data.id }} className="flex items-center justify-between rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-glow">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Workout in progress</div>
            <div className="text-xl font-black">{active.data.workout_name}</div>
          </div>
          <span className="font-bold">Resume →</span>
        </Link>
      )}

      {due && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/50 bg-accent p-4 text-accent-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">{lastBw ? "It's been a month since your last bodyweight entry. Time to weigh in." : "Log your bodyweight to start tracking it monthly."}</div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Workouts</h2>
        {plan.isSuccess && days.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">No workout plan yet.</p>
            <Button asChild variant="hero" size="xl" className="mt-4"><Link to="/plan">Build your plan</Link></Button>
          </div>
        )}
        {sorted.map((d) => (
          <div key={d.id} className={`flex items-center gap-4 rounded-2xl border bg-card p-4 ${d.weekday === today ? "border-primary" : "border-border"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-bold">{d.name || "Untitled"}</span>
                {d.weekday !== null && <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold">{WEEKDAYS[d.weekday]}</span>}
              </div>
              <div className="truncate text-sm text-muted-foreground">{d.exercises.map((e) => e.name).join(" · ") || "No exercises"}</div>
            </div>
            <Button variant="hero" size="xl" className="px-5" disabled={!!starting || d.exercises.length === 0} onClick={() => start(d)}>
              <Play className="h-5 w-5" /> {starting === d.id ? "…" : "Start"}
            </Button>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><Scale className="h-5 w-5 text-primary" /> Bodyweight</h2>
        <div className="flex gap-2">
          <Input inputMode="decimal" placeholder="lb" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-12 text-lg" />
          <Button size="xl" onClick={saveBw}>Save</Button>
        </div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {bw.data?.slice(0, 6).map((b) => (
            <li key={b.id} className="flex justify-between py-2"><span className="text-muted-foreground">{b.entry_date}</span><span className="font-semibold">{Number(b.weight)} lb</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
