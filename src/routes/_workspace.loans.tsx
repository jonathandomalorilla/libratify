import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { BookUp, RotateCcw, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, SortHeader, TablePagination, TableSkeleton } from "@/components/library/ui-kit";
import { StatusBadge } from "@/components/library/StatusBadge";
import { BookCover } from "@/components/library/BookCover";
import { useLibrary } from "@/hooks/use-library";
import { sortBy, usePagination, useSort } from "@/hooks/use-table";
import { availableCopies, canBorrow, loanStatus, openLoansByBook, overdueDays, todayISO } from "@/lib/library-stats";
import { pageHead } from "@/lib/seo";
import type { Loan } from "@/types";

type Tab = "all" | "active" | "overdue" | "returned";
export const Route = createFileRoute("/_workspace/loans")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; new?: boolean } => ({
    ...(["all", "active", "overdue", "returned"].includes(s.tab as string) ? { tab: s.tab as Tab } : {}),
    ...(s.new === true || s.new === "true" ? { new: true } : {}),
  }),
  head: pageHead("Borrow & Return", "Check books out, process returns and track overdue loans."),
  component: LoansPage,
});

type SortKey = "borrowDate" | "dueDate" | "returnDate";

function BorrowDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { books, members, loans, borrow } = useLibrary();
  const [memberId, setMemberId] = useState("");
  const [bookId, setBookId] = useState("");
  const [due, setDue] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [error, setError] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) { setMemberId(""); setBookId(""); setError(null); setDue(format(addDays(new Date(), 14), "yyyy-MM-dd")); }
  }
  const openByBook = useMemo(() => openLoansByBook(loans), [loans]);
  const sortedBooks = useMemo(() => [...books].sort((a, b) => a.title.localeCompare(b.title)), [books]);
  const activeMembers = useMemo(() => members.filter((m) => m.status === "active").sort((a, b) => a.name.localeCompare(b.name)), [members]);
  const book = books.find((b) => b.id === bookId);
  const member = members.find((m) => m.id === memberId);
  const check = canBorrow(book, member, loans, due);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = borrow(bookId, memberId, due);
    if (!res.ok) return setError(res.reason);
    toast.success("Book checked out", { description: `${book?.title} → ${member?.name}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Borrow a book</DialogTitle>
          <DialogDescription>Record a new checkout. Availability updates immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="loan-member">Member</Label>
            <Select value={memberId} onValueChange={(v) => { setMemberId(v); setError(null); }}>
              <SelectTrigger id="loan-member"><SelectValue placeholder="Select an active member" /></SelectTrigger>
              <SelectContent>{activeMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.id}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loan-book">Book</Label>
            <Select value={bookId} onValueChange={(v) => { setBookId(v); setError(null); }}>
              <SelectTrigger id="loan-book"><SelectValue placeholder="Select a book" /></SelectTrigger>
              <SelectContent>
                {sortedBooks.map((b) => {
                  const avail = availableCopies(b, openByBook);
                  return (
                    <SelectItem key={b.id} value={b.id} disabled={avail === 0}>
                      {b.title} — {avail === 0 ? "none available" : `${avail} available`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loan-due">Due date</Label>
            <Input id="loan-due" type="date" value={due} min={format(addDays(new Date(), 1), "yyyy-MM-dd")} onChange={(e) => { setDue(e.target.value); setError(null); }} />
          </div>
          {book && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <BookCover book={book} />
              <div className="text-sm">
                <p className="font-medium">{book.title}</p>
                <p className="text-xs text-muted-foreground">{availableCopies(book, openByBook)} of {book.totalCopies} copies available</p>
              </div>
            </div>
          )}
          {(error || (memberId && bookId && !check.ok)) && (
            <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{error ?? (!check.ok ? check.reason : "")}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!check.ok}>Confirm checkout</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoansPage() {
  const { ready, loans, books, members, returnLoan } = useLibrary();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/loans" });
  const tab: Tab = search.tab ?? "all";
  const [q, setQ] = useState("");
  const [toReturn, setToReturn] = useState<Loan | null>(null);
  const { sort, onSort } = useSort<SortKey>("borrowDate", "desc");
  const today = todayISO();

  const bookById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const counts = useMemo(() => {
    const c = { all: loans.length, active: 0, overdue: 0, returned: 0 };
    for (const l of loans) c[loanStatus(l, today)]++;
    return c;
  }, [loans, today]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = loans
      .filter((l) => tab === "all" || loanStatus(l, today) === tab)
      .filter((l) => !s || [bookById.get(l.bookId)?.title ?? "", memberById.get(l.memberId)?.name ?? "", l.id]
        .some((x) => x.toLowerCase().includes(s)));
    return sortBy(f, (l) => (sort.key === "returnDate" ? l.returnDate ?? "9999" : l[sort.key]), sort.dir);
  }, [loans, tab, q, sort, bookById, memberById, today]);
  const pg = usePagination(rows, 12, `${tab}|${q}`);
  const fmt = (d: string) => format(parseISO(d), "MMM d, yyyy");

  return (
    <>
      <PageHeader
        title="Borrow & Return"
        description="Check out books, process returns and keep an eye on overdue items."
        actions={<Button onClick={() => navigate({ search: (p) => ({ ...p, new: true }) })}><BookUp className="size-4" /> Borrow book</Button>}
      />

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={tab} onValueChange={(v) => navigate({ search: (p) => ({ ...p, tab: v as Tab }) })}>
            <TabsList>
              {(["all", "active", "overdue", "returned"] as Tab[]).map((t) => (
                <TabsTrigger key={t} value={t} className="capitalize">
                  {t} <span className="ml-1.5 rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground">{counts[t]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search book, member or loan ID" className="pl-9" aria-label="Search loans" />
          </div>
        </div>

        {!ready ? <TableSkeleton rows={8} /> : rows.length === 0 ? (
          <EmptyState title={tab === "overdue" ? "Nothing overdue" : "No loans found"} description={tab === "overdue" ? "Every borrowed book is within its due date." : "Try a different filter or search."} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4">Book</TableHead>
                  <TableHead className="hidden md:table-cell">Member</TableHead>
                  <TableHead className="hidden lg:table-cell"><SortHeader label="Borrowed" column="borrowDate" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="hidden sm:table-cell"><SortHeader label="Due" column="dueDate" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="hidden xl:table-cell"><SortHeader label="Returned" column="returnDate" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageRows.map((l) => {
                  const b = bookById.get(l.bookId);
                  const status = loanStatus(l, today);
                  const late = overdueDays(l, today);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          {b && <BookCover book={b} className="h-10 w-7" />}
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{b?.title}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{memberById.get(l.memberId)?.name}</p>
                            <p className="hidden font-mono text-xs text-muted-foreground md:block">{l.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{memberById.get(l.memberId)?.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{fmt(l.borrowDate)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={status === "overdue" ? "font-medium text-destructive" : "text-muted-foreground"}>{fmt(l.dueDate)}</span>
                        {late > 0 && <p className="text-xs text-destructive">{late} day{late > 1 ? "s" : ""} late</p>}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">{l.returnDate ? fmt(l.returnDate) : "—"}</TableCell>
                      <TableCell><StatusBadge status={status} /></TableCell>
                      <TableCell className="pr-4 text-right">
                        {status !== "returned" ? (
                          <Button size="sm" variant="outline" onClick={() => setToReturn(l)}><RotateCcw className="size-3.5" /> Return</Button>
                        ) : <span className="text-xs text-muted-foreground">Completed</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination page={pg.page} pageCount={pg.pageCount} total={pg.total} pageSize={pg.pageSize} onPage={pg.setPage} />
          </>
        )}
      </div>

      <BorrowDialog open={!!search.new} onOpenChange={(o) => navigate({ search: (p) => ({ ...p, new: o ? true : undefined }), replace: true })} />

      <AlertDialog open={!!toReturn} onOpenChange={(o) => !o && setToReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm return</AlertDialogTitle>
            <AlertDialogDescription>
              Mark "{toReturn && bookById.get(toReturn.bookId)?.title}" as returned by {toReturn && memberById.get(toReturn.memberId)?.name} today?
              {toReturn && overdueDays(toReturn, today) > 0 && ` This loan is ${overdueDays(toReturn, today)} days overdue.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!toReturn) return;
              const res = returnLoan(toReturn.id);
              res.ok ? toast.success("Book returned", { description: bookById.get(toReturn.bookId)?.title }) : toast.error(res.reason);
            }}>Confirm return</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
