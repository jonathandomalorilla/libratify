import { createFileRoute } from "@tanstack/react-router";
import { Info, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, Panel } from "@/components/library/ui-kit";
import { RangeSelect } from "@/components/library/RangeSelect";
import { useLibrary } from "@/hooks/use-library";
import { pageHead } from "@/lib/seo";
import type { AdminProfile } from "@/types";

export const Route = createFileRoute("/_workspace/settings")({
  head: pageHead("Settings", "Admin profile and interface preferences for your Libratify workspace."),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, preferences, updateProfile, updatePreferences, resetDemo } = useLibrary();
  const [form, setForm] = useState<AdminProfile>(profile);
  const [errors, setErrors] = useState<Partial<Record<keyof AdminProfile, string>>>({});
  useEffect(() => setForm(profile), [profile]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (form.name.trim().length < 2) errs.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.library.trim()) errs.library = "Enter the library name.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateProfile({ ...form, name: form.name.trim(), library: form.library.trim() });
    toast.success("Profile saved");
  };
  const field = (k: keyof AdminProfile, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`p-${k}`}>{label}</Label>
      <Input id={`p-${k}`} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <>
      <PageHeader title="Settings" description="Your profile and how the workspace looks and behaves." />
      <div className="grid max-w-4xl gap-6">
        <Panel title="Admin profile" description="Shown in the header and on the dashboard greeting.">
          <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            {field("name", "Full name")}
            {field("email", "Email")}
            {field("role", "Role")}
            {field("library", "Library name")}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => { setForm(profile); setErrors({}); }}>Discard</Button>
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </Panel>

        <Panel title="Interface preferences">
          <div className="divide-y">
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
              <div>
                <p className="text-sm font-medium">Default date range</p>
                <p className="text-xs text-muted-foreground">Used when opening the dashboard and reports.</p>
              </div>
              <RangeSelect value={preferences.defaultRange} onChange={(v) => { updatePreferences({ ...preferences, defaultRange: v }); toast.success("Default range updated"); }} />
            </div>
            <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
              <div>
                <Label htmlFor="compact" className="text-sm font-medium">Compact book table</Label>
                <p className="text-xs text-muted-foreground">Fit more rows on screen in the Books list.</p>
              </div>
              <Switch id="compact" checked={preferences.compactTables} onCheckedChange={(v) => updatePreferences({ ...preferences, compactTables: v })} />
            </div>
          </div>
        </Panel>

        <Panel title="Account security">
          <div className="flex gap-3 rounded-lg border bg-muted/50 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Password, sign-in and session management will be handled by your organisation's Libratify server once it's connected.
              They aren't available in this demo.
            </p>
          </div>
        </Panel>

        <Panel title="Demo data">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              Demo only: all changes are stored in this browser. Reset to restore the original sample collection.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="shrink-0"><RotateCcw className="size-4" /> Reset demo data</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
                  <AlertDialogDescription>Books, members, loans and your profile will return to the original sample data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { await resetDemo(); toast.success("Demo data reset"); }}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Panel>
      </div>
    </>
  );
}
