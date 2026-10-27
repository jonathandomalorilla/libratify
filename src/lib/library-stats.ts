import { format, parseISO, startOfMonth, subDays, subMonths } from "date-fns";
import type {
  Book, BookCategory, BookStatus, DashboardSummary, Loan, LoanStatus, Member, RangeKey, ReportSeries,
} from "@/types";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export function loanStatus(loan: Loan, today = todayISO()): LoanStatus {
  if (loan.returnDate) return "returned";
  return loan.dueDate < today ? "overdue" : "active";
}

export const isOpen = (l: Loan) => l.returnDate === null;

export function openLoansByBook(loans: Loan[]) {
  const m = new Map<string, number>();
  for (const l of loans) if (isOpen(l)) m.set(l.bookId, (m.get(l.bookId) ?? 0) + 1);
  return m;
}

export function openLoansByMember(loans: Loan[]) {
  const m = new Map<string, number>();
  for (const l of loans) if (isOpen(l)) m.set(l.memberId, (m.get(l.memberId) ?? 0) + 1);
  return m;
}

export function availableCopies(book: Book, openByBook: Map<string, number>) {
  return Math.max(0, book.totalCopies - (openByBook.get(book.id) ?? 0));
}

export function bookStatus(available: number, total: number): BookStatus {
  if (available === 0) return "unavailable";
  if (available / total <= 0.34) return "limited";
  return "available";
}

export function computeSummary(books: Book[], members: Member[], loans: Loan[], today = todayISO()): DashboardSummary {
  const open = openLoansByBook(loans);
  const totalCopies = books.reduce((a, b) => a + b.totalCopies, 0);
  const availableCopiesTotal = books.reduce((a, b) => a + availableCopies(b, open), 0);
  const openLoans = loans.filter(isOpen);
  return {
    totalTitles: books.length,
    totalCopies,
    availableCopies: availableCopiesTotal,
    activeMembers: members.filter((m) => m.status === "active").length,
    activeLoans: openLoans.length,
    overdueLoans: openLoans.filter((l) => l.dueDate < today).length,
  };
}

export const RANGE_DAYS: Record<RangeKey, number> = { "30d": 30, "90d": 90, "180d": 180 };
export const RANGE_LABEL: Record<RangeKey, string> = {
  "30d": "Last 30 days",
  "90d": "Last 3 months",
  "180d": "Last 6 months",
};

export function rangeStart(range: RangeKey, now = new Date()) {
  return format(subDays(now, RANGE_DAYS[range]), "yyyy-MM-dd");
}

export function loansInRange(loans: Loan[], range: RangeKey, now = new Date()) {
  const start = rangeStart(range, now);
  return loans.filter((l) => l.borrowDate >= start);
}

/** Monthly borrowed vs returned for the last `months` calendar months (incl. current). */
export function monthlySeries(loans: Loan[], months = 6, now = new Date()): ReportSeries[] {
  const series: ReportSeries[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i));
    series.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM"), borrowed: 0, returned: 0 });
  }
  const idx = new Map(series.map((s, i) => [s.key, i]));
  for (const l of loans) {
    const b = idx.get(l.borrowDate.slice(0, 7));
    if (b !== undefined) series[b]!.borrowed++;
    if (l.returnDate) {
      const r = idx.get(l.returnDate.slice(0, 7));
      if (r !== undefined) series[r]!.returned++;
    }
  }
  return series;
}

export function monthsForRange(range: RangeKey) {
  return range === "30d" ? 2 : range === "90d" ? 3 : 6;
}

export function loansByCategory(books: Book[], loans: Loan[]) {
  const cat = new Map(books.map((b) => [b.id, b.category]));
  const counts = new Map<BookCategory, number>();
  for (const l of loans) {
    const c = cat.get(l.bookId);
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function titlesByCategory(books: Book[]) {
  const counts = new Map<BookCategory, number>();
  for (const b of books) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function topBooks(books: Book[], loans: Loan[], limit = 5) {
  const counts = new Map<string, number>();
  for (const l of loans) counts.set(l.bookId, (counts.get(l.bookId) ?? 0) + 1);
  return books
    .map((book) => ({ book, count: counts.get(book.id) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || a.book.title.localeCompare(b.book.title))
    .slice(0, limit);
}

export function overdueDays(loan: Loan, today = todayISO()) {
  if (loan.returnDate || loan.dueDate >= today) return 0;
  return Math.round((parseISO(today).getTime() - parseISO(loan.dueDate).getTime()) / 86400000);
}

export type BorrowCheck = { ok: true } | { ok: false; reason: string };

export function canBorrow(
  book: Book | undefined, member: Member | undefined, loans: Loan[], dueDate: string, today = todayISO(),
): BorrowCheck {
  if (!member) return { ok: false, reason: "Select a member." };
  if (member.status !== "active") return { ok: false, reason: "This member is inactive." };
  if (!book) return { ok: false, reason: "Select a book." };
  if (availableCopies(book, openLoansByBook(loans)) <= 0) return { ok: false, reason: "No copies of this book are available." };
  if (loans.some((l) => isOpen(l) && l.bookId === book.id && l.memberId === member.id))
    return { ok: false, reason: "This member already has this book on loan." };
  if (!dueDate || dueDate <= today) return { ok: false, reason: "Due date must be after today." };
  return { ok: true };
}
