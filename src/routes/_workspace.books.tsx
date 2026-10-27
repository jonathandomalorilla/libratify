import { createFileRoute } from "@tanstack/react-router";
import { BookPlus, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, SortHeader, TablePagination, TableSkeleton } from "@/components/library/ui-kit";
import { BookCover } from "@/components/library/BookCover";
import { StatusBadge } from "@/components/library/StatusBadge";
import { useLibrary } from "@/hooks/use-library";
import { sortBy, usePagination, useSort } from "@/hooks/use-table";
import { availableCopies, bookStatus, openLoansByBook } from "@/lib/library-stats";
import { BOOK_CATEGORIES } from "@/data/mock-data";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Book, BookCategory } from "@/types";

export const Route = createFileRoute("/_workspace/books")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" ? { q: s["q"] } : {}),
  head: pageHead("Books", "Manage your library collection, copies and availability."),
  component: BooksPage,
});

type SortKey = "title" | "author" | "category" | "total" | "available";
type FormValues = { title: string; author: string; isbn: string; category: BookCategory | ""; publicationYear: string; totalCopies: string; coverUrl: string };
const EMPTY: FormValues = { title: "", author: "", isbn: "", category: "", publicationYear: "", totalCopies: "1", coverUrl: "" };

function validate(v: FormValues) {
  const e: Partial<Record<keyof FormValues, string>> = {};
  if (!v.title.trim()) e.title = "Title is required.";
  if (!v.author.trim()) e.author = "Author is required.";
  const digits = v.isbn.replace(/[-\s]/g, "");
  if (!/^(\d{9}[\dX]|\d{13})$/i.test(digits)) e.isbn = "Enter a valid 10 or 13 digit ISBN.";
  if (!v.category) e.category = "Choose a category.";
  const y = Number(v.publicationYear);
  if (!Number.isInteger(y) || y < 1450 || y > new Date().getFullYear()) e.publicationYear = "Enter a valid year.";
  const c = Number(v.totalCopies);
  if (!Number.isInteger(c) || c < 1 || c > 999) e.totalCopies = "Copies must be between 1 and 999.";
  if (v.coverUrl && !/^https?:\/\/\S+$/.test(v.coverUrl)) e.coverUrl = "Enter a full http(s) URL.";
  return e;
}

function BookDialog({ open, onOpenChange, book }: { open: boolean; onOpenChange: (o: boolean) => void; book: Book | null }) {
  const { addBook, updateBook } = useLibrary();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setErrors({});
      setValues(book ? {
        title: book.title, author: book.author, isbn: book.isbn, category: book.category,
        publicationYear: String(book.publicationYear), totalCopies: String(book.totalCopies), coverUrl: book.coverUrl ?? "",
      } : EMPTY);
    }
  }
  const set = (k: keyof FormValues) => (val: string) => setValues((v) => ({ ...v, [k]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = {
      title: values.title.trim(), author: values.author.trim(), isbn: values.isbn.trim(),
      category: values.category as BookCategory, publicationYear: Number(values.publicationYear),
      totalCopies: Number(values.totalCopies), coverUrl: values.coverUrl.trim() || undefined,
    };
    const res = book ? updateBook(book.id, payload) : addBook(payload);
    if (!res.ok) { toast.error(res.reason); return; }
    toast.success(book ? "Book updated" : "Book added", { description: payload.title });
    onOpenChange(false);
  };

  const field = (k: keyof FormValues, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`book-${k}`}>{label}</Label>
      <Input id={`book-${k}`} value={values[k]} onChange={(e) => set(k)(e.target.value)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{book ? "Edit book" : "Add book"}</DialogTitle>
          <DialogDescription>{book ? "Update this title's details." : "Add a new title to your collection."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          {field("title", "Title")}
          <div className="grid gap-4 sm:grid-cols-2">
            {field("author", "Author")}
            {field("isbn", "ISBN", { placeholder: "978-0-0000-0000-0" })}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="book-category">Category</Label>
              <Select value={values.category} onValueChange={set("category")}>
                <SelectTrigger id="book-category" aria-invalid={!!errors.category}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BOOK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>
            {field("publicationYear", "Year", { inputMode: "numeric", placeholder: "2024" })}
            {field("totalCopies", "Total copies", { type: "number", min: 1 })}
          </div>
          {field("coverUrl", "Cover image URL (optional)", { placeholder: "https://…" })}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{book ? "Save changes" : "Add book"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BooksPage() {
  const { ready, books, loans, deleteBook, preferences } = useLibrary();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [category, setCategory] = useState<string>("all");
  const { sort, onSort } = useSort<SortKey>("title");
  const [dialog, setDialog] = useState<{ open: boolean; book: Book | null }>({ open: false, book: null });
  const [toDelete, setToDelete] = useState<Book | null>(null);

  const open = useMemo(() => openLoansByBook(loans), [loans]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = books
      .filter((b) => category === "all" || b.category === category)
      .filter((b) => !s || [b.title, b.author, b.isbn].some((x) => x.toLowerCase().includes(s)))
      .map((b) => ({ book: b, available: availableCopies(b, open) }));
    const get = {
      title: (r: (typeof filtered)[0]) => r.book.title, author: (r: (typeof filtered)[0]) => r.book.author,
      category: (r: (typeof filtered)[0]) => r.book.category, total: (r: (typeof filtered)[0]) => r.book.totalCopies,
      available: (r: (typeof filtered)[0]) => r.available,
    }[sort.key];
    return sortBy(filtered, get, sort.dir);
  }, [books, open, q, category, sort]);
  const pg = usePagination(rows, 10, `${q}|${category}`);

  return (
    <>
      <PageHeader
        title="Books"
        description={`${books.length} titles · ${books.reduce((a, b) => a + b.totalCopies, 0)} copies`}
        actions={<Button onClick={() => setDialog({ open: true, book: null })}><BookPlus className="size-4" /> Add book</Button>}
      />

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, author or ISBN" className="pl-9" aria-label="Search books" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-48" aria-label="Filter by category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {BOOK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!ready ? <TableSkeleton rows={8} /> : rows.length === 0 ? (
          <EmptyState
            title={books.length ? "No books match your filters" : "Your collection is empty"}
            description={books.length ? "Try a different search or category." : "Add your first title to get started."}
            action={books.length
              ? <Button variant="outline" onClick={() => { setQ(""); setCategory("all"); }}>Clear filters</Button>
              : <Button onClick={() => setDialog({ open: true, book: null })}>Add book</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4"><SortHeader label="Title" column="title" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="hidden md:table-cell"><SortHeader label="Author" column="author" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="hidden xl:table-cell">ISBN</TableHead>
                  <TableHead className="hidden lg:table-cell"><SortHeader label="Category" column="category" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="hidden text-right sm:table-cell"><SortHeader label="Total" column="total" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="text-right"><SortHeader label="Available" column="available" sort={sort} onSort={onSort} /></TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageRows.map(({ book, available }) => (
                  <TableRow key={book.id}>
                    <TableCell className={cn("pl-4", preferences.compactTables ? "py-1.5" : "py-3")}>
                      <div className="flex items-center gap-3">
                        <BookCover book={book} className={preferences.compactTables ? "h-9 w-7" : undefined} />
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium">{book.title}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{book.author}</p>
                          <p className="hidden text-xs text-muted-foreground md:block">{book.publicationYear}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{book.author}</TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground xl:table-cell">{book.isbn}</TableCell>
                    <TableCell className="hidden lg:table-cell">{book.category}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{book.totalCopies}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{available}</TableCell>
                    <TableCell className="hidden sm:table-cell"><StatusBadge status={bookStatus(available, book.totalCopies)} /></TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${book.title}`}><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDialog({ open: true, book })}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setToDelete(book)}>
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

      <BookDialog open={dialog.open} book={dialog.book} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the title and its loan history from the demo. Books with copies on loan can't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!toDelete) return;
                const res = deleteBook(toDelete.id);
                res.ok ? toast.success("Book deleted", { description: toDelete.title }) : toast.error(res.reason);
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
