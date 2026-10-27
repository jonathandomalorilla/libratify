import { generateSeedData } from "@/data/mock-data";
import type { AdminProfile, Book, Loan, Member, Preferences } from "@/types";

export interface LibrarySnapshot {
  books: Book[];
  members: Member[];
  loans: Loan[];
  profile?: AdminProfile;
  preferences?: Preferences;
}

export interface LibraryRepository {
  load(): Promise<LibrarySnapshot>;
  save(snapshot: LibrarySnapshot): Promise<void>;
  reset(): Promise<LibrarySnapshot>;
}

/** DEMO ONLY: browser localStorage persistence. Replace with httpRepository later. */
const KEY = "libratify-demo-v1";

export const mockRepository: LibraryRepository = {
  async load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as LibrarySnapshot;
    } catch {
      /* ignore corrupt demo storage */
    }
    return generateSeedData();
  },
  async save(snapshot) {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  },
  async reset() {
    window.localStorage.removeItem(KEY);
    return generateSeedData();
  },
};
