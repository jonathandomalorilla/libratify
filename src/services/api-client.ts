/**
 * Typed HTTP client for the future ASP.NET Core API.
 * Not used by the demo yet — the demo runs on the local mock repository.
 * Set VITE_API_BASE_URL and swap `mockRepository` for `httpRepository` in library-store.
 */
import type { Book, Loan, Member } from "@/types";
import type { LibraryRepository, LibrarySnapshot } from "./repository";

export const API_BASE_URL: string | undefined = import.meta.env["VITE_API_BASE_URL"];

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  if (!API_BASE_URL) throw new ApiError(0, "VITE_API_BASE_URL is not configured.");
  const { token, headers, ...rest } = init;
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const httpRepository: LibraryRepository = {
  async load(): Promise<LibrarySnapshot> {
    const [books, members, loans] = await Promise.all([
      apiRequest<Book[]>("/api/books"),
      apiRequest<Member[]>("/api/members"),
      apiRequest<Loan[]>("/api/loans"),
    ]);
    return { books, members, loans };
  },
  async save() {
    // The real API persists each mutation through its own endpoint.
  },
  async reset() {
    return this.load();
  },
};
