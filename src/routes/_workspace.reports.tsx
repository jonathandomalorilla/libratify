import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/library/ui-kit";
import { BorrowTrendChart, CategoryDonut, HorizontalBars, StackedStatusBars } from "@/components/library/charts";
import { RangeSelect } from "@/components/library/RangeSelect";
import { StatusBadge } from "@/components/library/StatusBadge";
import { useLibrary } from "@/hooks/use-library";
import {
  isOpen, loanStatus, loansByCategory, loansInRange, monthlySeries, monthsForRange, overdueDays, RANGE_LABEL, todayISO, topBooks,
} from "@/lib/library-stats";
import { pageHead } from "@/lib/seo";
import type { RangeKey } from "@/types";

export const Route = createFileRoute("/_workspace/reports")({
  head: pageHead("Reports", "Borrowing trends, popular titles, category demand and overdue summary."),
  component: ReportsPage,
});

function ReportsPage() {
  const { ready, books, members, loans, preferences } = useLibrary();
  const [range, setRange] = useState<RangeKey>(preferences.defaultRange);
  useEffect(() => setRange(preferences.defaultRange), [preferences.defaultRange]);
  const today = todayISO();
  const label = RANGE_LABEL[range];

  const ranged = useMemo(() => loansInRange(loans, range), [loans, range]);
  const series = useMemo(() => monthlySeries(loans, monthsForRange(range)), [loans, range]);
  const top = useMemo(() => topBooks(books, ranged, 8).map((t) => ({ name: t.book.title.length > 22 ? t.book.title.slice(0, 21) + "…" : t.book.title, value: t.count })), [books, ranged]);
  const cats = useMemo(() => loansByCategory(books, ranged), [books, ranged]);
  const stats = useMemo(() => {
    const c = { active: 0, returned: 0, overdue: 0 };
    for (const l of ranged) c[loanStatus(l, today)]++;
    const returned = ranged.filter((l) => l.returnDate);
    const onTime = returned.filter((l) => l.returnDate! <= l.dueDate).length;
    return { ...c, total: ranged.length, onTimeRate: returned.length ? Math.round((onTime / returned.length) * 100) : 0 };
  }, [ranged, today]);
  const overdue = useMemo(
    () => loans.filter((l) => isOpen(l) && l.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [loans, today],
  );
  const bookById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const chart = (node: React.ReactNode, h = 280) => (ready ? node : <Skeleton className="w-full" style={{ height: h }} />);

  return (
    <>
      <PageHeader title="Reports" description={`Circulation insights · ${label}`} actions={<RangeSelect value={range} onChange={setRange} />} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={!ready} label="Loans in period" value={stats.total} icon={TrendingUp} hint={label} />
        <KpiCard loading={!ready} label="Returned" value={stats.returned} icon={CheckCircle2} tone="success" hint={`${stats.onTimeRate}% returned on time`} />
        <KpiCard loading={!ready} label="Still active" value={stats.active} icon={Clock} tone="neutral" hint="Borrowed in period, within due date" />
        <KpiCard loading={!ready} label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" hint="Borrowed in period, past due" />
      </div>

      <Panel title="Monthly borrowing trend" description={`Books borrowed and returned per calendar month · ${label}`}>
        {chart(<BorrowTrendChart data={series} height={300} />, 300)}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most borrowed books" description={`Top titles by number of loans · ${label}`}>
          {chart(top.length ? <HorizontalBars data={top} height={300} /> : <EmptyState title="No loans in this period" />, 300)}
        </Panel>
        <Panel title="Demand by category" description={`Share of loans per category · ${label}`}>
          {chart(cats.length ? <CategoryDonut data={cats} unit="loans" height={280} /> : <EmptyState title="No loans in this period" />)}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2" title="Borrowed vs returned" description="Monthly comparison">
          {chart(<StackedStatusBars data={series} />, 260)}
        </Panel>
        <Panel className="overflow-hidden p-0 lg:col-span-3">
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold">Overdue summary</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">All currently overdue loans, oldest first</p>
          </div>
          {overdue.length === 0 ? <EmptyState title="Nothing overdue" description="Every open loan is within its due date." /> : (
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="pl-5">Book</TableHead>
                    <TableHead className="hidden sm:table-cell">Member</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="pr-5 text-right">Days late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="pl-5 font-medium">{bookById.get(l.bookId)?.title}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{memberById.get(l.memberId)?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{l.dueDate}</TableCell>
                      <TableCell className="pr-5 text-right"><StatusBadge status="overdue" className="mr-2 hidden md:inline-flex" /><span className="font-semibold tabular-nums text-destructive">{overdueDays(l, today)}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
