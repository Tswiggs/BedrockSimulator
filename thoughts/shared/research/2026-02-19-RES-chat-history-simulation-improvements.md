---
date: 2026-02-19T12:00:00Z
researcher: Cursor Agent
branch: main
repository: BedrockSimulator
topic: "Chat history simulation improvements: graduated accumulation, summarization strategy, and summary caching break-even analysis"
tags: [research, codebase, simulation, chat-history, summarization, caching, cost-optimization]
status: complete
last_updated: 2026-02-19
last_updated_by: Cursor Agent
---

# Research: Chat History Simulation Improvements

## Research Question

How should the simulator model chat history accumulation for conversational templates (Clarity Chat, Interactive AI), and when does it make economic sense to summarize conversation history and/or cache that summary in the prompt prefix?

## Summary

The previous implementation treated `instTokens` (chat history) as a fixed constant per turn — every request assumed the full 2,000-token cap was being sent. This overestimates costs by 12-21% because real conversations start with zero history and accumulate gradually. Three improvements were implemented:

1. **Graduated accumulation model** — replaces the flat cap with a realistic ramp-up average
2. **Summarization strategy comparison** — models periodic LLM-based history compression
3. **Summary caching break-even analysis** — determines when caching the compressed summary in the prompt prefix is cost-effective

## Detailed Findings

### 1. Graduated Chat History Accumulation

#### The Problem

The simulator's cost functions multiplied `totalRequests * instTokens` uniformly. For a 12-turn Clarity Chat session with a 2,000-token cap, this charged 2,000 tokens of fresh history input for every turn — including Turn 1 (which has no history).

#### The Model

Each turn adds approximately `outputTokens * 1.25` tokens to the conversation history (AI response + estimated user message). History grows linearly until it hits the cap, then stays flat:

```
historyAtTurn(t) = min((t-1) * tokensPerExchange, historyCap)
```

The average across all turns:

```
rampCount = min(ceil(cap / tokensPerExchange), N)
rampSum = tokensPerExchange * rampCount * (rampCount - 1) / 2
cappedSum = cap * max(0, N - rampCount)
avgPerTurn = (rampSum + cappedSum) / N
```

#### Impact

| Template | Turns | Cap | Avg/Turn | Overestimate Fixed |
|---|---|---|---|---|
| Clarity Chat | 12 | 2,000 | 1,583 | 21% |
| Interactive AI | 20 | 2,000 | 1,750 | 12.5% |

The `getEffectiveInstTokens()` function computes this average and passes it to all existing cost functions without modifying the functions themselves. Sensitivity analysis sweeps also use the graduated model per data point.

### 2. Summarization Strategy

#### How It Works

When conversation history reaches the cap, instead of truncating via sliding window, an LLM call compresses the full history into a smaller summary:

1. History accumulates normally: 0, tpe, 2\*tpe, ...
2. When `history >= cap`: LLM summarization call (input = system prompt + full history, output = summary)
3. History resets to `summarySize` tokens (e.g., 500)
4. History grows again on top of the summary
5. Repeat when cap is reached again

Each summarization cycle has `ceil((cap - summarySize) / tokensPerExchange)` turns.

#### Cost Components

- **Savings**: reduced fresh input tokens for history across all turns
- **Extra cost**: summarization LLM calls (input + output tokens)

#### Example: Clarity Chat (12 turns, cap=2000, tpe=500, summarySize=500)

Without summarization: 19,000 total history tokens, avg 1,583/turn
With summarization: 10,500 total history tokens, avg 875/turn, 3 summarization calls

Using Claude Sonnet 4.6 ($0.003/1K input, $0.015/1K output):
- History savings: (19,000 - 10,500) / 1000 × $0.003 = $0.0255/student
- Summarization cost: 3 × [(3,000/1000 × $0.003) + (500/1000 × $0.015)] = $0.0495/student
- **Net: $0.024 MORE expensive per student**

#### When Summarization Pays Off

Summarization with the same model is typically a net loss for short-to-medium sessions because the summarization call itself is expensive. It becomes viable when:

- Sessions are very long (50+ turns) where summarization calls are fewer relative to total turns
- A cheaper model is used for summarization (e.g., Haiku at $0.0008/1K input, $0.0032/1K output)
- The history cap is large (10K+ tokens), making the fresh input savings more significant
- Context quality matters — summarization preserves meaning better than truncation

### 3. Summary Caching Break-Even Analysis

#### The Key Insight

The original research (2026-02-18) concluded that caching conversation history is **never** cost-effective because it changes every turn, forcing a full prefix rewrite. However, a **summary** is fundamentally different — it only changes every K turns, providing K-1 free cache reads per write.

#### The Break-Even Formula

Comparing two options over K turns between re-summarizations:

- **Option A (summary as fresh input)**: `K * P * pRead + K * S * pInput`
- **Option B (summary cached in prefix)**: `(P + S) * pWrite + (K-1) * (P + S) * pRead`

Where P = cached prefix size (system + context), S = summary size.

Solving B < A:

```
K > (P + S) * (pWrite - pRead) / (S * (pInput - pRead))
```

With standard 5-minute cache pricing (pWrite = 1.25× input, pRead = 0.1× input):

```
K > 1.278 * (P/S + 1)
```

With 1-hour cache pricing (pWrite = 2× input):

```
K > 2.111 * (P/S + 1)
```

#### Break-Even Table (S = 500 token summary, 5-min cache)

| Prefix (P) | Example | Min K | Viable? |
|---|---|---|---|
| 1,000 | Minimal system prompt | 4 turns | Very viable |
| 2,000 | Small assignment context | 6 turns | Viable |
| 3,000 | Clarity Chat | 9 turns | Viable at 12 turns/session |
| 5,000 | Medium context | 14 turns | Viable at 20 turns/session |
| 10,000 | Larger rubric/reference | 27 turns | Long sessions only |
| 50,000 | Interactive AI (full novel) | 129 turns | Not practical |

#### Why the Previous Analysis Was Incomplete

The 2026-02-18 research analyzed caching **raw growing history** (changes every turn → 1 write, 1 read per entry). A summary changes every K turns → 1 write, K-1 reads per entry. The collateral damage of rewriting the prefix still applies, but with small prefixes, the amortization over K reads makes it net positive.

The critical ratio is `P/S` (prefix-to-summary ratio). When the prefix is small relative to the summary, the rewrite cost is modest and quickly recovered through cache reads. When the prefix is large (like 50K for Interactive AI), the rewrite cost dominates.

## Implementation

### Files Modified

- `FE-BedrockCostOptimizer/src/app/components/workload-simulator.tsx`

### Functions Added

- `computeTokensPerExchange(outputTokens)` — estimates tokens per conversation exchange
- `computeAvgHistoryTokens(historyCap, reqsPerStudent, outputTokens)` — graduated model average
- `computeHistoryAtTurn(turn, historyCap, outputTokens)` — history at a specific turn
- `getEffectiveInstTokens(instTokens, reqs, output, conversational)` — routes to graduated or flat model
- `simulateSummarization(reqs, cap, output, summarySize)` — per-turn simulation with summarization
- `computeSummarizationCost(...)` — full cost comparison including break-even analysis

### UI Changes

- Graduated model annotation below the Chat History slider (shows avg tokens/turn and ramp info)
- Per-Turn Cost chart in caching-insights mode (shows cost ramp-up per turn for single student)
- Conversation Management card in left panel (toggle summarization, set summary size)
- Summarization Strategy Analysis card in right panel (sliding window vs. summarization comparison, cost breakdown, break-even indicator)
- Summary caching break-even section (prefix size, summary size, turns/cycle, viability assessment)

### Template Changes

- Added `conversational: boolean` to `TemplateMeta` interface
- `graf-simple`, `graf-literary`: `conversational: false`
- `clarity-chat`, `interactive-ai`: `conversational: true`

## Open Questions

1. **Summarization model selection**: Currently uses the same model for summarization calls. A cheaper model (e.g., Haiku) could shift the economics significantly. Consider adding a secondary model dropdown.
2. **Summary quality vs. size**: The simulator models the token cost but not the quality trade-off. Smaller summaries save more tokens but lose more context. This is a UX/quality decision beyond cost optimization.
3. **Multi-level summarization**: For very long sessions, you could summarize the summary (hierarchical compression). Not modeled currently.
4. **Bedrock cache breakpoints**: If Bedrock adds support for multiple cache breakpoints (partial prefix matching), the summary could be cached independently of the shared context, eliminating collateral rewrite costs entirely.
