import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { LogOut, Trash2, UserRound } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — IronLog" }, { name: "description", content: "Account settings." }, { property: "og:title", content: "Settings — IronLog" }, { property: "og:description", content: "Account settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const del = useServerFn(deleteAccount);
  const [busy, setBusy] = useState(false);
  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data });

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }
  async function remove() {
    setBusy(true);
    try { await del(); toast.success("Account deleted"); await signOut(); }
    catch (e: any) { toast.error(e.message); setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub="Your account and preferences." />
      <section className="page-section">
        <UserRound className="mb-4 h-7 w-7 text-primary" />
        <div className="text-lg font-bold">{profile.data?.name ?? "—"}</div>
        <div className="break-words text-sm text-muted-foreground">{profile.data?.email}</div>
        <p className="mt-2 text-sm text-muted-foreground">All weights are in pounds (lb).</p>
      </section>
      <Button size="xl" variant="secondary" onClick={signOut}><LogOut /> Sign out</Button>
      <AlertDialog>
        <div className="page-section"><h2 className="mb-3 font-bold">Account deletion</h2><AlertDialogTrigger asChild><Button size="xl" variant="outline" className="text-destructive" ><Trash2 />Delete account</Button></AlertDialogTrigger></div>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes your plan, version history, workouts, sets and bodyweight log. It can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={remove}>Delete forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
