import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

interface PromptSegment {
  label: string;
  tokens: number;
  type: "cached-shared" | "cached-unique" | "fresh";
}

export interface SegmentLabels {
  system: string;
  context: string;
  submission: string;
  instruction: string;
}

interface PromptVisualizerProps {
  strategy: "A" | "B" | "caching";
  systemTokens: number;
  contextTokens: number;
  submissionTokens: number;
  instructionTokens: number;
  labels?: SegmentLabels;
  submissionCacheable?: boolean;
  strategyLabel?: string;
}

const defaultLabels: SegmentLabels = {
  system: "System Prompt",
  context: "Context/Rubric",
  submission: "Submission",
  instruction: "Instruction",
};

const segmentColors = {
  "cached-shared": "bg-blue-500",
  "cached-unique": "bg-emerald-500",
  fresh: "bg-orange-500",
};

const segmentLegend = {
  "cached-shared": "Cached (Assignment-Level)",
  "cached-unique": "Cached (Submission-Level)",
  fresh: "Fresh Input",
};

const defaultStrategyLabels: Record<string, string> = {
  A: "Per-Assignment Cache: Prompt Structure",
  B: "Per-Submission Cache: Prompt Structure",
  caching: "Caching: Prompt Structure",
};

export function PromptVisualizer({
  strategy,
  systemTokens,
  contextTokens,
  submissionTokens,
  instructionTokens,
  labels = defaultLabels,
  submissionCacheable = true,
  strategyLabel,
}: PromptVisualizerProps) {
  const strategyBSubmissionType: PromptSegment["type"] =
    submissionCacheable ? "cached-unique" : "fresh";

  const segments: PromptSegment[] =
    strategy === "A" || strategy === "caching"
      ? [
          { label: labels.system, tokens: systemTokens, type: "cached-shared" },
          { label: labels.context, tokens: contextTokens, type: "cached-shared" },
          { label: labels.submission, tokens: submissionTokens, type: "fresh" },
          { label: labels.instruction, tokens: instructionTokens, type: "fresh" },
        ]
      : [
          { label: labels.system, tokens: systemTokens, type: "cached-shared" },
          { label: labels.context, tokens: contextTokens, type: "cached-shared" },
          { label: labels.submission, tokens: submissionTokens, type: strategyBSubmissionType },
          { label: labels.instruction, tokens: instructionTokens, type: "fresh" },
        ];

  const totalTokens = segments.reduce((sum, s) => sum + s.tokens, 0);
  const heading = strategyLabel ?? defaultStrategyLabels[strategy] ?? `Strategy ${strategy}: Prompt Structure`;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">
        {heading}
      </p>

      <div className="flex rounded-lg overflow-hidden h-10 border border-border">
        {segments.map((seg) => {
          const pct = (seg.tokens / totalTokens) * 100;
          if (pct < 1) return null;
          return (
            <Tooltip key={seg.label}>
              <TooltipTrigger asChild>
                <div
                  className={`${segmentColors[seg.type]} flex items-center justify-center min-w-[2px] transition-all cursor-default border-r border-background/20 last:border-r-0`}
                  style={{ width: `${pct}%` }}
                >
                  {pct > 12 && (
                    <span className="text-white truncate px-1 text-xs font-medium">
                      {seg.label}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs">
                  {seg.label}: {seg.tokens.toLocaleString()} tokens ({pct.toFixed(1)}%)
                </span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4">
        {Object.entries(segmentColors).map(([type, color]) => {
          const matchingSegments = segments.filter((s) => s.type === type);
          if (matchingSegments.length === 0) return null;
          const totalForType = matchingSegments.reduce((sum, s) => sum + s.tokens, 0);
          return (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              <span className="text-muted-foreground text-xs">
                {segmentLegend[type as keyof typeof segmentLegend]} ({totalForType.toLocaleString()} tokens)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
