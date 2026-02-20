import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";
import { CHART_COLORS, formatCost } from "../simulator-engine";

export interface BarChartDatum {
  name: string;
  "Cache Write": number;
  "Cache Read": number;
  "Fresh Input": number;
  Output: number;
  Guardrails: number;
}

interface CostComparisonBarChartProps {
  data: BarChartDatum[];
  chartKey?: string;
}

export function CostComparisonBarChart({ data, chartKey }: CostComparisonBarChartProps) {
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart key={chartKey} data={data} barSize={60}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <RechartsTooltip
            formatter={(value: number) => formatCost(value)}
            contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="Cache Write" stackId="cost" fill={CHART_COLORS.cachePrefix} isAnimationActive={false} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Cache Read" stackId="cost" fill={CHART_COLORS.cacheRead} isAnimationActive={false} />
          <Bar dataKey="Fresh Input" stackId="cost" fill={CHART_COLORS.noCaching} isAnimationActive={false} />
          <Bar dataKey="Output" stackId="cost" fill={CHART_COLORS.batch} isAnimationActive={false} />
          <Bar dataKey="Guardrails" stackId="cost" fill={CHART_COLORS.guardrails} isAnimationActive={false} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
