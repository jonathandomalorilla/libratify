import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftRight, ArrowRight, BarChart3, BookOpen, CheckCircle2, Clock, Library, Users,
} from "lucide-react";
import { useMemo } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/library/ui-kit";
import { BorrowTrendChart } from "@/components/library/charts";
import { BookCover } from "@/components/library/BookCover";
import { StatusBadge } from "@/components/library/StatusBadge";
import { useLibrary } from "@/hooks/use-library";
import { computeSummary, loanStatus, monthlySeries } from "@/lib/library-stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Libratify — A Smarter Way to Manage Your Library" },
      { name: "description", content: "Manage books, members, borrowing, and insights in one beautifully simple workspace." },
      { property: "og:title", content: "Libratify — A Smarter Way to Manage Your Library" },
      { property: "og:description", content: "Manage books, members, borrowing, and insights in one beautifully simple workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BookOpen, title: "Inventory that stays accurate", body: "Track every title and copy. Availability updates the moment a book goes out or comes back." },
  { icon: ArrowLeftRight, title: "Borrowing without friction", body: "Check out and return in two clicks, with due dates, overdue flags and duplicate-loan protection." },
  { icon: Users, title: "Members at a glance", body: "Profiles, contact details and current loans in one place. Deactivate instead of losing history." },
  { icon: BarChart3, title: "Insights you can act on", body: "Borrowing trends, popular titles and category demand — computed live from your circulation." },
];

const STEPS = [
  { title: "Add your collection", body: "Enter titles with ISBN, category and copy counts — or import later through the API." },
  { title: "Register members", body: "Create member profiles with contact details so every loan has an owner." },
  { title: "Lend and learn", body: "Record loans and returns, then watch the dashboard reveal how your library is used." },
];

function ProductPreview() {
  const { books, members, loans } = useLibrary();
  const summary = useMemo(() => computeSummary(books, members, loans), [books, members, loans]);
  const series = useMemo(() => monthlySeries(loans, 6), [loans]);
  const recent = useMemo(() => [...loans].sort((a, b) => b.borrowDate.localeCompare(a.borrowDate)).slice(0, 3), [loans]);
  return (
    <div className="surface overflow-hidden rounded-2xl shadow-[var(--shadow-preview)]" aria-label="Libratify dashboard preview">
      <div className="flex items-center gap-1.5 border-b bg-muted px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-xs text-muted-foreground">libratify.app/dashboard</span>
      </div>
      <div className="pointer-events-none grid gap-4 bg-background p-4 sm:p-5 select-none" aria-hidden="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Book titles" value={summary.totalTitles} icon={Library} />
          <KpiCard label="Available copies" value={summary.availableCopies} icon={CheckCircle2} tone="success" />
          <KpiCard label="Active loans" value={summary.activeLoans} icon={ArrowLeftRight} tone="neutral" />
          <KpiCard label="Overdue" value={summary.overdueLoans} icon={Clock} tone="danger" />
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="surface p-4 lg:col-span-3">
            <p className="mb-2 text-sm font-semibold">Borrowing activity</p>
            <BorrowTrendChart data={series} height={180} showReturned={false} />
          </div>
          <div className="surface p-4 lg:col-span-2">
            <p className="mb-3 text-sm font-semibold">Recent loans</p>
            <ul className="space-y-3">
              {recent.map((l) => {
                const b = books.find((x) => x.id === l.bookId)!;
                return (
                  <li key={l.id} className="flex items-center gap-3">
                    <BookCover book={b} className="h-10 w-7" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{members.find((m) => m.id === l.memberId)?.name}</p>
                    </div>
                    <StatusBadge status={loanStatus(l)} />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Libratify home"><Logo /></Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how-it-works" className="hover:text-foreground">How It Works</a>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
          </div>
          <Button asChild size="sm"><Link to="/dashboard">Try Demo</Link></Button>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 md:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" /> Your Library, Simplified.
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl">
                A Smarter Way to <span className="font-serif font-semibold italic text-primary">Manage</span> Your Library.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
                Manage books, members, borrowing, and insights in one beautifully simple workspace.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6">
                  <Link to="/dashboard">Explore Live Demo <ArrowRight className="size-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 bg-card px-6">
                  <a href="#features">See Features</a>
                </Button>
              </div>
            </div>
            <div className="mx-auto mt-16 max-w-5xl">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t bg-card py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Features</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything a modern library runs on.</h2>
              <p className="mt-3 text-muted-foreground">Four focused tools that work together, so the front desk spends less time on paperwork.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="surface lift bg-background p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">How It Works</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Up and running in an afternoon.</h2>
            </div>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative surface p-6">
                  <span className="font-serif text-4xl font-semibold text-primary/25">0{i + 1}</span>
                  <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl bg-navy p-8 text-navy-foreground sm:flex-row sm:items-center sm:p-10">
              <div>
                <h3 className="text-2xl font-bold">See it with a real-looking collection.</h3>
                <p className="mt-2 text-sm opacity-75">60 titles, 35 members and 150 loans — ready to explore, no sign-up needed.</p>
              </div>
              <Button asChild size="lg" className="h-12 shrink-0 px-6">
                <Link to="/dashboard">Explore Live Demo <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-muted-foreground">Your Library, Simplified.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how-it-works" className="hover:text-foreground">How It Works</a>
            <Link to="/dashboard" className="hover:text-foreground">Live Demo</Link>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Libratify</p>
        </div>
      </footer>
    </div>
  );
}
