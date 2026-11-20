import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero-barbell.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IronLog — Sign in" },
      { name: "description", content: "Plan your week, run workouts with timers, log every set and track progress." },
      { property: "og:title", content: "IronLog" },
      { property: "og:description", content: "Plan your week, run workouts with timers, log every set and track progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const G = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>`;

function Index() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (s && e === "SIGNED_IN") navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function signIn() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Sign-in failed. Please try again."); setBusy(false); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col justify-end px-6 pb-16">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Weight &amp; Strength Tracker</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-foreground sm:text-6xl">
          Iron<span className="text-primary">Log</span>.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">Your weekly plan, workout timers, every set logged, and progress you can see.</p>
        <Button
          variant="secondary"
          size="xl"
          onClick={signIn}
          disabled={busy}
          className="mt-8 gap-3 border border-border"
        >
          <span aria-hidden="true" className="h-[18px] w-[18px]" dangerouslySetInnerHTML={{ __html: G }} />
          Continue with Google
        </Button>
      </div>
    </main>
  );
}
