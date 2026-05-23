// ── api.js ────────────────────────────────────────────────
// All calls to your API Gateway endpoints live here.
// Change API_BASE to your real API Gateway URL when deploying.
// ─────────────────────────────────────────────────────────

// const API_BASE = 'http://localhost:8080'; // LOCAL — change to API Gateway URL in production
const API_BASE = 'https://jsgb9ymcg1.execute-api.us-east-1.amazonaws.com/prod'; // real gateway

// ── helpers ───────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res  = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ── reports ───────────────────────────────────────────────

/**
 * Returns list of available reports (for the dropdown).
 * Expected response:
 * [{ id: "REPORT#2026-05-19", date: "2026-05-19", risk_level: "HIGH" }, ...]
 */
async function fetchReports(from = null, to = null) {
  const params = new URLSearchParams({ limit: 100 });
  if (from) params.set('from', from);
  if (to)   params.set('to',   to);
  return apiFetch(`/reports?${params}`);
}

/**
 * Returns the full summary for one report.
 * Expected response:
 * {
 *   id, date, risk_level, executive_summary,
 *   total_deliveries, total_failures, total_successes, failure_rate,
 *   critical_regions, critical_carriers, top_failure_reasons,
 *   fraud_indicators, recommendations
 * }
 */
async function fetchReportSummary(reportId) {
  return apiFetch(`/reports/${encodeURIComponent(reportId)}`);
}

/**
 * Returns failure rate per region for a report (for bar chart).
 * Expected response:
 * [{ region: "Grande SP", failure_rate: 44.8, total: 29, failures: 13 }, ...]
 */
async function fetchRegionMetrics(reportId) {
  return apiFetch(`/reports/${encodeURIComponent(reportId)}/regions`);
}

/**
 * Returns failure rate per carrier for a report (for bar chart).
 * Expected response:
 * [{ carrier: "Sequoia Log", failure_rate: 44.7, total: 38, failures: 17 }, ...]
 */
async function fetchCarrierMetrics(reportId) {
  return apiFetch(`/reports/${encodeURIComponent(reportId)}/carriers`);
}

/**
 * Returns failure reason breakdown for a report (for doughnut chart).
 * Expected response:
 * [{ reason: "Área com restrição...", count: 20 }, ...]
 */
async function fetchReasonMetrics(reportId) {
  return apiFetch(`/reports/${encodeURIComponent(reportId)}/reasons`);
}

/**
 * Returns last N reports with their failure_rate (for trend line chart).
 * Expected response:
 * [{ date: "2026-05-05", failure_rate: 28.2 }, ...]
 */
async function fetchTrend(from = null, to = null) {
  const params = new URLSearchParams({ limit: 50 });
  if (from) params.set('from', from);
  if (to)   params.set('to',   to);
  return apiFetch(`/reports/trend?${params}`);
}

// ── customers ─────────────────────────────────────────────

/**
 * Returns paginated list of affected customers for a report.
 * Supports search and region filter via query params.
 * Expected response:
 * {
 *   data: [{ id, name, whatsapp, failure_reason, region, carrier,
 *             attempts, whatsapp_sent, sent_at }],
 *   total: 76,
 *   page: 1,
 *   per_page: 20
 * }
 */
async function fetchCustomers(reportId, { page = 1, perPage = 20, search = '', region = '' } = {}) {
  const params = new URLSearchParams({ page, per_page: perPage });
  if (search) params.set('search', search);
  if (region) params.set('region', region);
  return apiFetch(`/reports/${encodeURIComponent(reportId)}/customers?${params}`);
}

/**
 * Marks a customer's WhatsApp message as sent.
 * Called when the user clicks "send" in the table.
 * Expected response: { success: true, sent_at: "2026-05-19T21:00:00Z" }
 */
async function markWhatsappSent(customerId) {
  return apiFetch(`/customers/${customerId}/whatsapp-sent`, {
    method: 'PATCH',
    body: JSON.stringify({ whatsapp_sent: true }),
  });
}

// ─────────────────────────────────────────────────────────
// NOTE: During local development without a real API,
// replace the functions above with mock versions.
// See the MOCK DATA section at the bottom of dashboard.js.
// ─────────────────────────────────────────────────────────
