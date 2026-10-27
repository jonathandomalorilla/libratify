import { describe, expect, it } from "vitest";
import { generateSeedData } from "@/data/mock-data";
import { availableCopies, canBorrow, computeSummary, isOpen, loanStatus, openLoansByBook } from "@/lib/library-stats";
import type { Book, Loan, Member } from "@/types";

const book: Book = { id: "BK-1", title: "T", author: "A", isbn: "9780000000000", category: "Fiction", publicationYear: 2000, totalCopies: 1, addedAt: "2024-01-01" };
const member: Member = { id: "MBR-1", name: "M", email: "m@example.com", phone: "5551234", joinDate: "2024-01-01", status: "active" };

describe("library rules", () => {
  it("seed has 60 books, 35 members, 150 loans", () => {
    const s = generateSeedData();
    expect([s.books.length, s.members.length, s.loans.length]).toEqual([60, 35, 150]);
  });
  it("seed never lends more copies than exist", () => {
    const s = generateSeedData();
    const open = openLoansByBook(s.loans);
    for (const b of s.books) expect(open.get(b.id) ?? 0).toBeLessThanOrEqual(b.totalCopies);
  });
  it("available = total minus open loans", () => {
    const loans: Loan[] = [{ id: "L1", bookId: "BK-1", memberId: "MBR-1", borrowDate: "2026-01-01", dueDate: "2026-01-15", returnDate: null }];
    expect(availableCopies({ ...book, totalCopies: 3 }, openLoansByBook(loans))).toBe(2);
  });
  it("blocks borrowing when no copies are available", () => {
    const loans: Loan[] = [{ id: "L1", bookId: "BK-1", memberId: "MBR-2", borrowDate: "2026-01-01", dueDate: "2099-01-15", returnDate: null }];
    expect(canBorrow(book, member, loans, "2099-02-01").ok).toBe(false);
  });
  it("blocks inactive members", () => {
    expect(canBorrow(book, { ...member, status: "inactive" }, [], "2099-02-01").ok).toBe(false);
  });
  it("marks open loans past due as overdue", () => {
    const l: Loan = { id: "L", bookId: "BK-1", memberId: "MBR-1", borrowDate: "2026-01-01", dueDate: "2026-01-10", returnDate: null };
    expect(loanStatus(l, "2026-01-11")).toBe("overdue");
    expect(loanStatus({ ...l, returnDate: "2026-01-12" }, "2026-01-20")).toBe("returned");
  });
  it("summary overdue count matches open past-due loans", () => {
    const s = generateSeedData();
    const today = new Date().toISOString().slice(0, 10);
    const expected = s.loans.filter((l) => isOpen(l) && l.dueDate < today).length;
    expect(computeSummary(s.books, s.members, s.loans, today).overdueLoans).toBe(expected);
  });
});
