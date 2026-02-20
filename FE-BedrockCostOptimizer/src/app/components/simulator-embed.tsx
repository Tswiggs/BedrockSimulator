import { useState, useMemo } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { getPricingData, type BedrockModel } from "./pricing-data";
import { PromptVisualizer } from "./prompt-visualizer";
import {
  type TemplateKey, type CacheTTL, type SensitivityParamKey,
  TEMPLATES, CHART_COLORS, SENSITIVITY_SAMPLE_POINTS, STRATEGY_TIEBREAK,
  WORDS_PER_TOKEN, TOKENS_PER_WORD,
  formatCost, formatParamLabel,
  computeStrategyA, computeStrategyB, computeNoCaching, computeBatch,
  computeTokensPerExchange, computeHistoryAtTurn,
  getEffectiveInstTokens, getEffectiveSubTokens, computeSubTokensAtTurn,
  simulateSummarization,
  computeSumNoCaching, computeSumCacheAssessment, computeSumCacheSummary,
  computeGuardrailsCost,
} from "./simulator-engine";
import { CostComparisonBarChart, type BarChartDatum } from "./charts/CostComparisonBarChart";
import { ParameterSensitivityChart, type ParamSensitivityDatum } from "./charts/ParameterSensitivityChart";
import { PerTurnCostChart, type PerTurnDatum } from "./charts/PerTurnCostChart";
import { CostSummaryCards, type StrategyCardData } from "./charts/CostSummaryCards";

type ShowPanel = "prompt-visualizer" | "cards" | "bar" | "sensitivity" | "per-turn";

interface SimulatorEmbedProps {
  template: TemplateKey;
  show: ShowPanel[];
  hideBatch?: boolean;
}

const PREFERRED_DEFAULT_MODEL = "anthropic.claude-sonnet-4-6-20260115-v1:0";

export function SimulatorEmbed({ template, show, hideBatch = false }: SimulatorEmbedProps) {
  const pricingData = getPricingData();
  const meta = TEMPLATES[template];
  const preset = meta.preset;

  const cachingModels = useMemo(
    () => pricingData.models.filter((m) => m.constraints.supports_caching),
    [pricingData]
  );

  const [selectedModelId, setSelectedModelId] = useState(() => {
    const preferred = pricingData.models.find((m) => m.id === PREFERRED_DEFAULT_MODEL);
    if (preferred) return preferred.id;
    return cachingModels[0]?.id ?? pricingData.models[0].id;
  });

  const [students, setStudents] = useState(preset.students);
  const [reqsPerStudent, setReqsPerStudent] = useState(preset.reqsPerStudent);
  const [sysTokens] = useState(preset.sysTokens);
  const [ctxTokens, setCtxTokens] = useState(preset.ctxTokens);
  const [subTokens] = useState(preset.subTokens);
  const [instTokens, setInstTokens] = useState(preset.instTokens);
  const [outputTokens] = useState(preset.outputTokens);

  const selectedModel: BedrockModel = useMemo(
    () => pricingData.models.find((m) => m.id === selectedModelId) ?? pricingData.models[0],
    [pricingData, selectedModelId]
  );

  const supportsCaching = selectedModel.constraints.supports_caching;
  const supportsBatch = !hideBatch && selectedModel.constraints.supports_batch && selectedModel.pricing.batch_input_1k != null;
  const tierMultiplier = 1.0;
  const cacheTTL: CacheTTL = meta.defaultCacheTTL;
  const effectiveCacheTTL: CacheTTL = cacheTTL === "1hour" && selectedModel.constraints.supports_1hour_cache ? "1hour" : "5min";
  const isConversational = meta.conversational;
  const isProgressiveSubmission = meta.progressiveSubmission;
  const submissionCacheable = meta.submissionCacheable;
  const summarizationEnabled = meta.defaultSummarizationEnabled;
  const summarySize = meta.defaultSummarySize;
  const sensitivityParam: SensitivityParamKey = meta.defaultSensitivityParam;

  const effectiveInstTokens = getEffectiveInstTokens(instTokens, reqsPerStudent, outputTokens, isConversational);
  const effectiveSubTokens = useMemo(
    () => getEffectiveSubTokens(subTokens, reqsPerStudent, isProgressiveSubmission),
    [subTokens, reqsPerStudent, isProgressiveSubmission]
  );

  const displayMode = isConversational ? "caching-insights" as const : "strategy-comparison" as const;

  // --- Cost calculations ---
  const results = useMemo(() => {
    const noCaching = computeNoCaching(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier
    );

    let batch: typeof noCaching | null = null;
    if (supportsBatch && !isConversational) {
      batch = computeBatch(
        selectedModel, students, reqsPerStudent,
        sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier
      );
    }

    if (!supportsCaching) {
      return { noCaching, strategyA: null, strategyB: null, batch };
    }

    const strategyA = computeStrategyA(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier,
      effectiveCacheTTL
    );

    const strategyB = computeStrategyB(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier,
      submissionCacheable, effectiveCacheTTL
    );

    return { noCaching, strategyA, strategyB, batch };
  }, [selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, supportsCaching, supportsBatch, effectiveCacheTTL, submissionCacheable, isConversational, tierMultiplier]);

  // --- Winner ---
  type WinnerKey = "noCaching" | "A" | "B" | "batch";
  const { winner } = useMemo(() => {
    const candidates: { key: WinnerKey; total: number }[] = [
      { key: "noCaching", total: results.noCaching.total },
    ];
    if (results.strategyA) candidates.push({ key: "A", total: results.strategyA.total });
    if (results.strategyB) candidates.push({ key: "B", total: results.strategyB.total });
    if (results.batch) candidates.push({ key: "batch", total: results.batch.total });
    candidates.sort((a, b) => a.total - b.total);
    return { winner: candidates[0].key };
  }, [results]);

  // --- Summarization strategies (for conversational templates with summarization) ---
  const sumStrategies = useMemo(() => {
    if (!isConversational || !summarizationEnabled) return null;
    const noCaching = computeSumNoCaching(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
      summarySize, tierMultiplier
    );
    const cacheAssessment = supportsCaching ? computeSumCacheAssessment(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
      summarySize, tierMultiplier, effectiveCacheTTL
    ) : null;
    const cacheSummary = supportsCaching ? computeSumCacheSummary(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
      summarySize, tierMultiplier, effectiveCacheTTL
    ) : null;
    return { noCaching, cacheAssessment, cacheSummary };
  }, [isConversational, summarizationEnabled, selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens, summarySize, tierMultiplier, effectiveCacheTTL, supportsCaching]);

  // --- Bar chart data ---
  const chartData = useMemo((): BarChartDatum[] => {
    const data: BarChartDatum[] = [];
    data.push({
      name: "No Caching",
      "Cache Write": 0, "Cache Read": 0,
      "Fresh Input": results.noCaching.freshInput,
      Output: results.noCaching.output,
      Guardrails: 0,
    });
    if (results.strategyA) {
      data.push({
        name: displayMode === "strategy-comparison" ? "Per-Assignment" : "With Caching",
        "Cache Write": results.strategyA.cacheWrite,
        "Cache Read": results.strategyA.cacheRead,
        "Fresh Input": results.strategyA.freshInput,
        Output: results.strategyA.output,
        Guardrails: 0,
      });
    }
    if (results.strategyB && displayMode === "strategy-comparison") {
      data.push({
        name: "Per-Submission",
        "Cache Write": results.strategyB.cacheWrite,
        "Cache Read": results.strategyB.cacheRead,
        "Fresh Input": results.strategyB.freshInput,
        Output: results.strategyB.output,
        Guardrails: 0,
      });
    }
    if (results.batch) {
      data.push({
        name: "Batch",
        "Cache Write": 0, "Cache Read": 0,
        "Fresh Input": results.batch.freshInput,
        Output: results.batch.output,
        Guardrails: 0,
      });
    }
    return data;
  }, [results, displayMode]);

  // --- Parameter sensitivity data ---
  const paramSensitivityData = useMemo((): ParamSensitivityDatum[] => {
    if (!supportsCaching) return [];
    const range = SENSITIVITY_SAMPLE_POINTS[sensitivityParam];
    const min = range[0];
    const max = range[range.length - 1];
    const numPoints = 40;
    const step = (max - min) / (numPoints - 1);
    const samplePoints: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      samplePoints.push(Math.round(min + step * i));
    }
    const currentValue: number = { students, reqsPerStudent, sysTokens, ctxTokens, subTokens, instTokens, outputTokens }[sensitivityParam];
    if (!samplePoints.includes(currentValue)) {
      samplePoints.push(currentValue);
      samplePoints.sort((a, b) => a - b);
    }

    const isSumMode = summarizationEnabled && isConversational;

    const rawData: ParamSensitivityDatum[] = samplePoints.map((val) => {
      const args = {
        students, reqsPerStudent, sysTokens, ctxTokens, subTokens, instTokens, outputTokens,
        [sensitivityParam]: val,
      };
      const effInst = getEffectiveInstTokens(args.instTokens, args.reqsPerStudent, args.outputTokens, isConversational);
      const effSub = getEffectiveSubTokens(args.subTokens, args.reqsPerStudent, isProgressiveSubmission);
      const adjustedTotalReqs = args.students * args.reqsPerStudent;
      const gr = computeGuardrailsCost(adjustedTotalReqs, effSub, args.outputTokens) * 0;

      const noCachingR = computeNoCaching(
        selectedModel, args.students, args.reqsPerStudent,
        args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens, tierMultiplier
      );
      const stratA = computeStrategyA(
        selectedModel, args.students, args.reqsPerStudent,
        args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens, tierMultiplier, effectiveCacheTTL
      );

      const point: Record<string, number | string | boolean> = {
        value: val,
        label: formatParamLabel(sensitivityParam, val),
        isCurrent: val === currentValue,
      };

      if (isSumMode) {
        const sumNone = computeSumNoCaching(
          selectedModel, args.students, args.reqsPerStudent,
          args.sysTokens, args.ctxTokens, effSub, args.instTokens, args.outputTokens,
          summarySize, tierMultiplier
        );
        const sumPrefix = computeSumCacheAssessment(
          selectedModel, args.students, args.reqsPerStudent,
          args.sysTokens, args.ctxTokens, effSub, args.instTokens, args.outputTokens,
          summarySize, tierMultiplier, effectiveCacheTTL
        );
        const sumFull = computeSumCacheSummary(
          selectedModel, args.students, args.reqsPerStudent,
          args.sysTokens, args.ctxTokens, effSub, args.instTokens, args.outputTokens,
          summarySize, tierMultiplier, effectiveCacheTTL
        );
        point["Chat Sum. — No Cache"] = sumNone.total + gr;
        point["Chat Sum. — Cache Prefix"] = sumPrefix.total + gr;
        point["Chat Sum. — Cache in Prefix"] = sumFull.total + gr;
      } else {
        point["No Caching"] = noCachingR.total + gr;
        point["Per-Assignment Cache"] = stratA.total + gr;
      }

      if (displayMode === "strategy-comparison") {
        const stratB = computeStrategyB(
          selectedModel, args.students, args.reqsPerStudent,
          args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens,
          tierMultiplier, submissionCacheable, effectiveCacheTTL
        );
        point["Per-Submission Cache"] = stratB.total + gr;

        if (supportsBatch) {
          const batchR = computeBatch(
            selectedModel, args.students, args.reqsPerStudent,
            args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens, tierMultiplier
          );
          point["Batch Inference"] = batchR.total + gr;
        }
      }

      const costKeys = isSumMode
        ? ["Chat Sum. — No Cache", "Chat Sum. — Cache Prefix", "Chat Sum. — Cache in Prefix"]
        : ["No Caching", "Per-Assignment Cache"];
      const costs: [string, number][] = costKeys
        .filter((k) => point[k] != null)
        .map((k) => [k, point[k] as number]);
      if (point["Per-Submission Cache"] != null) costs.push(["Per-Submission Cache", point["Per-Submission Cache"] as number]);
      if (point["Batch Inference"] != null) costs.push(["Batch Inference", point["Batch Inference"] as number]);
      costs.sort((a, b) => a[1] - b[1] || (STRATEGY_TIEBREAK[a[0]] ?? 99) - (STRATEGY_TIEBREAK[b[0]] ?? 99));
      point.winner = costs[0]?.[0] ?? "";
      const colorMap: Record<string, string> = {
        "No Caching": CHART_COLORS.noCaching,
        "Per-Assignment Cache": CHART_COLORS.cachePrefix,
        "Per-Submission Cache": CHART_COLORS.cacheSubmission,
        "Batch Inference": CHART_COLORS.batch,
        "Chat Sum. — No Cache": CHART_COLORS.noCaching,
        "Chat Sum. — Cache Prefix": CHART_COLORS.cachePrefix,
        "Chat Sum. — Cache in Prefix": CHART_COLORS.batch,
      };
      point.winnerColor = colorMap[costs[0]?.[0] ?? ""] ?? "#999";

      return point as unknown as ParamSensitivityDatum;
    });

    // Stabilize winner through near-ties
    const stabKeys = isSumMode
      ? ["Chat Sum. — No Cache", "Chat Sum. — Cache Prefix", "Chat Sum. — Cache in Prefix"]
      : ["No Caching", "Per-Assignment Cache"];
    let ri = 0;
    while (ri < rawData.length) {
      const pt = rawData[ri] as unknown as Record<string, number | string | boolean>;
      const allKeys = [...stabKeys];
      if (pt["Per-Submission Cache"] != null) allKeys.push("Per-Submission Cache");
      if (pt["Batch Inference"] != null) allKeys.push("Batch Inference");
      const sorted = allKeys
        .filter(k => pt[k] != null)
        .map(k => pt[k] as number)
        .sort((a, b) => a - b);
      const gap = sorted.length >= 2 ? sorted[1] - sorted[0] : Infinity;
      if (gap < 0.005) {
        let rj = ri + 1;
        while (rj < rawData.length) {
          const p2 = rawData[rj] as unknown as Record<string, number | string | boolean>;
          const s2 = allKeys
            .filter(k => p2[k] != null)
            .map(k => p2[k] as number)
            .sort((a, b) => a - b);
          if (s2.length < 2 || s2[1] - s2[0] >= 0.005) break;
          rj++;
        }
        const resolved = rawData[rj < rawData.length ? rj : rawData.length - 1];
        for (let k = ri; k < rj; k++) {
          rawData[k].winner = resolved.winner;
          rawData[k].winnerColor = resolved.winnerColor;
        }
        ri = rj;
      } else {
        ri++;
      }
    }
    return rawData;
  }, [supportsCaching, sensitivityParam, selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, subTokens, instTokens, outputTokens, tierMultiplier, effectiveCacheTTL, submissionCacheable, supportsBatch, isConversational, isProgressiveSubmission, displayMode, summarizationEnabled, summarySize]);

  const paramCrossoverLabels = useMemo(() => {
    const crossovers: number[] = [];
    for (let i = 0; i < paramSensitivityData.length - 1; i++) {
      if (paramSensitivityData[i].winner !== paramSensitivityData[i + 1].winner) {
        crossovers.push(paramSensitivityData[i + 1].value);
      }
    }
    return crossovers;
  }, [paramSensitivityData]);

  const sensitivityStrategies = useMemo(() => {
    const isSumMode = summarizationEnabled && isConversational;
    const strats: string[] = [];
    if (isSumMode) {
      strats.push("Chat Sum. — No Cache", "Chat Sum. — Cache Prefix", "Chat Sum. — Cache in Prefix");
    } else {
      strats.push("No Caching", "Per-Assignment Cache");
      if (displayMode === "strategy-comparison") strats.push("Per-Submission Cache");
      if (displayMode === "strategy-comparison" && supportsBatch) strats.push("Batch Inference");
    }
    return strats;
  }, [summarizationEnabled, isConversational, displayMode, supportsBatch]);

  // --- Per-turn data ---
  const tokensPerExchange = computeTokensPerExchange(outputTokens);
  const turnsUntilCap = isConversational && tokensPerExchange > 0
    ? Math.ceil(instTokens / tokensPerExchange) : 0;

  const perTurnData = useMemo((): PerTurnDatum[] => {
    if (!isConversational || reqsPerStudent < 2) return [];
    const p = selectedModel.pricing;
    const pInput = p.input_1k * tierMultiplier;
    const pOutput = p.output_1k * tierMultiplier;
    const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;
    const pWrite = (p.cache_write_1k ?? 0) * tierMultiplier;
    const cachedPrefix = sysTokens + ctxTokens;

    const sumSim = summarizationEnabled
      ? simulateSummarization(reqsPerStudent, instTokens, outputTokens, summarySize)
      : null;
    const sumTurns = sumSim ? new Set(sumSim.summarizationTurns) : null;
    let hasSummaryCIP = false;

    return Array.from({ length: reqsPerStudent }, (_, i) => {
      const turn = i + 1;
      const turnSub = computeSubTokensAtTurn(turn, reqsPerStudent, subTokens, isProgressiveSubmission);
      const history = computeHistoryAtTurn(turn, instTokens, outputTokens);
      const freshTokens = turnSub + history;
      const allInput = cachedPrefix + freshTokens;
      const prefixPrice = (supportsCaching && turn === 1) ? pWrite : pRead;

      const noCachingCost = (allInput / 1000) * pInput + (outputTokens / 1000) * pOutput;
      const withCachingCost = supportsCaching
        ? (cachedPrefix / 1000) * prefixPrice + (freshTokens / 1000) * pInput + (outputTokens / 1000) * pOutput
        : noCachingCost;

      const point: Record<string, number | string> = {
        turn,
        label: `${turn}`,
        "Without Caching": noCachingCost,
        ...(supportsCaching ? { "With Caching": withCachingCost } : {}),
        historyTokens: history,
      };

      if (sumSim && sumTurns) {
        const sumHistory = sumSim.historyPerTurn[i] ?? 0;
        const sumFresh = turnSub + sumHistory;
        point["Chat Summary — No Cache"] = ((cachedPrefix + sumFresh) / 1000) * pInput + (outputTokens / 1000) * pOutput;
        if (supportsCaching) {
          const cachePrefixPrice = (turn === 1) ? pWrite : pRead;
          point["Chat Summary — Cache Prefix"] = (cachedPrefix / 1000) * cachePrefixPrice + (sumFresh / 1000) * pInput + (outputTokens / 1000) * pOutput;

          if (turn > 1 && sumTurns.has(turn - 1)) hasSummaryCIP = true;
          const fullPrefix = cachedPrefix + summarySize;
          const freshHistoryForCacheSummary = hasSummaryCIP ? Math.max(0, sumHistory - summarySize) : sumHistory;
          const cacheSumFresh = turnSub + freshHistoryForCacheSummary;
          const cacheSumPrefix = hasSummaryCIP ? fullPrefix : cachedPrefix;
          const cacheSumPrefixPrice = (turn === 1 || (hasSummaryCIP && sumTurns.has(turn - 1))) ? pWrite : pRead;
          point["Chat Summary — Cache in Prefix"] = (cacheSumPrefix / 1000) * cacheSumPrefixPrice + (cacheSumFresh / 1000) * pInput + (outputTokens / 1000) * pOutput;
        }
      }

      return point as unknown as PerTurnDatum;
    });
  }, [isConversational, reqsPerStudent, instTokens, outputTokens, sysTokens, ctxTokens, subTokens, selectedModel, tierMultiplier, supportsCaching, summarizationEnabled, summarySize, isProgressiveSubmission]);

  const perTurnStrategies = useMemo(() => {
    const strats: string[] = [];
    if (summarizationEnabled) {
      strats.push("Chat Summary — No Cache");
      if (supportsCaching) {
        strats.push("Chat Summary — Cache Prefix");
        strats.push("Chat Summary — Cache in Prefix");
      }
    } else {
      strats.push("Without Caching");
      if (supportsCaching) strats.push("With Caching");
    }
    return strats;
  }, [summarizationEnabled, supportsCaching]);

  // --- Strategy cards data ---
  const strategyCards = useMemo((): StrategyCardData[] => {
    if (summarizationEnabled && isConversational && sumStrategies) {
      const cards: StrategyCardData[] = [
        { key: "sumNoCaching", label: "Chat Sum. — No Cache", description: "Summarization without caching", breakdown: sumStrategies.noCaching, isWinner: false },
      ];
      if (sumStrategies.cacheAssessment) {
        cards.push({ key: "sumCacheAssessment", label: "Chat Sum. — Cache Prefix", description: "Cache shared prefix, summary as fresh input", breakdown: sumStrategies.cacheAssessment, isWinner: false });
      }
      if (sumStrategies.cacheSummary) {
        cards.push({ key: "sumCacheSummary", label: "Chat Sum. — Cache in Prefix", description: "Cache prefix + summary together", breakdown: sumStrategies.cacheSummary, isWinner: false });
      }
      const best = cards.reduce((a, b) => a.breakdown.total < b.breakdown.total ? a : b);
      best.isWinner = true;
      return cards;
    }

    const cards: StrategyCardData[] = [
      { key: "noCaching", label: "No Caching", description: "On-demand baseline", breakdown: results.noCaching, isWinner: winner === "noCaching" },
    ];
    if (results.strategyA) {
      cards.push({ key: "strategyA", label: "Per-Assignment Cache", description: "Caches shared context across students", breakdown: results.strategyA, isWinner: winner === "A" });
    }
    if (results.strategyB && displayMode === "strategy-comparison") {
      cards.push({ key: "strategyB", label: "Per-Submission Cache", description: "Writes cache per student submission", breakdown: results.strategyB, isWinner: winner === "B" });
    }
    if (results.batch) {
      cards.push({ key: "batch", label: "Batch Inference", description: "Async via S3, 50% off", breakdown: results.batch, isWinner: winner === "batch" });
    }
    return cards;
  }, [results, winner, displayMode, summarizationEnabled, isConversational, sumStrategies]);

  const showSet = new Set(show);
  const hasControls = showSet.has("cards") || showSet.has("bar") || showSet.has("sensitivity") || showSet.has("per-turn");

  return (
    <div className="my-6 rounded-lg border border-border bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">{meta.label} — Interactive Simulator</p>
          <p className="text-xs text-muted-foreground">Adjust parameters to explore cost tradeoffs</p>
        </div>
        <a
          href={`#/simulator?template=${template}`}
          className="text-xs text-primary hover:underline whitespace-nowrap"
        >
          Open full simulator →
        </a>
      </div>

      {/* Compact controls */}
      {hasControls && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cachingModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Class Size</Label>
              <div className="flex items-center gap-1.5 mt-1">
                <Input
                  type="number"
                  min={1}
                  value={students}
                  onChange={(e) => setStudents(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 text-xs"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">students</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {isConversational ? "Messages / Student" : "Requests / Student"}
              </Label>
              <div className="flex items-center gap-1.5 mt-1">
                <Input
                  type="number"
                  min={1}
                  value={reqsPerStudent}
                  onChange={(e) => setReqsPerStudent(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 text-xs"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {isConversational ? "msgs" : "reqs"}
                </span>
              </div>
            </div>
            {isConversational ? (
              <div>
                <Label className="text-xs text-muted-foreground">Chat History</Label>
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    type="number"
                    min={50}
                    value={Math.round(instTokens * WORDS_PER_TOKEN)}
                    onChange={(e) => {
                      const words = Math.max(50, parseInt(e.target.value) || 50);
                      setInstTokens(Math.round(words * TOKENS_PER_WORD));
                    }}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">words</span>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground">Shared Context</Label>
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    type="number"
                    min={0}
                    value={ctxTokens}
                    onChange={(e) => setCtxTokens(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">tokens</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panels */}
      <div className="p-4 space-y-4">
        {showSet.has("prompt-visualizer") && supportsCaching && (
          <div className="space-y-4">
            <PromptVisualizer
              strategy="A"
              systemTokens={sysTokens}
              contextTokens={ctxTokens}
              submissionTokens={subTokens}
              instructionTokens={instTokens}
              labels={meta.visualizerLabels}
              submissionCacheable={submissionCacheable}
            />
            {displayMode === "strategy-comparison" && (
              <>
                <div className="border-t border-border" />
                <PromptVisualizer
                  strategy="B"
                  systemTokens={sysTokens}
                  contextTokens={ctxTokens}
                  submissionTokens={subTokens}
                  instructionTokens={instTokens}
                  labels={meta.visualizerLabels}
                  submissionCacheable={submissionCacheable}
                />
              </>
            )}
          </div>
        )}

        {showSet.has("cards") && (
          <CostSummaryCards strategies={strategyCards} students={students} />
        )}

        {showSet.has("bar") && (
          <CostComparisonBarChart
            data={chartData}
            chartKey={`${selectedModelId}-${supportsCaching}`}
          />
        )}

        {showSet.has("sensitivity") && paramSensitivityData.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Cost by {meta.fieldLabels[sensitivityParam].label}
              <span className="text-[10px] ml-2 text-muted-foreground/60">Scroll to zoom · double-click to reset</span>
            </p>
            <ParameterSensitivityChart
              data={paramSensitivityData}
              sensitivityParam={sensitivityParam}
              paramLabel={meta.fieldLabels[sensitivityParam].label}
              strategies={sensitivityStrategies}
              crossoverLabels={paramCrossoverLabels}
              compact
            />
          </div>
        )}

        {showSet.has("per-turn") && perTurnData.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Per-Turn Cost (Single Student)</p>
            <p className="text-[11px] text-muted-foreground mb-2">
              Cost per API call across a student's session — history ramps to the {instTokens.toLocaleString()}-token cap
            </p>
            <PerTurnCostChart
              data={perTurnData}
              strategies={perTurnStrategies}
              capReachedTurn={turnsUntilCap > 0 && turnsUntilCap <= reqsPerStudent ? turnsUntilCap + 1 : undefined}
              compact
            />
            <p className="text-muted-foreground mt-2 text-[11px]">
              Each exchange adds ~{tokensPerExchange.toLocaleString()} tokens.
              Cap reached at turn {Math.min(turnsUntilCap + 1, reqsPerStudent)}.
              The is a slight upward cost trend over time as the student's draft grows in the Clarity Chat simulation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
