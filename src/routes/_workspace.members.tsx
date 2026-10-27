import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { Eye, MoreHorizontal, Pencil, Search, Trash2, UserCheck, UserMinus, UserPlus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState, PageHeader, SortHeader, TablePagination, TableSkeleton } from "@/components/library/ui-kit";
import { StatusBadge } from "@/components/library/StatusBadge";
import { BookCover } from "@/components/library/BookCover";
import { useLibrary } from "@/hooks/use-library";
import { sortBy, usePagination, useSort } from "@/hooks/use-table";
import { loanStatus, openLoansByMember } from "@/lib/library-stats";
import { pageHead } from "@/lib/seo";
import type { Member, MemberStatus } from "@/types";

export const Route = createFileRoute("/_workspace/members")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s.q === "string" ? { q: s.q } : {}),
  head: pageHead("Members", "Manage library members, contact details and their active loans."),
  component: MembersPage,
});

type SortKey = "id" | "name" | "joinDate" | "loans";
type FormValues = { name: string; email: string; phone: string; status: MemberStatus };
const EMPTY: FormValues = { name: "", email: "", phone: "", status: "active" };
const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function MemberDialog({ open, onOpenChange, member }: { open: boolean; onOpenChange: (o: boolean) => void; member: Member | null }) {
  const { addMember, updateMember } = useLibrary();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setErrors({});
      setValues(member ? { name: member.name, email: member.email, phone: member.phone, status: member.status } : EMPTY);
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (values.name.trim().length < 2) errs.name = "Enter the member's full name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errs.email = "Enter a valid email address.";
    if (values.phone.replace(/\D/g, "").length < 7) errs.phone = "Enter a valid phone number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), status: values.status };
    const res = member ? updateMember(member.id, payload) : addMember(payload);
    if (!res.ok) return toast.error(res.reason);
    toast.success(member ? "Member updated" : "Member added", { description: payload.name });
    onOpenChange(false);
  };
  const field = (k: "name" | "email" | "phone", label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`m-${k}`}>{label}</Label>
      <Input id={`m-${k}`} type={type} value={values[k]} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? "Edit member" : "Add member"}</DialogTitle>
          <DialogDescription>{member ? `Member ID ${member.id}` : "Register a new library member."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          {field("name", "Full name")}
          {field("email", "Email", "email")}
          {field("phone", "Phone", "tel")}
          <div className="space-y-1.5">
            <Label htmlFor="m-status">Status</Label>
            <Select value={values.status} onValueChange={(v) => setValues((s) => ({ ...s, status: v as MemberStatus }))}>
              <SelectTrigger id="m-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{member ? "Save changes" : "Add member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MembersPage() {
  const { ready, members, loans, books, deleteMember, setMemberStatus } = useLibrary();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [status, setStatus] = useState("all");
  const { sort, onSort } = useSort<SortKey>("name");
  const [dialog, setDialog] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [viewing, setViewing] = useState<Member | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);

  const openCount = useMemo(() => openLoansByMember(loans), [loans]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = members
      .filter((m) => status === "all" || m.status === status)
      .filter((m) => !s || [m.name, m.email, m.id, m.phone].some((x) => x.toLowerCase().includes(s)));
    const get = { id: (m: Member) => m.id, name: (m: Member) => m.name, joinDate: (m: Member) => m.joinDate, loans: (m: Member) => openCount.get(m.id) ?? 0 }[sort.key];
    return sortBy(f, get, sort.dir);
  }, [members, q, status, sort, openCount]);
  const pg = usePagination(rows, 10, `${q}|${status}`);

  const viewingLoans = useMemo(
    () => (viewing ? loans.filter((l) => l.memberId === viewing.id).sort((a, b) => b.borrowDate.localeCompare(a.borrowDate)) : []),
    [viewing, loans],
  );
  const bookById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const toggleStatus = (m: Member) => {
    const next = m.status === "active" ? "inactive" : "active";
    setMemberStatus(m.id, next);
    toast.success(next === "active" ? "Member reactivated" : "Member deactivated", { description: m.name });
  };

  return (
    <>
      <PageHeader
        title="Members"
        description={`${members.filter((m) => m.status === "active").length} active of ${members.length} registered`}
        actions={<Button onClick={() => setDialog({ open: true, member: null })}><UserPlus className="size-4" /> Add member</Button>}
      />
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or ID" className="pl-9" aria-label="Search members" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!ready ? <TableSkeleton rows={8} /> : rows.length === 0 ? (
          <EmptyState title="No members found" description="Adjust your search or add a new member."
            action={<Button variant="outline" onClick={() => { setQ(""); setStatus("all"); }}>Clear filters</Button>} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="hidden pl-4 lg:table-cell"><SortHeader label="Member ID" column="id" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="pl-4 lg:pl-2"><SortHeader label="Name" column="name" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden xl:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell"><SortHeader label="Joined" column="joinDate" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"><SortHeader label="Loans" column="loans" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageRows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="hidden pl-4 font-mono text-xs text-muted-foreground lg:table-cell">{m.id}</TableCell>
                    <TableCell className="pl-4 lg:pl-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8"><AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{initials(m.name)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{m.email}</TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">{m.phone}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{format(parseISO(m.joinDate), "MMM d, yyyy")}</TableCell>
                    <TableCell><StatusBadge status={`member-${m.status}`} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{openCount.get(m.id) ?? 0}</TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${m.name}`}><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setViewing(m)}><Eye className="size-4" /> View</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDialog({ open: true, member: m })}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleStatus(m)}>
                            {m.status === "active" ? <><UserMinus className="size-4" /> Deactivate</> : <><UserCheck className="size-4" /> Reactivate</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setToDelete(m)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination page={pg.page} pageCount={pg.pageCount} total={pg.total} pageSize={pg.pageSize} onPage={pg.setPage} />
          </>
        )}
      </div>

      <MemberDialog open={dialog.open} member={dialog.member} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {viewing && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12"><AvatarFallback className="bg-primary text-primary-foreground">{initials(viewing.name)}</AvatarFallback></Avatar>
                  <div>
                    <SheetTitle>{viewing.name}</SheetTitle>
                    <SheetDescription>{viewing.id}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <dl className="mt-6 grid grid-cols-2 gap-4 px-4 text-sm">
                <div><dt className="text-muted-foreground">Email</dt><dd className="mt-0.5 break-all font-medium">{viewing.email}</dd></div>
                <div><dt className="text-muted-foreground">Phone</dt><dd className="mt-0.5 font-medium">{viewing.phone}</dd></div>
                <div><dt className="text-muted-foreground">Joined</dt><dd className="mt-0.5 font-medium">{format(parseISO(viewing.joinDate), "MMM d, yyyy")}</dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge status={`member-${viewing.status}`} /></dd></div>
              </dl>
              <div className="mt-8 px-4">
                <h3 className="text-sm font-semibold">Loan history ({viewingLoans.length})</h3>
                {viewingLoans.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No loans yet.</p> : (
                  <ul className="mt-3 divide-y">
                    {viewingLoans.map((l) => {
                      const b = bookById.get(l.bookId);
                      return (
                        <li key={l.id} className="flex items-center gap-3 py-3">
                          {b && <BookCover book={b} className="h-10 w-7" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{b?.title}</p>
                            <p className="text-xs text-muted-foreground">Borrowed {l.borrowDate} · due {l.dueDate}</p>
                          </div>
                          <StatusBadge status={loanStatus(l)} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting removes the member and their loan history. To keep history, deactivate instead. Members with books on loan can't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {toDelete?.status === "active" && (
              <Button variant="outline" onClick={() => { if (toDelete) toggleStatus(toDelete); setToDelete(null); }}>Deactivate instead</Button>
            )}
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!toDelete) return;
                const res = deleteMember(toDelete.id);
                res.ok ? toast.success("Member deleted", { description: toDelete.name }) : toast.error(res.reason);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
