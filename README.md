# Residual — Agentic Operations FinOps Engine

An interactive decision-support application analyzing the hidden downstream human rework costs created by autonomous AI workflows.

## Overview

While direct LLM API token costs often appear minimal ($0.20 per interaction), downstream human remediation—investigating silent errors, handling support re-opens, and resolving database mismatches—often averages $13.16 per task. This project visualizes this gap through interactive operational models.

## Key Features

1. **The Waterline Visualizer**: An interactive canvas contrasting direct token spending against submerged downstream remediation costs across 14 operational task categories.
2. **Failure Emergence Modeling**: Time-delay curves illustrating when silent agent mistakes surface downstream and how they compound over a 14-day observation window.
3. **Proactive Intervention Matrix**: Risk-weighted routing to intercept high-uncertainty traces before customer escalation.
4. **Execution Audit & Receipt**: Step-by-step breakdown of real-world operational traces with itemized remediation costs.
5. **Backstage SQL & Analytics Console**: Interactive client-side DuckDB queries and empirical distribution analysis.

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- HTML5 Canvas API
- Vite

## Quickstart

```bash
git clone https://github.com/amlfarhad/residual-agentic-finops.git
cd residual-agentic-finops
npm install
npm run dev
```

Built for production analysis on local development servers and modern browsers.
