import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { PageHeader } from "@/components/PageHeader";
import { fmtDuration, localDate } from "@/lib/training";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — I.S.I" }, { name: "description", content: "Past workouts on a calendar." }, { property: "og:title", content: "History — I.S.I" }, { property: "og:description", content: "Past workouts on a calendar." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const q = useQuery({
    queryKey: ["history"],
    queryFn: async () => (await supabase.from("sessions").select("*, set_logs(*)").eq("status", "finished").order("started_at", { ascending: false })).data ?? [],
  });
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const dates = useMemo(() => (q.data ?? []).map((s) => new Date(s.session_date + "T00:00:00")), [q.data]);
  const key = selected ? localDate(selected) : "";
  const onDay = (q.data ?? []).filter((s) => s.session_date === key);

  return (
    <div className="space-y-6">
      <PageHeader title="History" sub={`${q.data?.length ?? 0} workouts logged`} />
      <div className="flex justify-center border-y border-border py-5">
        <Calendar mode="single" selected={selected} onSelect={setSelected}
          modifiers={{ trained: dates }} modifiersClassNames={{ trained: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-bold rounded-md" }} />
      </div>
      {selected && onDay.length === 0 && <p className="text-center text-muted-foreground">No workout on {selected.toLocaleDateString()}.</p>}
      {onDay.map((s) => {
        const groups = new Map<string, any[]>();
        for (const r of [...s.set_logs].sort((a, b) => a.set_number - b.set_number)) groups.set(r.exercise_name, [...(groups.get(r.exercise_name) ?? []), r]);
        return (
          <section key={s.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">{s.workout_name}</h2>
              <span className="timer-digits text-primary">{fmtDuration(s.duration_seconds ?? 0)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · plan v{s.plan_version}</p>
            {s.notes && <p className="mt-2 rounded-lg bg-secondary p-2 text-sm">📝 {s.notes}</p>}
            <div className="mt-3 space-y-3">
              {[...groups.entries()].map(([name, rows]) => (
                <div key={name}>
                  <div className="font-semibold">{name}</div>
                  <ul className="text-sm text-muted-foreground">
                    {rows.map((r) => <li key={r.id} className={r.completed ? "" : "line-through opacity-50"}>Set {r.set_number}: {Number(r.weight ?? 0)} lb × {r.reps ?? 0}</li>)}
                  </ul>
                  {rows[0]?.exercise_notes && <p className="text-sm italic">“{rows[0].exercise_notes}”</p>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
