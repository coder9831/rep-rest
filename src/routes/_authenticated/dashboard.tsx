import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Scale, AlertCircle, ArrowUpRight, Dumbbell } from "lucide-react";
import hero from "@/assets/hero-barbell.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { fetchPlan, startSession } from "@/lib/data";
import { WEEKDAYS, bodyweightDue, localDate, type WorkoutDay } from "@/lib/training";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Train — I.S.I" }, { name: "description", content: "Start today's workout." }, { property: "og:title", content: "Train — I.S.I" }, { property: "og:description", content: "Start today's workout." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
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
      <PageHeader title="Ready to lift?" sub={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} />
      <div className="relative overflow-hidden border-b-2 border-primary bg-card">
        <img src={hero} alt="Barbell ready for a strength training session" className="h-56 w-full object-cover sm:h-64" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8"><p className="section-label text-primary">I.S.I</p><h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Built one<br />rep at a time.</h2><div className="mt-5 flex gap-6 text-sm"><span><strong className="text-primary">{days.length}</strong> workouts</span><span><strong className="text-primary">{plan.data?.days_per_week ?? 0}</strong> days / week</span></div></div>
      </div>

      {active.data && (
        <Link to="/workout/$sessionId" params={{ sessionId: active.data.id }} className="flex items-center justify-between rounded-lg bg-primary p-5 text-primary-foreground shadow-glow">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Workout in progress</div>
            <div className="text-xl font-black">{active.data.workout_name}</div>
          </div>
          <span className="font-bold">Resume →</span>
        </Link>
      )}

      {due && (
        <div className="flex items-start gap-3 border-l-2 border-primary bg-primary/5 p-4 text-muted-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">{lastBw ? "It's been a month since your last bodyweight entry. Time to weigh in." : "Log your bodyweight to start tracking it monthly."}</div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Your workouts</h2><Button asChild variant="link" className="px-0"><Link to="/plan">Edit plan <ArrowUpRight /></Link></Button></div>
        {plan.isSuccess && days.length === 0 && (
          <div className="border-y border-border py-8 text-center">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="text-muted-foreground">No workout plan yet.</p>
            <Button asChild variant="hero" size="xl" className="mt-4"><Link to="/plan">Build your plan</Link></Button>
          </div>
        )}
        {sorted.map((d) => (
          <div key={d.id} className={`flex items-center gap-4 rounded-lg border bg-card p-5 transition-colors hover:border-primary/50 ${d.weekday === today ? "border-primary" : "border-border"}`}>
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

      <section className="page-section">
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
