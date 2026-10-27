import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ArrowLeftRight, ArrowRight, BookCopy, Library, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, KpiCard, PageHeader, Panel, TableSkeleton } from "@/components/library/ui-kit";
import { BorrowTrendChart, CategoryDonut } from "@/components/library/charts";
import { BookCover } from "@/components/library/BookCover";
import { StatusBadge } from "@/components/library/StatusBadge";
import { RangeSelect } from "@/components/library/RangeSelect";
import { useLibrary } from "@/hooks/use-library";
import {
  computeSummary, loanStatus, loansInRange, monthlySeries, monthsForRange, RANGE_LABEL, titlesByCategory, topBooks,
} from "@/lib/library-stats";
import { pageHead } from "@/lib/seo";
import type { RangeKey } from "@/types";

export const Route = createFileRoute("/_workspace/dashboard")({
  head: pageHead("Dashboard", "Library overview: collection, members, active and overdue loans."),
  component: Dashboard,
});

function Dashboard() {
  const { ready, books, members, loans, profile, preferences } = useLibrary();
  const [range, setRange] = useState<RangeKey>(preferences.defaultRange);
  useEffect(() => setRange(preferences.defaultRange), [preferences.defaultRange]);

  const summary = useMemo(() => computeSummary(books, members, loans), [books, members, loans]);
  const ranged = useMemo(() => loansInRange(loans, range), [loans, range]);
  const series = useMemo(() => monthlySeries(loans, monthsForRange(range)), [loans, range]);
  const categories = useMemo(() => titlesByCategory(books), [books]);
  const popular = useMemo(() => topBooks(books, ranged, 5), [books, ranged]);
  const recent = useMemo(() => [...loans].sort((a, b) => b.borrowDate.localeCompare(a.borrowDate) || b.id.localeCompare(a.id)).slice(0, 7), [loans]);
  const bookById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  return (
    <>
      <PageHeader
        title={`Good to see you, ${profile.name.split(" ")[0]}`}
        description={`Here's what's happening at ${profile.library} today.`}
        actions={
          <>
            <RangeSelect value={range} onChange={setRange} />
            <Button asChild><Link to="/loans" search={{ new: true }}><ArrowLeftRight className="size-4" /> New loan</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard loading={!ready} label="Total Book Titles" value={summary.totalTitles} icon={Library} hint={`${summary.totalCopies} copies in collection`} />
        <KpiCard loading={!ready} label="Available Copies" value={summary.availableCopies} icon={BookCopy} tone="success"
          hint={`${Math.round((summary.availableCopies / Math.max(1, summary.totalCopies)) * 100)}% of copies on shelf`} />
        <KpiCard loading={!ready} label="Active Members" value={summary.activeMembers} icon={Users} tone="neutral" hint={`${members.length} registered`} />
        <KpiCard loading={!ready} label="Active Loans" value={summary.activeLoans} icon={ArrowLeftRight} tone="primary" hint="Currently checked out" />
        <KpiCard loading={!ready} label="Overdue Loans" value={summary.overdueLoans} icon={AlertTriangle} tone={summary.overdueLoans ? "danger" : "success"}
          hint={summary.overdueLoans ? "Past their due date" : "Nothing overdue"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="Borrowing activity" description={`Loans and returns per month · ${RANGE_LABEL[range]}`}>
          {ready ? <BorrowTrendChart data={series} /> : <Skeleton className="h-[280px] w-full" />}
        </Panel>
        <Panel className="lg:col-span-2" title="Collection by category" description="Share of book titles">
          {ready ? (categories.length ? <CategoryDonut data={categories} unit="titles" /> : <EmptyState title="No books yet" />)
            : <Skeleton className="h-[260px] w-full" />}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel
          className="overflow-hidden p-0 lg:col-span-3"
          title=""
        >
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h2 className="text-base font-semibold">Recent borrowing activity</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Latest checkouts across the library</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/loans">View all <ArrowRight className="size-4" /></Link></Button>
          </div>
          {!ready ? <TableSkeleton rows={5} /> : recent.length === 0 ? <EmptyState title="No loans yet" description="Loans will appear here once books are borrowed." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Book</TableHead>
                  <TableHead className="hidden sm:table-cell">Member</TableHead>
                  <TableHead className="hidden md:table-cell">Borrowed</TableHead>
                  <TableHead className="pr-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((l) => {
                  const b = bookById.get(l.bookId);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          {b && <BookCover book={b} className="h-10 w-7" />}
                          <span className="line-clamp-1 font-medium">{b?.title ?? "Removed book"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{memberById.get(l.memberId)?.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{format(parseISO(l.borrowDate), "MMM d")}</TableCell>
                      <TableCell className="pr-5"><StatusBadge status={loanStatus(l)} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel className="lg:col-span-2" title="Most borrowed books" description={RANGE_LABEL[range]}>
          {!ready ? <TableSkeleton rows={5} /> : popular.length === 0 ? (
            <EmptyState title="No loans in this period" description="Try a wider date range." />
          ) : (
            <ol className="space-y-4">
              {popular.map(({ book, count }, i) => (
                <li key={book.id} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                  <BookCover book={book} className="h-11 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(count / (popular[0]?.count ?? 1)) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{count}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
