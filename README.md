# Axi AI Readiness Checker (MVP)

A lightweight web app that scans a website URL and grades "AI readiness" with deterministic checks.

## What it does

- Accepts a URL and crawls homepage + key internal links.
- Scores six categories:
  - Crawlability & Indexing
  - Structured Data & Entity Clarity
  - Content Extractability & Semantics
  - Trust & Policy Signals
  - Technical Performance & Accessibility
  - Freshness & Discoverability
- Returns:
  - Overall AI Readiness Score (0-100)
  - Category breakdown
  - Prioritized fixes
- Locks full report behind an email lead capture step.

## Tech stack

- Node.js + TypeScript
- Express API
- Cheerio HTML parsing
- JSON file persistence (`/data/reports.json`, `/data/leads.json`)

## Run locally

```bash
npm install
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## API endpoints

- `GET /api/health`
- `POST /api/scans` with body `{ "url": "example.com" }`
- `GET /api/reports/:id`
- `POST /api/reports/:id/lead` with body `{ "email": "you@company.com", "consent": true }`

## Notes

- This MVP uses deterministic heuristics, not LLM scoring.
- No auth or billing included.
- Internal links are selected heuristically and capped.
