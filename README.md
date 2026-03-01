# AXI MRI Scoring Tool (Public Beta)

Client-side Next.js tool for MRI scoring with spreadsheet-style inputs, simulated AI audit, and print-friendly reporting.

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

## How Scoring Works

The model has 5 fixed pillars with weights:

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

## Run the Mock Audit

1. Open `/score`.
2. Enter target URL and task prompt.
3. Set constraint toggles.
4. Click **Run Audit**.

The simulated auditor runs staged steps and returns:

- Steps log
- Blockers
- Suggested category scores, rationales, and evidence URLs

You can manually override any category score afterward.

## Export / Import JSON

Use the **State Tools** panel on `/score`:

- **Export JSON** downloads current audit state.
- **Import JSON** loads prior state and validates/scaffolds missing fields.
- **Reset** clears all local state.

Autosave persists to `localStorage` and restores on refresh.

## Print Report

1. Open `/report`.
2. Click **Print / Save PDF**.
3. Use browser print dialog to print or save as PDF.
