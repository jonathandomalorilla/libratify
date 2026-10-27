export type BookCategory =
  | "Fiction"
  | "Science"
  | "History"
  | "Technology"
  | "Biography"
  | "Children"
  | "Philosophy"
  | "Business";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  publicationYear: number;
  totalCopies: number;
  coverUrl?: string | undefined;
  addedAt: string; // yyyy-MM-dd
}

export type MemberStatus = "active" | "inactive";

export interface Member {
  id: string; // e.g. MBR-0001
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: MemberStatus;
}

export interface Loan {
  id: string;
  bookId: string;
  memberId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
}

export type LoanStatus = "active" | "returned" | "overdue";
export type BookStatus = "available" | "limited" | "unavailable";

export interface DashboardSummary {
  totalTitles: number;
  availableCopies: number;
  totalCopies: number;
  activeMembers: number;
  activeLoans: number;
  overdueLoans: number;
}

export interface ReportSeries {
  key: string; // yyyy-MM
  label: string; // "Jan"
  borrowed: number;
  returned: number;
}

export interface AdminProfile {
  name: string;
  email: string;
  role: string;
  library: string;
}

export interface Preferences {
  defaultRange: RangeKey;
  compactTables: boolean;
}

export type RangeKey = "30d" | "90d" | "180d";
