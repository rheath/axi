# AXI MRI Scoring Tool (Public Beta)

Next.js App Router tool for MRI scoring with a spreadsheet-style UI, live server-side audit, local autosave, and print-friendly reporting.

## Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` landing page
- `/score` scoring workspace
- `/report` print-friendly report

## Scoring Model

The model uses 5 fixed pillars with weights:

- Data & Rule Clarity: 25
- Machine Trust & Reliability: 25
- Schema & Interoperability: 15
- Intent & Decision Support: 20
- Interaction & Operations: 15

Each pillar has exactly 3 scored categories (15 total), each scored as integer `0..5`.

For each pillar:

- `pillarAverage = mean(categoryScores)`
- `normalized = pillarAverage / 5`
- `weightedPoints = normalized * pillarWeight`

Final MRI score:

- `finalScore0to100 = sum(weightedPoints over 5 pillars)`

Risk bands:

- `0–39` Red (High Risk)
- `40–69` Yellow (Moderate Risk)
- `70–84` Green (Ready)
- `85–100` Blue (Advanced)

Displayed score is rounded to 1 decimal.

## Run Live Audit

1. Open `/score`.
2. Enter target URL and task prompt.
3. Set constraint toggles.
4. Click **Run Live Audit**.

The live audit runs through `/api/live-audit` and:

- Crawls homepage + up to 8 key internal links
- Respects robots policy and records skipped URLs as warnings
- Runs deterministic MRI checks from actual fetched HTML
- Returns steps, blockers, evidence URLs, and crawl metadata

Failure behavior is fail-hard (no mock fallback).

## Export / Import JSON

Use **State Tools** on `/score`:

- **Export JSON** downloads current audit state.
- **Import JSON** restores a prior state (with validation/merging for required keys).
- **Reset** clears local state.

Autosave persists in `localStorage`.

## Print Report

1. Open `/report`.
2. Click **Print / Save PDF**.
3. Use browser print dialog to print or save PDF.
