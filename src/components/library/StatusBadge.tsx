import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONES: Record<Tone, string> = {
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-destructive-soft text-destructive ring-destructive/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-primary-soft text-primary ring-primary/20",
};

const MAP: Record<string, { tone: Tone; label: string }> = {
  available: { tone: "success", label: "Available" },
  limited: { tone: "warning", label: "Limited" },
  unavailable: { tone: "danger", label: "Unavailable" },
  active: { tone: "info", label: "Active" },
  returned: { tone: "neutral", label: "Returned" },
  overdue: { tone: "danger", label: "Overdue" },
  "member-active": { tone: "success", label: "Active" },
  "member-inactive": { tone: "neutral", label: "Inactive" },
};

export function StatusBadge({ status, className }: { status: keyof typeof MAP | string; className?: string }) {
  const s = MAP[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[s.tone], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
