import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  Ativa: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Ativo: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Operacional: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Confirmado: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Paga: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Compensado: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Válido: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Concluído: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  Inativo: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  Recolhida: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  Cancelada: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  Trial: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  Pendente: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  "Em espera": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  Previsto: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  Manutenção: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  "Vence em breve": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  Suspensa: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  Suspenso: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  Atrasada: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  Atrasado: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  Vencido: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight",
        tones[status] ?? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
        className,
      )}
    >
      {status}
    </span>
  );
}