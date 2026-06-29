import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  hintTone = "muted",
  icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  hintTone?: "muted" | "positive" | "warning" | "danger";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="font-mono text-2xl font-medium tracking-tight tabular-nums text-foreground">{value}</p>
      {hint && (
        <span
          className={cn(
            "mt-1 inline-block text-[10px]",
            hintTone === "positive" && "text-emerald-600",
            hintTone === "warning" && "text-amber-600",
            hintTone === "danger" && "text-destructive",
            hintTone === "muted" && "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}