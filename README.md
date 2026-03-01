# Axi AI Readiness Checker (Next.js MVP)

A Next.js web app that scans a website URL and grades AI readiness using deterministic checks.

## Features

- URL scan (homepage + key internal pages)
- Weighted AI readiness score (0-100)
- Category breakdown and prioritized fixes
- Lead-capture unlock for full report
- API routes for scans and reports

## Stack

- Next.js (App Router) + TypeScript
- Cheerio for HTML parsing
- File-backed persistence in `/data`

## Local development

```bash
npm install
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## API

- `GET /api/health`
- `POST /api/scans` with `{ "url": "example.com" }`
- `GET /api/reports/:id`
- `POST /api/reports/:id/lead` with `{ "email": "you@company.com", "consent": true }`

## Deploy

This repo is now structured as a standard Next.js app for Hostinger Git deployment.
