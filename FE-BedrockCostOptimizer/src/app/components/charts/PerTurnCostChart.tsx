import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip as RechartsTooltip,
  ReferenceLine,
} from "recharts";
import { CHART_COLORS, formatCost } from "../simulator-engine";

export interface PerTurnDatum {
  turn: number;
  label: string;
  historyTokens: number;
  [strategy: string]: number | string;
}

interface PerTurnCostChartProps {
  data: PerTurnDatum[];
  strategies: string[];
  capReachedTurn?: number;
  compact?: boolean;
}

const STRATEGY_COLOR_MAP: Record<string, string> = {
  "Without Caching": CHART_COLORS.noCaching,
  "With Caching": CHART_COLORS.cachePrefix,
  "Chat Summary — No Cache": CHART_COLORS.noCaching,
  "Chat Summary — Cache Prefix": CHART_COLORS.cachePrefix,
  "Chat Summary — Cache in Prefix": CHART_COLORS.batch,
};

export function PerTurnCostChart({ data, strategies, capReachedTurn, compact = false }: PerTurnCostChartProps) {
  return (
    <div className={compact ? "h-[240px]" : "h-[280px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            label={{ value: "Turn", position: "insideBottom", offset: -5, fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCost(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <RechartsTooltip
            content={({ active, payload, label: tipLabel }) => {
              if (!active || !payload?.length) return null;
              const turn = parseInt(tipLabel as string);
              const datum = data[turn - 1];
              return (
                <div style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", fontSize: "12px" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Turn {tipLabel}</div>
                  <div style={{ color: "var(--muted-foreground)", marginBottom: 4 }}>
                    History: {Math.round(Number(datum?.historyTokens ?? 0)).toLocaleString()} tokens
                  </div>
                  {payload.map((p) => (
                    <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color as string, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span style={{ fontWeight: 600, marginLeft: 8 }}>{formatCost(p.value as number)}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {strategies.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={STRATEGY_COLOR_MAP[s] ?? "#999"}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {capReachedTurn != null && capReachedTurn > 0 && (
            <ReferenceLine
              x={`${capReachedTurn}`}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: "Cap reached", position: "top", fill: "var(--muted-foreground)", fontSize: 10 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
