# AWS Bedrock Pricing Tracker & Workload Optimizer

A client-side SPA for comparing AWS Bedrock model pricing and simulating workload costs with caching strategies. Built with React, Vite, TailwindCSS, and shadcn/ui.

## Features

### Pricing Matrix
- Side-by-side comparison of all Anthropic (Claude) and Amazon (Nova/Titan) model pricing
- Toggle between per-1K and per-1M token display
- Green highlighting for cheapest model in each pricing column
- Filter by provider, search by name/ID, filter to caching-capable models only
- Sortable columns

### Workload Simulator
- Simulate an "Essay Grading" workload with configurable parameters
- Compare three strategies: No Caching, Strategy A (shallow cache), Strategy B (deep cache)
- Stacked bar chart visualizing cost breakdown
- Prompt structure visualizer showing cached vs. fresh segments
- Guardrails cost toggle (AWS Bedrock content filtering)
- Batch mode toggle for supported models
- Per-request cost analysis

## Getting Started

```bash
cd FE-BedrockCostOptimizer
npm install
npm run dev
```

Open http://localhost:5173/BedrockSimulator/

## Build

```bash
npm run build     # Type-checks then builds for production
npm run preview   # Preview the production build locally
npm run typecheck # Run TypeScript type-checking only
```

## Data

Model pricing data lives in `public/data/pricing.json`. This file is fetched at runtime, so it can be updated independently of the app build.

Currently tracks **14 models** from 2 providers:
- **Anthropic**: Claude Opus 4, Claude Sonnet 4, Claude 3.7 Sonnet, Claude 3.5 Sonnet v2, Claude 3.5 Haiku, Claude 3 Opus, Claude 3 Haiku
- **Amazon**: Nova Premier, Nova Pro, Nova Lite, Nova Micro, Titan Text Premier, Titan Text Express, Titan Text Lite

## Automated Pricing Updates

A GitHub Actions workflow (`.github/workflows/update-pricing.yml`) can automatically update pricing weekly using the Cursor Cloud Agents API.

### Setup
1. Create a Cursor Cloud Agents API key from the [Cursor Dashboard](https://cursor.com/dashboard?tab=integrations)
2. Add it as a GitHub Actions secret named `CURSOR_API_KEY`
3. Ensure the Cursor GitHub App has access to the repository
4. The workflow runs every Monday at 8am UTC, or can be triggered manually

## Deployment

The app deploys to GitHub Pages automatically on push to `main` via `.github/workflows/deploy.yml`.

### Setup
1. In your GitHub repo settings, enable GitHub Pages with Source: "GitHub Actions"
2. Push to `main` -- the workflow builds and deploys automatically

## Tech Stack

- **React 18** with TypeScript
- **Vite** for bundling
- **TailwindCSS v4** for styling
- **shadcn/ui** (Radix primitives) for UI components
- **Recharts** for data visualization
- **React Router** (hash-based) for navigation
