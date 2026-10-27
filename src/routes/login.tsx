import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Info } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Libratify" },
      { name: "description", content: "Sign in to your Libratify library workspace or enter the live demo." },
      { property: "og:title", content: "Sign in — Libratify" },
      { property: "og:description", content: "Sign in to your Libratify library workspace or enter the live demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function Shelf() {
  const books = [
    { h: 70, c: "var(--chart-1)" }, { h: 84, c: "var(--chart-2)" }, { h: 62, c: "var(--chart-3)" },
    { h: 90, c: "var(--chart-7)" }, { h: 76, c: "var(--chart-6)" }, { h: 66, c: "var(--chart-4)" },
    { h: 88, c: "var(--primary-foreground)" }, { h: 72, c: "var(--chart-1)" },
  ];
  return (
    <div className="flex items-end gap-1.5" aria-hidden="true">
      {books.map((b, i) => (
        <div
          key={i}
          className="w-7 rounded-t-sm opacity-90 transition-transform duration-300 hover:-translate-y-2"
          style={{ height: b.h * 1.6, background: b.c, transform: i === 5 ? "rotate(-8deg) translateX(4px)" : undefined, transformOrigin: "bottom left" }}
        >
          <div className="mx-auto mt-3 h-0.5 w-4 bg-navy/30" />
          <div className="mx-auto mt-1 h-0.5 w-3 bg-navy/20" />
        </div>
      ))}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    setNotice(Object.keys(next).length === 0);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-navy-foreground lg:flex">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <Link to="/" className="relative" aria-label="Libratify home"><Logo light /></Link>
        <div className="relative">
          <Shelf />
          <div className="h-2 w-full max-w-md rounded-full bg-navy-foreground/15" />
          <h2 className="mt-10 max-w-md font-serif text-4xl font-semibold leading-tight">
            Every book, every borrower, <em className="text-primary">in order.</em>
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-70">
            Libratify keeps your collection, members and circulation in one calm, clear workspace.
          </p>
        </div>
        <p className="relative text-xs opacity-50">Your Library, Simplified.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden" aria-label="Libratify home"><Logo /></Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight lg:mt-0">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your library workspace.</p>

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" autoComplete="email" placeholder="you@library.org" value={email}
                onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined} className="h-11"
              />
              {errors.email && <p id="email-error" className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined} className="h-11 pr-11"
                />
                <button
                  type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p id="password-error" className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              Remember me
            </label>
            {notice && (
              <div role="status" className="flex gap-2 rounded-lg border border-primary/20 bg-primary-soft p-3 text-sm text-accent-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                Account sign-in isn't connected yet. Use the demo below to explore the workspace.
              </div>
            )}
            <Button type="submit" className="h-11 w-full">Sign in</Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="h-11 w-full" onClick={() => navigate({ to: "/dashboard" })}>
            Enter Demo <ArrowRight className="size-4" />
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Demo mode — no account or authentication. Sample data only.
          </p>
        </div>
      </main>
    </div>
  );
}
