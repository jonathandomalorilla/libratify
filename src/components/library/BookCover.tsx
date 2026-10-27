import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Book } from "@/types";

const HUES: Record<Book["category"], string> = {
  Fiction: "var(--chart-1)",
  Science: "var(--chart-2)",
  History: "var(--chart-3)",
  Technology: "var(--chart-8)",
  Biography: "var(--chart-6)",
  Children: "var(--chart-4)",
  Philosophy: "var(--chart-5)",
  Business: "var(--chart-7)",
};

export const categoryColor = (c: Book["category"]) => HUES[c];

/** Generated placeholder cover (no copyrighted artwork). Uses coverUrl when provided. */
export function BookCover({ book, className }: { book: Pick<Book, "title" | "category" | "coverUrl">; className?: string | undefined }) {
  const [failed, setFailed] = useState(false);
  if (book.coverUrl && !failed) {
    return (
      <img
        src={book.coverUrl}
        alt=""
        onError={() => setFailed(true)}
        className={cn("h-12 w-9 shrink-0 rounded-md object-cover shadow-sm", className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-12 w-9 shrink-0 overflow-hidden rounded-md shadow-sm", className)}
      style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${HUES[book.category]} 85%, white), ${HUES[book.category]})` }}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-foreground/15" />
      <div className="absolute inset-x-1.5 top-2 h-0.5 rounded bg-primary-foreground/70" />
      <div className="absolute inset-x-2.5 top-3.5 h-0.5 rounded bg-primary-foreground/40" />
      <span className="absolute bottom-1 left-1.5 font-serif text-[10px] font-semibold text-primary-foreground/90">
        {book.title.replace(/^The |^A /, "").charAt(0)}
      </span>
    </div>
  );
}
