import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Dumbbell, CalendarDays, LineChart, ListChecks, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pl-56">
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r border-border bg-sidebar p-4 md:flex">
        <div className="mb-6 px-2 text-lg font-black uppercase tracking-tight">Tife<span className="text-primary">.</span>lift</div>
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold text-muted-foreground hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-primary" }}>
            <n.icon className="h-5 w-5" /> {n.label}
          </Link>
        ))}
      </aside>
      <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-sidebar md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <n.icon className="h-5 w-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
