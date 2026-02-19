---
date: 2026-02-18T12:00:00Z
researcher: Copilot Agent
branch: main
repository: BedrockSimulator
topic: "Predefined simulation template presets (GRAF+ Literary Analysis, Clarity Chat, Interactive AI Assignment)"
tags: [research, codebase, simulation-templates, ui, cost-optimization]
status: complete
last_updated: 2026-02-18
last_updated_by: Copilot Agent
---

# Research: Predefined Simulation Template Presets

## Research Question

How should we add a "Simulation Template" toggle group to the Workload Simulator that lets users quickly switch between predefined parameter presets — **GRAF+ Literary Analysis** (current defaults), **Clarity Chat** (writing-assistant scenario), **Interactive AI Assignment** (character-interview scenario), and **Custom** (user-modified) — including auto-detection when the user departs from a template?

## Summary

The existing `workload-simulator.tsx` uses component-local `useState` hooks for all simulation parameters (class size, requests/student, and five prompt-segment token counts). Adding template presets requires:

1. **A new `simulationTemplate` state** (`"graf-literary"` | `"clarity-chat"` | `"interactive-ai"` | `"custom"`) with a toggle-group UI placed between the Model Selection card and the Class Parameters card.
2. **A preset definitions object** mapping each template to its default parameter values.
3. **An auto-switch-to-custom mechanism** — when any class param or prompt segment is changed by the user, set the template state to `"custom"`.
4. **Template reselection resets all params** back to the chosen template's defaults.
5. **Three distinct workload profiles** that fit within the existing calculation framework using different default values and label semantics. No changes to the core compute functions are needed.

The existing three-strategy comparison engine (`computeStrategyA`, `computeStrategyB`, `computeNoCaching`) works for all scenarios without modification. However, each template should display a **strategy relevance note** — for example, Clarity Chat's actively-changing draft makes Strategy B unrealistic, while Interactive AI Assignment's massive shared context makes caching dramatically valuable.

## Detailed Findings

### 1. Current State Management

All simulation parameters are independent `useState` calls in `workload-simulator.tsx`:

- `src/app/components/workload-simulator.tsx:173-185` — State declarations

```
students = 30, reqsPerStudent = 5
sysTokens = 1000, ctxTokens = 15000, subTokens = 2000
instTokens = 500, outputTokens = 1000
batchMode = false, guardrailsEnabled = false
pricingTier = "standard"
```

There is no external state management library; everything is component-local React state.

### 2. Current UI Structure (Left Panel)

The left panel is a vertical stack of three Cards:

| Card | Lines | Contents |
|------|-------|----------|
| **Model Selection** | 305-431 | Model dropdown, pricing tier, batch mode, guardrails |
| **Class Parameters** | 433-467 | Students slider, requests/student slider |
| **Prompt Segments** | 469-533 | 5 SliderInput controls (sys, ctx, sub, inst, output) |

The new template toggle group should go **between the Model Selection card and the Class Parameters card** as a new `<Card>` titled "Simulation Template".

### 3. UI Component Availability

The project uses **shadcn/ui** (Radix UI primitives). There is currently **no ToggleGroup component** installed. Options:

| Approach | Pros | Cons |
|----------|------|------|
| **A. Install `@radix-ui/react-toggle-group`** + add shadcn `toggle-group.tsx` | Consistent with existing patterns, accessible | One more dependency |
| **B. Use `<Button>` with variant toggling** | No new deps, simple | Manual a11y, less semantic |
| **C. Custom radio-button-group styled as pills** | Full control | More code to write |

**Recommendation: Approach A** — install `@radix-ui/react-toggle-group` and create a `toggle-group.tsx` in `src/app/components/ui/`. This is the standard shadcn pattern and gives us proper `role="radiogroup"` accessibility for free.

### 4. Template Preset Definitions

#### GRAF+ Literary Analysis (current defaults)

This is the existing "Essay Grading" use case. A teacher grades student essays against a shared book/rubric using an LLM.

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `students` | 30 | Typical class size |
| `reqsPerStudent` | 5 | Multi-turn grading passes |
| `sysTokens` | 1,000 | System prompt with grading instructions |
| `ctxTokens` | 15,000 | Full book excerpt or detailed rubric |
| `subTokens` | 2,000 | Student essay |
| `instTokens` | 500 | Per-turn grading command |
| `outputTokens` | 1,000 | Detailed feedback response |

Caching profile:
- **Strategy A**: Cache system + context (16K tokens shared across all requests)
- **Strategy B**: Cache system + context + submission (per-student checkpoint)

#### Clarity Chat (writing-assistant chatbot)

A writing-assistant chatbot where students interact with an AI while actively drafting a paper. **Critical distinction from GRAF+:** the student's draft is being written and edited in real time, so it changes on nearly every turn and **cannot be cached**. Only the system prompt and assignment-level context are stable enough to cache.

| Parameter | Default | Label Override | Tooltip Override |
|-----------|---------|----------------|------------------|
| `students` | 30 | "Active Students" | "Number of students using the chat concurrently." |
| `reqsPerStudent` | 12 | "Messages per Session" | "Average back-and-forth messages per student writing session." |
| `sysTokens` | 800 | "System Prompt" | "Writing assistant instructions and persona." |
| `ctxTokens` | 3,000 | "Assignment Context" | "Assignment description, rubric, and reference materials (cacheable)." |
| `subTokens` | 3,000 | "Student Draft (Live)" | "The student's current paper draft — changes every turn, always sent as fresh input." |
| `instTokens` | 2,000 | "Chat History (Capped)" | "Recent conversation history, capped at last ~4-5 exchanges for cost control." |
| `outputTokens` | 600 | "AI Response" | "Expected chat response length." |

##### Why the Draft Cannot Be Cached

In GRAF+ the student essay is submitted once and graded multiple times — it's stable across requests for the same student, making Strategy B (deep caching) viable. In Clarity Chat, the student is actively writing and revising their paper between each message. The draft is different on nearly every API call, so:

- **Strategy B is unrealistic**: It would pay a cache-write on every single request (since `subTokens` changes each turn), negating the read savings entirely.
- **Strategy A is the only meaningful caching play**: Cache system prompt + assignment context (3.8K tokens). Everything else — draft + chat history — is fresh input every turn.

The simulator will still compute Strategy B mathematically (the engine is scenario-agnostic), but a **strategy note** should appear for this template indicating that Strategy B's numbers assume the draft is stable per-student, which isn't realistic for a live-writing scenario. Strategy A is the recommended comparison point.

##### Cost Optimization Decision: Chat History Strategy

Three approaches were evaluated for handling growing chat history:

| Strategy | Description | Cost Impact | Complexity |
|----------|-------------|-------------|------------|
| **Full history every turn** | Send entire conversation | O(n²) token growth, very expensive | Simplest code |
| **Periodic cache checkpoints** | Cache conversation snapshots, only send delta | Lower cost, needs cache invalidation logic | High complexity |
| **Capped sliding window** | Keep last N messages (~2K tokens cap) | Predictable, flat cost per turn | Simple, effective |

**Recommendation: Capped sliding window (Option 3).** This is the most cost-effective approach because:
- It keeps per-request token counts **flat and predictable** regardless of session length
- It avoids the cache-write overhead of periodic checkpoints (which adds up with 30+ students × 12+ turns)
- It maps cleanly to the existing `instTokens` ("Variable Instruction") field — we simply relabel it as "Chat History (Capped)" and set a higher default (2,000 tokens ≈ last 4-5 exchanges)

Caching profile:
- **Strategy A** (recommended): Cache system + assignment context (3.8K tokens shared). Fresh: draft + chat history (5K tokens).
- **Strategy B** (not realistic): Would attempt to cache draft per-student, but draft changes every turn, so cache-write cost is paid every request with no read savings.

#### Interactive AI Assignment (character-interview scenario)

A teacher provides extensive source material — textbook chapters, a novel, historical documents — and students interview fictional or historical characters drawn from that material. This is the **strongest caching use case** of all templates because the shared context is enormous and completely stable.

| Parameter | Default | Label Override | Tooltip Override |
|-----------|---------|----------------|------------------|
| `students` | 30 | "Students" | "Number of students doing the assignment." |
| `reqsPerStudent` | 20 | "Interview Turns" | "Average Q&A exchanges per student interview session." |
| `sysTokens` | 1,500 | "System Prompt" | "Character persona, interview rules, and behavioral instructions." |
| `ctxTokens` | 50,000 | "Source Material" | "Textbook chapters, novel text, or primary sources shared across all students (cacheable)." |
| `subTokens` | 500 | "Student Question" | "The student's interview question or prompt for the current turn." |
| `instTokens` | 2,000 | "Conversation Context" | "Recent interview exchange history, capped sliding window for cost control." |
| `outputTokens` | 800 | "Character Response" | "The AI character's response to the student's question." |

##### Why This Template Maximizes Caching Value

The source material (textbook chapters, novel, etc.) is:
- **Very large** (~50K tokens) — making the per-token cache-read discount highly impactful
- **Identical for every student** doing the same assignment — one cache-write serves all
- **Completely stable** — it never changes during the assignment

Meanwhile, the fresh input per request is relatively small (~2,500 tokens: question + conversation context). This creates a very favorable ratio of cached-to-fresh tokens.

With 20 turns per student, conversation context grows over the session. See **Section 4a** below for why we use a capped sliding window (2K tokens) rather than attempting to cache the growing conversation history.

Caching profile:
- **Strategy A** (very effective): Cache system + source material (51.5K tokens). Fresh: student question + conversation context (2,500 tokens). The savings are dramatic — the vast majority of input tokens are cache-reads.
- **Strategy B** (marginal improvement): Cache system + source material + student question (52K tokens per student). Adds only 500 tokens to the cached prefix, so the extra cache-write cost per student may not be worthwhile. Strategy A is likely the winner here.

Strategy note: For this template, caching vs. no-caching will show the **most dramatic cost difference** of any scenario. Strategy A vs. Strategy B will be close, with Strategy A likely winning because the student question is so small that caching it per-student isn't worth the write overhead.

### 4a. Why Caching Chat History Is Not Cost-Effective

For both Clarity Chat and Interactive AI Assignment, a natural question arises: **why not cache the growing conversation history?** This section works through the economics to show why it's counterproductive, especially with large shared contexts.

#### How Prompt Caching Works

Bedrock prompt caching caches a **contiguous prefix** of the prompt. The prompt structure looks like:

```
[System Prompt] [Shared Context] [Conversation History] [Current Message]
      ↑ cached prefix extends rightward →
```

To cache conversation history, you must include it in the cached prefix. But history grows every turn (each exchange adds ~1K tokens), which means the cached prefix **must be re-written every turn**.

#### The Critical Math: Cache Write > Fresh Input Price

Using Claude Sonnet 4.6 as a reference (typical Anthropic pricing ratios):
- `input_1k` = base price (1.0×)
- `cache_write_1k` = 1.25× input price
- `cache_read_1k` = 0.1× input price

When content changes every turn, you get exactly **one write and one read** per cache entry. The per-token cost cycle for that content is:

```
Cache approach:  write (1.25×) + read (0.1×) = 1.35× per two-turn cycle
Fresh approach:  input (1.0×) + input (1.0×)  = 2.0×  per two-turn cycle
```

At first glance, caching looks cheaper (1.35× vs 2.0×). But this ignores the **collateral damage**: re-writing the cache forces you to re-write the **entire prefix**, including the shared context that was already cached and getting cheap reads.

#### The Collateral Damage: Re-Writing Stable Tokens

Consider Interactive AI Assignment at turn 10, with 10K of accumulated history:

**Option A: Cache only shared context (51.5K), send history fresh**
- Cache read: 51.5K × 0.1× = 5.15K cost-units
- Fresh input: 10K × 1.0× = 10K cost-units
- **Total: 15.15K cost-units**

**Option B: Re-write cache to include history (51.5K + 10K = 61.5K)**
- Cache write: 61.5K × 1.25× = 76.875K cost-units
- (Next turn reads: 61.5K × 0.1× = 6.15K cost-units)
- **Write alone: 76.875K cost-units** — already 5× more expensive than Option A's total

The 51.5K of source material was already cached for free reads. Re-writing the cache to add 10K of history means paying 1.25× on all 61.5K tokens — including re-paying the write cost for 51.5K tokens that didn't change. The write cost for just the shared-context portion ($51.5K × 1.25× = 64.375K$) vastly exceeds what you save by caching 10K of history.

#### When Would Caching History Be Worthwhile?

Caching content that changes every turn is only viable when you get **multiple reads per write** — for example, if a batch of requests all share the same conversation state. In a standard chat interaction (one request per turn, history grows each turn), this never happens.

The break-even condition for a single read:
```
S × cache_write < H × (input - cache_read - cache_write)
```
Where S = shared context tokens, H = history tokens. With standard Anthropic pricing ratios, `input - cache_read - cache_write = 1.0 - 0.1 - 1.25 = -0.35`. This is **negative**, meaning the inequality can never be satisfied regardless of history size when the shared context is non-trivial.

#### Conclusion: Capped Sliding Window for All Chat Scenarios

For all templates with conversation history (Clarity Chat, Interactive AI), the optimal approach is:

1. **Cache the stable shared prefix** (system prompt + shared context) — written once, read many times
2. **Send conversation history as fresh input** — cheaper than re-writing the entire cache prefix each turn
3. **Cap the history with a sliding window** (~2K tokens, last 4-5 exchanges) to keep fresh-input costs flat and predictable

This is why `instTokens` is set to 2,000 for both Clarity Chat and Interactive AI — it represents a capped conversation history window sent as fresh input each turn.

### 5. Auto-Switch to Custom Logic

When the user manually changes any of these values, the template state should switch to `"custom"`:
- `students`, `reqsPerStudent`
- `sysTokens`, `ctxTokens`, `subTokens`, `instTokens`, `outputTokens`

Implementation approach: wrap setter functions so that any change also sets `setSimulationTemplate("custom")`. For example:

```typescript
const handleStudentsChange = (v: number) => {
  setStudents(v);
  setSimulationTemplate("custom");
};
```

Or, more elegantly, create a generic wrapper:

```typescript
function makeTemplateAwareSetter<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
  return (value: T) => {
    setter(value);
    setSimulationTemplate("custom");
  };
}
```

### 6. Label/Tooltip Customization per Template

The prompt segment labels and tooltips should change based on the active template. The current `SliderInput` component already accepts `label` and `tooltip` props. We need a lookup table:

```typescript
const TEMPLATE_LABELS = {
  "graf-literary": {
    students: { label: "Class Size (Students)" },
    reqsPerStudent: { label: "Requests per Student" },
    sysTokens: { label: "System Prompt", tooltip: "The shared system instructions sent with every request." },
    ctxTokens: { label: "Shared Context (Book/Rubric)", tooltip: "Reference material shared across all students (e.g., the book or grading rubric)." },
    subTokens: { label: "Student Submission", tooltip: "The unique essay text for each student." },
    instTokens: { label: "Variable Instruction", tooltip: "The specific grading command for each turn." },
    outputTokens: { label: "Expected Output", tooltip: "Estimated output tokens per response." },
  },
  "clarity-chat": {
    students: { label: "Active Students" },
    reqsPerStudent: { label: "Messages per Session" },
    sysTokens: { label: "System Prompt", tooltip: "Writing assistant instructions and persona." },
    ctxTokens: { label: "Assignment Context", tooltip: "Assignment description, rubric, and reference materials (cacheable)." },
    subTokens: { label: "Student Draft (Live)", tooltip: "The student's current paper draft — changes every turn, always sent as fresh input." },
    instTokens: { label: "Chat History (Capped)", tooltip: "Recent conversation history, capped at last ~4-5 exchanges." },
    outputTokens: { label: "AI Response", tooltip: "Expected chat response length." },
  },
  "interactive-ai": {
    students: { label: "Students" },
    reqsPerStudent: { label: "Interview Turns" },
    sysTokens: { label: "System Prompt", tooltip: "Character persona, interview rules, and behavioral instructions." },
    ctxTokens: { label: "Source Material", tooltip: "Textbook chapters, novel text, or primary sources shared across all students (cacheable)." },
    subTokens: { label: "Student Question", tooltip: "The student's interview question or prompt for the current turn." },
    instTokens: { label: "Conversation Context", tooltip: "Recent interview exchange history, capped sliding window sent as fresh input." },
    outputTokens: { label: "Character Response", tooltip: "The AI character's response to the student's question." },
  },
};
```

When `"custom"` is active, retain whatever labels were last shown (i.e., from the template the user started with before customizing).

### 7. Calculation Engine Compatibility

The three compute functions (`computeStrategyA`, `computeStrategyB`, `computeNoCaching`) at lines 34-138 are **fully generic**. They operate on:
- `sysTokens`, `ctxTokens`, `subTokens`, `instTokens`, `outputTokens`
- `students`, `reqsPerStudent`

These are semantic-agnostic — they don't care whether `subTokens` represents an essay, a live draft, or a student question. **No changes to the compute functions are needed.**

However, the **interpretation** of Strategy B differs by template:
- **GRAF+**: Strategy B is fully valid — the essay is stable per-student.
- **Clarity Chat**: Strategy B is misleading — the draft changes every turn, so per-student caching of `subTokens` doesn't help. A **strategy caveat note** should be shown.
- **Interactive AI Assignment**: Strategy B offers marginal improvement — the student question is so small (~500 tokens) that caching it per-student adds negligible savings over Strategy A.

The `PromptVisualizer` component (`prompt-visualizer.tsx:1-104`) hardcodes segment labels ("System Prompt", "Context/Rubric", "Submission", "Instruction"). These should be made dynamic based on the active template, accepting custom labels as props.

### 8. Description Text and Strategy Notes

The page subtitle at line 298 currently says:
```
Simulate the "Essay Grading" workload and compare caching strategies...
```

This should update dynamically based on the selected template:
- **GRAF+**: "Simulate an essay grading workload with GRAF+ literary analysis and compare caching strategies."
- **Clarity Chat**: "Simulate a writing-assistant chatbot workload and compare caching strategies."
- **Interactive AI Assignment**: "Simulate a character-interview assignment workload and compare caching strategies."
- **Custom**: "Simulate a custom workload and compare caching strategies."

Each template should also display a **strategy relevance note** in the results panel:

| Template | Note |
|----------|------|
| GRAF+ | *(none — both strategies are valid)* |
| Clarity Chat | "Note: Strategy B assumes the student draft is stable per-student. In a live-writing scenario, the draft changes every turn — Strategy A is the realistic caching comparison. Chat history is sent as fresh input (capped sliding window) because re-writing the cache each turn is more expensive than fresh reads." |
| Interactive AI | "Note: The large shared source material makes caching extremely valuable. Strategy A and B perform similarly because the student question is small. Conversation history is sent as fresh input — re-writing the 50K+ cache prefix each turn to include history would cost far more than sending history as fresh tokens." |
| Custom | *(none)* |

## Code References

- `FE-BedrockCostOptimizer/src/app/components/workload-simulator.tsx:161-185` — Component state declarations
- `FE-BedrockCostOptimizer/src/app/components/workload-simulator.tsx:34-138` — Compute strategy functions (unchanged)
- `FE-BedrockCostOptimizer/src/app/components/workload-simulator.tsx:293-534` — Left panel JSX (insertion point for template UI)
- `FE-BedrockCostOptimizer/src/app/components/workload-simulator.tsx:812-870` — SliderInput component (already supports dynamic label/tooltip)
- `FE-BedrockCostOptimizer/src/app/components/prompt-visualizer.tsx:36-49` — Hardcoded segment labels (needs template awareness)
- `FE-BedrockCostOptimizer/src/app/components/pricing-data.ts:1-48` — Data types (unchanged)
- `FE-BedrockCostOptimizer/src/app/components/ui/button.tsx:1-58` — Button component with variants (useful for toggle styling)
- `FE-BedrockCostOptimizer/package.json:13-28` — Current dependencies (need `@radix-ui/react-toggle-group`)

## Architecture Insights

1. **The existing cost model is scenario-agnostic.** The five token segments + two class params map cleanly to all three scenarios. This is good design — the templates are just preset "skins" over the same engine.

2. **But strategy interpretation is NOT scenario-agnostic.** Strategy B assumes `subTokens` is stable per-student (changes between students but not between turns). This is true for GRAF+ (essays) and Interactive AI (questions), but false for Clarity Chat (live drafts). The UI should surface this distinction with per-template strategy notes.

3. **The three templates span the caching value spectrum:**
   - **Clarity Chat**: Minimal caching value (small shared context, large fresh input every turn)
   - **GRAF+**: Moderate caching value (medium shared context, submission stable per-student)
   - **Interactive AI**: Maximum caching value (enormous shared context, tiny fresh input)
   
   This gives users an excellent mental model of when caching matters.

4. **Component-local state is fine for this scope.** No need to introduce a state management library. The template state is another `useState` that coordinates with existing state.

5. **The toggle group pattern** (four mutually-exclusive buttons: 3 templates + Custom) is semantically a **single-select radio group**, which is what `@radix-ui/react-toggle-group` with `type="single"` provides.

6. **The "Custom" toggle is implicit** — it's auto-selected when the user deviates from a template. It should be visually distinct (e.g., outlined/ghost style) to indicate it's a fallback rather than a first-class preset.

7. **Template selection should NOT affect**: model selection, pricing tier, batch mode, or guardrails toggle. Those are infrastructure choices independent of the workload scenario.

## Implementation Plan (for downstream agent)

1. Install `@radix-ui/react-toggle-group` via npm
2. Create `src/app/components/ui/toggle-group.tsx` (shadcn pattern)
3. Define `SimulationTemplate` type and `TEMPLATE_PRESETS` constant (all three templates + custom)
4. Add `simulationTemplate` state and template-selection handler to `WorkloadSimulator`
5. Insert template toggle-group Card between Model Selection and Class Parameters (4 buttons: GRAF+ Literary Analysis, Clarity Chat, Interactive AI Assignment, Custom)
6. Wrap all class-param and prompt-segment setters with auto-custom detection
7. Update SliderInput labels/tooltips to be template-aware
8. Update page subtitle to reflect selected template
9. Add per-template strategy relevance notes to the results panel
10. Make `PromptVisualizer` labels template-aware (accept custom segment labels as props)

## Open Questions

1. ~~Should the PromptVisualizer segment labels also change per template?~~ **Yes** — confirmed, will implement.
2. ~~Should template selection persist across page navigations?~~ **No** — not needed.
3. ~~Should the "Custom" button show a reset option?~~ **No** — reselecting a template is sufficient.
4. ~~Chat history cap for Clarity Chat~~ — 2,000 tokens is good, the slider handles customization.
5. **Strategy B caveat for Clarity Chat**: Should the UI (a) show a warning banner next to Strategy B results, (b) visually de-emphasize Strategy B, or (c) just add a text note? Recommend (a) — a small info banner similar to the existing "cache pricing not published" warning.
6. **Future templates**: The architecture should make it trivial to add more presets (e.g., "Code Review", "Q&A Bot"). The preset definitions object is extensible.
7. **Interactive AI source material size**: 50K tokens is a reasonable default for a few textbook chapters or a short novel. Some source material could be much larger (100K+), but the slider max should accommodate this.
