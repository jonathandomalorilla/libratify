import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGE_LABEL } from "@/lib/library-stats";
import type { RangeKey } from "@/types";

export function RangeSelect({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RangeKey)}>
      <SelectTrigger className="h-9 w-[170px] bg-card" aria-label="Date range">
        <CalendarDays className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
          <SelectItem key={k} value={k}>{RANGE_LABEL[k]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
