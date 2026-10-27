import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ReportSeries } from "@/types";
import { categoryColor } from "./BookCover";
import type { BookCategory } from "@/types";

const tooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "var(--shadow-lift)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
};
const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false };

export function BorrowTrendChart({ data, height = 280, showReturned = true }: { data: ReportSeries[]; height?: number; showReturned?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gBorrow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gReturn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="borrowed" name="Borrowed" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gBorrow)" />
        {showReturned && (
          <Area type="monotone" dataKey="returned" name="Returned" stroke="var(--chart-2)" strokeWidth={2} fill="url(#gReturn)" />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data, height = 260, unit = "items" }: { data: { name: BookCategory; value: number }[]; height?: number; unit?: string }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative w-full sm:w-1/2" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} ${unit}`, ""]} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {data.map((d) => <Cell key={d.name} fill={categoryColor(d.name)} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-2xl font-bold tabular-nums">{total}</div>
            <div className="text-xs text-muted-foreground">{unit}</div>
          </div>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm sm:w-1/2 sm:grid-cols-1">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: categoryColor(d.name) }} />
              {d.name}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBars({ data, height = 280 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} {...axis} />
        <YAxis type="category" dataKey="name" width={150} {...axis} tick={{ fill: "var(--foreground)", fontSize: 12 }} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="value" name="Loans" fill="var(--chart-1)" radius={[0, 6, 6, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StackedStatusBars({ data, height = 260 }: { data: ReportSeries[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="borrowed" name="Borrowed" fill="var(--chart-1)" radius={[6, 6, 0, 0]} barSize={18} />
        <Bar dataKey="returned" name="Returned" fill="var(--chart-2)" radius={[6, 6, 0, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
