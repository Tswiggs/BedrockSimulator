
# Design Document: AWS Bedrock Pricing Tracker & Workload Optimizer

## 1. High-Level Architecture

The application follows a **"Git-Stack" Architecture** (Serverless, Database-less).

* **Database:** A flat JSON file (`pricing.json`) hosted in the GitHub repository.
* **Backend/Worker:** A scheduled GitHub Action that launches a **Cursor Cloud Agent** via the Cloud Agents API. It scrapes pricing, normalizes it, and opens a PR with the updates.
* **Frontend:** A client-side HTML/JS Single Page Application (SPA) hosted on GitHub Pages. It fetches the raw JSON to power its logic.

## 2. Data Persistence Layer

We need a unified schema to handle the complexity of Bedrock pricing (On-demand, Cross-region inference, Provisioned, Batch, Caching).

**File:** `data/pricing.json`
**Schema Definition:**

```json
{
  "metadata": {
    "last_updated": "2023-10-27T10:00:00Z",
    "currency": "USD"
  },
  "models": [
    {
      "id": "anthropic.claude-3-5-sonnet-20240620-v1:0",
      "name": "Claude 3.5 Sonnet",
      "provider": "Anthropic",
      "pricing": {
        "input_1k": 0.003,
        "output_1k": 0.015,
        "cache_write_1k": 0.00375,
        "cache_read_1k": 0.0003,
        "batch_input_1k": 0.0015, 
        "batch_output_1k": 0.0075
      },
      "constraints": {
        "min_cache_ttl_seconds": 300,
        "supports_batch": true,
        "supports_vision": true
      }
    }
    // ... other models (Nova, Titan, Llama, etc.)
  ]
}

```

---

## 3. Component A: The Automated Agent (Backend)

**Goal:** Maintain an up-to-date pricing database without manual intervention.

### GitHub Actions Workflow (`.github/workflows/update-pricing.yml`)

A scheduled GitHub Action triggers a Cursor Cloud Agent via the [Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints). The agent runs on Cursor's infrastructure, not on a local machine, and costs are billed to the team's Cursor subscription.

#### Setup

1. **Create a Cloud Agents API key** from the [Cursor Dashboard → Integrations](https://cursor.com/dashboard?tab=integrations).
2. **Add the key as a GitHub Actions secret** named `CURSOR_API_KEY` in the repository settings.
3. **Ensure the Cursor GitHub App** has access to the repository (required for the cloud agent to clone and push).

#### Workflow Definition

```yaml
name: Update Bedrock Pricing

on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8am UTC
  workflow_dispatch:       # Manual trigger from GitHub UI

jobs:
  update-pricing:
    runs-on: ubuntu-latest
    steps:
      - name: Launch Cursor Cloud Agent
        run: |
          curl --request POST \
            --url https://api.cursor.com/v0/agents \
            -u "${{ secrets.CURSOR_API_KEY }}:" \
            --header 'Content-Type: application/json' \
            --data '{
              "prompt": {
                "text": "Review the current official AWS Bedrock pricing pages. Extract pricing for all available foundation models. Update data/pricing.json strictly following the existing schema. Ensure you capture specific cache_write and cache_read costs. If a model supports Batch inference (50% discount), populate the batch fields. Do not hallucinate prices; if unknown, set to null. Validate the JSON is well-formed before committing."
              },
              "source": {
                "repository": "https://github.com/YOUR_ORG/BedrockSimulator",
                "ref": "main"
              },
              "target": {
                "autoCreatePr": true,
                "branchName": "automated/pricing-update"
              }
            }'
```

#### Flow

1. **Trigger:** GitHub Actions fires on the cron schedule (weekly) or via manual dispatch.
2. **API Call:** The workflow sends a POST to the Cursor Cloud Agents API with the pricing update prompt.
3. **Agent Execution:** A Cursor Cloud Agent clones the repo, browses the AWS Bedrock pricing pages, updates `data/pricing.json`, and validates the JSON.
4. **PR Creation:** The agent pushes to a feature branch and automatically opens a pull request for review before merging to `main`.



---

## 4. Component B: The Frontend Application

**Tech Stack:** HTML5, TailwindCSS (via CDN), Alpine.js (for lightweight reactivity), Chart.js (for visualization). No build process required.

### View 1: The Normalized Pricing Matrix

**Purpose:** Apples-to-apples comparison of raw unit costs.

* **Grid Layout:** Columns for Input, Output, Cache Write, Cache Read, and Batch prices.
* **Unit Toggle:** Switch display between "Per 1k Tokens" and "Per 1M Tokens".
* **Highlighting:** Automatically highlights the "Lowest Cost" cell in each column (e.g., Green background for the cheapest model).
* **Filter:** "Show only models supporting Caching."

### View 2: The Workload Simulator & Optimizer

**Purpose:** Simulate the specific "Essay Grading" workload and calculate the optimal caching strategy.

#### 1. The Inputs (Left Panel)

The user defines the workload parameters:

* **Class Size ():** Number of unique submissions (e.g., 30).
* **Requests per Student ():** How many turns of conversation/grading per paper (e.g., 5).
* **Prompt Segments (Token Counts):**
* *Shared System Prompt ():* e.g., 1,000 tokens.
* *Shared Context ():* The book/rubric. e.g., 15,000 tokens.
* *Variable Submission ():* The student's essay. e.g., 2,000 tokens.
* *Variable Instruction ():* The specific chat command. e.g., 500 tokens.


* **Guardrails:** Toggle On/Off (adds fixed cost per character).
* **Batch Mode:** Toggle On/Off (applies 50% discount where available).

#### 2. The Optimizer Logic (The "Brain")

The app will run two parallel calculations for the selected model and display the winner.

**Strategy A: Shallow Caching (Shared Context Only)**

* **Cache:** We cache only .
* **Write Cost:** Paid once (assuming TTL holds).


* **Read Cost:** Every request reads the shared prefix.


* **Fresh Input Cost:** The student submission is treated as fresh input every time.



**Strategy B: Deep Caching (Shared + Student Submission)**

* **Cache:** We cache .
* *Note:* This effectively creates  unique cache checkpoints.


* **Write Cost:** We pay to write the Shared part once, BUT we pay to write the *Student Submission* part  times (once for each unique paper).


* **Read Cost:** Every request reads the full chain (Shared + Submission).


* **Fresh Input Cost:** Only the instruction is fresh.



#### 3. The Output Visualization (Right Panel)

* **The Verdict:** A large banner: *"Strategy B is cheaper by 15% ($4.20 savings)."*
* **The Breakdown Graph:** A stacked bar chart comparing Strategy A vs Strategy B.
* Segments: Cache Write (One-time), Cache Read, Fresh Input, Output.


* **Prompt Visualizer:** A horizontal bar showing the prompt structure.
* *Color Coded:* Blue (Cached Shared), Green (Cached Unique), Orange (Fresh).
* This visually demonstrates *what* is being cached in the selected strategy.



---

## 5. Technical Validation

### 1. Capability of HTML/JS

**Verdict: Valid.**

* Modern JavaScript (`fetch`, `async/await`) handles JSON retrieval effortlessly.
* Client-side math is instantaneous for these formulas.
* Frameworks like Alpine.js allow for "reactive" calculations (updates cost as you drag the slider) without needing a backend server.

### 2. Capability of GitHub Actions + Cursor Cloud Agents API

**Verdict: Valid.**

* The Cloud Agents API is in beta and available on all Cursor plans, including team subscriptions.
* The agent runs on Cursor's infrastructure — no local machine needs to be on or awake.
* **Cost:** Billed to the team's Cursor subscription, not a personal Claude account.
* **Risk:** Web page layouts change.
* **Mitigation:** The prompt should instruct the agent to "Look for tables containing pricing information" generically, rather than hard-coding CSS selectors.
* **Git Integration:** The Cursor GitHub App handles repo access and PR creation automatically. No local SSH keys or CI/CD secrets beyond the API key are needed.
* **Safety:** Using `autoCreatePr: true` means changes land on a feature branch with a PR, giving a human the chance to review before merging — safer than pushing directly to `main`.

