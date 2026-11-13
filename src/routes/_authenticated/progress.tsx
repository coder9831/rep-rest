import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { fetchFinishedLogs, exKey } from "@/lib/data";
import { epley, volume } from "@/lib/training";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress — Tife's Weight Tracker" }, { name: "description", content: "Strength and volume charts." }, { property: "og:title", content: "Progress — Tife's Weight Tracker" }, { property: "og:description", content: "Strength and volume charts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ProgressPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" } };

function ProgressPage() {
  const q = useQuery({ queryKey: ["finished-logs"], queryFn: fetchFinishedLogs });
  const logs = q.data ?? [];
  const exercises = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of logs) m.set(exKey(r), r.exercise_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);
  const [ex, setEx] = useState<string>("");
  const [metric, setMetric] = useState<"top" | "e1rm">("top");
  const [range, setRange] = useState<"week" | "month" | "all">("month");
  const current = ex || exercises[0]?.[0] || "";

  const series = useMemo(() => {
    const bySession = new Map<string, { date: string; top: number; e1rm: number }>();
    for (const r of logs.filter((r) => exKey(r) === current)) {
      const w = Number(r.weight) || 0, reps = r.reps || 0;
      const cur = bySession.get(r.session_id) ?? { date: r.sessions.started_at, top: 0, e1rm: 0 };
      cur.top = Math.max(cur.top, w); cur.e1rm = Math.max(cur.e1rm, Math.round(epley(w, reps)));
      bySession.set(r.session_id, cur);
    }
    return [...bySession.values()].sort((a, b) => a.date.localeCompare(b.date)).map((p) => ({ ...p, label: new Date(p.date).toLocaleDateString([], { month: "short", day: "numeric" }) }));
  }, [logs, current]);

  const pie = useMemo(() => {
    const now = new Date();
    const start = range === "all" ? new Date(0) : range === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
    const m = new Map<string, { name: string; value: number }>();
    for (const r of logs) {
      if (new Date(r.sessions.started_at) < start) continue;
      const k = exKey(r); const cur = m.get(k) ?? { name: r.exercise_name, value: 0 };
      cur.value += volume(r.weight, r.reps); m.set(k, cur);
    }
    return [...m.values()].filter((v) => v.value > 0).sort((a, b) => b.value - a.value);
  }, [logs, range]);
  const totalVol = pie.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Your progress" sub="Strength, volume, and every rep that counts." />
      {q.isSuccess && logs.length === 0 && <div className="flex flex-col items-center border-y border-border py-16 text-center"><TrendingUp className="mb-4 h-10 w-10 text-primary" /><h2 className="text-xl font-bold">Every session adds up.</h2><p className="mt-2 text-sm text-muted-foreground">Finish a workout to see your progress here.</p></div>}

      {exercises.length > 0 && (
        <section className="page-section">
          <div className="flex flex-wrap items-center gap-2">
            <select value={current} onChange={(e) => setEx(e.target.value)} className="h-11 flex-1 rounded-md border border-input bg-background px-3 font-semibold">
              {exercises.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <div className="flex rounded-lg bg-secondary p-1">
              <Button size="sm" variant={metric === "top" ? "default" : "ghost"} onClick={() => setMetric("top")}>Top weight</Button>
              <Button size="sm" variant={metric === "e1rm" ? "default" : "ghost"} onClick={() => setMetric("e1rm")}>Est. 1RM</Button>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} unit=" lb" width={60} domain={["auto", "auto"]} />
                <Tooltip {...tip} formatter={(v: number) => [`${v} lb`, metric === "top" ? "Top weight" : "Est. 1RM"]} />
                <Line type="monotone" dataKey={metric} stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {metric === "e1rm" && <p className="text-xs text-muted-foreground">Epley: weight × (1 + reps ÷ 30), best set per session.</p>}
        </section>
      )}

      {logs.length > 0 && (
        <section className="page-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Volume split</h2>
            <div className="flex rounded-lg bg-secondary p-1">
              {(["week", "month", "all"] as const).map((r) => (
                <Button key={r} size="sm" variant={range === r ? "default" : "ghost"} onClick={() => setRange(r)}>{r === "week" ? "This week" : r === "month" ? "This month" : "All time"}</Button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Total: {totalVol.toLocaleString()} lb</p>
          {pie.length === 0 ? <p className="py-10 text-center text-muted-foreground">No volume in this range.</p> : (
            <div className="h-80">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="80%" stroke="var(--card)">
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tip} formatter={(v: number) => [`${v.toLocaleString()} lb (${Math.round((v / totalVol) * 100)}%)`, "Volume"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
