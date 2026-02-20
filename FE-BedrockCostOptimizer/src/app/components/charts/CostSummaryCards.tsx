import { Badge } from "../ui/badge";
import { formatCost, type CostBreakdown } from "../simulator-engine";

export interface StrategyCardData {
  key: string;
  label: string;
  description: string;
  breakdown: CostBreakdown;
  isWinner: boolean;
}

interface CostSummaryCardsProps {
  strategies: StrategyCardData[];
  students: number;
}

function CostLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs font-medium">{formatCost(value)}</span>
    </div>
  );
}

export function CostSummaryCards({ strategies, students }: CostSummaryCardsProps) {
  const cardCount = strategies.length;
  const gridCols = cardCount >= 4
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    : cardCount === 3
      ? "grid-cols-1 md:grid-cols-3"
      : cardCount === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1";

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {strategies.map((s) => (
        <div
          key={s.key}
          className={`rounded-lg border p-4 min-w-0 ${s.isWinner ? "border-emerald-500" : "border-border"}`}
        >
          <div className="flex items-start gap-2 justify-between mb-1">
            <p className="text-sm font-semibold min-w-0">{s.label}</p>
            {s.isWinner && (
              <Badge className="bg-emerald-500 text-white text-[10px] shrink-0">Best</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-[11px] mb-2">{s.description}</p>
          <p className="text-foreground text-lg font-medium">
            {formatCost(s.breakdown.total)}
            <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
          </p>
          <p className="text-muted-foreground text-sm">
            {students > 0 ? formatCost(s.breakdown.total / students) : "$0.00"}
            <span className="ml-1 text-xs">per student</span>
          </p>
          <div className="mt-2 space-y-0.5">
            {s.breakdown.cacheWrite > 0 && <CostLine label="Cache Write" value={s.breakdown.cacheWrite} />}
            {s.breakdown.cacheRead > 0 && <CostLine label="Cache Read" value={s.breakdown.cacheRead} />}
            <CostLine label="Fresh Input" value={s.breakdown.freshInput} />
            <CostLine label="Output" value={s.breakdown.output} />
            {s.breakdown.guardrails > 0 && <CostLine label="Guardrails" value={s.breakdown.guardrails} />}
          </div>
        </div>
      ))}
    </div>
  );
}
