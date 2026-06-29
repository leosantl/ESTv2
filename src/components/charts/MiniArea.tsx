import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export function MiniArea({
  data,
  dataKey = "value",
  xKey = "month",
  height = 220,
  format = (n: number) => n.toLocaleString("pt-BR"),
}: {
  data: Array<Record<string, unknown>>;
  dataKey?: string;
  xKey?: string;
  height?: number;
  format?: (n: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => format(v as number)}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
          formatter={(v: number) => format(v)}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="var(--foreground)"
          strokeWidth={1.5}
          fill="url(#g1)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}