import type { BedrockModel } from "./pricing-data";
import type { SegmentLabels } from "./prompt-visualizer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateKey = "graf-simple" | "graf-literary" | "clarity-chat" | "clarity-chat-xl" | "interactive-ai";
export type CacheTTL = "5min" | "1hour";
export type DisplayMode = "strategy-comparison" | "caching-insights";
export type InputMode = "simple" | "technical";
export type SensitivityParamKey = keyof TemplatePreset;

export interface TemplatePreset {
  students: number;
  reqsPerStudent: number;
  sysTokens: number;
  ctxTokens: number;
  subTokens: number;
  instTokens: number;
  outputTokens: number;
}

export interface TemplateMeta {
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

export interface CostBreakdown {
  cacheWrite: number;
  cacheRead: number;
  freshInput: number;
  output: number;
  guardrails: number;
  total: number;
}

export interface SumStrategyBreakdown extends CostBreakdown {
  summarizationCalls: number;
}

export interface SummarizationSim {
  historyPerTurn: number[];
  summarizationTurns: number[];
  totalHistoryTokensSent: number;
  avgHistoryPerTurn: number;
  numSummarizations: number;
  turnsPerCycle: number;
}

export interface SummarizationCostResult {
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TEMPLATES: Record<TemplateKey, TemplateMeta> = {
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

export const DEFAULT_TEMPLATE: TemplateKey = "graf-simple";

export const CHART_COLORS = {
  noCaching: "#f97316",
  cachePrefix: "#3b82f6",
  cacheSubmission: "#10b981",
  batch: "#a855f7",
  cacheRead: "#60a5fa",
  guardrails: "#6b7280",
  crossover: "#ef4444",
} as const;

export const SENSITIVITY_SAMPLE_POINTS: Record<SensitivityParamKey, number[]> = {
  students: [5, 10, 15, 20, 30, 50, 75, 100, 150, 200],
  reqsPerStudent: [1, 5, 10, 20, 50, 75, 100, 150, 200],
  sysTokens: [100, 500, 1000, 2000, 5000, 10000],
  ctxTokens: [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000],
  subTokens: [100, 500, 1000, 2000, 5000, 10000, 20000],
  instTokens: [50, 200, 500, 1000, 2000, 5000, 10000],
  outputTokens: [100, 500, 1000, 2000, 5000, 10000],
};

export const SENSITIVITY_INSIGHT: Record<SensitivityParamKey, string> = {
  students: "More students increase total requests, amplifying the savings from cache reads.",
  reqsPerStudent: "More requests per student increase cache-read utilization relative to the one-time cache write cost.",
  sysTokens: "System prompt tokens are cached, so larger system prompts modestly increase caching efficiency.",
  ctxTokens: "Larger shared contexts increase the caching benefit because more tokens are read from cache instead of re-sent as fresh input.",
  subTokens: "Submission tokens are sent fresh each request. In progressive-writing simulations, the draft grows linearly across messages, averaging half the final length.",
  instTokens: "Variable instruction tokens are always fresh input — changes here affect both strategies roughly equally.",
  outputTokens: "Output tokens are unaffected by input caching — changes affect both strategies equally.",
};

export const STRATEGY_TIEBREAK: Record<string, number> = {
  "Per-Assignment Cache": 0, "Chat Sum. — Cache in Prefix": 0,
  "Per-Submission Cache": 1, "Chat Sum. — Cache Prefix": 1,
  "Batch Inference": 2,
  "No Caching": 3, "Chat Sum. — No Cache": 3,
};

export const CHARS_PER_TOKEN = 4;
export const TOKENS_PER_WORD = 4 / 3;
export const WORDS_PER_TOKEN = 3 / 4;
export const GUARDRAILS_COST_PER_1K_UNITS = 0.15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatParamLabel(key: SensitivityParamKey, value: number): string {
  if (key === "students" || key === "reqsPerStudent") return `${value}`;
  return value >= 1000 ? `${value / 1000}K` : `${value}`;
}

export function formatCost(value: number): string {
  if (value < 0) return `-${formatCost(-value)}`;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function getCacheWritePrice(model: BedrockModel, cacheTTL: CacheTTL): number {
  const p = model.pricing;
  if (cacheTTL === "1hour" && p.cache_write_1hour_1k != null) {
    return p.cache_write_1hour_1k;
  }
  return p.cache_write_1k ?? 0;
}

// ---------------------------------------------------------------------------
// Cost calculation functions
// ---------------------------------------------------------------------------

export function computeStrategyA(
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

export function computeStrategyB(
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
    cacheWrite = students * (fullCachedTokens / 1000) * pWrite;
    cacheRead = students * (reqsPerStudent - 1) * (fullCachedTokens / 1000) * pRead;
    freshInput = totalRequests * (instTokens / 1000) * pInput;
  } else {
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

export function computeNoCaching(
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

export function computeBatch(
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

export function computeTokensPerExchange(outputTokens: number): number {
  return Math.round(outputTokens * 1.25);
}

export function computeAvgHistoryTokens(
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

export function computeHistoryAtTurn(
  turn: number,
  historyCap: number,
  outputTokens: number
): number {
  if (turn <= 1) return 0;
  const tpe = computeTokensPerExchange(outputTokens);
  return Math.min((turn - 1) * tpe, historyCap);
}

export function getEffectiveInstTokens(
  instTokens: number,
  reqsPerStudent: number,
  outputTokens: number,
  conversational: boolean
): number {
  if (!conversational) return instTokens;
  return computeAvgHistoryTokens(instTokens, reqsPerStudent, outputTokens);
}

// ---------------------------------------------------------------------------
// Progressive submission model
// ---------------------------------------------------------------------------

export function getEffectiveSubTokens(
  subTokens: number,
  reqsPerStudent: number,
  progressiveSubmission: boolean
): number {
  if (!progressiveSubmission || reqsPerStudent <= 1) return subTokens;
  return subTokens / 2;
}

export function computeSubTokensAtTurn(
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

export function simulateSummarization(
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

export function computeSummarizationCost(
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
// Summarization strategy compute functions
// ---------------------------------------------------------------------------

export function computeSumNoCaching(
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

export function computeSumCacheAssessment(
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

export function computeSumCacheSummary(
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

export function computeGuardrailsCost(
  totalRequests: number,
  studentInputTokensPerRequest: number,
  outputTokensPerRequest: number
): number {
  const evaluatedChars = (studentInputTokensPerRequest + outputTokensPerRequest) * CHARS_PER_TOKEN;
  const textUnits = evaluatedChars / 1000;
  return totalRequests * (textUnits / 1000) * GUARDRAILS_COST_PER_1K_UNITS;
}
