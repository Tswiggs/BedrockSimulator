# Reducing Inference Costs on Amazon Bedrock

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

Every time your application calls an LLM through Bedrock, you're billed based on how much text you send in (the **prompt**) and how much text the model generates back (the **response**). Both are measured in **tokens** — roughly ¾ of a word each. When you're running the same kind of request hundreds or thousands of times — say, grading every student's paper against the same rubric — those costs add up fast because you're sending the same rubric, instructions, and reference material over and over again.

Bedrock gives us some tools to bring those costs down: **model selection**, **service tiers**, **prompt caching**, **batch inference**. Additionally we will explore **chat summarization** as a cost saving technique for chat experiences. Which one saves you the most depends on your workload. I've built a simulator to help answer that question, and this document walks through what I learned.

## The Models We're Using

The biggest single factor in your Bedrock bill is which model you choose. Here are some we're currently working with:

**Claude Sonnet 4.5/4.6** is our primary model for GRAF+ grading and Clarity Chat features. It's capable enough for nuanced feedback and writing assistance, and at $3.00 / $15.00 per million tokens (input / output), it sits in the mid-range of Anthropic's lineup. Sonnet supports prompt caching but not batch inference on Bedrock.

**Claude Haiku 4.5** is a good fit for lower-complexity tasks — lighter grading rubrics, simpler chat interactions, or auxiliary processing steps that don't need a larger model. At $1.00 / $5.00 per million tokens, it's 3× cheaper than Sonnet with surprisingly good quality for straightforward work.

**Amazon Nova 2 Lite** is worth evaluating for any workload where it meets quality requirements. Amazon is currently pricing it at $0.30 / $2.50 per million tokens — roughly **8× cheaper** than Sonnet on average for our workloads. It also supports batch inference (another 50% off) and automatic prompt caching. Amazon's Nova models also offer a **flex service tier** — you accept a couple of seconds of added latency per request and get the same 50% discount as batch inference, but responses come back immediately rather than requiring you to wait for a batch job to complete. If a Nova 2 Lite evaluation shows acceptable quality for a given task, the cost difference is hard to ignore.

The cost-saving strategies in this document — caching, batching, summarization — all compound on top of model selection. A 90% cache-read discount on Sonnet saves dollars; the same optimization on an already-cheap model saves pennies. In practice, the first question is always "can a cheaper model do this job well enough?" and the techniques below help you optimize from there.

## How a Prompt Is Put Together

A typical request to an LLM has layers. Think of a teacher handing out an essay assignment. There's context that's the same for every student in the class — the instructions, the grading rubric, maybe the full text of the book they're writing about. Then there's content that's specific to each student — their essay, their question, their draft. Finally, there's the specific ask for this particular request — "grade the thesis statement" or "give feedback on paragraph 3."

When we send all of this to Bedrock, it gets assembled into a single prompt:

```
[Instructions & Rubric] → [Source Material] → [Student's Work] → [Specific Request]
 ◄─── same for everyone ──────────────────►   ◄── changes per student or per turn ──►
```

The key to the Prompt Caching cost-saving strategy is: **how much of this prompt is repeated across requests, and what can we do to avoid paying full price for the repeated parts?**

![The Prompt Visualizer from the simulator, showing which segments of a prompt are shared across all students (blue), specific to one student (green), and unique to each request (orange).](figure_1_prompt_structure.png)

## Tool 1: Prompt Caching

Prompt caching lets Bedrock remember the beginning of your prompt so you don't have to pay full price to send it again. The catch is that caching only works on a **contiguous prefix** — meaning it starts from the very beginning of the prompt and extends forward. You can't cache something in the middle. This is why prompt structure matters: stable, shared content goes first, and the parts that change go at the end.

The exact pricing depends on the model provider. For **Anthropic models** (Claude Sonnet, Haiku, Opus), the first request pays a surcharge to write the prefix to cache (1.25× the normal input rate for a 5-minute TTL), and subsequent requests read from cache at 0.1× — a 90% discount. **Amazon Nova models** handle caching automatically with different economics: cache writes are at the standard input rate (no surcharge), and cache reads are at roughly 25% of the input rate — a 75% discount. The simulator accounts for these per-model differences.

### Cache Time to Live (TTL)

A cached prefix doesn't last forever. Bedrock offers two TTL options: **5 minutes** and **1 hour**. The 5-minute cache is cheaper to write (1.25× the normal input rate on Anthropic models), while the 1-hour cache costs more up front (2× the normal input rate) but stays available longer. The 1-hour option is available on newer Anthropic models (Sonnet 4.5+, Haiku 4.5, Opus 4.5+); older models only support the 5-minute TTL. Writing to the cache happens automatically if a section of the prompt is tagged as the prefix and there is no cache hit found.

For the grading workflow, where all 150 requests might run within a few minutes, the 5-minute TTL is sufficient — the cache stays warm for the entire batch. But for a live chat like the Clarity writing assistant, the student is working on their paper over the course of an hour or more. A 5-minute cache would expire between turns every time the student pauses to think, revise, or step away, and you'd pay the write cost again on the next message. The 1-hour TTL keeps the cached assignment context available for the duration of a realistic writing session.

The simulator lets you toggle between TTL settings to see the cost impact. It's worth noting that these simulations assume an ideal, uninterrupted session — in practice, students take breaks, get distracted, and come back later. A cache expiring mid-session isn't catastrophic (the next request just pays a fresh write), but it does erode the savings you'd see in the simulator.

### How much should you cache?

Consider a teacher who has 30 students each writing an essay about *The Great Gatsby*. We make on average 5 calls to the LLM for each student's submission to generate feedback in batches. That's 150 total requests.

- **Cache at the assignment level:** Cache the instructions + rubric. Every one of those 150 requests reads this from the cache at 90% off. Each student's essay and the specific grading instruction are sent fresh. This works well when the shared material is large. For example maybe we allow the teacher to attach the full text of *The Great Gatsby* as grounding context for the assignment.  

- **Cache at the submission level:** Go further and also cache each student's essay as part of the prefix. Now you're paying a cache-write for each of the 30 students, but the remaining 4 grading passes per student get to read the essay from cache too. This pays off when you're making enough passes per student to recoup the per-student write cost.

The simulator lets you adjust these parameters and see exactly where one strategy overtakes the other. With a large shared context like a full novel, assignment-level caching alone is powerful. When the shared context is smaller, caching deeper into each student's submission starts to matter more.

![Cost comparison from the simulator's "GRAF+ w/ Context" template — 30 students, 5 passes each, with the full text of a novel as shared context. Shows assignment-level caching, submission-level caching, and no caching side by side.](figure_2_caching.png)

## Tool 2: Batch Inference

Batch inference is only an option situationally: you submit all your requests at once as a batch job and get a flat **50% discount** on everything — input and output tokens. The trade-off is that you're giving up real-time responses. Results come back when the batch completes, not one at a time. Officially you have to be willing to wait 24 hours for your results, but in practice most workloads are processed within minutes. 

For something like grading, where you don't need results instantly, this is a compelling option. It can't be combined with caching — it's one or the other.

![Strategy comparison from the GRAF+ Simple template showing all four strategies — No Caching, Per-Assignment Cache, Per-Submission Cache, and Batch Inference — with per-class and per-student costs. The chart below sweeps Shared Context size, showing how caching strategies scale differently as shared context grows.](figure_3_batch.png)

## Tool 3: Managing Chat History Costs

The first two tools apply cleanly to the grading workflow because it runs asynchronously — you can submit everything at once. But what about **live conversations**, like a chatbot that helps students write their papers, or an AI that lets them interview a historical figure based on source material?

In a chat, the conversation history grows with every message. You might think you'd want to cache the whole conversation, but the math works against you: every time the history changes (i.e., every turn), the cache has to be re-written — including all the shared material that hasn't changed. With 50K tokens of source text, a single cache re-write costs more than just sending the chat history as fresh input many times over.

The practical approach is to **cache only the stable parts** (instructions and source material) and send the conversation history as regular input. That leaves two techniques for keeping those history costs under control.

### Sliding window

The most straightforward approach is a **sliding window**: you keep the most recent few exchanges (roughly the last 4–5 turns) in the context, and older messages simply fall off. This keeps costs flat and predictable regardless of how long the session runs. The trade-off is that the AI loses awareness of what happened earlier in the conversation — if a student referenced something from ten turns ago, the chatbot won't remember it.

For many use cases this is perfectly acceptable, and it's the default approach in all of the chat-based simulator templates. The per-turn cost chart below shows what this looks like over a 40-message session — costs ramp up as the history window fills, then flatten once the cap is reached. Caching the stable prefix (assignment context and source material) provides a consistent discount on every turn.

![Per-turn cost for a single student across a 40-message session using a sliding window. History ramps from 0 to the 3,650-token cap around turn 11, then costs flatten. The "With Caching" line shows the savings from caching the stable assignment prefix.](figure_5_per_turn_sliding_window.png)

### Chat history summarization

Summarization is a middle ground between a full sliding window (cheap but forgetful) and keeping the entire conversation history (accurate but expensive). Instead of letting old context disappear entirely, you periodically use a cheaper model like Haiku to compress the full conversation into a short summary. That summary gets included in future requests alongside the sliding window, so the AI retains a general sense of the whole conversation without carrying the full token cost of every past message.

This is a **quality feature, not a cost-saving one** — you're spending tokens on summarization calls to give the chatbot better memory. The cost question is whether you can then **cache** that summary as part of the prompt prefix, since it stays stable for several turns between updates. For most of our workloads (12–20 turns per student), the summarization calls themselves add more cost than caching the summary saves, so it's hard to justify. But in longer sessions — 40+ turns — the math starts to work. The simulator's "Clarity Chat XL" template lets you experiment with this and find the break-even point for your specific parameters. For the use cases that are outlined in the simulator, the cost savings for caching the chat history probably doesn't justify the expense and complexity of building that into the product.

Compare the smooth, predictable cost curve of the sliding window above with the sawtooth pattern of summarization below. Each time the history cap is reached, a summarization call fires and the history resets — producing the spikes and drops. The "Cache in Prefix" strategy (purple) has the lowest per-turn cost between spikes, but the periodic cache re-writes when the summary updates eat into those savings.

![Per-turn cost for a single student across a 40-message session with chat history summarization enabled. The sawtooth pattern shows summarization calls firing when the history cap is reached. Three strategies are compared: no caching, caching the prefix only, and caching the prefix with the chat summary included.](figure_5_per_turn_summarization.png)

![Clarity Chat XL template with summarization enabled, comparing three strategies: No Caching, Cache Prefix, and Cache Prefix + Chat Summary. The cost cards show that summarization calls ($3.47) are a significant line item across all strategies. The sensitivity chart sweeps Messages per Student, showing that caching the summary in the prefix only becomes the cheapest option around 40 messages — and even then, the savings over just caching the prefix are modest.](figure_4_summary.png)

## Choosing the Right Strategy

Each scenario below maps to a template in the simulator. Load the template, adjust the parameters to match your workload, and compare the strategies side by side.

| Your workload looks like… | Simulator template |
|---------------------------|------------|
| Grading student work with a rubric and modest shared context | **GRAF+ Simple** — compare assignment-level vs. submission-level caching, and batch inference |
| Same, but with large shared source material (a novel, textbook chapters) | **GRAF+ w/ Context** — see how a large shared prefix amplifies caching savings |
| A writing-assistant chatbot where students are actively drafting | **Clarity Chat** — explore caching the stable assignment context while sending the live draft and chat history fresh |
| Same, but with longer sessions where the AI losing older context is a concern | **Clarity Chat XL** — evaluate whether chat summarization is worth the added cost and complexity |
| An interactive assignment where students chat with an AI grounded in source material | **Interactive AI Assignment** — the strongest caching scenario, with large shared context and small per-turn input |
