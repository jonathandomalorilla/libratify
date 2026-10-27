import { addDays, format, subDays } from "date-fns";
import type { Book, BookCategory, Loan, Member } from "@/types";

/** Deterministic PRNG so server and browser render the same demo data. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

const CATEGORIES: BookCategory[] = [
  "Fiction", "Science", "History", "Technology", "Biography", "Children", "Philosophy", "Business",
];

const TITLES: Record<BookCategory, string[]> = {
  Fiction: ["The Quiet Orchard", "Lanterns Over Marrow Bay", "A House of Paper Birds", "The Cartographer's Daughter", "Salt and Silver Rain", "Midnight at Hollow Lane", "The Glass Meridian", "Letters to the Tide"],
  Science: ["The Patient Universe", "Small Wonders of the Cell", "Gravity, Gently Explained", "The Living Coastline", "Notes on the Night Sky", "Atoms in Everyday Life", "The Restless Planet", "Field Guide to Fungi"],
  History: ["Rivers That Built Empires", "The Long Silk Road", "Harbors of the Old World", "Voices of the Industrial Age", "Maps, Monarchs and Merchants", "The Forgotten Archives", "A Brief History of Bridges"],
  Technology: ["Designing Calm Software", "The Pragmatic Database", "Networks Without Mystery", "Thinking in Systems Code", "Practical Machine Learning", "The Clean Interface", "Building for the Long Web", "APIs That Last"],
  Biography: ["A Life in Ink", "The Lighthouse Keeper's Journal", "Portrait of an Inventor", "She Charted the Stars", "The Baker of Via Rosa", "Notes From a Quiet Revolutionary", "Steady Hands"],
  Children: ["Pip and the Paper Moon", "The Bear Who Loved Books", "Ollie's Big Garden", "Captain Fern's Voyage", "The Very Curious Fox", "A Cloud Named Wednesday", "Tiny Trains of Maple Town", "Luna Learns to Count"],
  Philosophy: ["On Slowness", "The Examined Morning", "Questions Worth Keeping", "A Small Book of Virtues", "Meditations for Modern Minds", "The Art of Attention", "Reasoning Together"],
  Business: ["The Thoughtful Manager", "Small Teams, Big Outcomes", "Ledgers and Lessons", "The Customer Compass", "Quiet Leadership", "Making Work Visible", "Margins That Matter"],
};

const FIRST = ["Amelia", "Noah", "Isla", "Theo", "Maya", "Elias", "Clara", "Jonah", "Nadia", "Felix", "Hana", "Rafael", "Lena", "Owen", "Priya", "Mateo", "Sofia", "Kai", "Elena", "Lucas", "Yara", "Samuel", "Ivy", "Daniel", "Zara", "Adrian", "Mira", "Leo", "Aisha", "Gabriel", "Nora", "Tomas", "Freya", "Hugo", "Leila"];
const LAST = ["Hartwell", "Okafor", "Lindqvist", "Moreau", "Tanaka", "Castell", "Brennan", "Delacroix", "Varga", "Ashford", "Nakamura", "Quinn", "Petrova", "Santos", "Whitlock", "Reyes", "Bianchi", "Holloway", "Mensah", "Fairbanks", "Kowalski", "Navarro", "Sterling", "Abara", "Lowell"];

function isbn13(r: () => number) {
  const digits = [9, 7, 8];
  for (let i = 0; i < 9; i++) digits.push(Math.floor(r() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  digits.push((10 - (sum % 10)) % 10);
  const s = digits.join("");
  return `${s.slice(0, 3)}-${s.slice(3, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12)}`;
}

export interface SeedData {
  books: Book[];
  members: Member[];
  loans: Loan[];
}

export function generateSeedData(today = new Date()): SeedData {
  const r = rng(20261027);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]!;

  const books: Book[] = [];
  let n = 1;
  for (const cat of CATEGORIES) {
    for (const title of TITLES[cat]) {
      books.push({
        id: `BK-${String(n).padStart(4, "0")}`,
        title,
        author: `${pick(FIRST)} ${pick(LAST)}`,
        isbn: isbn13(r),
        category: cat,
        publicationYear: 1975 + Math.floor(r() * 50),
        totalCopies: 2 + Math.floor(r() * 5),
        addedAt: iso(subDays(today, 200 + Math.floor(r() * 500))),
      });
      n++;
    }
  }

  const members: Member[] = FIRST.map((first, i) => {
    const last = LAST[(i * 7) % LAST.length]!;
    return {
      id: `MBR-${String(i + 1).padStart(4, "0")}`,
      name: `${first} ${last}`,
      email: `${first}.${last}`.toLowerCase() + "@example.com",
      phone: `+1 (555) ${String(100 + Math.floor(r() * 900))}-${String(1000 + Math.floor(r() * 9000))}`,
      joinDate: iso(subDays(today, 190 + Math.floor(r() * 700))),
      status: i % 9 === 8 ? "inactive" : "active",
    };
  });

  // Popularity weighting so "most borrowed" has a clear shape.
  const weights = books.map(() => 0.3 + r() * r() * 3);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const weightedBook = () => {
    let x = r() * totalW;
    for (let i = 0; i < books.length; i++) {
      x -= weights[i]!;
      if (x <= 0) return books[i]!;
    }
    return books[books.length - 1]!;
  };
  const activeMembers = members.filter((m) => m.status === "active");

  const raw: Loan[] = [];
  for (let i = 0; i < 150; i++) {
    const ageDays = Math.floor(Math.pow(r(), 0.85) * 178);
    const borrow = subDays(today, ageDays);
    const due = addDays(borrow, 14);
    let returnDate: string | null = null;
    const roll = r();
    if (ageDays > 28) {
      returnDate = roll < 0.95 ? iso(addDays(borrow, 3 + Math.floor(r() * 16))) : null;
    } else if (ageDays > 14) {
      returnDate = roll < 0.55 ? iso(addDays(borrow, 4 + Math.floor(r() * 10))) : null;
    } else {
      returnDate = roll < 0.3 && ageDays > 3 ? iso(addDays(borrow, 1 + Math.floor(r() * Math.min(ageDays, 10)))) : null;
    }
    if (returnDate && returnDate > iso(today)) returnDate = iso(today);
    raw.push({
      id: "",
      bookId: weightedBook().id,
      memberId: pick(activeMembers).id,
      borrowDate: iso(borrow),
      dueDate: iso(due),
      returnDate,
    });
  }

  raw.sort((a, b) => a.borrowDate.localeCompare(b.borrowDate));
  // Enforce copy limits and no duplicate holdings for open loans.
  const openByBook = new Map<string, number>();
  const holding = new Set<string>();
  const totals = new Map(books.map((b) => [b.id, b.totalCopies]));
  raw.forEach((loan, idx) => {
    loan.id = `LN-${String(idx + 1).padStart(5, "0")}`;
    if (loan.returnDate) return;
    const open = openByBook.get(loan.bookId) ?? 0;
    const key = `${loan.memberId}:${loan.bookId}`;
    if (open >= (totals.get(loan.bookId) ?? 0) || holding.has(key)) {
      loan.returnDate = iso(addDays(new Date(loan.borrowDate), 2));
      if (loan.returnDate > iso(today)) loan.returnDate = iso(today);
      return;
    }
    openByBook.set(loan.bookId, open + 1);
    holding.add(key);
  });

  return { books, members, loans: raw };
}

export const BOOK_CATEGORIES = CATEGORIES;
