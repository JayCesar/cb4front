# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step. Serve the root directory with any static file server:

```bash
python3 -m http.server 3000
# or
npx serve .
# then open http://localhost:3000
```

## Development mode (offline)

Set `useMock = true` at the top of `js/dashboard.js` to run fully offline with bundled sample data. Set it back to `false` to hit the real backend.

The real backend is a Spring Boot API. Set `API_BASE` in `js/api.js` to point to the correct API Gateway URL when deploying.

## Architecture

**No framework, no bundler.** Four vanilla JS files are loaded in order via `<script>` tags in `index.html`:

1. `js/api.js` — All HTTP calls. Each function maps to one backend endpoint. Change `API_BASE` here for deployments.
2. `js/charts.js` — Creates and updates four Chart.js instances (region bar, carrier bar, trend line, reasons doughnut). Chart instances are stored in the `charts` object so re-renders reuse them via `.update()` instead of destroying and recreating.
3. `js/table.js` — Tabulator customer table, search/region filters, CSV export, and WhatsApp send handler.
4. `js/dashboard.js` — Orchestrates everything: global state (`currentReportId`, `activeDateFrom/To`), mock data, API wrappers that route to mock or real functions, `loadReport()` which fans out all fetches in parallel, and KPI/fraud banner DOM updates.

**Data flow**: `init()` → `applyPreset()` → `reloadAll()` fetches the report list, picks the most recent report, then `loadReport()` fires all six fetches in parallel and pipes results to `charts.js`, `table.js`, and inline DOM helpers.

**Fallback metrics**: When `/regions`, `/carriers`, or `/reasons` return plain strings instead of objects with rates, `dashboard.js` computes metrics locally from the customer list (`buildRegionMetrics`, `buildCarrierMetrics`, `buildReasonMetrics`).

## External dependencies (CDN only)

- **Chart.js 4.4.1** — charts
- **Day.js 1.11.10** — date formatting and period math
- **Tabulator 6.2.1** — customer table
- **flatpickr 4.6.13** — date range picker

## Backend API contract

Base URL: `http://localhost:8080` (dev) / API Gateway URL (prod)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/reports?limit&from&to` | List reports |
| GET | `/reports/{id}` | Full report summary |
| GET | `/reports/{id}/regions` | Failure rate per region |
| GET | `/reports/{id}/carriers` | Failure rate per carrier |
| GET | `/reports/{id}/reasons` | Failure reason breakdown |
| GET | `/reports/trend?limit&from&to` | Failure rate trend over time |
| GET | `/reports/{id}/customers?page&per_page&search&region` | Paginated customer list |
| PATCH | `/customers/{id}/whatsapp-sent` | Mark WhatsApp as sent |

The summary object uses `failure_rate_percent` (Spring Boot) with a fallback to `failure_rate`. Both field names are handled throughout the frontend.
