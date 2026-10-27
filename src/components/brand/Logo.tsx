import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M8 10.5c2.6-1.2 5.3-1.2 8 .4v12.6c-2.7-1.6-5.4-1.6-8-.4z" className="fill-primary-foreground" opacity="0.95" />
      <path d="M24 10.5c-2.6-1.2-5.3-1.2-8 .4v12.6c2.7-1.6 5.4-1.6 8-.4z" className="fill-primary-foreground" opacity="0.6" />
      <path d="M19.5 8v6l1.5-1.1 1.5 1.1V8z" className="fill-warning" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-navy-foreground" : "text-foreground")}>
        Libratify
      </span>
    </span>
  );
}
