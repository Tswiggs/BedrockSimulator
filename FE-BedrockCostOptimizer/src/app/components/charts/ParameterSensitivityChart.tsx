import { useRef, useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip as RechartsTooltip,
  ReferenceDot, ReferenceLine,
} from "recharts";
import {
  CHART_COLORS, formatCost, formatParamLabel,
  type SensitivityParamKey,
} from "../simulator-engine";

export interface ParamSensitivityDatum {
  value: number;
  label: string;
  isCurrent: boolean;
  winner: string;
  winnerColor: string;
  [strategy: string]: number | string | boolean;
}

interface ParameterSensitivityChartProps {
  data: ParamSensitivityDatum[];
  sensitivityParam: SensitivityParamKey;
  paramLabel: string;
  strategies: string[];
  crossoverLabels?: number[];
  compact?: boolean;
}

const STRATEGY_COLOR_MAP: Record<string, string> = {
  "No Caching": CHART_COLORS.noCaching,
  "Per-Assignment Cache": CHART_COLORS.cachePrefix,
  "Per-Submission Cache": CHART_COLORS.cacheSubmission,
  "Batch Inference": CHART_COLORS.batch,
  "Chat Sum. — No Cache": CHART_COLORS.noCaching,
  "Chat Sum. — Cache Prefix": CHART_COLORS.cachePrefix,
  "Chat Sum. — Cache in Prefix": CHART_COLORS.batch,
};

export function ParameterSensitivityChart({
  data,
  sensitivityParam,
  paramLabel,
  strategies,
  crossoverLabels = [],
  compact = false,
}: ParameterSensitivityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);

  useEffect(() => { setZoomDomain(null); }, [sensitivityParam]);

  const visibleData = useMemo(() => {
    if (!zoomDomain || data.length < 2) return data;
    const [zMin, zMax] = zoomDomain;
    let startIdx = 0;
    let endIdx = data.length - 1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].value >= zMin) { startIdx = Math.max(0, i - 1); break; }
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].value <= zMax) { endIdx = Math.min(data.length - 1, i + 1); break; }
    }
    return data.slice(startIdx, endIdx + 1);
  }, [data, zoomDomain]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (data.length < 2) return;
      e.preventDefault();
      const dataMin = data[0].value;
      const dataMax = data[data.length - 1].value;
      const fullRange = dataMax - dataMin;
      if (fullRange <= 0) return;
      setZoomDomain(prev => {
        const currentMin = prev?.[0] ?? dataMin;
        const currentMax = prev?.[1] ?? dataMax;
        const currentRange = currentMax - currentMin;
        const rect = el.getBoundingClientRect();
        const chartLeft = rect.left + 65;
        const chartWidth = rect.right - 5 - chartLeft;
        const cursorRatio = Math.max(0, Math.min(1, (e.clientX - chartLeft) / chartWidth));
        const cursorValue = currentMin + cursorRatio * currentRange;
        const zoomFactor = e.deltaY > 0 ? 1.3 : 0.7;
        const newRange = Math.min(fullRange, Math.max(fullRange * 0.05, currentRange * zoomFactor));
        if (newRange >= fullRange * 0.98) return null;
        const leftRatio = currentRange > 0 ? (cursorValue - currentMin) / currentRange : 0.5;
        let newMin = cursorValue - leftRatio * newRange;
        let newMax = cursorValue + (1 - leftRatio) * newRange;
        if (newMin < dataMin) { newMin = dataMin; newMax = newMin + newRange; }
        if (newMax > dataMax) { newMax = dataMax; newMin = newMax - newRange; }
        return [Math.max(dataMin, newMin), Math.min(dataMax, newMax)];
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [data]);

  const current = data.find((d) => d.isCurrent);
  const xSuffix = sensitivityParam !== "students" && sensitivityParam !== "reqsPerStudent" ? " (tokens)" : "";

  return (
    <div>
      <div
        className={compact ? "h-[260px]" : "h-[320px]"}
        ref={containerRef}
        onDoubleClick={() => setZoomDomain(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="value"
              type="number"
              domain={zoomDomain ?? ['dataMin', 'dataMax']}
              allowDataOverflow={!!zoomDomain}
              tickCount={8}
              tickFormatter={(v: number) => formatParamLabel(sensitivityParam, v)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              label={{
                value: paramLabel + xSuffix,
                position: "insideBottom",
                offset: -5,
                fill: "var(--muted-foreground)",
                fontSize: 12,
              }}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <RechartsTooltip
              content={({ active, payload, label: tipLabel }) => {
                if (!active || !payload?.length) return null;
                const entries = payload
                  .filter((p) => p.value != null)
                  .map((p) => ({ name: p.name as string, cost: p.value as number, color: STRATEGY_COLOR_MAP[p.name as string] ?? "#999" }))
                  .sort((a, b) => a.cost - b.cost);
                if (entries.length === 0) return null;
                const cheapest = entries[0].cost;
                const mostExpensive = entries[entries.length - 1].cost;
                const savings = mostExpensive - cheapest;
                const savingsPct = mostExpensive > 0 ? (savings / mostExpensive) * 100 : 0;
                return (
                  <div style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", fontSize: "12px" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatParamLabel(sensitivityParam, Number(tipLabel))}{xSuffix.replace(" (", " ").replace(")", "")}</div>
                    {entries.map((e) => (
                      <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: e.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: e.cost === cheapest ? 700 : 400, flex: 1 }}>{e.name}</span>
                        <span style={{ fontWeight: e.cost === cheapest ? 700 : 400, marginLeft: 8 }}>{formatCost(e.cost)}</span>
                        {e.cost === cheapest && (
                          <span style={{ fontSize: 9, backgroundColor: e.color, color: "#fff", borderRadius: 3, padding: "1px 4px", marginLeft: 4 }}>Cheapest</span>
                        )}
                      </div>
                    ))}
                    {savings > 0 && (
                      <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4, fontSize: 11, color: "var(--muted-foreground)" }}>
                        Best saves {formatCost(savings)} ({savingsPct.toFixed(1)}%) vs. most expensive
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
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
            {crossoverLabels.map((lbl) => (
              <ReferenceLine
                key={lbl}
                x={lbl}
                stroke={CHART_COLORS.crossover}
                strokeOpacity={0.6}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: "⬍", position: "insideTopRight", fill: CHART_COLORS.crossover, fontSize: 14, fontWeight: 700 }}
              />
            ))}
            {current && strategies.map((s) => {
              const val = current[s];
              if (val == null || typeof val !== "number") return null;
              return (
                <ReferenceDot
                  key={`dot-${s}`}
                  x={current.value}
                  y={val}
                  r={6}
                  fill={STRATEGY_COLOR_MAP[s] ?? "#999"}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {zoomDomain && data.length >= 2 && (() => {
        const dMin = data[0].value;
        const dMax = data[data.length - 1].value;
        const fullRange = dMax - dMin;
        const visRange = zoomDomain[1] - zoomDomain[0];
        const thumbPct = Math.max(8, (visRange / fullRange) * 100);
        const maxLeft = 100 - thumbPct;
        const leftPct = fullRange > visRange
          ? ((zoomDomain[0] - dMin) / (fullRange - visRange)) * maxLeft
          : 0;
        return (
          <div className="mt-1.5 mb-1 flex items-center gap-2 px-[5px]">
            <div
              className="flex-1 relative h-2.5 bg-muted rounded-full cursor-pointer select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                const track = e.currentTarget;
                const rect = track.getBoundingClientRect();
                const positionAt = (clientX: number) => {
                  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                  const centerValue = dMin + ratio * fullRange;
                  const halfVis = visRange / 2;
                  let nMin = centerValue - halfVis;
                  let nMax = centerValue + halfVis;
                  if (nMin < dMin) { nMin = dMin; nMax = nMin + visRange; }
                  if (nMax > dMax) { nMax = dMax; nMin = nMax - visRange; }
                  setZoomDomain([Math.max(dMin, nMin), Math.min(dMax, nMax)]);
                };
                positionAt(e.clientX);
                const onMove = (me: MouseEvent) => positionAt(me.clientX);
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
            >
              <div
                className="absolute h-full bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50 active:bg-muted-foreground/60 transition-colors"
                style={{ left: `${leftPct}%`, width: `${thumbPct}%` }}
              />
            </div>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors whitespace-nowrap"
              onClick={() => setZoomDomain(null)}
            >
              Reset
            </button>
          </div>
        );
      })()}
      <div className="mt-1 px-[5px]">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[10px] whitespace-nowrap">Cheapest</span>
          <div className="flex-1 flex h-3 rounded-sm overflow-hidden">
            {visibleData.map((d, i) => (
              <div
                key={i}
                className="flex-1 transition-colors"
                style={{ backgroundColor: d.winnerColor as string }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
