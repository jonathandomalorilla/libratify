import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { generateSeedData } from "@/data/mock-data";
import { mockRepository, type LibrarySnapshot } from "@/services/repository";
import { canBorrow, isOpen, todayISO } from "@/lib/library-stats";
import type { AdminProfile, Book, Loan, Member, Preferences } from "@/types";

type Result = { ok: true } | { ok: false; reason: string };

const DEFAULT_PROFILE: AdminProfile = {
  name: "Alex Rivera",
  email: "admin@example.com",
  role: "Head Librarian",
  library: "Northbridge Community Library",
};
const DEFAULT_PREFS: Preferences = { defaultRange: "180d", compactTables: false };

interface LibraryContextValue {
  ready: boolean;
  books: Book[];
  members: Member[];
  loans: Loan[];
  profile: AdminProfile;
  preferences: Preferences;
  addBook(b: Omit<Book, "id" | "addedAt">): Result;
  updateBook(id: string, b: Omit<Book, "id" | "addedAt">): Result;
  deleteBook(id: string): Result;
  addMember(m: Omit<Member, "id" | "joinDate">): Result;
  updateMember(id: string, m: Omit<Member, "id" | "joinDate">): Result;
  deleteMember(id: string): Result;
  setMemberStatus(id: string, status: Member["status"]): Result;
  borrow(bookId: string, memberId: string, dueDate: string): Result;
  returnLoan(loanId: string): Result;
  updateProfile(p: AdminProfile): void;
  updatePreferences(p: Preferences): void;
  resetDemo(): Promise<void>;
}

const Ctx = createContext<LibraryContextValue | null>(null);
const seed = generateSeedData();
const nextId = (prefix: string, ids: string[], pad: number) => {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.split("-")[1]) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(pad, "0")}`;
};

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Required<LibrarySnapshot>>({
    ...seed, profile: DEFAULT_PROFILE, preferences: DEFAULT_PREFS,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    mockRepository.load().then((snap) => {
      setState({ profile: DEFAULT_PROFILE, preferences: DEFAULT_PREFS, ...snap });
      // Brief delay keeps loading skeletons visible on first paint for a smoother reveal.
      setTimeout(() => setReady(true), 350);
    });
  }, []);

  useEffect(() => {
    if (ready) void mockRepository.save(state);
  }, [state, ready]);

  const commit = useCallback((fn: (s: Required<LibrarySnapshot>) => Required<LibrarySnapshot>) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  const isbnTaken = (isbn: string, exceptId?: string) =>
    stateRef.current.books.some((b) => b.isbn.replace(/-/g, "") === isbn.replace(/-/g, "") && b.id !== exceptId);

  const value = useMemo<LibraryContextValue>(() => ({
    ready,
    ...state,
    addBook(b) {
      if (isbnTaken(b.isbn)) return { ok: false, reason: "A book with this ISBN already exists." };
      commit((s) => ({
        ...s,
        books: [{ ...b, id: nextId("BK", s.books.map((x) => x.id), 4), addedAt: todayISO() }, ...s.books],
      }));
      return { ok: true };
    },
    updateBook(id, b) {
      if (isbnTaken(b.isbn, id)) return { ok: false, reason: "A book with this ISBN already exists." };
      const open = stateRef.current.loans.filter((l) => isOpen(l) && l.bookId === id).length;
      if (b.totalCopies < open)
        return { ok: false, reason: `Total copies can't be below the ${open} currently on loan.` };
      commit((s) => ({ ...s, books: s.books.map((x) => (x.id === id ? { ...x, ...b } : x)) }));
      return { ok: true };
    },
    deleteBook(id) {
      if (stateRef.current.loans.some((l) => isOpen(l) && l.bookId === id))
        return { ok: false, reason: "This book has copies on loan. Return them before deleting." };
      commit((s) => ({ ...s, books: s.books.filter((x) => x.id !== id), loans: s.loans.filter((l) => l.bookId !== id) }));
      return { ok: true };
    },
    addMember(m) {
      if (stateRef.current.members.some((x) => x.email.toLowerCase() === m.email.toLowerCase()))
        return { ok: false, reason: "A member with this email already exists." };
      commit((s) => ({
        ...s,
        members: [{ ...m, id: nextId("MBR", s.members.map((x) => x.id), 4), joinDate: todayISO() }, ...s.members],
      }));
      return { ok: true };
    },
    updateMember(id, m) {
      if (stateRef.current.members.some((x) => x.email.toLowerCase() === m.email.toLowerCase() && x.id !== id))
        return { ok: false, reason: "A member with this email already exists." };
      commit((s) => ({ ...s, members: s.members.map((x) => (x.id === id ? { ...x, ...m } : x)) }));
      return { ok: true };
    },
    deleteMember(id) {
      if (stateRef.current.loans.some((l) => isOpen(l) && l.memberId === id))
        return { ok: false, reason: "This member has books on loan. Deactivate them instead, or process returns first." };
      commit((s) => ({ ...s, members: s.members.filter((x) => x.id !== id), loans: s.loans.filter((l) => l.memberId !== id) }));
      return { ok: true };
    },
    setMemberStatus(id, status) {
      commit((s) => ({ ...s, members: s.members.map((x) => (x.id === id ? { ...x, status } : x)) }));
      return { ok: true };
    },
    borrow(bookId, memberId, dueDate) {
      const s = stateRef.current;
      const check = canBorrow(s.books.find((b) => b.id === bookId), s.members.find((m) => m.id === memberId), s.loans, dueDate);
      if (!check.ok) return check;
      commit((st) => ({
        ...st,
        loans: [...st.loans, {
          id: nextId("LN", st.loans.map((l) => l.id), 5),
          bookId, memberId, borrowDate: format(new Date(), "yyyy-MM-dd"), dueDate, returnDate: null,
        }],
      }));
      return { ok: true };
    },
    returnLoan(loanId) {
      const loan = stateRef.current.loans.find((l) => l.id === loanId);
      if (!loan) return { ok: false, reason: "Loan not found." };
      if (loan.returnDate) return { ok: false, reason: "This loan has already been returned." };
      commit((s) => ({ ...s, loans: s.loans.map((l) => (l.id === loanId ? { ...l, returnDate: todayISO() } : l)) }));
      return { ok: true };
    },
    updateProfile(profile) {
      commit((s) => ({ ...s, profile }));
    },
    updatePreferences(preferences) {
      commit((s) => ({ ...s, preferences }));
    },
    async resetDemo() {
      const snap = await mockRepository.reset();
      commit(() => ({ profile: DEFAULT_PROFILE, preferences: DEFAULT_PREFS, ...snap }));
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ready, state, commit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
