# Reducing Inference Costs on Amazon Bedrock

## TL;DR

> When a teacher grades 30 essays with 5 feedback passes each, that's 150 LLM calls — and every one resends the same rubric, instructions, and source material at full price. This document explores how to stop paying for that repetition. The biggest wins come from **prompt caching** (up to 90% off repeated input) and **batch inference** (50% off for async work like grading), and the right choice depends on whether your workload is synchronous or asynchronous, and how much of the prompt is shared across requests. For live chat experiences, the calculus is different — we walk through what works there too. A companion [Workload Simulator](#/simulator) lets you plug in your own workload parameters and compare strategies side by side.

## Contents

- [The Cost Problem](#the-cost-problem)
- [The Models We're Using](#the-models-were-using)
- [How a Prompt Is Put Together](#how-a-prompt-is-put-together)
- [Tool 1: Prompt Caching](#tool-1-prompt-caching)
  - [Cache Time to Live (TTL)](#cache-time-to-live-ttl)
  - [How much should you cache?](#how-much-should-you-cache)
- [Tool 2: Batch Inference](#tool-2-batch-inference)
- [Tool 3: Managing Chat History Costs](#tool-3-managing-chat-history-costs)
  - [Sliding window](#sliding-window)
  - [Chat history summarization](#chat-history-summarization)
- [Choosing the Right Strategy](#choosing-the-right-strategy)

## The Cost Problem

Bedrock bills per token (≈ ¾ of a word) on both input and output. When you're making hundreds of similar requests — grading 30 students × 5 passes each against the same rubric — you're paying full price to resend the same instructions, rubric, and reference material every time.

Bedrock offers several levers to reduce this: **model selection**, **prompt caching**, **batch inference**, and **service tiers**. We also explore **chat summarization** for conversational workloads. Which lever saves the most depends on your workload — this document walks through each technique, and the companion [Workload Simulator](#/simulator) lets you model the cost impact with your own parameters.

## The Models We're Using

Model choice is the single biggest factor in your Bedrock bill.

**Claude Sonnet 4.5/4.6** — Primary model for GRAF+ grading and Clarity Chat. Supports prompt caching and batch inference.

```pricing-row
Claude Sonnet 4.6
```

**Claude Haiku 4.5** — Good for lower-complexity tasks: lighter rubrics, simpler chat, auxiliary processing. 3× cheaper than Sonnet with strong quality for straightforward work.

```pricing-row
Claude Haiku 4.5
```

**Amazon Nova 2 Lite** — Worth evaluating wherever it meets quality requirements — roughly **8× cheaper** than Sonnet. Supports batch inference (50% off) and automatic prompt caching. Nova also offers a **flex service tier**: same 50% discount as batch, but responses return immediately with just a couple seconds of added latency. If quality holds, the cost difference is hard to ignore.

```pricing-row
Amazon Nova 2 Lite
```

The cost-saving strategies below — caching, batching, summarization — compound on top of model selection. A 90% cache-read discount on Sonnet saves dollars; the same optimization on an already-cheap model saves pennies. The first question is always: *can a cheaper model do this job well enough?*

## How a Prompt Is Put Together

A typical LLM request has layers:

1. **Shared context** — instructions, rubric, source material (same for every student)
2. **Per-student content** — their essay, draft, or question
3. **Per-request instruction** — the specific ask ("grade the thesis statement")

Assembled into a prompt:

```
[Instructions & Rubric] → [Source Material] → [Student's Work] → [Specific Request]
 ◄─── same for everyone ──────────────────►   ◄── changes per student or per turn ──►
```

The key insight for caching: **how much of this prompt is repeated across requests, and how can we avoid paying full price for those repeated parts?**

```simulator-embed
{"template": "graf-simple", "show": ["prompt-visualizer"]}
```

## Tool 1: Prompt Caching

Prompt caching lets Bedrock remember the beginning of your prompt so subsequent requests don't pay full price for the same content. The constraint: caching only works on a **contiguous prefix** — it starts from the beginning and extends forward. You can't cache a middle segment. This is why prompt structure matters: stable content first, variable content last.

Pricing differs by provider:

- **Anthropic** (Claude): cache writes cost 1.25× input rate (5-min TTL), cache reads cost 0.1× — a **90% discount**.
- **Amazon Nova**: cache writes at standard input rate (no surcharge), cache reads at ~25% — a **75% discount**. Caching is automatic.

### Cache Time to Live (TTL)

Bedrock offers **5-minute** and **1-hour** TTLs. The 5-minute TTL has a lower write cost (1.25× on Anthropic); the 1-hour TTL costs more up front (2×) but persists longer. The 1-hour option is available on Sonnet 4.5+, Haiku 4.5, and Opus 4.5+.

**Grading workflows** (150 requests in a few minutes): 5-minute TTL is sufficient — the cache stays warm for the entire run. **Live chat** (student working over an hour): 5-minute TTL expires between turns whenever the student pauses. The 1-hour TTL keeps the cached context available for a realistic session.

The simulator lets you toggle TTL to see the cost impact. Note that simulations assume ideal, uninterrupted sessions — real-world cache expiries will erode savings modestly.

### How much should you cache?

Example: 30 students, 5 LLM calls each = 150 requests.

- **Assignment-level caching:** Cache instructions + rubric. All 150 requests read from cache at 90% off. Each student's essay is sent fresh. Best when shared material is large (e.g., full text of a novel as grounding context).

- **Submission-level caching:** Also cache each student's essay in the prefix. You pay a cache-write per student (30 writes), but the remaining 4 passes per student read the essay from cache too. Pays off when passes-per-student is high enough to recoup the per-student write cost.

The simulator shows exactly where one strategy overtakes the other.

```simulator-embed
{"template": "graf-simple", "show": ["cards", "bar", "sensitivity"], "hideBatch": true}
```

## Tool 2: Batch Inference

Batch inference gives a flat **50% discount** on all tokens (input and output). The trade-off: you submit all requests as a batch job and wait for results — officially up to 24 hours, though most jobs complete in minutes. It cannot be combined with caching.

For asynchronous workloads like grading, this is compelling.

```simulator-embed
{"template": "graf-simple", "show": ["cards", "bar", "sensitivity"]}
```

## Tool 3: Managing Chat History Costs

Caching and batching work well for async grading workflows. Live conversations are different: history grows every turn, and caching the full conversation means rewriting the cache each turn — including all the stable shared material. With 50K tokens of source text, a single cache rewrite costs more than sending chat history fresh many times over.

The practical approach: **cache only the stable prefix** (instructions + source material) and send conversation history as regular input. Two techniques keep history costs manageable:

### Sliding window

Keep the most recent 4–5 turns; older messages drop off. Costs stay flat regardless of session length. The trade-off: the AI loses context from earlier in the conversation.

This is the default approach in all chat-based simulator templates. Costs ramp as the window fills, then flatten at the cap. Caching the stable prefix provides a consistent discount on every turn.

```simulator-embed
{"template": "clarity-chat", "show": ["per-turn"]}
```

### Chat history summarization

Instead of letting old context vanish, periodically compress the full conversation into a short summary using a cheaper model (e.g., Haiku). Include the summary alongside the sliding window so the AI retains general awareness of the full conversation.

This is a **quality feature, not a cost-saving one** — you're spending tokens on summarization calls to improve memory. The cost question is whether caching the summary as part of the prefix saves enough to offset those calls. For most of our workloads (12–20 turns/student), it doesn't. At 40+ turns, the math starts to work. The simulator's "Clarity Chat XL" template lets you find the break-even point.

**Bottom line:** for the use cases modeled in the simulator, summarization probably doesn't justify its cost and complexity.

Compare the smooth cost curve of the sliding window with the sawtooth pattern below. Each summarization call fires when the history cap is reached, producing spikes and drops. The "Cache in Prefix" strategy has the lowest per-turn cost between spikes, but periodic cache rewrites when the summary updates eat into those savings.

```simulator-embed
{"template": "clarity-chat-xl", "show": ["cards", "sensitivity", "per-turn"]}
```

## Choosing the Right Strategy

Each scenario below maps to a template in the [Workload Simulator](#/simulator). Load a template, adjust parameters to match your workload, and compare strategies side by side.

| Your workload looks like… | Simulator template |
|---------------------------|------------|
| Grading student work with a rubric and modest shared context | [**GRAF+ Simple**](#/simulator?template=graf-simple) — compare assignment-level vs. submission-level caching, and batch inference |
| Same, but with large shared source material (a novel, textbook chapters) | [**GRAF+ w/ Context**](#/simulator?template=graf-literary) — see how a large shared prefix amplifies caching savings |
| A writing-assistant chatbot where students are actively drafting | [**Clarity Chat**](#/simulator?template=clarity-chat) — explore caching the stable assignment context while sending the live draft and chat history fresh |
| Same, but with longer sessions where the AI losing older context is a concern | [**Clarity Chat XL**](#/simulator?template=clarity-chat-xl) — evaluate whether chat summarization is worth the added cost and complexity |
| An interactive assignment where students chat with an AI grounded in source material | [**Interactive AI Assignment**](#/simulator?template=interactive-ai) — the strongest caching scenario, with large shared context and small per-turn input |
