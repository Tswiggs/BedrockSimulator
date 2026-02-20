import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { getPricingData, type BedrockModel } from "./pricing-data";
import { PromptVisualizer, type SegmentLabels } from "./prompt-visualizer";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, ReferenceDot, ReferenceLine,
} from "recharts";
import {
  TrendingDown, Info, Zap, Award, Users, MessageSquare,
  BookOpen, FileText, PenLine, Terminal, Shield, Timer,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

type TemplateKey = "graf-simple" | "graf-literary" | "clarity-chat" | "clarity-chat-xl" | "interactive-ai";
type CacheTTL = "5min" | "1hour";
type DisplayMode = "strategy-comparison" | "caching-insights";
type InputMode = "simple" | "technical";
type SensitivityParamKey = keyof TemplatePreset;

interface TemplatePreset {
  students: number;
  reqsPerStudent: number;
  sysTokens: number;
  ctxTokens: number;
  subTokens: number;
  instTokens: number;
  outputTokens: number;
}

interface TemplateMeta {
  label: string;
  shortLabel: string;
  description: string;
  strategyNote: string | null;
  submissionCacheable: boolean;
  conversational: boolean;
  progressiveSubmission: boolean;
  defaultSummarizationEnabled: boolean;
  defaultSummarySize: number;
  defaultSensitivityParam: SensitivityParamKey;
  defaultCacheTTL: CacheTTL;
  preset: TemplatePreset;
  fieldLabels: {
    students: { label: string };
    reqsPerStudent: { label: string };
    sysTokens: { label: string; tooltip: string };
    ctxTokens: { label: string; tooltip: string };
    subTokens: { label: string; tooltip: string };
    instTokens: { label: string; tooltip: string };
    outputTokens: { label: string; tooltip: string };
  };
  visualizerLabels: SegmentLabels;
}

const TEMPLATES: Record<TemplateKey, TemplateMeta> = {
  "graf-simple": {
    label: "GRAF+ Simple",
    shortLabel: "GRAF+",
    description:
      "GRAF+ Literary Analysis — template represents a typical example in David Adamson's demo for first-pass feedback.",
    strategyNote: null,
    submissionCacheable: true,
    conversational: false,
    progressiveSubmission: false,
    defaultSummarizationEnabled: false,
    defaultSummarySize: 500,
    defaultSensitivityParam: "ctxTokens",
    defaultCacheTTL: "5min",
    preset: {
      students: 30,
      reqsPerStudent: 5,
      sysTokens: 1000,
      ctxTokens: 500,
      subTokens: 2000,
      instTokens: 200,
      outputTokens: 500,
    },
    fieldLabels: {
      students: { label: "Class Size (Students)" },
      reqsPerStudent: { label: "Requests per Student" },
      sysTokens: { label: "System Prompt", tooltip: "The shared system instructions sent with every request." },
      ctxTokens: { label: "Shared Context (Book/Rubric)", tooltip: "Reference material shared across all students (e.g., the book or grading rubric)." },
      subTokens: { label: "Student Submission", tooltip: "The unique essay text for each student." },
      instTokens: { label: "Variable Instruction", tooltip: "The specific grading command for each turn." },
      outputTokens: { label: "Expected Output", tooltip: "Estimated output tokens per response." },
    },
    visualizerLabels: {
      system: "System Prompt",
      context: "Context/Rubric",
      submission: "Submission",
      instruction: "Instruction",
    },
  },
  "graf-literary": {
    label: "GRAF+ w/ Context",
    shortLabel: "GRAF+ w/ Context",
    description:
      "GRAF+ Literary Analysis with full source text attached — represents a use case where the entire text of an average novel (e.g., The Great Gatsby, ~60K tokens) is included as shared context for assessment-level grading.",
    strategyNote: null,
    submissionCacheable: true,
    conversational: false,
    progressiveSubmission: false,
    defaultSummarizationEnabled: false,
    defaultSummarySize: 500,
    defaultSensitivityParam: "ctxTokens",
    defaultCacheTTL: "5min",
    preset: {
      students: 30,
      reqsPerStudent: 5,
      sysTokens: 1000,
      ctxTokens: 60000,
      subTokens: 2000,
      instTokens: 200,
      outputTokens: 500,
    },
    fieldLabels: {
      students: { label: "Class Size (Students)" },
      reqsPerStudent: { label: "Requests per Student" },
      sysTokens: { label: "System Prompt", tooltip: "The shared system instructions sent with every request." },
      ctxTokens: { label: "Shared Context (Full Text)", tooltip: "The entire source text shared across all students (e.g., The Great Gatsby, ~60K tokens)." },
      subTokens: { label: "Student Submission", tooltip: "The unique essay text for each student." },
      instTokens: { label: "Variable Instruction", tooltip: "The specific grading command for each turn." },
      outputTokens: { label: "Expected Output", tooltip: "Estimated output tokens per response." },
    },
    visualizerLabels: {
      system: "System Prompt",
      context: "Full Text Context",
      submission: "Submission",
      instruction: "Instruction",
    },
  },
  "clarity-chat": {
    label: "Clarity Chat",
    shortLabel: "Clarity",
    description:
      "Simulate a writing-assistant chatbot workload and explore caching optimization levers.",
    strategyNote: null,
    submissionCacheable: false,
    conversational: true,
    progressiveSubmission: true,
    defaultSummarizationEnabled: false,
    defaultSummarySize: 500,
    defaultSensitivityParam: "ctxTokens",
    defaultCacheTTL: "1hour",
    preset: {
      students: 30,
      reqsPerStudent: 12,
      sysTokens: 1000,
      ctxTokens: 1000,
      subTokens: 2000,
      instTokens: 2000,
      outputTokens: 400,
    },
    fieldLabels: {
      students: { label: "Class Size (Students)" },
      reqsPerStudent: { label: "Messages per Student" },
      sysTokens: { label: "System Prompt", tooltip: "Writing assistant instructions and persona." },
      ctxTokens: { label: "Assignment Context", tooltip: "Assignment description, rubric, and reference materials (cacheable)." },
      subTokens: { label: "Student Text Length", tooltip: "Total token count of the student's completed paper. The simulation models progressive writing — the draft grows from 0 tokens on the first message to this value on the last." },
      instTokens: { label: "Chat History (Capped)", tooltip: "Recent conversation history, capped at last ~4-5 exchanges for cost control." },
      outputTokens: { label: "AI Response", tooltip: "Expected AI response length per message." },
    },
    visualizerLabels: {
      system: "System Prompt",
      context: "Assignment Context",
      submission: "Student Draft",
      instruction: "Chat History",
    },
  },
  "clarity-chat-xl": {
    label: "Clarity Chat XL",
    shortLabel: "Clarity XL",
    description:
      "Extended writing-assistant session — models a long chat where periodic summarization of chat history becomes the optimal cost strategy.",
    strategyNote: null,
    submissionCacheable: false,
    conversational: true,
    progressiveSubmission: true,
    defaultSummarizationEnabled: true,
    defaultSummarySize: 1000,
    defaultSensitivityParam: "reqsPerStudent",
    defaultCacheTTL: "1hour",
    preset: {
      students: 30,
      reqsPerStudent: 40,
      sysTokens: 1000,
      ctxTokens: 1000,
      subTokens: 1500,
      instTokens: 3650,
      outputTokens: 300,
    },
    fieldLabels: {
      students: { label: "Class Size (Students)" },
      reqsPerStudent: { label: "Messages per Student" },
      sysTokens: { label: "System Prompt", tooltip: "Writing assistant instructions and persona." },
      ctxTokens: { label: "Assignment Context", tooltip: "Assignment description and rubric (cacheable)." },
      subTokens: { label: "Student Text Length", tooltip: "Total token count of the student's completed paper. The simulation models progressive writing — the draft grows from 0 tokens on the first message to this value on the last." },
      instTokens: { label: "Chat History (Capped)", tooltip: "Recent conversation history cap — with a long session, periodic summarization becomes cost-effective." },
      outputTokens: { label: "AI Response", tooltip: "Expected AI response length per message." },
    },
    visualizerLabels: {
      system: "System Prompt",
      context: "Assignment Context",
      submission: "Student Draft",
      instruction: "Chat History",
    },
  },
  "interactive-ai": {
    label: "Interactive AI Assignment",
    shortLabel: "Interactive",
    description:
      "Simulate a character-interview assignment workload and explore caching optimization levers.",
    strategyNote: null,
    submissionCacheable: true,
    conversational: true,
    progressiveSubmission: false,
    defaultSummarizationEnabled: true,
    defaultSummarySize: 500,
    defaultSensitivityParam: "ctxTokens",
    defaultCacheTTL: "1hour",
    preset: {
      students: 30,
      reqsPerStudent: 20,
      sysTokens: 1000,
      ctxTokens: 50000,
      subTokens: 20,
      instTokens: 1660,
      outputTokens: 133,
    },
    fieldLabels: {
      students: { label: "Class Size (Students)" },
      reqsPerStudent: { label: "Interview Turns" },
      sysTokens: { label: "System Prompt", tooltip: "Character persona, interview rules, and behavioral instructions." },
      ctxTokens: { label: "Source Material", tooltip: "Textbook chapters, novel text, or primary sources shared across all students (cacheable)." },
      subTokens: { label: "Student Question", tooltip: "The student's interview question or prompt for the current turn." },
      instTokens: { label: "Chat History (Capped)", tooltip: "Recent interview exchange history, capped sliding window sent as fresh input." },
      outputTokens: { label: "AI Response", tooltip: "Expected AI response length per message." },
    },
    visualizerLabels: {
      system: "System Prompt",
      context: "Source Material",
      submission: "Question",
      instruction: "Conv. Context",
    },
  },
};

const DEFAULT_TEMPLATE: TemplateKey = "graf-simple";

const CHART_COLORS = {
  noCaching: "#f97316",
  cachePrefix: "#3b82f6",
  cacheSubmission: "#10b981",
  batch: "#a855f7",
  cacheRead: "#60a5fa",
  guardrails: "#6b7280",
  crossover: "#ef4444",
} as const;

// ---------------------------------------------------------------------------
// Parameter sensitivity chart configuration
// ---------------------------------------------------------------------------

const SENSITIVITY_SAMPLE_POINTS: Record<SensitivityParamKey, number[]> = {
  students: [5, 10, 15, 20, 30, 50, 75, 100, 150, 200],
  reqsPerStudent: [1, 5, 10, 20, 50, 75, 100, 150, 200],
  sysTokens: [100, 500, 1000, 2000, 5000, 10000],
  ctxTokens: [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000],
  subTokens: [100, 500, 1000, 2000, 5000, 10000, 20000],
  instTokens: [50, 200, 500, 1000, 2000, 5000, 10000],
  outputTokens: [100, 500, 1000, 2000, 5000, 10000],
};

function formatParamLabel(key: SensitivityParamKey, value: number): string {
  if (key === "students" || key === "reqsPerStudent") return `${value}`;
  return value >= 1000 ? `${value / 1000}K` : `${value}`;
}

const SENSITIVITY_INSIGHT: Record<SensitivityParamKey, string> = {
  students: "More students increase total requests, amplifying the savings from cache reads.",
  reqsPerStudent: "More requests per student increase cache-read utilization relative to the one-time cache write cost.",
  sysTokens: "System prompt tokens are cached, so larger system prompts modestly increase caching efficiency.",
  ctxTokens: "Larger shared contexts increase the caching benefit because more tokens are read from cache instead of re-sent as fresh input.",
  subTokens: "Submission tokens are sent fresh each request. In progressive-writing simulations, the draft grows linearly across messages, averaging half the final length.",
  instTokens: "Variable instruction tokens are always fresh input — changes here affect both strategies roughly equally.",
  outputTokens: "Output tokens are unaffected by input caching — changes affect both strategies equally.",
};

const STRATEGY_TIEBREAK: Record<string, number> = {
  "Per-Assignment Cache": 0, "Chat Sum. — Cache in Prefix": 0,
  "Per-Submission Cache": 1, "Chat Sum. — Cache Prefix": 1,
  "Batch Inference": 2,
  "No Caching": 3, "Chat Sum. — No Cache": 3,
};

// ---------------------------------------------------------------------------
// Cost calculation functions (unchanged)
// ---------------------------------------------------------------------------

interface CostBreakdown {
  cacheWrite: number;
  cacheRead: number;
  freshInput: number;
  output: number;
  guardrails: number;
  total: number;
}

interface SumStrategyBreakdown extends CostBreakdown {
  summarizationCalls: number;
}

function getCacheWritePrice(model: BedrockModel, cacheTTL: CacheTTL): number {
  const p = model.pricing;
  if (cacheTTL === "1hour" && p.cache_write_1hour_1k != null) {
    return p.cache_write_1hour_1k;
  }
  return p.cache_write_1k ?? 0;
}

function computeStrategyA(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  tierMultiplier: number,
  cacheTTL: CacheTTL
): CostBreakdown {
  const p = model.pricing;
  const pInput = p.input_1k * tierMultiplier;
  const pOutput = p.output_1k * tierMultiplier;
  const pWrite = getCacheWritePrice(model, cacheTTL) * tierMultiplier;
  const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;

  const totalRequests = students * reqsPerStudent;
  const cachedTokens = sysTokens + ctxTokens;
  const freshTokens = subTokens + instTokens;

  const cacheWrite = (cachedTokens / 1000) * pWrite;
  const cacheRead = (totalRequests - 1) * (cachedTokens / 1000) * pRead;
  const freshInput = totalRequests * (freshTokens / 1000) * pInput;
  const output = totalRequests * (outputTokens / 1000) * pOutput;

  return {
    cacheWrite,
    cacheRead,
    freshInput,
    output,
    guardrails: 0,
    total: cacheWrite + cacheRead + freshInput + output,
  };
}

function computeStrategyB(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  tierMultiplier: number,
  submissionCacheable: boolean,
  cacheTTL: CacheTTL
): CostBreakdown {
  const p = model.pricing;
  const pInput = p.input_1k * tierMultiplier;
  const pOutput = p.output_1k * tierMultiplier;
  const pWrite = getCacheWritePrice(model, cacheTTL) * tierMultiplier;
  const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;

  const totalRequests = students * reqsPerStudent;
  const sharedTokens = sysTokens + ctxTokens;
  const fullCachedTokens = sharedTokens + subTokens;

  let cacheWrite: number;
  let cacheRead: number;
  let freshInput: number;

  if (submissionCacheable) {
    // Submission is stable per-student: write once per student, read (reqs-1) times
    cacheWrite = students * (fullCachedTokens / 1000) * pWrite;
    cacheRead = students * (reqsPerStudent - 1) * (fullCachedTokens / 1000) * pRead;
    freshInput = totalRequests * (instTokens / 1000) * pInput;
  } else {
    // Submission changes every turn. Prefix caching is prefix-based, so:
    // - The shared portion (system + context) still matches the cached prefix → cache READ
    // - The submission is appended/changed → cache WRITE for those tokens each turn
    // First request: write full prefix. Subsequent: read shared, write submission.
    cacheWrite = (sharedTokens / 1000) * pWrite
      + totalRequests * (subTokens / 1000) * pWrite;
    cacheRead = (totalRequests - 1) * (sharedTokens / 1000) * pRead;
    freshInput = totalRequests * (instTokens / 1000) * pInput;
  }

  const output = totalRequests * (outputTokens / 1000) * pOutput;

  return {
    cacheWrite,
    cacheRead,
    freshInput,
    output,
    guardrails: 0,
    total: cacheWrite + cacheRead + freshInput + output,
  };
}

function computeNoCaching(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  tierMultiplier: number
): CostBreakdown {
  const p = model.pricing;
  const pInput = p.input_1k * tierMultiplier;
  const pOutput = p.output_1k * tierMultiplier;

  const totalRequests = students * reqsPerStudent;
  const allInputTokens = sysTokens + ctxTokens + subTokens + instTokens;

  const freshInput = totalRequests * (allInputTokens / 1000) * pInput;
  const output = totalRequests * (outputTokens / 1000) * pOutput;

  return {
    cacheWrite: 0,
    cacheRead: 0,
    freshInput,
    output,
    guardrails: 0,
    total: freshInput + output,
  };
}

function computeBatch(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  tierMultiplier: number
): CostBreakdown {
  const p = model.pricing;
  const pInput = (p.batch_input_1k ?? p.input_1k) * tierMultiplier;
  const pOutput = (p.batch_output_1k ?? p.output_1k) * tierMultiplier;

  const totalRequests = students * reqsPerStudent;
  const allInputTokens = sysTokens + ctxTokens + subTokens + instTokens;

  const freshInput = totalRequests * (allInputTokens / 1000) * pInput;
  const output = totalRequests * (outputTokens / 1000) * pOutput;

  return {
    cacheWrite: 0,
    cacheRead: 0,
    freshInput,
    output,
    guardrails: 0,
    total: freshInput + output,
  };
}

// ---------------------------------------------------------------------------
// Graduated chat history model
// ---------------------------------------------------------------------------

function computeTokensPerExchange(outputTokens: number): number {
  return Math.round(outputTokens * 1.25);
}

function computeAvgHistoryTokens(
  historyCap: number,
  reqsPerStudent: number,
  outputTokens: number
): number {
  if (reqsPerStudent <= 0 || historyCap <= 0) return 0;
  const tpe = computeTokensPerExchange(outputTokens);
  if (tpe <= 0) return historyCap;
  const rampCount = Math.min(Math.ceil(historyCap / tpe), reqsPerStudent);
  const rampSum = tpe * rampCount * (rampCount - 1) / 2;
  const cappedCount = Math.max(0, reqsPerStudent - rampCount);
  const cappedSum = historyCap * cappedCount;
  return (rampSum + cappedSum) / reqsPerStudent;
}

function computeHistoryAtTurn(
  turn: number,
  historyCap: number,
  outputTokens: number
): number {
  if (turn <= 1) return 0;
  const tpe = computeTokensPerExchange(outputTokens);
  return Math.min((turn - 1) * tpe, historyCap);
}

function getEffectiveInstTokens(
  instTokens: number,
  reqsPerStudent: number,
  outputTokens: number,
  conversational: boolean
): number {
  if (!conversational) return instTokens;
  return computeAvgHistoryTokens(instTokens, reqsPerStudent, outputTokens);
}

// ---------------------------------------------------------------------------
// Progressive submission model (student writes paper over the conversation)
// ---------------------------------------------------------------------------

function getEffectiveSubTokens(
  subTokens: number,
  reqsPerStudent: number,
  progressiveSubmission: boolean
): number {
  if (!progressiveSubmission || reqsPerStudent <= 1) return subTokens;
  return subTokens / 2;
}

function computeSubTokensAtTurn(
  turn: number,
  reqsPerStudent: number,
  subTokens: number,
  progressiveSubmission: boolean
): number {
  if (!progressiveSubmission || reqsPerStudent <= 1) return subTokens;
  if (turn <= 1) return 0;
  return Math.round(((turn - 1) / (reqsPerStudent - 1)) * subTokens);
}

// ---------------------------------------------------------------------------
// Summarization simulation
// ---------------------------------------------------------------------------

interface SummarizationSim {
  historyPerTurn: number[];
  summarizationTurns: number[];
  totalHistoryTokensSent: number;
  avgHistoryPerTurn: number;
  numSummarizations: number;
  turnsPerCycle: number;
}

function simulateSummarization(
  reqsPerStudent: number,
  historyCap: number,
  outputTokens: number,
  summarySize: number,
): SummarizationSim {
  const tpe = computeTokensPerExchange(outputTokens);
  if (tpe <= 0 || reqsPerStudent <= 0 || historyCap <= 0) {
    return { historyPerTurn: [], summarizationTurns: [], totalHistoryTokensSent: 0, avgHistoryPerTurn: 0, numSummarizations: 0, turnsPerCycle: 0 };
  }
  const historyPerTurn: number[] = [];
  const summarizationTurns: number[] = [];
  let history = 0;
  let total = 0;
  for (let t = 1; t <= reqsPerStudent; t++) {
    historyPerTurn.push(history);
    total += history;
    history += tpe;
    if (history >= historyCap && t < reqsPerStudent) {
      summarizationTurns.push(t);
      history = summarySize;
    }
  }
  const turnsPerCycle = tpe > 0 ? Math.ceil((historyCap - summarySize) / tpe) : 0;
  return {
    historyPerTurn,
    summarizationTurns,
    totalHistoryTokensSent: total,
    avgHistoryPerTurn: reqsPerStudent > 0 ? total / reqsPerStudent : 0,
    numSummarizations: summarizationTurns.length,
    turnsPerCycle,
  };
}

interface SummarizationCostResult {
  mainCallCost: number;
  summarizationCallCost: number;
  totalCost: number;
  numSummarizations: number;
  avgHistoryPerTurn: number;
  vsWindowSavings: number;
  vsWindowSavingsPct: number;
  turnsPerCycle: number;
  breakEvenK: number;
  summaryCachingViable: boolean;
  summaryCachingSavings: number;
}

function computeSummarizationCost(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  summarySize: number,
  tierMultiplier: number,
  cacheTTL: CacheTTL,
  windowCostTotal: number,
): SummarizationCostResult {
  const p = model.pricing;
  const pInput = p.input_1k * tierMultiplier;
  const pOutput = p.output_1k * tierMultiplier;
  const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;
  const pWrite = getCacheWritePrice(model, cacheTTL) * tierMultiplier;

  const sim = simulateSummarization(reqsPerStudent, instTokens, outputTokens, summarySize);
  const cachedPrefix = sysTokens + ctxTokens;
  const totalReqs = students * reqsPerStudent;

  const cacheWrite = (cachedPrefix / 1000) * pWrite;
  const cacheRead = (totalReqs - 1) * (cachedPrefix / 1000) * pRead;
  const freshInput = students * (sim.totalHistoryTokensSent / 1000) * pInput
    + totalReqs * (subTokens / 1000) * pInput;
  const output = totalReqs * (outputTokens / 1000) * pOutput;
  const mainCallCost = cacheWrite + cacheRead + freshInput + output;

  const perSumInput = (sysTokens + instTokens) / 1000 * pInput;
  const perSumOutput = (summarySize / 1000) * pOutput;
  const summarizationCallCost = students * sim.numSummarizations * (perSumInput + perSumOutput);

  const totalCost = mainCallCost + summarizationCallCost;
  const vsWindowSavings = windowCostTotal - totalCost;
  const vsWindowSavingsPct = windowCostTotal > 0 ? (vsWindowSavings / windowCostTotal) * 100 : 0;

  const denominator = summarySize * (pInput - pRead);
  const breakEvenK = denominator > 0
    ? (cachedPrefix + summarySize) * (pWrite - pRead) / denominator
    : Infinity;
  const summaryCachingViable = sim.turnsPerCycle >= breakEvenK;

  let summaryCachingSavings = 0;
  if (sim.numSummarizations > 0 && sim.turnsPerCycle > 0) {
    const K = sim.turnsPerCycle;
    const perCycleFresh = K * (cachedPrefix / 1000) * pRead + K * (summarySize / 1000) * pInput;
    const perCycleCached = ((cachedPrefix + summarySize) / 1000) * pWrite
      + (K - 1) * ((cachedPrefix + summarySize) / 1000) * pRead;
    summaryCachingSavings = students * sim.numSummarizations * (perCycleFresh - perCycleCached);
  }

  return {
    mainCallCost,
    summarizationCallCost,
    totalCost,
    numSummarizations: sim.numSummarizations,
    avgHistoryPerTurn: sim.avgHistoryPerTurn,
    vsWindowSavings,
    vsWindowSavingsPct,
    turnsPerCycle: sim.turnsPerCycle,
    breakEvenK,
    summaryCachingViable,
    summaryCachingSavings,
  };
}

// ---------------------------------------------------------------------------
// Summarization strategy compute functions (for strategy cards)
// ---------------------------------------------------------------------------

function computeSumNoCaching(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  summarySize: number,
  tierMultiplier: number,
): SumStrategyBreakdown {
  const p = model.pricing;
  const pInput = p.input_1k * tierMultiplier;
  const pOutput = p.output_1k * tierMultiplier;

  const sim = simulateSummarization(reqsPerStudent, instTokens, outputTokens, summarySize);
  const totalReqs = students * reqsPerStudent;

  const fixedPerReq = sysTokens + ctxTokens + subTokens;
  const freshInput = totalReqs * (fixedPerReq / 1000) * pInput
    + students * (sim.totalHistoryTokensSent / 1000) * pInput;
  const output = totalReqs * (outputTokens / 1000) * pOutput;

  const perSumInput = (sysTokens + instTokens) / 1000 * pInput;
  const perSumOutput = (summarySize / 1000) * pOutput;
  const summarizationCalls = students * sim.numSummarizations * (perSumInput + perSumOutput);

  return {
    cacheWrite: 0,
    cacheRead: 0,
    freshInput,
    output,
    guardrails: 0,
    summarizationCalls,
    total: freshInput + output + summarizationCalls,
  };
}

function computeSumCacheAssessment(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  summarySize: number,
  tierMultiplier: number,
  cacheTTL: CacheTTL,
): SumStrategyBreakdown {
  const p = model.pricing;
  const pInput = p.input_1k * tierMultiplier;
  const pOutput = p.output_1k * tierMultiplier;
  const pWrite = getCacheWritePrice(model, cacheTTL) * tierMultiplier;
  const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;

  const sim = simulateSummarization(reqsPerStudent, instTokens, outputTokens, summarySize);
  const cachedPrefix = sysTokens + ctxTokens;
  const totalReqs = students * reqsPerStudent;

  const cacheWrite = (cachedPrefix / 1000) * pWrite;
  const cacheRead = (totalReqs - 1) * (cachedPrefix / 1000) * pRead;
  const freshInput = students * (sim.totalHistoryTokensSent / 1000) * pInput
    + totalReqs * (subTokens / 1000) * pInput;
  const output = totalReqs * (outputTokens / 1000) * pOutput;

  const perSumInput = (sysTokens + instTokens) / 1000 * pInput;
  const perSumOutput = (summarySize / 1000) * pOutput;
  const summarizationCalls = students * sim.numSummarizations * (perSumInput + perSumOutput);

  return {
    cacheWrite,
    cacheRead,
    freshInput,
    output,
    guardrails: 0,
    summarizationCalls,
    total: cacheWrite + cacheRead + freshInput + output + summarizationCalls,
  };
}

function computeSumCacheSummary(
  model: BedrockModel,
  students: number,
  reqsPerStudent: number,
  sysTokens: number,
  ctxTokens: number,
  subTokens: number,
  instTokens: number,
  outputTokens: number,
  summarySize: number,
  tierMultiplier: number,
  cacheTTL: CacheTTL,
): SumStrategyBreakdown {
  const p = model.pricing;
  const pInput = p.input_1k * tierMultiplier;
  const pOutput = p.output_1k * tierMultiplier;
  const pWrite = getCacheWritePrice(model, cacheTTL) * tierMultiplier;
  const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;

  const sim = simulateSummarization(reqsPerStudent, instTokens, outputTokens, summarySize);
  const assessmentPrefix = sysTokens + ctxTokens;
  const fullPrefix = assessmentPrefix + summarySize;
  const totalReqs = students * reqsPerStudent;

  let perStudentCacheWrite = 0;
  let perStudentCacheRead = 0;
  let perStudentFreshInput = 0;

  const sumTurns = new Set(sim.summarizationTurns);
  let hasSummary = false;

  for (let t = 1; t <= reqsPerStudent; t++) {
    const history = sim.historyPerTurn[t - 1] ?? 0;

    if (t > 1 && sumTurns.has(t - 1)) {
      hasSummary = true;
    }

    const prefix = hasSummary ? fullPrefix : assessmentPrefix;

    if (t === 1 || (hasSummary && sumTurns.has(t - 1))) {
      perStudentCacheWrite += (prefix / 1000) * pWrite;
    } else {
      perStudentCacheRead += (prefix / 1000) * pRead;
    }

    const freshHistory = hasSummary ? Math.max(0, history - summarySize) : history;
    perStudentFreshInput += ((subTokens + freshHistory) / 1000) * pInput;
  }

  const sharedPrefixWriteCorrection = (students > 1)
    ? (students - 1) * (assessmentPrefix / 1000) * pWrite
    : 0;
  const sharedPrefixReadCorrection = (students > 1)
    ? (students - 1) * (assessmentPrefix / 1000) * pRead
    : 0;

  const cacheWrite = students * perStudentCacheWrite - sharedPrefixWriteCorrection;
  const cacheRead = students * perStudentCacheRead + sharedPrefixReadCorrection;
  const freshInput = students * perStudentFreshInput;
  const output = totalReqs * (outputTokens / 1000) * pOutput;

  const perSumInput = (sysTokens + instTokens) / 1000 * pInput;
  const perSumOutput = (summarySize / 1000) * pOutput;
  const summarizationCalls = students * sim.numSummarizations * (perSumInput + perSumOutput);

  return {
    cacheWrite,
    cacheRead,
    freshInput,
    output,
    guardrails: 0,
    summarizationCalls,
    total: cacheWrite + cacheRead + freshInput + output + summarizationCalls,
  };
}

const CHARS_PER_TOKEN = 4;
const TOKENS_PER_WORD = 4 / 3;
const WORDS_PER_TOKEN = 3 / 4;
const GUARDRAILS_COST_PER_1K_UNITS = 0.15;

function computeGuardrailsCost(
  totalRequests: number,
  studentInputTokensPerRequest: number,
  outputTokensPerRequest: number
): number {
  const evaluatedChars = (studentInputTokensPerRequest + outputTokensPerRequest) * CHARS_PER_TOKEN;
  const textUnits = evaluatedChars / 1000;
  return totalRequests * (textUnits / 1000) * GUARDRAILS_COST_PER_1K_UNITS;
}

function formatCost(value: number): string {
  if (value < 0) return `-${formatCost(-value)}`;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkloadSimulator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pricingData = getPricingData();

  const cachingModels = useMemo(
    () => pricingData.models.filter((m) => m.constraints.supports_caching),
    [pricingData]
  );
  const nonCachingModels = useMemo(
    () => pricingData.models.filter((m) => !m.constraints.supports_caching),
    [pricingData]
  );

  // --- Template state ---
  const [simulationTemplate, setSimulationTemplate] = useState<TemplateKey>(DEFAULT_TEMPLATE);
  const activeTemplateMeta = TEMPLATES[simulationTemplate];
  const labels = activeTemplateMeta.fieldLabels;
  const vizLabels = activeTemplateMeta.visualizerLabels;

  // --- Simulation parameter state ---
  const PREFERRED_DEFAULT_MODEL = "anthropic.claude-sonnet-4-6-20260115-v1:0";
  const [selectedModelId, setSelectedModelId] = useState(() => {
    const preferred = pricingData.models.find((m) => m.id === PREFERRED_DEFAULT_MODEL);
    if (preferred) return preferred.id;
    return cachingModels[0]?.id ?? pricingData.models[0].id;
  });
  const defaultPreset = TEMPLATES[DEFAULT_TEMPLATE].preset;
  const [students, setStudents] = useState(defaultPreset.students);
  const [reqsPerStudent, setReqsPerStudent] = useState(defaultPreset.reqsPerStudent);
  const [sysTokens, setSysTokens] = useState(defaultPreset.sysTokens);
  const [ctxTokens, setCtxTokens] = useState(defaultPreset.ctxTokens);
  const [subTokens, setSubTokens] = useState(defaultPreset.subTokens);
  const [instTokens, setInstTokens] = useState(defaultPreset.instTokens);
  const [outputTokens, setOutputTokens] = useState(defaultPreset.outputTokens);
  const [cacheTTL, setCacheTTL] = useState<CacheTTL>(TEMPLATES[DEFAULT_TEMPLATE].defaultCacheTTL);
  const [guardrailsEnabled, setGuardrailsEnabled] = useState(false);
  const [pricingTier, setPricingTier] = useState<"standard" | "priority" | "flex">("standard");
  const [batchEnabled, setBatchEnabled] = useState(true);
  const [sensitivityParam, setSensitivityParam] = useState<SensitivityParamKey>("ctxTokens");
  const [paramChartZoomDomain, setParamChartZoomDomain] = useState<[number, number] | null>(null);
  const paramChartContainerRef = useRef<HTMLDivElement>(null);
  const [inputMode, setInputMode] = useState<InputMode>("simple");
  const [summarizationEnabled, setSummarizationEnabled] = useState(false);
  const [summarySize, setSummarySize] = useState(500);
  const [tornadoSumStrategy, setTornadoSumStrategy] = useState<"cacheAssessment" | "cacheSummary">("cacheAssessment");

  // --- Template selection handler ---
  // Clicking a new template switches to it and resets parameters.
  // Clicking the already-active template resets its parameters to defaults.
  const resetToTemplate = useCallback((tmpl: TemplateKey) => {
    const t = TEMPLATES[tmpl];
    const p = t.preset;
    setStudents(p.students);
    setReqsPerStudent(p.reqsPerStudent);
    setSysTokens(p.sysTokens);
    setCtxTokens(p.ctxTokens);
    setSubTokens(p.subTokens);
    setInstTokens(p.instTokens);
    setOutputTokens(p.outputTokens);
    setCacheTTL(t.defaultCacheTTL);
    setSummarizationEnabled(t.defaultSummarizationEnabled);
    setSummarySize(t.defaultSummarySize);
    setSensitivityParam(t.defaultSensitivityParam);
  }, []);

  const handleTemplateChange = useCallback(
    (value: string) => {
      if (value) {
        const tmpl = value as TemplateKey;
        setSimulationTemplate(tmpl);
        resetToTemplate(tmpl);
      } else {
        resetToTemplate(simulationTemplate);
      }
    },
    [simulationTemplate, resetToTemplate]
  );

  useEffect(() => {
    const tmplParam = searchParams.get("template");
    if (tmplParam && tmplParam in TEMPLATES) {
      const key = tmplParam as TemplateKey;
      setSimulationTemplate(key);
      resetToTemplate(key);
      searchParams.delete("template");
      setSearchParams(searchParams, { replace: true });
      window.scrollTo(0, 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Input mode ---
  const handleInputModeChange = useCallback(
    (v: string) => {
      if (!v) return;
      const mode = v as InputMode;
      setInputMode(mode);
      if (mode === "simple") {
        setSysTokens(activeTemplateMeta.preset.sysTokens);
      }
    },
    [activeTemplateMeta]
  );

  const assignmentWords = Math.round((sysTokens + ctxTokens) * WORDS_PER_TOKEN);
  const studentTextWords = Math.round((subTokens + instTokens) * WORDS_PER_TOKEN);
  const aiResponseWords = Math.round(outputTokens * WORDS_PER_TOKEN);

  const handleAssignmentWordsChange = useCallback(
    (words: number) => {
      const totalTokens = Math.round(words * TOKENS_PER_WORD);
      const defaultSys = activeTemplateMeta.preset.sysTokens;
      setSysTokens(defaultSys);
      setCtxTokens(Math.max(0, totalTokens - defaultSys));
    },
    [activeTemplateMeta]
  );

  const handleStudentTextWordsChange = useCallback(
    (words: number) => {
      const totalTokens = Math.round(words * TOKENS_PER_WORD);
      const preset = activeTemplateMeta.preset;
      const subRatio = preset.subTokens / (preset.subTokens + preset.instTokens);
      const newSub = Math.round(totalTokens * subRatio);
      setSubTokens(Math.max(100, newSub));
      setInstTokens(Math.max(50, totalTokens - newSub));
    },
    [activeTemplateMeta]
  );

  const handleStudentTextWordsOnlyChange = useCallback(
    (words: number) => {
      setSubTokens(Math.max(5, Math.round(words * TOKENS_PER_WORD)));
    },
    []
  );

  const handleChatHistoryWordsChange = useCallback(
    (words: number) => {
      setInstTokens(Math.max(50, Math.round(words * TOKENS_PER_WORD)));
    },
    []
  );

  const handleAiResponseWordsChange = useCallback(
    (words: number) => {
      setOutputTokens(Math.max(100, Math.round(words * TOKENS_PER_WORD)));
    },
    []
  );

  // --- Derived model state ---
  const selectedModel = useMemo(
    () => pricingData.models.find((m) => m.id === selectedModelId) ?? pricingData.models[0],
    [pricingData, selectedModelId]
  );
  const supportsCaching = selectedModel.constraints.supports_caching;
  const supportsBatch = selectedModel.constraints.supports_batch && selectedModel.pricing.batch_input_1k != null;
  const hasMissingCachePrices = supportsCaching && (selectedModel.pricing.cache_write_1k === null || selectedModel.pricing.cache_read_1k === null);
  const supportsTiers = selectedModel.constraints.supported_tiers.length > 1;
  const effectiveTier = selectedModel.constraints.supported_tiers.includes(pricingTier) ? pricingTier : "standard";
  const tierMultiplier = effectiveTier === "priority" ? 1.75 : effectiveTier === "flex" ? 0.5 : 1.0;
  const isAmazonModel = selectedModel.provider === "Amazon";
  const batchAvailableForTier = !isAmazonModel || effectiveTier === "standard";
  const batchIncluded = supportsBatch && batchEnabled && batchAvailableForTier;

  const supports1Hour = selectedModel.constraints.supports_1hour_cache;
  const effectiveCacheTTL: CacheTTL = cacheTTL === "1hour" && supports1Hour ? "1hour" : "5min";

  const totalRequests = students * reqsPerStudent;

  // --- Template-driven flags ---
  const submissionCacheable = activeTemplateMeta.submissionCacheable;
  const isConversational = activeTemplateMeta.conversational;
  const isProgressiveSubmission = activeTemplateMeta.progressiveSubmission;

  const effectiveInstTokens = getEffectiveInstTokens(
    instTokens, reqsPerStudent, outputTokens, isConversational
  );
  const effectiveSubTokens = useMemo(
    () => getEffectiveSubTokens(subTokens, reqsPerStudent, isProgressiveSubmission),
    [subTokens, reqsPerStudent, isProgressiveSubmission]
  );
  const tokensPerExchange = computeTokensPerExchange(outputTokens);
  const turnsUntilCap = isConversational && tokensPerExchange > 0
    ? Math.ceil(instTokens / tokensPerExchange)
    : 0;
  const chatHistoryWords = Math.round(instTokens * WORDS_PER_TOKEN);
  const studentTextWordsOnly = Math.round(subTokens * WORDS_PER_TOKEN);

  const displayMode: DisplayMode = useMemo(() => {
    if (simulationTemplate === "clarity-chat" || simulationTemplate === "clarity-chat-xl" || simulationTemplate === "interactive-ai") {
      return "caching-insights";
    }
    return "strategy-comparison";
  }, [simulationTemplate]);

  const strategyNote = activeTemplateMeta.strategyNote;
  const pageDescription = activeTemplateMeta.description;

  // --- Cost calculations ---
  const results = useMemo(() => {
    const guardrailsCost = guardrailsEnabled
      ? computeGuardrailsCost(totalRequests, effectiveSubTokens, outputTokens)
      : 0;

    const noCaching = computeNoCaching(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier
    );
    noCaching.guardrails = guardrailsCost;
    noCaching.total += guardrailsCost;

    let batch: CostBreakdown | null = null;
    if (batchIncluded) {
      batch = computeBatch(
        selectedModel, students, reqsPerStudent,
        sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier
      );
      batch.guardrails = guardrailsCost;
      batch.total += guardrailsCost;
    }

    if (!supportsCaching) {
      return { noCaching, strategyA: null, strategyB: null, batch };
    }

    const strategyA = computeStrategyA(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier,
      effectiveCacheTTL
    );
    strategyA.guardrails = guardrailsCost;
    strategyA.total += guardrailsCost;

    const strategyB = computeStrategyB(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, effectiveInstTokens, outputTokens, tierMultiplier,
      submissionCacheable, effectiveCacheTTL
    );
    strategyB.guardrails = guardrailsCost;
    strategyB.total += guardrailsCost;

    return { noCaching, strategyA, strategyB, batch };
  }, [selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens, supportsCaching, batchIncluded, guardrailsEnabled, totalRequests, effectiveTier, tierMultiplier, submissionCacheable, effectiveCacheTTL, isConversational, effectiveInstTokens]);

  type WinnerKey = "noCaching" | "A" | "B" | "batch";

  const winnerLabels: Record<WinnerKey, string> = {
    noCaching: "No Caching",
    A: "Per-Assignment Cache",
    B: "Per-Submission Cache",
    batch: "Batch Inference",
  };

  const { winner, winnerSavings } = useMemo(() => {
    const candidates: { key: WinnerKey; total: number }[] = [
      { key: "noCaching", total: results.noCaching.total },
    ];
    if (results.strategyA) candidates.push({ key: "A", total: results.strategyA.total });
    if (results.strategyB) candidates.push({ key: "B", total: results.strategyB.total });
    if (results.batch) candidates.push({ key: "batch", total: results.batch.total });

    if (candidates.length <= 1) return { winner: null as WinnerKey | null, winnerSavings: null };

    candidates.sort((a, b) => a.total - b.total);
    const best = candidates[0];
    const worst = candidates[candidates.length - 1];
    const diff = worst.total - best.total;
    const pct = worst.total > 0 ? (diff / worst.total) * 100 : 0;

    return {
      winner: best.key,
      winnerSavings: { amount: diff, percentage: pct, vsLabel: winnerLabels[worst.key] },
    };
  }, [results]);

  const chartData = useMemo(() => {
    const data: { name: string; "Cache Write": number; "Cache Read": number; "Fresh Input": number; Output: number; Guardrails: number }[] = [];

    data.push({
      name: "No Caching",
      "Cache Write": 0,
      "Cache Read": 0,
      "Fresh Input": results.noCaching.freshInput,
      Output: results.noCaching.output,
      Guardrails: results.noCaching.guardrails,
    });

    if (results.strategyA) {
      data.push({
        name: displayMode === "strategy-comparison" ? "Per-Assignment" : "With Caching",
        "Cache Write": results.strategyA.cacheWrite,
        "Cache Read": results.strategyA.cacheRead,
        "Fresh Input": results.strategyA.freshInput,
        Output: results.strategyA.output,
        Guardrails: results.strategyA.guardrails,
      });
    }

    if (results.strategyB && displayMode === "strategy-comparison") {
      data.push({
        name: "Per-Submission",
        "Cache Write": results.strategyB.cacheWrite,
        "Cache Read": results.strategyB.cacheRead,
        "Fresh Input": results.strategyB.freshInput,
        Output: results.strategyB.output,
        Guardrails: results.strategyB.guardrails,
      });
    }

    if (results.batch) {
      data.push({
        name: "Batch",
        "Cache Write": 0,
        "Cache Read": 0,
        "Fresh Input": results.batch.freshInput,
        Output: results.batch.output,
        Guardrails: results.batch.guardrails,
      });
    }

    return data;
  }, [results, displayMode]);

  // --- Caching-insights: savings vs no caching ---
  const insightsSavings = useMemo(() => {
    if (displayMode !== "caching-insights" || !results.strategyA) return null;
    const diff = results.noCaching.total - results.strategyA.total;
    const pct = results.noCaching.total > 0 ? (diff / results.noCaching.total) * 100 : 0;
    return { amount: diff, percentage: pct };
  }, [displayMode, results]);

  // --- Summarization analysis (conversational templates) ---
  const summarizationResult = useMemo(() => {
    if (!isConversational || !summarizationEnabled || !results.strategyA) return null;
    return computeSummarizationCost(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
      summarySize, tierMultiplier, effectiveCacheTTL,
      results.strategyA.total,
    );
  }, [isConversational, summarizationEnabled, selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens, summarySize, tierMultiplier, effectiveCacheTTL, results]);

  // --- Summarization strategy comparison (three variants) ---
  const sumStrategies = useMemo(() => {
    if (!isConversational || !summarizationEnabled) return null;
    const guardrailsCost = guardrailsEnabled
      ? computeGuardrailsCost(totalRequests, effectiveSubTokens, outputTokens)
      : 0;

    const noCaching = computeSumNoCaching(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
      summarySize, tierMultiplier
    );
    noCaching.guardrails = guardrailsCost;
    noCaching.total += guardrailsCost;

    const cacheAssessment = supportsCaching ? (() => {
      const r = computeSumCacheAssessment(
        selectedModel, students, reqsPerStudent,
        sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
        summarySize, tierMultiplier, effectiveCacheTTL
      );
      r.guardrails = guardrailsCost;
      r.total += guardrailsCost;
      return r;
    })() : null;

    const cacheSummary = supportsCaching ? (() => {
      const r = computeSumCacheSummary(
        selectedModel, students, reqsPerStudent,
        sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
        summarySize, tierMultiplier, effectiveCacheTTL
      );
      r.guardrails = guardrailsCost;
      r.total += guardrailsCost;
      return r;
    })() : null;

    return { noCaching, cacheAssessment, cacheSummary };
  }, [isConversational, summarizationEnabled, selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens, summarySize, tierMultiplier, effectiveCacheTTL, supportsCaching, guardrailsEnabled, totalRequests]);

  type SumWinnerKey = "sumNoCaching" | "sumCacheAssessment" | "sumCacheSummary";
  const sumWinnerLabels: Record<SumWinnerKey, string> = {
    sumNoCaching: "No Caching",
    sumCacheAssessment: "Cache Prefix",
    sumCacheSummary: "Cache Prefix + Chat Summary",
  };

  const { sumWinner, sumWinnerSavings } = useMemo(() => {
    if (!sumStrategies) return { sumWinner: null as SumWinnerKey | null, sumWinnerSavings: null };
    const candidates: { key: SumWinnerKey; total: number }[] = [
      { key: "sumNoCaching", total: sumStrategies.noCaching.total },
    ];
    if (sumStrategies.cacheAssessment) candidates.push({ key: "sumCacheAssessment", total: sumStrategies.cacheAssessment.total });
    if (sumStrategies.cacheSummary) candidates.push({ key: "sumCacheSummary", total: sumStrategies.cacheSummary.total });

    if (candidates.length <= 1) return { sumWinner: null as SumWinnerKey | null, sumWinnerSavings: null };

    candidates.sort((a, b) => a.total - b.total);
    const best = candidates[0];
    const worst = candidates[candidates.length - 1];
    const diff = worst.total - best.total;
    const pct = worst.total > 0 ? (diff / worst.total) * 100 : 0;

    return {
      sumWinner: best.key,
      sumWinnerSavings: { amount: diff, percentage: pct, vsLabel: sumWinnerLabels[worst.key] },
    };
  }, [sumStrategies]);

  // --- Optimal chat history size for Cache Prefix + Chat Summary ---
  const optimalChatHistory = useMemo(() => {
    if (!isConversational || !summarizationEnabled || !supportsCaching) return null;
    const guardrailsCost = guardrailsEnabled
      ? computeGuardrailsCost(totalRequests, effectiveSubTokens, outputTokens)
      : 0;
    const minCandidate = summarySize + 100;
    const maxCandidate = 10000;
    const step = 50;

    let bestTokens = instTokens;
    let bestTotal = Infinity;

    for (let candidate = minCandidate; candidate <= maxCandidate; candidate += step) {
      const r = computeSumCacheSummary(
        selectedModel, students, reqsPerStudent,
        sysTokens, ctxTokens, effectiveSubTokens, candidate, outputTokens,
        summarySize, tierMultiplier, effectiveCacheTTL
      );
      const total = r.total + guardrailsCost;
      if (total < bestTotal) {
        bestTotal = total;
        bestTokens = candidate;
      }
    }

    const currentR = computeSumCacheSummary(
      selectedModel, students, reqsPerStudent,
      sysTokens, ctxTokens, effectiveSubTokens, instTokens, outputTokens,
      summarySize, tierMultiplier, effectiveCacheTTL
    );
    const currentTotal = currentR.total + guardrailsCost;
    const savings = currentTotal - bestTotal;
    const savingsPct = currentTotal > 0 ? (savings / currentTotal) * 100 : 0;

    return { optimalTokens: bestTokens, optimalTotal: bestTotal, currentTotal, savings, savingsPct };
  }, [isConversational, summarizationEnabled, supportsCaching, guardrailsEnabled, totalRequests, effectiveSubTokens, outputTokens, summarySize, instTokens, selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, tierMultiplier, effectiveCacheTTL]);

  // --- Summarization per-turn data (for chart overlay) ---
  const summarizationPerTurnData = useMemo(() => {
    if (!isConversational || !summarizationEnabled || reqsPerStudent < 2) return [];
    const sim = simulateSummarization(reqsPerStudent, instTokens, outputTokens, summarySize);
    const p = selectedModel.pricing;
    const pInput = p.input_1k * tierMultiplier;
    const pOutput = p.output_1k * tierMultiplier;
    const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;
    const cachedPrefix = sysTokens + ctxTokens;

    return sim.historyPerTurn.map((history, i) => {
      const turnSub = computeSubTokensAtTurn(i + 1, reqsPerStudent, subTokens, isProgressiveSubmission);
      const freshTokens = turnSub + history;
      const withCachingCost = supportsCaching
        ? (cachedPrefix / 1000) * pRead + (freshTokens / 1000) * pInput + (outputTokens / 1000) * pOutput
        : ((cachedPrefix + freshTokens) / 1000) * pInput + (outputTokens / 1000) * pOutput;
      return {
        turn: i + 1,
        cost: withCachingCost,
        historyTokens: history,
        isSummarizationTurn: sim.summarizationTurns.includes(i + 1),
      };
    });
  }, [isConversational, summarizationEnabled, reqsPerStudent, instTokens, outputTokens, summarySize, sysTokens, ctxTokens, subTokens, selectedModel, tierMultiplier, supportsCaching, isProgressiveSubmission]);

  // --- Caching benefit: parameter sensitivity data ---
  // Varies the selected parameter to show how each strategy's cost changes.
  const paramSensitivityData = useMemo(() => {
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

    const rawData = samplePoints.map((val) => {
      const args = {
        students, reqsPerStudent, sysTokens, ctxTokens, subTokens, instTokens, outputTokens,
        [sensitivityParam]: val,
      };
      const effInst = getEffectiveInstTokens(args.instTokens, args.reqsPerStudent, args.outputTokens, isConversational);
      const effSub = getEffectiveSubTokens(args.subTokens, args.reqsPerStudent, isProgressiveSubmission);
      const adjustedTotalReqs = args.students * args.reqsPerStudent;
      const gr = guardrailsEnabled
        ? computeGuardrailsCost(adjustedTotalReqs, effSub, args.outputTokens)
        : 0;

      const noCaching = computeNoCaching(
        selectedModel, args.students, args.reqsPerStudent,
        args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens,
        tierMultiplier
      );
      const stratA = computeStrategyA(
        selectedModel, args.students, args.reqsPerStudent,
        args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens,
        tierMultiplier, effectiveCacheTTL
      );

      const isSumMode = summarizationEnabled && isConversational;

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
        point["No Caching"] = noCaching.total + gr;
        point["Per-Assignment Cache"] = stratA.total + gr;
      }

      if (displayMode === "strategy-comparison") {
        const stratB = computeStrategyB(
          selectedModel, args.students, args.reqsPerStudent,
          args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens,
          tierMultiplier, submissionCacheable, effectiveCacheTTL
        );
        point["Per-Submission Cache"] = stratB.total + gr;

        if (batchIncluded) {
          const batch = computeBatch(
            selectedModel, args.students, args.reqsPerStudent,
            args.sysTokens, args.ctxTokens, effSub, effInst, args.outputTokens,
            tierMultiplier
          );
          point["Batch Inference"] = batch.total + gr;
        }
      }

      const costKeys = isSumMode
        ? ["Chat Sum. — No Cache", "Chat Sum. — Cache Prefix", "Chat Sum. — Cache in Prefix"] as const
        : ["No Caching", "Per-Assignment Cache"] as const;
      const costs: [string, number][] = costKeys
        .filter((k) => point[k] != null)
        .map((k) => [k, point[k] as number]);
      if (point["Per-Submission Cache"] != null) {
        costs.push(["Per-Submission Cache", point["Per-Submission Cache"] as number]);
      }
      if (point["Batch Inference"] != null) {
        costs.push(["Batch Inference", point["Batch Inference"] as number]);
      }
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

      return point;
    });

    const stabKeys = (summarizationEnabled && isConversational)
      ? ["Chat Sum. — No Cache", "Chat Sum. — Cache Prefix", "Chat Sum. — Cache in Prefix"]
      : ["No Caching", "Per-Assignment Cache"];
    let ri = 0;
    while (ri < rawData.length) {
      const pt = rawData[ri];
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
          const p2 = rawData[rj];
          const s2 = allKeys
            .filter(k => p2[k] != null)
            .map(k => p2[k] as number)
            .sort((a, b) => a - b);
          if (s2.length < 2 || s2[1] - s2[0] >= 0.005) break;
          rj++;
        }
        const resolved = rj < rawData.length ? rawData[rj] : rawData[rawData.length - 1];
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
  }, [supportsCaching, sensitivityParam, selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, subTokens, instTokens, outputTokens, tierMultiplier, effectiveCacheTTL, guardrailsEnabled, submissionCacheable, batchIncluded, isConversational, isProgressiveSubmission, displayMode, summarizationEnabled, summarySize]);

  const paramCrossoverLabels = useMemo(() => {
    const crossovers: number[] = [];
    for (let i = 0; i < paramSensitivityData.length - 1; i++) {
      if (paramSensitivityData[i].winner !== paramSensitivityData[i + 1].winner) {
        crossovers.push(paramSensitivityData[i + 1].value as number);
      }
    }
    return crossovers;
  }, [paramSensitivityData]);

  useEffect(() => { setParamChartZoomDomain(null); }, [sensitivityParam]);

  const visibleParamData = useMemo(() => {
    if (!paramChartZoomDomain || paramSensitivityData.length < 2) return paramSensitivityData;
    const [zMin, zMax] = paramChartZoomDomain;
    let startIdx = 0;
    let endIdx = paramSensitivityData.length - 1;
    for (let i = 0; i < paramSensitivityData.length; i++) {
      if ((paramSensitivityData[i].value as number) >= zMin) { startIdx = Math.max(0, i - 1); break; }
    }
    for (let i = paramSensitivityData.length - 1; i >= 0; i--) {
      if ((paramSensitivityData[i].value as number) <= zMax) { endIdx = Math.min(paramSensitivityData.length - 1, i + 1); break; }
    }
    return paramSensitivityData.slice(startIdx, endIdx + 1);
  }, [paramSensitivityData, paramChartZoomDomain]);

  useEffect(() => {
    const el = paramChartContainerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (paramSensitivityData.length < 2) return;
      e.preventDefault();
      const dataMin = paramSensitivityData[0].value as number;
      const dataMax = paramSensitivityData[paramSensitivityData.length - 1].value as number;
      const fullRange = dataMax - dataMin;
      if (fullRange <= 0) return;
      setParamChartZoomDomain(prev => {
        const currentMin = prev?.[0] ?? dataMin;
        const currentMax = prev?.[1] ?? dataMax;
        const currentRange = currentMax - currentMin;
        const rect = el.getBoundingClientRect();
        const chartLeft = rect.left + 65;
        const chartWidth = rect.right - 5 - chartLeft;
        const cursorRatio = Math.max(0, Math.min(1, (e.clientX - chartLeft) / chartWidth));
        const cursorValue = currentMin + cursorRatio * currentRange;
        const zoomFactor = e.deltaY > 0 ? 1.3 : 0.7;
        let newRange = Math.min(fullRange, Math.max(fullRange * 0.05, currentRange * zoomFactor));
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
  }, [paramSensitivityData]);

  // --- Caching-insights: sensitivity / tornado chart data ---
  const sensitivityData = useMemo(() => {
    if (displayMode !== "caching-insights") return [];

    const isSumMode = summarizationEnabled && isConversational;
    const baseline = isSumMode
      ? (sumStrategies
        ? (tornadoSumStrategy === "cacheSummary"
            ? (sumStrategies.cacheSummary?.total ?? sumStrategies.cacheAssessment?.total ?? sumStrategies.noCaching.total)
            : (sumStrategies.cacheAssessment?.total ?? sumStrategies.noCaching.total))
        : 0)
      : (results.strategyA?.total ?? 0);
    if (baseline === 0) return [];

    const halfFloor = (val: number, min: number) => Math.max(min, Math.round(val / 2));

    const params: { key: string; label: string; current: number; half: number; double: number }[] = [
      { key: "students", label: "Class Size", current: students, half: halfFloor(students, 1), double: students * 2 },
      { key: "reqs", label: activeTemplateMeta.fieldLabels.reqsPerStudent.label, current: reqsPerStudent, half: halfFloor(reqsPerStudent, 1), double: reqsPerStudent * 2 },
      { key: "ctx", label: activeTemplateMeta.fieldLabels.ctxTokens.label, current: ctxTokens, half: Math.max(Math.min(500, ctxTokens - 1), Math.round(ctxTokens / 2)), double: ctxTokens * 2 },
      { key: "sub", label: activeTemplateMeta.fieldLabels.subTokens.label, current: subTokens, half: Math.max(1, Math.round(subTokens / 2)), double: subTokens * 2 },
      { key: "inst", label: activeTemplateMeta.fieldLabels.instTokens.label, current: instTokens, half: Math.max(1, Math.round(instTokens / 2)), double: instTokens * 2 },
      { key: "output", label: "Output Tokens", current: outputTokens, half: Math.max(1, Math.round(outputTokens / 2)), double: outputTokens * 2 },
    ];

    return params.map((p) => {
      const computeForValues = (s: number, r: number, ctx: number, sub: number, inst: number, out: number) => {
        const effSub = getEffectiveSubTokens(sub, r, isProgressiveSubmission);
        if (isSumMode) {
          const gr = guardrailsEnabled ? computeGuardrailsCost(s * r, effSub, out) : 0;
          if (tornadoSumStrategy === "cacheSummary" && supportsCaching) {
            return computeSumCacheSummary(selectedModel, s, r, sysTokens, ctx, effSub, inst, out, summarySize, tierMultiplier, effectiveCacheTTL).total + gr;
          }
          if (supportsCaching) {
            return computeSumCacheAssessment(selectedModel, s, r, sysTokens, ctx, effSub, inst, out, summarySize, tierMultiplier, effectiveCacheTTL).total + gr;
          }
          return computeSumNoCaching(selectedModel, s, r, sysTokens, ctx, effSub, inst, out, summarySize, tierMultiplier).total + gr;
        }
        const effInst = getEffectiveInstTokens(inst, r, out, isConversational);
        const res = computeStrategyA(selectedModel, s, r, sysTokens, ctx, effSub, effInst, out, tierMultiplier, effectiveCacheTTL);
        const gr = guardrailsEnabled ? computeGuardrailsCost(s * r, effSub, out) : 0;
        return res.total + gr;
      };

      const getArgs = (override: Partial<Record<string, number>>): [number, number, number, number, number, number] => [
        override.students ?? students,
        override.reqs ?? reqsPerStudent,
        override.ctx ?? ctxTokens,
        override.sub ?? subTokens,
        override.inst ?? instTokens,
        override.output ?? outputTokens,
      ];

      const halfCost = computeForValues(...getArgs({ [p.key]: p.half }));
      const doubleCost = computeForValues(...getArgs({ [p.key]: p.double }));

      return {
        label: p.label,
        halfDelta: ((halfCost - baseline) / baseline) * 100,
        doubleDelta: ((doubleCost - baseline) / baseline) * 100,
      };
    }).sort((a, b) => Math.abs(b.doubleDelta) - Math.abs(a.doubleDelta));
  }, [displayMode, results, selectedModel, students, reqsPerStudent, sysTokens, ctxTokens, subTokens, instTokens, outputTokens, tierMultiplier, effectiveCacheTTL, guardrailsEnabled, totalRequests, activeTemplateMeta, isConversational, isProgressiveSubmission, summarizationEnabled, summarySize, supportsCaching, sumStrategies, tornadoSumStrategy]);

  // --- Per-turn cost data (conversational templates) ---
  const perTurnData = useMemo(() => {
    if (!isConversational || reqsPerStudent < 2) return [];
    const p = selectedModel.pricing;
    const pInput = p.input_1k * tierMultiplier;
    const pOutput = p.output_1k * tierMultiplier;
    const pRead = (p.cache_read_1k ?? 0) * tierMultiplier;
    const pWrite = getCacheWritePrice(selectedModel, effectiveCacheTTL) * tierMultiplier;
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
        point.sumHistoryTokens = sumHistory;

        point["Chat Summary — No Cache"] = ((cachedPrefix + sumFresh) / 1000) * pInput + (outputTokens / 1000) * pOutput;

        if (supportsCaching) {
          const cachePrefixPrice = (turn === 1) ? pWrite : pRead;
          point["Chat Summary — Cache Prefix"] = (cachedPrefix / 1000) * cachePrefixPrice + (sumFresh / 1000) * pInput + (outputTokens / 1000) * pOutput;

          if (turn > 1 && sumTurns.has(turn - 1)) {
            hasSummaryCIP = true;
          }
          const fullPrefix = cachedPrefix + summarySize;
          const freshHistoryForCacheSummary = hasSummaryCIP ? Math.max(0, sumHistory - summarySize) : sumHistory;
          const cacheSumFresh = turnSub + freshHistoryForCacheSummary;
          const cacheSumPrefix = hasSummaryCIP ? fullPrefix : cachedPrefix;
          const cacheSumPrefixPrice = (turn === 1 || (hasSummaryCIP && sumTurns.has(turn - 1))) ? pWrite : pRead;
          point["Chat Summary — Cache in Prefix"] = (cacheSumPrefix / 1000) * cacheSumPrefixPrice + (cacheSumFresh / 1000) * pInput + (outputTokens / 1000) * pOutput;
        }
      }

      return point;
    });
  }, [isConversational, reqsPerStudent, instTokens, outputTokens, sysTokens, ctxTokens, subTokens, selectedModel, tierMultiplier, supportsCaching, summarizationEnabled, summarySize, isProgressiveSubmission, effectiveCacheTTL]);

  // --- Parameter sensitivity chart (rendered in both display modes) ---
  const paramChart = supportsCaching && paramSensitivityData.length > 0 ? (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Cost by Parameter</CardTitle>
            <CardDescription className="text-sm">
              See how varying a parameter affects each strategy&apos;s cost — your current setting is highlighted
              <span className="block text-[10px] text-muted-foreground/60 mt-0.5">Scroll to zoom &middot; double-click to reset</span>
            </CardDescription>
          </div>
          <Select value={sensitivityParam} onValueChange={(v) => setSensitivityParam(v as SensitivityParamKey)}>
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="students">{labels.students.label}</SelectItem>
              <SelectItem value="reqsPerStudent">{labels.reqsPerStudent.label}</SelectItem>
              <SelectItem value="sysTokens">{labels.sysTokens.label}</SelectItem>
              <SelectItem value="ctxTokens">{labels.ctxTokens.label}</SelectItem>
              <SelectItem value="subTokens">{labels.subTokens.label}</SelectItem>
              <SelectItem value="instTokens">{labels.instTokens.label}</SelectItem>
              <SelectItem value="outputTokens">{labels.outputTokens.label}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]" ref={paramChartContainerRef} onDoubleClick={() => setParamChartZoomDomain(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibleParamData} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="value"
                type="number"
                domain={paramChartZoomDomain ?? ['dataMin', 'dataMax']}
                allowDataOverflow={!!paramChartZoomDomain}
                tickCount={8}
                tickFormatter={(v: number) => formatParamLabel(sensitivityParam, v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                label={{
                  value: labels[sensitivityParam].label + (sensitivityParam !== "students" && sensitivityParam !== "reqsPerStudent" ? " (tokens)" : ""),
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
                  const strategyColorMap: Record<string, string> = {
                    "No Caching": CHART_COLORS.noCaching,
                    "Per-Assignment Cache": CHART_COLORS.cachePrefix,
                    "Per-Submission Cache": CHART_COLORS.cacheSubmission,
                    "Batch Inference": CHART_COLORS.batch,
                    "Chat Sum. — No Cache": CHART_COLORS.noCaching,
                    "Chat Sum. — Cache Prefix": CHART_COLORS.cachePrefix,
                    "Chat Sum. — Cache in Prefix": CHART_COLORS.batch,
                  };
                  const entries = payload
                    .filter((p) => p.value != null)
                    .map((p) => ({ name: p.name as string, cost: p.value as number, color: strategyColorMap[p.name as string] ?? "#999" }))
                    .sort((a, b) => a.cost - b.cost);
                  if (entries.length === 0) return null;
                  const cheapest = entries[0].cost;
                  const mostExpensive = entries[entries.length - 1].cost;
                  const savings = mostExpensive - cheapest;
                  const savingsPct = mostExpensive > 0 ? (savings / mostExpensive) * 100 : 0;
                  return (
                    <div style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", fontSize: "12px" }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatParamLabel(sensitivityParam, Number(tipLabel))}{sensitivityParam !== "students" && sensitivityParam !== "reqsPerStudent" ? " tokens" : ""}</div>
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
              {!(summarizationEnabled && isConversational) && (
                <Line type="monotone" dataKey="No Caching" stroke={CHART_COLORS.noCaching} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {!(summarizationEnabled && isConversational) && (
                <Line type="monotone" dataKey="Per-Assignment Cache" stroke={CHART_COLORS.cachePrefix} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {summarizationEnabled && isConversational && (
                <Line type="monotone" dataKey="Chat Sum. — No Cache" stroke={CHART_COLORS.noCaching} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {summarizationEnabled && isConversational && (
                <Line type="monotone" dataKey="Chat Sum. — Cache Prefix" stroke={CHART_COLORS.cachePrefix} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {summarizationEnabled && isConversational && (
                <Line type="monotone" dataKey="Chat Sum. — Cache in Prefix" stroke={CHART_COLORS.batch} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {displayMode === "strategy-comparison" && (
                <Line type="monotone" dataKey="Per-Submission Cache" stroke={CHART_COLORS.cacheSubmission} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {displayMode === "strategy-comparison" && batchIncluded && (
                <Line type="monotone" dataKey="Batch Inference" stroke={CHART_COLORS.batch} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {paramCrossoverLabels.map((lbl) => (
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
              {(() => {
                const current = paramSensitivityData.find((d) => d.isCurrent);
                if (!current) return null;
                const isSumMode = summarizationEnabled && isConversational;
                return (
                  <>
                    {!isSumMode && (
                      <ReferenceDot x={current.value as number} y={current["No Caching"] as number} r={6} fill={CHART_COLORS.noCaching} stroke="#fff" strokeWidth={2} />
                    )}
                    {!isSumMode && (
                      <ReferenceDot x={current.value as number} y={current["Per-Assignment Cache"] as number} r={6} fill={CHART_COLORS.cachePrefix} stroke="#fff" strokeWidth={2} />
                    )}
                    {isSumMode && current["Chat Sum. — No Cache"] != null && (
                      <ReferenceDot x={current.value as number} y={current["Chat Sum. — No Cache"] as number} r={6} fill={CHART_COLORS.noCaching} stroke="#fff" strokeWidth={2} />
                    )}
                    {isSumMode && current["Chat Sum. — Cache Prefix"] != null && (
                      <ReferenceDot x={current.value as number} y={current["Chat Sum. — Cache Prefix"] as number} r={6} fill={CHART_COLORS.cachePrefix} stroke="#fff" strokeWidth={2} />
                    )}
                    {isSumMode && current["Chat Sum. — Cache in Prefix"] != null && (
                      <ReferenceDot x={current.value as number} y={current["Chat Sum. — Cache in Prefix"] as number} r={6} fill={CHART_COLORS.batch} stroke="#fff" strokeWidth={2} />
                    )}
                    {displayMode === "strategy-comparison" && current["Per-Submission Cache"] != null && (
                      <ReferenceDot x={current.value as number} y={current["Per-Submission Cache"] as number} r={6} fill={CHART_COLORS.cacheSubmission} stroke="#fff" strokeWidth={2} />
                    )}
                    {displayMode === "strategy-comparison" && batchIncluded && current["Batch Inference"] != null && (
                      <ReferenceDot x={current.value as number} y={current["Batch Inference"] as number} r={6} fill={CHART_COLORS.batch} stroke="#fff" strokeWidth={2} />
                    )}
                  </>
                );
              })()}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {paramChartZoomDomain && paramSensitivityData.length >= 2 && (() => {
          const dMin = paramSensitivityData[0].value as number;
          const dMax = paramSensitivityData[paramSensitivityData.length - 1].value as number;
          const fullRange = dMax - dMin;
          const visRange = paramChartZoomDomain[1] - paramChartZoomDomain[0];
          const thumbPct = Math.max(8, (visRange / fullRange) * 100);
          const maxLeft = 100 - thumbPct;
          const leftPct = fullRange > visRange
            ? ((paramChartZoomDomain[0] - dMin) / (fullRange - visRange)) * maxLeft
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
                    setParamChartZoomDomain([Math.max(dMin, nMin), Math.min(dMax, nMax)]);
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
                onClick={() => setParamChartZoomDomain(null)}
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
              {(paramChartZoomDomain
                ? paramSensitivityData.filter(d => {
                    const v = d.value as number;
                    return v >= paramChartZoomDomain[0] && v <= paramChartZoomDomain[1];
                  })
                : paramSensitivityData
              ).map((d, i) => (
                <div
                  key={i}
                  className="flex-1 transition-colors"
                  style={{ backgroundColor: d.winnerColor as string }}
                />
              ))}
            </div>
          </div>
        </div>
        {(() => {
          const current = paramSensitivityData.find((d) => d.isCurrent);
          if (!current) return null;
          const isSumMode = summarizationEnabled && isConversational;
          const costs: [string, number][] = isSumMode
            ? ([
                ["Chat Sum. — No Cache", current["Chat Sum. — No Cache"]],
                ["Chat Sum. — Cache Prefix", current["Chat Sum. — Cache Prefix"]],
                ["Chat Sum. — Cache in Prefix", current["Chat Sum. — Cache in Prefix"]],
              ] as [string, number | undefined][]).filter((c): c is [string, number] => c[1] != null)
            : [
                ["No Caching", current["No Caching"] as number],
                ["Per-Assignment Cache", current["Per-Assignment Cache"] as number],
              ];
          if (!isSumMode) {
            if (current["Per-Submission Cache"] != null) {
              costs.push(["Per-Submission Cache", current["Per-Submission Cache"] as number]);
            }
            if (current["Batch Inference"] != null) {
              costs.push(["Batch Inference", current["Batch Inference"] as number]);
            }
          }
          costs.sort((a, b) => a[1] - b[1]);
          if (costs.length < 2) return null;
          const cheapest = costs[0];
          const mostExpensive = costs[costs.length - 1];
          const savings = mostExpensive[1] - cheapest[1];
          const pct = mostExpensive[1] > 0 ? (savings / mostExpensive[1]) * 100 : 0;
          const currentValue: number = { students, reqsPerStudent, sysTokens, ctxTokens, subTokens, instTokens, outputTokens }[sensitivityParam];
          const valueDisplay = sensitivityParam === "students" || sensitivityParam === "reqsPerStudent"
            ? currentValue.toString()
            : currentValue.toLocaleString() + " tokens";
          return (
            <p className="text-muted-foreground mt-3 text-xs">
              At your current setting of <strong>{valueDisplay}</strong>, <strong>{cheapest[0]}</strong> is cheapest — saving{" "}
              <strong>{pct.toFixed(1)}%</strong> ({formatCost(savings)}) vs. {mostExpensive[0]}.{" "}
              {SENSITIVITY_INSIGHT[sensitivityParam]}
            </p>
          );
        })()}
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2>Workload Simulator</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {pageDescription}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="mb-2">Select Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cachingModels.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Supports Caching
                      </div>
                      {cachingModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-primary" />
                            {m.name}
                            <span className="text-muted-foreground text-xs">({m.provider})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {nonCachingModels.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 mt-1 text-xs font-semibold text-muted-foreground">
                        No Caching
                      </div>
                      {nonCachingModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2">
                            {m.name}
                            <span className="text-muted-foreground text-xs">({m.provider})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {supportsTiers && (
                <div className="mt-3">
                  <Label className="mb-2">Pricing Tier</Label>
                  <Select value={effectiveTier} onValueChange={(v) => setPricingTier(v as "standard" | "priority" | "flex")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedModel.constraints.supported_tiers.includes("standard") && (
                        <SelectItem value="standard">
                          <span className="flex items-center gap-2">
                            Standard
                            <span className="text-muted-foreground text-xs">(Base price)</span>
                          </span>
                        </SelectItem>
                      )}
                      {selectedModel.constraints.supported_tiers.includes("priority") && (
                        <SelectItem value="priority">
                          <span className="flex items-center gap-2">
                            Priority
                            <span className="text-muted-foreground text-xs">(1.75x — lower latency)</span>
                          </span>
                        </SelectItem>
                      )}
                      {selectedModel.constraints.supported_tiers.includes("flex") && (
                        <SelectItem value="flex">
                          <span className="flex items-center gap-2">
                            Flex
                            <span className="text-muted-foreground text-xs">(0.5x — cost optimized)</span>
                          </span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {supportsBatch && displayMode === "strategy-comparison" && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="batch-mode"
                      checked={batchEnabled && batchAvailableForTier}
                      onCheckedChange={(checked) => setBatchEnabled(checked === true)}
                      disabled={!batchAvailableForTier}
                    />
                    <Label htmlFor="batch-mode" className={`cursor-pointer ${!batchAvailableForTier ? "text-muted-foreground" : ""}`}>
                      <Badge variant="secondary" className="mr-1">Batch</Badge>
                      Include batch inference in comparison
                    </Label>
                  </div>
                  {!batchAvailableForTier && (
                    <p className="text-muted-foreground mt-1 text-xs ml-6">
                      {effectiveTier === "flex" ? "Flex" : "Priority"} tier pricing already reflects a discounted rate. Select Standard tier to compare batch inference separately.
                    </p>
                  )}
                  {batchIncluded && (
                    <p className="text-amber-600 dark:text-amber-400 mt-1 text-xs ml-6 font-medium">
                      <Timer className="w-3 h-3 inline mr-1" />
                      Results may take up to 24 hours. Only use if your workload can tolerate async processing via S3.
                    </p>
                  )}
                </div>
              )}
              {supportsBatch && displayMode !== "strategy-comparison" && (
                <p className="text-muted-foreground mt-3 text-xs">
                  <Badge variant="secondary" className="mr-1">Batch</Badge>
                  This model supports batch inference (50% off input &amp; output, no caching). Switch to a grading template to see the batch comparison.
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Checkbox
                  id="guardrails-mode"
                  checked={guardrailsEnabled}
                  onCheckedChange={(checked) => setGuardrailsEnabled(checked === true)}
                />
                <Label htmlFor="guardrails-mode" className="cursor-pointer">
                  <Shield className="w-3.5 h-3.5 inline mr-1" />
                  Guardrails
                  {guardrailsEnabled && (
                    <Badge className="ml-2" variant="secondary">
                      +$0.15/1K text units
                    </Badge>
                  )}
                </Label>
              </div>
              {guardrailsEnabled && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Adds content filtering cost ($0.15 per 1,000 text units) on student input and model output. Trusted prompt segments (system prompt, shared context, instructions) are excluded. Assumes ~4 characters per token.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Simulation Template Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Simulation Template
                </span>
              </CardTitle>
              <CardDescription className="text-sm">
                Choose a workload scenario. Adjust parameters below to explore; click the active template again to reset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleGroup
                type="single"
                value={simulationTemplate}
                onValueChange={handleTemplateChange}
                className="flex flex-wrap w-full"
              >
                <ToggleGroupItem value="graf-simple" className="flex-1 min-w-0 text-xs">
                  GRAF+
                </ToggleGroupItem>
                <ToggleGroupItem value="graf-literary" className="flex-1 min-w-0 text-xs">
                  GRAF+ w/ Context
                </ToggleGroupItem>
                <ToggleGroupItem value="clarity-chat" className="flex-1 min-w-0 text-xs">
                  Clarity Chat
                </ToggleGroupItem>
                <ToggleGroupItem value="clarity-chat-xl" className="flex-1 min-w-0 text-xs">
                  Clarity XL
                </ToggleGroupItem>
                <ToggleGroupItem value="interactive-ai" className="flex-1 min-w-0 text-xs">
                  Interactive AI
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-muted-foreground mt-2 text-xs">
                {activeTemplateMeta.label} — {activeTemplateMeta.description.replace(" and compare caching strategies.", ".")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Class Parameters
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <SliderInput
                icon={<Users className="w-4 h-4" />}
                label={labels.students.label}
                value={students}
                onChange={setStudents}
                min={1}
                max={200}
                step={1}
              />
              <SliderInput
                icon={<MessageSquare className="w-4 h-4" />}
                label={labels.reqsPerStudent.label}
                value={reqsPerStudent}
                onChange={setReqsPerStudent}
                min={1}
                max={50}
                step={1}
              />
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground text-xs">
                  Total Requests: <strong className="font-semibold">{totalRequests.toLocaleString()}</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Prompt Segments {inputMode === "technical" && "(Tokens)"}
                </span>
              </CardTitle>
              <CardDescription className="text-sm">
                {inputMode === "simple"
                  ? "Estimate word counts for each part of the prompt."
                  : "Define token counts for each part of the prompt."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">Input Mode</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="text-xs">
                        Simple mode uses word counts for easier estimation. Technical mode gives full control over individual token parameters.
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <ToggleGroup
                  type="single"
                  value={inputMode}
                  onValueChange={handleInputModeChange}
                  className="flex w-full"
                >
                  <ToggleGroupItem value="simple" className="flex-1 text-xs">
                    Simple
                  </ToggleGroupItem>
                  <ToggleGroupItem value="technical" className="flex-1 text-xs">
                    Technical
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              {supportsCaching && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm">Cache TTL</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="text-xs">
                          How long cached tokens persist. 5-min is cheaper to write (1.25× input) but expires quickly. 1-hour costs more to write (2× input) but suits longer sessions.
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={cacheTTL}
                    onValueChange={(v) => { if (v) setCacheTTL(v as CacheTTL); }}
                    className="flex w-full"
                  >
                    <ToggleGroupItem value="5min" className="flex-1 text-xs">
                      5 min
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="1hour"
                      className="flex-1 text-xs"
                      disabled={!supports1Hour}
                    >
                      1 hour
                    </ToggleGroupItem>
                  </ToggleGroup>
                  {cacheTTL === "1hour" && !supports1Hour ? (
                    <p className="text-amber-600 dark:text-amber-400 text-xs">
                      {selectedModel.name} only supports 5-min cache. Using 5-min write pricing (1.25× input).
                    </p>
                  ) : effectiveCacheTTL === "1hour" ? (
                    <p className="text-muted-foreground text-xs">
                      1-hour cache — write cost is 2× base input price.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      5-min cache — write cost is 1.25× base input price.
                    </p>
                  )}
                </div>
              )}
              {inputMode === "simple" ? (
                <>
                  <SliderInput
                    icon={<BookOpen className="w-4 h-4" />}
                    label="Per-Assignment LLM Instructions"
                    tooltip="Total word count for the instructions and context defined as part of the assignment (system prompt, rubric, reference text, etc.)."
                    value={assignmentWords}
                    onChange={handleAssignmentWordsChange}
                    min={100}
                    max={120000}
                    step={100}
                    suffix="words"
                  />
                  {isConversational ? (
                    <>
                      <SliderInput
                        icon={<PenLine className="w-4 h-4" />}
                        label={labels.subTokens.label}
                        tooltip={isProgressiveSubmission
                          ? "Total word count of the student's completed paper. The simulation models the student writing progressively across their messages."
                          : "Approximate word count of each student's input per request (their submission, draft, or question)."}
                        value={studentTextWordsOnly}
                        onChange={handleStudentTextWordsOnlyChange}
                        min={50}
                        max={15000}
                        step={50}
                        suffix="words"
                      />
                      {isProgressiveSubmission && (
                        <p className="text-muted-foreground -mt-1 text-xs">
                          Progressive writing model: the student&apos;s text grows from 0 words on the first message
                          to {studentTextWordsOnly.toLocaleString()} words on the last, averaging ~{Math.round(studentTextWordsOnly / 2).toLocaleString()} words per message.
                        </p>
                      )}
                      <SliderInput
                        icon={<MessageSquare className="w-4 h-4" />}
                        label="Chat History Size"
                        tooltip="Maximum size of recent conversation history included in each request. When the limit is reached, older history is summarized or dropped."
                        value={chatHistoryWords}
                        onChange={handleChatHistoryWordsChange}
                        min={50}
                        max={7500}
                        step={50}
                        suffix="words"
                      />
                    </>
                  ) : (
                    <SliderInput
                      icon={<PenLine className="w-4 h-4" />}
                      label="Per-Student Text Length"
                      tooltip="Approximate word count of each student's input per request (their submission, draft, questions, or conversation history)."
                      value={studentTextWords}
                      onChange={handleStudentTextWordsChange}
                      min={50}
                      max={15000}
                      step={50}
                      suffix="words"
                    />
                  )}
                  <SliderInput
                    icon={<FileText className="w-4 h-4" />}
                    label="AI Response Length"
                    tooltip="Approximate word count of each AI response."
                    value={aiResponseWords}
                    onChange={handleAiResponseWordsChange}
                    min={50}
                    max={7500}
                    step={25}
                    suffix="words"
                  />
                </>
              ) : (
                <>
                  <SliderInput
                    icon={<Terminal className="w-4 h-4" />}
                    label={labels.sysTokens.label}
                    tooltip={labels.sysTokens.tooltip}
                    value={sysTokens}
                    onChange={setSysTokens}
                    min={100}
                    max={10000}
                    step={100}
                    suffix="tokens"
                  />
                  <SliderInput
                    icon={<BookOpen className="w-4 h-4" />}
                    label={labels.ctxTokens.label}
                    tooltip={labels.ctxTokens.tooltip}
                    value={ctxTokens}
                    onChange={setCtxTokens}
                    min={1000}
                    max={200000}
                    step={500}
                    suffix="tokens"
                  />
                  <SliderInput
                    icon={<PenLine className="w-4 h-4" />}
                    label={labels.subTokens.label}
                    tooltip={labels.subTokens.tooltip}
                    value={subTokens}
                    onChange={setSubTokens}
                    min={100}
                    max={20000}
                    step={100}
                    suffix="tokens"
                  />
                  {isProgressiveSubmission && (
                    <p className="text-muted-foreground -mt-1 text-xs">
                      Progressive writing model: avg. <strong>{Math.round(effectiveSubTokens).toLocaleString()}</strong> tokens/message
                      (grows from 0 to {subTokens.toLocaleString()} over {reqsPerStudent} messages)
                    </p>
                  )}
                  <SliderInput
                    icon={<MessageSquare className="w-4 h-4" />}
                    label={labels.instTokens.label}
                    tooltip={labels.instTokens.tooltip}
                    value={instTokens}
                    onChange={setInstTokens}
                    min={50}
                    max={10000}
                    step={50}
                    suffix="tokens"
                  />
                  {isConversational && (
                    <p className="text-muted-foreground -mt-1 text-xs">
                      Graduated model: avg. <strong>{Math.round(effectiveInstTokens).toLocaleString()}</strong> tokens/turn
                      (ramps from 0 to {instTokens.toLocaleString()} over {turnsUntilCap} turns,
                      ~{tokensPerExchange.toLocaleString()} per exchange)
                    </p>
                  )}
                  <SliderInput
                    icon={<FileText className="w-4 h-4" />}
                    label={labels.outputTokens.label}
                    tooltip={labels.outputTokens.tooltip}
                    value={outputTokens}
                    onChange={setOutputTokens}
                    min={100}
                    max={10000}
                    step={100}
                    suffix="tokens"
                  />
                </>
              )}
            </CardContent>
          </Card>

          {isConversational && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Conversation Management
                  </span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Explore how periodic summarization affects cost vs. a simple sliding window.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="summarization-mode"
                    checked={summarizationEnabled}
                    onCheckedChange={(checked) => setSummarizationEnabled(checked === true)}
                  />
                  <Label htmlFor="summarization-mode" className="cursor-pointer text-sm">
                    Enable summarization comparison
                  </Label>
                </div>
                {summarizationEnabled && (
                  <>
                    {inputMode === "simple" ? (
                      <SliderInput
                        icon={<FileText className="w-4 h-4" />}
                        label="Summary Size"
                        tooltip="Approximate word count of the compressed summary that replaces full history when the cap is reached. Smaller summaries save tokens but lose more context."
                        value={Math.round(summarySize * WORDS_PER_TOKEN)}
                        onChange={(words: number) => setSummarySize(Math.max(100, Math.round(words * TOKENS_PER_WORD)))}
                        min={75}
                        max={Math.max(150, Math.round(instTokens * 0.75 * WORDS_PER_TOKEN))}
                        step={25}
                        suffix="words"
                      />
                    ) : (
                      <SliderInput
                        icon={<FileText className="w-4 h-4" />}
                        label="Summary Size"
                        tooltip="Token count of the compressed summary that replaces full history when the cap is reached. Smaller summaries save tokens but lose more context."
                        value={summarySize}
                        onChange={setSummarySize}
                        min={100}
                        max={Math.max(200, Math.round(instTokens * 0.75))}
                        step={50}
                        suffix="tokens"
                      />
                    )}
                    <p className="text-muted-foreground text-xs">
                      {inputMode === "simple"
                        ? `When chat history fills up, an LLM call compresses it to ~${Math.round(summarySize * WORDS_PER_TOKEN).toLocaleString()} words (${Math.round(summarySize / instTokens * 100)}% of cap). The summarization call uses the same model.`
                        : `When chat history reaches ${instTokens.toLocaleString()} tokens, an LLM call compresses it to ${summarySize.toLocaleString()} tokens (${Math.round(summarySize / instTokens * 100)}% of cap). The summarization call uses the same model.`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT PANEL: Results */}
        <div className="lg:col-span-8 space-y-4">
          {/* Shared warnings */}
          {hasMissingCachePrices && (
            <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-900/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 shrink-0">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      Cache pricing not published for {selectedModel.name}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      AWS has not published cache write/read prices for this model.
                      Caching strategy costs below assume $0 for unpublished cache prices,
                      so actual costs may be higher.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!supportsCaching && (
            <Card className="border-chart-4/30 bg-chart-4/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-chart-4 shrink-0">
                    <Info className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      {selectedModel.name} does not support caching
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Only the baseline (no caching) cost is shown. Select a caching-capable model to compare strategies.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============================================================ */}
          {/* STRATEGY COMPARISON MODE (GRAF+ templates)                   */}
          {/* ============================================================ */}
          {displayMode === "strategy-comparison" && (
            <>
              {/* Verdict Banner */}
              {winner && winnerSavings && (
                <Card className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 shrink-0">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-medium">
                          {winnerSavings.percentage < 0.1
                            ? "All strategies have similar cost"
                            : `${winnerLabels[winner]} is cheapest — saving ${winnerSavings.percentage.toFixed(1)}%`}
                        </h3>
                        {winnerSavings.percentage >= 0.1 && (
                          <p className="text-muted-foreground mt-1 text-sm">
                            Saving {formatCost(winnerSavings.amount)} compared to {winnerSavings.vsLabel}.
                          </p>
                        )}
                        {winner === "batch" && (
                          <>
                            <div className="flex items-center gap-2 mt-3">
                              <TrendingDown className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium">
                                Batch inference (async via S3) beats real-time caching for this workload
                              </span>
                            </div>
                            <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                              <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <span className="text-sm text-amber-800 dark:text-amber-300">
                                <strong>Important:</strong> Batch inference requires submitting jobs to S3 and waiting up to 24 hours for results. Only choose this strategy if your use case can tolerate that delay.
                              </span>
                            </div>
                          </>
                        )}
                        {(winner === "A" || winner === "B") && (
                          <div className="flex items-center gap-2 mt-3">
                            <TrendingDown className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium">
                              Real-time caching beats batch inference for this workload
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Strategy relevance note */}
              {supportsCaching && strategyNote && (
                <Card className="border-blue-500/30 bg-blue-50 dark:bg-blue-900/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500 shrink-0">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Strategy Note</h3>
                        <p className="text-muted-foreground mt-1 text-sm">{strategyNote}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cost Summary Cards */}
              {(() => {
                const cardCount = 1 + (results.strategyA ? 1 : 0) + (results.strategyB ? 1 : 0) + (results.batch ? 1 : 0);
                const gridCols = cardCount >= 4
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  : cardCount === 3
                    ? "grid-cols-1 md:grid-cols-3"
                    : cardCount === 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1";
                return (
                  <div className={`grid gap-4 ${gridCols}`}>
                    <Card className={winner === "noCaching" ? "border-emerald-500" : !supportsCaching && !batchIncluded ? "border-secondary" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">No Caching</CardTitle>
                          {winner === "noCaching" && (
                            <Badge className="bg-emerald-500 text-white">Winner</Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">On-demand baseline</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-foreground text-xl font-medium">
                          {formatCost(results.noCaching.total)}
                          <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {students > 0 ? formatCost(results.noCaching.total / students) : "$0.00"}
                          <span className="ml-1 text-xs">per student</span>
                        </p>
                        <div className="mt-3 space-y-1">
                          <CostLine label="Fresh Input" value={results.noCaching.freshInput} />
                          <CostLine label="Output" value={results.noCaching.output} />
                          {results.noCaching.guardrails > 0 && (
                            <CostLine label="Guardrails" value={results.noCaching.guardrails} />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {results.strategyA && (
                      <Card className={winner === "A" ? "border-emerald-500" : ""}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Per-Assignment Cache</CardTitle>
                            {winner === "A" && (
                              <Badge className="bg-emerald-500 text-white">Winner</Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs">Caches shared context across all students</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-foreground text-xl font-medium">
                            {formatCost(results.strategyA.total)}
                            <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {students > 0 ? formatCost(results.strategyA.total / students) : "$0.00"}
                            <span className="ml-1 text-xs">per student</span>
                          </p>
                          <div className="mt-3 space-y-1">
                            <CostLine label="Cache Write" value={results.strategyA.cacheWrite} />
                            <CostLine label="Cache Read" value={results.strategyA.cacheRead} />
                            <CostLine label="Fresh Input" value={results.strategyA.freshInput} />
                            <CostLine label="Output" value={results.strategyA.output} />
                            {results.strategyA.guardrails > 0 && (
                              <CostLine label="Guardrails" value={results.strategyA.guardrails} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results.strategyB && (
                      <Card className={winner === "B" ? "border-emerald-500" : ""}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Per-Submission Cache</CardTitle>
                            {winner === "B" && (
                              <Badge className="bg-emerald-500 text-white">Winner</Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs">Writes cache for each student&apos;s submission</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-foreground text-xl font-medium">
                            {formatCost(results.strategyB.total)}
                            <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {students > 0 ? formatCost(results.strategyB.total / students) : "$0.00"}
                            <span className="ml-1 text-xs">per student</span>
                          </p>
                          <div className="mt-3 space-y-1">
                            <CostLine label="Cache Write" value={results.strategyB.cacheWrite} />
                            <CostLine label="Cache Read" value={results.strategyB.cacheRead} />
                            <CostLine label="Fresh Input" value={results.strategyB.freshInput} />
                            <CostLine label="Output" value={results.strategyB.output} />
                            {results.strategyB.guardrails > 0 && (
                              <CostLine label="Guardrails" value={results.strategyB.guardrails} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results.batch && (
                      <Card className={winner === "batch" ? "border-emerald-500" : ""}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Batch Inference</CardTitle>
                            {winner === "batch" && (
                              <Badge className="bg-emerald-500 text-white">Winner</Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs">Async via S3, 50% off input &amp; output, no caching</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-foreground text-xl font-medium">
                            {formatCost(results.batch.total)}
                            <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {students > 0 ? formatCost(results.batch.total / students) : "$0.00"}
                            <span className="ml-1 text-xs">per student</span>
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <Timer className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs font-medium">Up to 24-hour turnaround</span>
                          </div>
                          <div className="mt-3 space-y-1">
                            <CostLine label="Fresh Input" value={results.batch.freshInput} />
                            <CostLine label="Output" value={results.batch.output} />
                            {results.batch.guardrails > 0 && (
                              <CostLine label="Guardrails" value={results.batch.guardrails} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}

              {paramChart}

              {/* Stacked Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown Comparison</CardTitle>
                  <CardDescription className="text-sm">
                    Stacked cost by category across caching strategies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart key={`${selectedModelId}-${supportsCaching}`} data={chartData} barSize={60}>
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
                </CardContent>
              </Card>

              {/* Prompt Visualizer — dual bar */}
              {supportsCaching && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prompt Structure Visualizer</CardTitle>
                    <CardDescription className="text-sm">
                      Visual representation of what is cached in each strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <PromptVisualizer
                      strategy="A"
                      systemTokens={sysTokens}
                      contextTokens={ctxTokens}
                      submissionTokens={subTokens}
                      instructionTokens={instTokens}
                      labels={vizLabels}
                      submissionCacheable={submissionCacheable}
                    />
                    <div className="border-t border-border" />
                    <PromptVisualizer
                      strategy="B"
                      systemTokens={sysTokens}
                      contextTokens={ctxTokens}
                      submissionTokens={subTokens}
                      instructionTokens={instTokens}
                      labels={vizLabels}
                      submissionCacheable={submissionCacheable}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Per-Request Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Per-Request Cost Analysis</CardTitle>
                  <CardDescription className="text-sm">Cost per individual API request</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const colCount = 1 + (results.strategyA ? 1 : 0) + (results.strategyB ? 1 : 0) + (results.batch ? 1 : 0);
                    const gridCols = colCount >= 4
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                      : colCount === 3
                        ? "grid-cols-1 md:grid-cols-3"
                        : colCount === 2
                          ? "grid-cols-1 md:grid-cols-2"
                          : "grid-cols-1";
                    return (
                      <div className={`grid gap-4 ${gridCols}`}>
                        <div className={`p-4 rounded-lg ${winner === "noCaching" ? "bg-emerald-500/10" : "bg-muted/50"}`}>
                          <p className="text-muted-foreground text-xs font-semibold">No Caching</p>
                          <p className="text-foreground mt-1 text-xl font-medium">
                            {totalRequests > 0 ? formatCost(results.noCaching.total / totalRequests) : "$0.00"}
                          </p>
                          <p className="text-muted-foreground text-xs">per request</p>
                        </div>
                        {results.strategyA && (
                          <div className={`p-4 rounded-lg ${winner === "A" ? "bg-emerald-500/10" : "bg-muted/50"}`}>
                            <p className="text-muted-foreground text-xs font-semibold">Per-Assignment Cache</p>
                            <p className="text-foreground mt-1 text-xl font-medium">
                              {totalRequests > 0 ? formatCost(results.strategyA.total / totalRequests) : "$0.00"}
                            </p>
                            <p className="text-muted-foreground text-xs">per request</p>
                          </div>
                        )}
                        {results.strategyB && (
                          <div className={`p-4 rounded-lg ${winner === "B" ? "bg-emerald-500/10" : "bg-muted/50"}`}>
                            <p className="text-muted-foreground text-xs font-semibold">Per-Submission Cache</p>
                            <p className="text-foreground mt-1 text-xl font-medium">
                              {totalRequests > 0 ? formatCost(results.strategyB.total / totalRequests) : "$0.00"}
                            </p>
                            <p className="text-muted-foreground text-xs">per request</p>
                          </div>
                        )}
                        {results.batch && (
                          <div className={`p-4 rounded-lg ${winner === "batch" ? "bg-emerald-500/10" : "bg-muted/50"}`}>
                            <p className="text-muted-foreground text-xs font-semibold">Batch Inference</p>
                            <p className="text-foreground mt-1 text-xl font-medium">
                              {totalRequests > 0 ? formatCost(results.batch.total / totalRequests) : "$0.00"}
                            </p>
                            <p className="text-muted-foreground text-xs">per request</p>
                            <p className="text-amber-600 dark:text-amber-400 text-[10px] font-medium mt-1">
                              <Timer className="w-3 h-3 inline mr-0.5" />up to 24h wait
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          )}

          {/* ============================================================ */}
          {/* CACHING INSIGHTS MODE (Clarity Chat, Interactive AI)         */}
          {/* ============================================================ */}
          {displayMode === "caching-insights" && (
            <>
              {/* Savings Verdict */}
              {summarizationEnabled && sumStrategies && sumWinner && sumWinnerSavings ? (
                <Card className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 shrink-0">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-medium">
                          {sumWinnerSavings.percentage < 0.1
                            ? "All chat history summarization strategies have similar cost"
                            : <>{sumWinnerLabels[sumWinner]} is cheapest — saving {sumWinnerSavings.percentage.toFixed(1)}% ({formatCost(sumWinnerSavings.amount)})</>}
                        </h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Comparing chat history summarization strategies: no caching, cache assessment prefix only, and cache prefix with periodic chat summary writes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : supportsCaching && insightsSavings ? (
                <Card className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 shrink-0">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        {insightsSavings.amount > 0 ? (
                          <>
                            <h3 className="text-lg font-medium">
                              Caching saves {insightsSavings.percentage.toFixed(1)}% ({formatCost(insightsSavings.amount)})
                            </h3>
                            <p className="text-muted-foreground mt-1 text-sm">
                              Per-student cost: {students > 0 ? formatCost(results.noCaching.total / students) : "$0.00"}
                              {" → "}
                              {students > 0 && results.strategyA ? formatCost(results.strategyA.total / students) : "$0.00"}
                              {" | "}
                              Per-message: {totalRequests > 0 ? formatCost(results.noCaching.total / totalRequests) : "$0.00"}
                              {" → "}
                              {totalRequests > 0 && results.strategyA ? formatCost(results.strategyA.total / totalRequests) : "$0.00"}
                            </p>
                          </>
                        ) : (
                          <h3 className="text-lg font-medium text-muted-foreground">
                            Caching costs more than baseline at this configuration
                          </h3>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {supportsBatch && (
                <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-900/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 shrink-0">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Batch inference not applicable</h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                          This template models an interactive conversation where students need real-time responses.
                          Batch inference (async via S3, up to 24-hour turnaround) is not suitable here.
                          Switch to a grading template to see the batch strategy comparison.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Strategy Cards — either sliding window or summarization */}
              {summarizationEnabled && sumStrategies ? (
                <>
                  {(() => {
                    const cardCount = 1 + (sumStrategies.cacheAssessment ? 1 : 0) + (sumStrategies.cacheSummary ? 1 : 0);
                    const gridCols = cardCount >= 3
                      ? "grid-cols-1 md:grid-cols-3"
                      : cardCount === 2
                        ? "grid-cols-1 md:grid-cols-2"
                        : "grid-cols-1";
                    return (
                      <div className={`grid gap-4 ${gridCols}`}>
                        <Card className={sumWinner === "sumNoCaching" ? "border-emerald-500" : ""}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">No Caching</CardTitle>
                              {sumWinner === "sumNoCaching" && (
                                <Badge className="bg-emerald-500 text-white">Cheapest</Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs">Compress chat history, all tokens as fresh input</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-foreground text-xl font-medium">
                              {formatCost(sumStrategies.noCaching.total)}
                              <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                            </p>
                            <div className="mt-2 space-y-0.5">
                              <p className="text-muted-foreground text-sm">
                                {students > 0 ? formatCost(sumStrategies.noCaching.total / students) : "$0.00"}
                                <span className="ml-1 text-xs">per student</span>
                              </p>
                            </div>
                            <div className="mt-3 space-y-1">
                              <CostLine label="Fresh Input" value={sumStrategies.noCaching.freshInput} />
                              <CostLine label="Output" value={sumStrategies.noCaching.output} />
                              <CostLine label="Summarization Calls" value={sumStrategies.noCaching.summarizationCalls} />
                              {sumStrategies.noCaching.guardrails > 0 && (
                                <CostLine label="Guardrails" value={sumStrategies.noCaching.guardrails} />
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {sumStrategies.cacheAssessment && (
                          <Card className={sumWinner === "sumCacheAssessment" ? "border-emerald-500" : ""}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Cache Prefix</CardTitle>
                                {sumWinner === "sumCacheAssessment" && (
                                  <Badge className="bg-emerald-500 text-white">Cheapest</Badge>
                                )}
                              </div>
                              <CardDescription className="text-xs">Cache assessment context; chat summary sent as fresh input</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-foreground text-xl font-medium">
                                {formatCost(sumStrategies.cacheAssessment.total)}
                                <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                              </p>
                              <div className="mt-2 space-y-0.5">
                                <p className="text-muted-foreground text-sm">
                                  {students > 0 ? formatCost(sumStrategies.cacheAssessment.total / students) : "$0.00"}
                                  <span className="ml-1 text-xs">per student</span>
                                </p>
                              </div>
                              <div className="mt-3 space-y-1">
                                <CostLine label="Cache Write" value={sumStrategies.cacheAssessment.cacheWrite} />
                                <CostLine label="Cache Read" value={sumStrategies.cacheAssessment.cacheRead} />
                                <CostLine label="Fresh Input" value={sumStrategies.cacheAssessment.freshInput} />
                                <CostLine label="Output" value={sumStrategies.cacheAssessment.output} />
                                <CostLine label="Summarization Calls" value={sumStrategies.cacheAssessment.summarizationCalls} />
                                {sumStrategies.cacheAssessment.guardrails > 0 && (
                                  <CostLine label="Guardrails" value={sumStrategies.cacheAssessment.guardrails} />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {sumStrategies.cacheSummary && (
                          <Card className={sumWinner === "sumCacheSummary" ? "border-emerald-500" : ""}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Cache Prefix + Chat Summary</CardTitle>
                                {sumWinner === "sumCacheSummary" && (
                                  <Badge className="bg-emerald-500 text-white">Cheapest</Badge>
                                )}
                              </div>
                              <CardDescription className="text-xs">Cache assessment context with chat summary; periodic cache rewrites when summary updates</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-foreground text-xl font-medium">
                                {formatCost(sumStrategies.cacheSummary.total)}
                                <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                              </p>
                              <div className="mt-2 space-y-0.5">
                                <p className="text-muted-foreground text-sm">
                                  {students > 0 ? formatCost(sumStrategies.cacheSummary.total / students) : "$0.00"}
                                  <span className="ml-1 text-xs">per student</span>
                                </p>
                              </div>
                              <div className="mt-3 space-y-1">
                                <CostLine label="Cache Write" value={sumStrategies.cacheSummary.cacheWrite} />
                                <CostLine label="Cache Read" value={sumStrategies.cacheSummary.cacheRead} />
                                <CostLine label="Fresh Input" value={sumStrategies.cacheSummary.freshInput} />
                                <CostLine label="Output" value={sumStrategies.cacheSummary.output} />
                                <CostLine label="Summarization Calls" value={sumStrategies.cacheSummary.summarizationCalls} />
                                {sumStrategies.cacheSummary.guardrails > 0 && (
                                  <CostLine label="Guardrails" value={sumStrategies.cacheSummary.guardrails} />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })()}

                </>
              ) : (
                (() => {
                  const colCount = 1 + (results.strategyA ? 1 : 0);
                  const gridCols = colCount === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1";
                  return (
                    <div className={`grid gap-4 ${gridCols}`}>
                      <Card className={!supportsCaching ? "border-secondary" : ""}>
                        <CardHeader>
                          <CardTitle className="text-base">Without Caching</CardTitle>
                          <CardDescription className="text-xs">On-demand baseline</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-foreground text-xl font-medium">
                            {formatCost(results.noCaching.total)}
                            <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                          </p>
                          <div className="mt-2 space-y-0.5">
                            <p className="text-muted-foreground text-sm">
                              {students > 0 ? formatCost(results.noCaching.total / students) : "$0.00"}
                              <span className="ml-1 text-xs">per student</span>
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {totalRequests > 0 ? formatCost(results.noCaching.total / totalRequests) : "$0.00"}
                              <span className="ml-1 text-xs">per message</span>
                            </p>
                          </div>
                          <div className="mt-3 space-y-1">
                            <CostLine label="Fresh Input" value={results.noCaching.freshInput} />
                            <CostLine label="Output" value={results.noCaching.output} />
                            {results.noCaching.guardrails > 0 && (
                              <CostLine label="Guardrails" value={results.noCaching.guardrails} />
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {results.strategyA && (
                        <Card className="border-emerald-500">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">With Caching</CardTitle>
                              {insightsSavings && insightsSavings.amount > 0 && (
                                <Badge className="bg-emerald-500 text-white">
                                  {insightsSavings.percentage.toFixed(1)}% savings
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs">Assignment-level prefix caching</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-foreground text-xl font-medium">
                              {formatCost(results.strategyA.total)}
                              <span className="text-muted-foreground ml-1 text-xs font-normal">per class</span>
                            </p>
                            <div className="mt-2 space-y-0.5">
                              <p className="text-muted-foreground text-sm">
                                {students > 0 ? formatCost(results.strategyA.total / students) : "$0.00"}
                                <span className="ml-1 text-xs">per student</span>
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {totalRequests > 0 ? formatCost(results.strategyA.total / totalRequests) : "$0.00"}
                                <span className="ml-1 text-xs">per message</span>
                              </p>
                            </div>
                            <div className="mt-3 space-y-1">
                              <CostLine label="Cache Write" value={results.strategyA.cacheWrite} />
                              <CostLine label="Cache Read" value={results.strategyA.cacheRead} />
                              <CostLine label="Fresh Input" value={results.strategyA.freshInput} />
                              <CostLine label="Output" value={results.strategyA.output} />
                              {results.strategyA.guardrails > 0 && (
                                <CostLine label="Guardrails" value={results.strategyA.guardrails} />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()
              )}

              {paramChart}

              {/* Per-Turn Cost Chart */}
              {perTurnData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Per-Turn Cost (Single Student)</CardTitle>
                    <CardDescription className="text-sm">
                      Cost per API call across a student&apos;s session — history ramps from 0 to the {instTokens.toLocaleString()}-token cap
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={perTurnData}>
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
                              const datum = perTurnData[turn - 1];
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
                          {!summarizationEnabled && (
                            <Line type="monotone" dataKey="Without Caching" stroke={CHART_COLORS.noCaching} strokeWidth={2} dot={false} isAnimationActive={false} />
                          )}
                          {!summarizationEnabled && supportsCaching && (
                            <Line type="monotone" dataKey="With Caching" stroke={CHART_COLORS.cachePrefix} strokeWidth={2} dot={false} isAnimationActive={false} />
                          )}
                          {summarizationEnabled && (
                            <Line type="monotone" dataKey="Chat Summary — No Cache" stroke={CHART_COLORS.noCaching} strokeWidth={2} dot={false} isAnimationActive={false} />
                          )}
                          {summarizationEnabled && supportsCaching && (
                            <Line type="monotone" dataKey="Chat Summary — Cache Prefix" stroke={CHART_COLORS.cachePrefix} strokeWidth={2} dot={false} isAnimationActive={false} />
                          )}
                          {summarizationEnabled && supportsCaching && (
                            <Line type="monotone" dataKey="Chat Summary — Cache in Prefix" stroke={CHART_COLORS.batch} strokeWidth={2} dot={false} isAnimationActive={false} />
                          )}
                          {turnsUntilCap > 0 && turnsUntilCap <= reqsPerStudent && (
                            <ReferenceLine
                              x={`${turnsUntilCap + 1}`}
                              stroke="var(--muted-foreground)"
                              strokeDasharray="4 3"
                              strokeWidth={1}
                              label={{ value: "Cap reached", position: "top", fill: "var(--muted-foreground)", fontSize: 10 }}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-muted-foreground mt-3 text-xs">
                      Each exchange adds ~{tokensPerExchange.toLocaleString()} tokens to history.
                      The {instTokens.toLocaleString()}-token cap is reached at turn {Math.min(turnsUntilCap + 1, reqsPerStudent)}.
                      {" "}Costs shown per single API call; cache write spikes appear on turns where the cached prefix must be written or re-written.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Summarization Caching Analysis */}
              {summarizationEnabled && sumStrategies?.cacheAssessment && sumStrategies?.cacheSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Chat Summary Caching Analysis</CardTitle>
                    <CardDescription className="text-sm">
                      Should the compressed chat history summary be cached in the prefix (with periodic rewrites) or sent as fresh input each turn?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const prefixCost = sumStrategies.cacheAssessment!.total;
                      const summaryCost = sumStrategies.cacheSummary!.total;
                      const diff = prefixCost - summaryCost;
                      const pct = prefixCost > 0 ? (diff / prefixCost) * 100 : 0;
                      const summaryWins = diff > 0;
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-lg ${!summaryWins ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "bg-muted/50"}`}>
                              <p className="text-xs font-semibold">Cache Prefix Only</p>
                              <p className="text-foreground mt-1 text-xl font-medium">
                                {formatCost(prefixCost)}
                              </p>
                              <p className="text-muted-foreground text-xs mt-1">
                                Chat summary sent as fresh input every call
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Stable prefix — no extra cache rewrites
                              </p>
                            </div>
                            <div className={`p-4 rounded-lg ${summaryWins ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "bg-muted/50"}`}>
                              <p className="text-xs font-semibold">Cache Prefix + Chat Summary</p>
                              <p className="text-foreground mt-1 text-xl font-medium">
                                {formatCost(summaryCost)}
                              </p>
                              <p className="text-muted-foreground text-xs mt-1">
                                Chat summary cached in prefix — reduced fresh input
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Prefix rewritten every {summarizationResult?.turnsPerCycle ?? "–"} turns when summary updates
                              </p>
                            </div>
                          </div>

                          {Math.abs(pct) >= 0.1 ? (
                            summaryWins ? (
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-sm">
                                <TrendingDown className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <span>
                                  Caching the summary saves <strong>{formatCost(diff)}</strong> ({pct.toFixed(1)}%) per class.
                                  The reduced fresh input cost from caching the chat summary outweighs the periodic prefix rewrite cost.
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-sm">
                                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <span>
                                  Caching the summary costs <strong>{formatCost(Math.abs(diff))}</strong> ({Math.abs(pct).toFixed(1)}%) more.
                                  The periodic prefix rewrite cost ({((sysTokens + ctxTokens + summarySize) / 1000).toFixed(1)}K tokens rewritten every {summarizationResult?.turnsPerCycle ?? "–"} turns when the chat summary updates) outweighs the savings from reduced fresh input.
                                  {sysTokens + ctxTokens > 5000 && " Try reducing shared context to shift the break-even."}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                              <span>Both strategies have nearly identical cost at this configuration.</span>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {summarizationResult && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm font-semibold mb-2">Break-Even Analysis</p>
                        <p className="text-muted-foreground text-xs mb-3">
                          Caching the chat summary in the prefix pays off when there are enough turns between re-summarizations
                          to amortize the prefix rewrite cost through cheaper cache reads.
                        </p>

                        <div className="grid grid-cols-3 gap-3 text-center mb-3">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Prefix Size</p>
                            <p className="text-sm font-semibold">{((sysTokens + ctxTokens) / 1000).toFixed(1)}K</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Summary Size</p>
                            <p className="text-sm font-semibold">{(summarySize / 1000).toFixed(1)}K</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Turns/Cycle</p>
                            <p className="text-sm font-semibold">{summarizationResult.turnsPerCycle}</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                          <p>
                            <strong>Break-even:</strong> Caching the chat summary saves money when there
                            are <strong>{Math.ceil(summarizationResult.breakEvenK)}+</strong> turns between re-summarizations.
                          </p>
                          <p>
                            Your current configuration has <strong>{summarizationResult.turnsPerCycle}</strong> turns per cycle.
                          </p>
                          {summarizationResult.summaryCachingViable ? (
                            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Viable — {summarizationResult.turnsPerCycle} turns/cycle exceeds the {Math.ceil(summarizationResult.breakEvenK)}-turn threshold. Periodic prefix rewrites are cost-effective.
                            </p>
                          ) : (
                            <p className="text-amber-600 dark:text-amber-400 font-medium">
                              Not viable — {summarizationResult.turnsPerCycle} turns/cycle is below the {Math.ceil(summarizationResult.breakEvenK)}-turn threshold.
                              {sysTokens + ctxTokens > 5000 && " Try reducing shared context size to see the break-even shift."}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {optimalChatHistory && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm font-semibold mb-2">Optimal Chat History Size</p>
                        <p className="text-muted-foreground text-xs mb-3">
                          The chat history cap that minimizes total cost for the Cache Prefix + Chat Summary strategy, balancing per-turn input cost against summarization frequency.
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center mb-3">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Optimal Size</p>
                            <p className="text-sm font-semibold">
                              {inputMode === "simple"
                                ? `${Math.round(optimalChatHistory.optimalTokens * WORDS_PER_TOKEN).toLocaleString()} words`
                                : `${optimalChatHistory.optimalTokens.toLocaleString()} tokens`}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Current Size</p>
                            <p className="text-sm font-semibold">
                              {inputMode === "simple"
                                ? `${Math.round(instTokens * WORDS_PER_TOKEN).toLocaleString()} words`
                                : `${instTokens.toLocaleString()} tokens`}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Cost at Optimal</p>
                            <p className="text-sm font-semibold">{formatCost(optimalChatHistory.optimalTotal)}</p>
                          </div>
                        </div>
                        {optimalChatHistory.savings > 0.001 ? (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-sm">
                            <TrendingDown className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span>
                              Switching to the optimal chat history size would save <strong>{formatCost(optimalChatHistory.savings)}</strong> ({optimalChatHistory.savingsPct.toFixed(1)}%) compared to your current {inputMode === "simple" ? `${Math.round(instTokens * WORDS_PER_TOKEN).toLocaleString()}-word` : `${instTokens.toLocaleString()}-token`} setting.
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <span>Your current chat history size is already at or near the cost-optimal point.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Cost Sensitivity Tornado Chart */}
              {(supportsCaching || (summarizationEnabled && isConversational)) && sensitivityData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Sensitivity Analysis</CardTitle>
                    <CardDescription className="text-sm">
                      Impact of halving (green) or doubling (red) each parameter on total {summarizationEnabled && isConversational
                        ? (tornadoSumStrategy === "cacheSummary" ? "Cache Prefix + Chat Summary" : "Cache Assessment Prefix")
                        : "cached"} cost
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summarizationEnabled && isConversational && supportsCaching && (
                      <div className="mb-4 pb-3 border-b border-border">
                        <Label className="text-xs text-muted-foreground mb-2 block">Analyze strategy:</Label>
                        <ToggleGroup
                          type="single"
                          value={tornadoSumStrategy}
                          onValueChange={(v) => { if (v) setTornadoSumStrategy(v as "cacheAssessment" | "cacheSummary"); }}
                          className="justify-start"
                        >
                          <ToggleGroupItem value="cacheAssessment" className="text-xs px-3 h-7">
                            Cache Prefix
                          </ToggleGroupItem>
                          <ToggleGroupItem value="cacheSummary" className="text-xs px-3 h-7">
                            Cache Prefix + Chat Summary
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    )}
                    <div className="space-y-3">
                      {sensitivityData.map((item) => {
                        const maxAbs = Math.max(
                          ...sensitivityData.map((d) => Math.max(Math.abs(d.halfDelta), Math.abs(d.doubleDelta)))
                        );
                        const scale = maxAbs > 0 ? 100 / maxAbs : 1;
                        const halfWidth = Math.abs(item.halfDelta) * scale;
                        const doubleWidth = Math.abs(item.doubleDelta) * scale;
                        const halfIsNeg = item.halfDelta < 0;
                        const doubleIsNeg = item.doubleDelta < 0;

                        return (
                          <div key={item.label} className="grid grid-cols-[140px_1fr_60px] items-center gap-2">
                            <span className="text-xs font-medium truncate text-right">{item.label}</span>
                            <div className="relative h-6 flex items-center">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full h-px bg-border" />
                              </div>
                              <div className="absolute left-1/2 h-full w-px bg-border" />
                              {/* Half bar (left of center) */}
                              <div
                                className={`absolute h-5 rounded-sm ${halfIsNeg ? "bg-emerald-500/80" : "bg-red-500/80"}`}
                                style={{
                                  width: `${halfWidth / 2}%`,
                                  right: "50%",
                                }}
                              />
                              {/* Double bar (right of center) */}
                              <div
                                className={`absolute h-5 rounded-sm ${doubleIsNeg ? "bg-emerald-500/80" : "bg-red-500/80"}`}
                                style={{
                                  width: `${doubleWidth / 2}%`,
                                  left: "50%",
                                }}
                              />
                            </div>
                            <div className="flex flex-col text-right">
                              <span className={`text-xs font-medium ${halfIsNeg ? "text-emerald-600" : "text-red-600"}`}>
                                {item.halfDelta > 0 ? "+" : ""}{item.halfDelta.toFixed(1)}%
                              </span>
                              <span className={`text-xs font-medium ${doubleIsNeg ? "text-emerald-600" : "text-red-600"}`}>
                                {item.doubleDelta > 0 ? "+" : ""}{item.doubleDelta.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
                        <span className="text-muted-foreground text-xs">Cost decrease</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-red-500/80" />
                        <span className="text-muted-foreground text-xs">Cost increase</span>
                      </div>
                      <span className="text-muted-foreground text-xs ml-auto">
                        Left = halved, Right = doubled
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Single Prompt Visualizer */}
              {supportsCaching && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prompt Structure</CardTitle>
                    <CardDescription className="text-sm">
                      What is cached vs. sent as fresh input on each request
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PromptVisualizer
                      strategy="caching"
                      strategyLabel="Cached vs. Fresh Segments"
                      systemTokens={sysTokens}
                      contextTokens={ctxTokens}
                      submissionTokens={subTokens}
                      instructionTokens={instTokens}
                      labels={vizLabels}
                      submissionCacheable={submissionCacheable}
                    />
                    {isProgressiveSubmission && (
                      <p className="text-muted-foreground mt-3 text-xs">
                        This diagram shows the prompt at its maximum size (completed paper). The simulation models the student writing progressively
                        — the &ldquo;{vizLabels.submission}&rdquo; segment grows from 0 to {subTokens.toLocaleString()} tokens
                        across {reqsPerStudent} messages (avg. ~{Math.round(effectiveSubTokens).toLocaleString()} tokens/message).
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Per-Request Breakdown — 2 columns */}
              <Card>
                <CardHeader>
                  <CardTitle>Per-Request Cost Analysis</CardTitle>
                  <CardDescription className="text-sm">Cost per individual API request</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`grid gap-4 ${supportsCaching ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground text-xs font-semibold">Without Caching</p>
                      <p className="text-foreground mt-1 text-xl font-medium">
                        {totalRequests > 0 ? formatCost(results.noCaching.total / totalRequests) : "$0.00"}
                      </p>
                      <p className="text-muted-foreground text-xs">per request</p>
                    </div>
                    {results.strategyA && (
                      <div className="p-4 rounded-lg bg-emerald-500/10">
                        <p className="text-muted-foreground text-xs font-semibold">With Caching</p>
                        <p className="text-foreground mt-1 text-xl font-medium">
                          {totalRequests > 0 ? formatCost(results.strategyA.total / totalRequests) : "$0.00"}
                        </p>
                        <p className="text-muted-foreground text-xs">per request</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function SliderInput({
  label,
  tooltip,
  icon,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  tooltip?: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  const [inputText, setInputText] = useState(String(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setInputText(String(value));
    }
  }, [value]);

  const commitValue = () => {
    const v = parseInt(inputText);
    if (!isNaN(v)) {
      const clamped = Math.min(max, Math.max(min, v));
      onChange(clamped);
      setInputText(String(clamped));
    } else {
      setInputText(String(value));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <Label className="text-sm">{label}</Label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs">{tooltip}</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => { isFocused.current = true; }}
            onBlur={() => {
              isFocused.current = false;
              commitValue();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-24 h-7 text-right text-sm"
            min={min}
            max={max}
            step={step}
          />
          {suffix && (
            <span className="text-muted-foreground text-xs w-10">{suffix}</span>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function CostLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs font-medium">{formatCost(value)}</span>
    </div>
  );
}
