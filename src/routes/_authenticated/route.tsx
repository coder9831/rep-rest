import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Dumbbell, CalendarDays, LineChart, ListChecks, Settings, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/isi-logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: Layout,
});

const nav = [
  { to: "/dashboard", label: "Train", icon: Dumbbell },
  { to: "/plan", label: "Plan", icon: ListChecks },
  { to: "/history", label: "History", icon: CalendarDays },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  const name = String(user.user_metadata?.['full_name'] ?? "Lifter");
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar px-5 py-8 md:flex">
        <Link to="/dashboard" className="mb-12 flex items-center gap-3">
          <img src={logo} alt="I.S.I" width={760} height={446} loading="lazy" className="h-11 w-auto" />
        </Link>
        <p className="section-label mb-3 px-3">Training</p>
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="group mb-1 flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground" activeProps={{ className: "border-primary bg-primary/10 text-primary" }}>
            <n.icon className="h-5 w-5" /> {n.label}<ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />
          </Link>
        ))}
        <div className="mt-auto border-t border-border pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">{name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-muted-foreground">Personal training log</p></div>
          </div>
        </div>
      </aside>
      <header className="flex items-center justify-between border-b border-border px-5 py-4 md:px-10">
        <Link to="/dashboard" className="md:hidden"><img src={logo} alt="I.S.I" width={760} height={446} loading="lazy" className="h-7 w-auto" /></Link>
        <span className="section-label hidden md:block">Iron sharpens iron</span>
        <span className="text-xs font-medium text-muted-foreground">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-7 md:px-10 md:py-10">
        <div className="page-enter"><Outlet /></div>
      </main>
      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1.5 border-t-2 border-transparent py-3 text-xs font-semibold text-muted-foreground" activeProps={{ className: "border-primary bg-primary/5 text-primary" }}>
            <n.icon className="h-5 w-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
