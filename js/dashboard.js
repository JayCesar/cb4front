// ── dashboard.js ──────────────────────────────────────────
// SET useMock = true  → runs fully offline with sample data
// SET useMock = false → calls your real Spring Boot / API Gateway
// ─────────────────────────────────────────────────────────

const useMock = false; // ← false = use real Spring Boot API

// ── MOCK DATA (only used when useMock = true) ─────────────
const MOCK = {
  reports: [
    { id: 2, created_at: '2026-05-19T00:57:16', risk_level: 'HIGH',   failure_rate_percent: 34.7, total_deliveries: 219 },
    { id: 1, created_at: '2026-05-12T00:55:21', risk_level: 'MEDIUM', failure_rate_percent: 30.8, total_deliveries: 201 },
  ],
  summary: {
    2: {
      risk_level: 'HIGH', executive_summary: '34.7% overall failure rate across 219 deliveries.',
      total_deliveries: 219, total_failures: 76, total_successes: 143,
      failure_rate_percent: 34.7, success_rate_percent: 65.3,
      fraud_indicators: ['Card 4532-xxxx-5409 linked to 2 different CPFs'],
      recommendations: ['Suspend Sequoia Log pending SLA review'],
      critical_regions: ['Grande SP', 'Centro'],
      critical_carriers: ['Sequoia Log', 'Flash Courier'],
      top_failure_reasons: ['Área com restrição (Risco de segurança)', 'Extravio de carga'],
    },
  },
  regions: {
    2: [
      { region: 'Grande SP',  failure_rate: 44.8 },
      { region: 'Centro',     failure_rate: 39.4 },
      { region: 'Zona Oeste', failure_rate: 34.1 },
      { region: 'Zona Leste', failure_rate: 32.4 },
      { region: 'Zona Norte', failure_rate: 31.7 },
      { region: 'Zona Sul',   failure_rate: 29.3 },
    ],
  },
  carriers: {
    2: [
      { carrier: 'Sequoia Log',    failure_rate: 44.7 },
      { carrier: 'Flash Courier',  failure_rate: 36.6 },
      { carrier: 'Loggi Express',  failure_rate: 35.0 },
      { carrier: 'Correios Sedex', failure_rate: 31.5 },
      { carrier: 'Total Express',  failure_rate: 28.3 },
    ],
  },
  reasons: {
    2: [
      { reason: 'Área com restrição (Risco de segurança)', count: 20 },
      { reason: 'Extravio de carga pela transportadora',   count: 14 },
      { reason: 'Recusado pelo destinatário',              count: 13 },
      { reason: 'Mudou-se / Desconhecido no local',        count: 13 },
      { reason: 'Destinatário ausente nas 3 tentativas',   count:  8 },
      { reason: 'Endereço não localizado',                 count:  8 },
    ],
  },
  trend: [
    { created_at: '2026-05-05', failure_rate_percent: 28.2, risk_level: 'MEDIUM' },
    { created_at: '2026-05-12', failure_rate_percent: 30.8, risk_level: 'MEDIUM' },
    { created_at: '2026-05-19', failure_rate_percent: 34.7, risk_level: 'HIGH'   },
  ],
  customers: {
    2: [
      { id:1, name:'Leonardo da Cunha',      whatsapp:'5511903508717', failure_reason:'Recusado pelo destinatário',              region:'Zona Norte', whatsapp_sent:false },
      { id:2, name:'Ana Sophia da Mota Jr.', whatsapp:'5511907368316', failure_reason:'Destinatário ausente nas 3 tentativas',   region:'Centro',     whatsapp_sent:false },
      { id:3, name:'Maria Isis Gomide',      whatsapp:'5511918375427', failure_reason:'Extravio de carga pela transportadora',   region:'Grande SP',  whatsapp_sent:false },
      { id:4, name:'Carlos Eduardo Lima',    whatsapp:'5511924563821', failure_reason:'Área com restrição (Risco de segurança)', region:'Zona Leste', whatsapp_sent:false },
      { id:5, name:'Fernanda Oliveira',      whatsapp:'5511931204756', failure_reason:'Mudou-se / Desconhecido no local',        region:'Zona Sul',   whatsapp_sent:false },
    ],
  },
};

// Mock API functions
if (typeof window !== 'undefined') {
  window._mockFetchReports        = async ()    => MOCK.reports;
  window._mockFetchSummary        = async (id)  => MOCK.summary[id]  || MOCK.summary[2];
  window._mockFetchRegions        = async (id)  => MOCK.regions[id]  || MOCK.regions[2];
  window._mockFetchCarriers       = async (id)  => MOCK.carriers[id] || MOCK.carriers[2];
  window._mockFetchReasons        = async (id)  => MOCK.reasons[id]  || MOCK.reasons[2];
  window._mockFetchTrend          = async ()    => MOCK.trend;
  window._mockFetchCustomers      = async (id)  => ({ data: MOCK.customers[id] || MOCK.customers[2], total: 5 });
  window._mockMarkWhatsappSent    = async (cid) => { console.log('mock sent', cid); return { success: true }; };
}
// ─────────────────────────────────────────────────────────

// ── API WRAPPERS (route to mock or real) ──────────────────
async function _fetchReports(from, to)   { return useMock ? window._mockFetchReports()      : fetchReports(from, to); }
async function _fetchSummary(id)         { return useMock ? window._mockFetchSummary(id)    : fetchReportSummary(id); }
async function _fetchRegions(id)         { return useMock ? window._mockFetchRegions(id)    : fetchRegionMetrics(id); }
async function _fetchCarriers(id)        { return useMock ? window._mockFetchCarriers(id)   : fetchCarrierMetrics(id); }
async function _fetchReasons(id)         { return useMock ? window._mockFetchReasons(id)    : fetchReasonMetrics(id); }
async function _fetchTrend(from, to)     { return useMock ? window._mockFetchTrend()        : fetchTrend(from, to); }
async function _fetchCustomers(id)       { return useMock ? window._mockFetchCustomers(id)  : fetchCustomers(id); }
async function _markSent(cid)            { return useMock ? window._mockMarkWhatsappSent(cid) : markWhatsappSent(cid); }

// ── STATE ─────────────────────────────────────────────────
let currentReportId = null;
let currentPeriod   = 'all';   // 'all' | 'week' | 'month' | 'year'
let currentMode     = 'file';  // 'file' | 'period'
let activeDateFrom  = null;
let activeDateTo    = null;
let _calendar       = null;

// ── PERIOD HELPERS ────────────────────────────────────────
function periodRange(period) {
  const now = dayjs();
  if (period === 'week')  return { from: now.subtract(7,  'day').toISOString(),  to: now.toISOString() };
  if (period === 'month') return { from: now.subtract(30, 'day').toISOString(),  to: now.toISOString() };
  if (period === 'year')  return { from: now.subtract(365,'day').toISOString(),  to: now.toISOString() };
  return { from: null, to: null }; // 'all'
}

// ── CALENDAR / DATE RANGE ─────────────────────────────────
function initCalendar() {
  if (_calendar) return;
  const input = document.getElementById('date-range-input');
  if (!input || typeof flatpickr === 'undefined') return;

  // input is readonly so users can't type — flatpickr needs allowInput:false
  // and we manage clearing via the X button.
  _calendar = flatpickr(input, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    maxDate: 'today',
    onChange: (selectedDates) => {
      if (selectedDates.length === 2) {
        activeDateFrom = dayjs(selectedDates[0]).startOf('day').toISOString();
        activeDateTo   = dayjs(selectedDates[1]).endOf('day').toISOString();
        document.getElementById('btn-clear-range').style.display = 'inline-flex';
        clearPresetActive();
        reloadAll();
      }
    },
  });
}

function applyPreset(period, btn) {
  initCalendar();
  const { from, to } = periodRange(period);
  activeDateFrom = from;
  activeDateTo   = to;
  currentPeriod  = period;

  // reflect on the input without re-triggering onChange
  if (_calendar && from && to) {
    _calendar.setDate([new Date(from), new Date(to)], false);
  }

  clearPresetActive();
  if (btn) btn.classList.add('active');
  document.getElementById('btn-clear-range').style.display = 'inline-flex';
  reloadAll();
}

function clearDateRange() {
  activeDateFrom = null;
  activeDateTo   = null;
  currentPeriod  = 'all';
  if (_calendar) _calendar.clear();
  clearPresetActive();
  document.getElementById('btn-clear-range').style.display = 'none';
  reloadAll();
}

function clearPresetActive() {
  document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
}

// ── MODE SWITCH ──────────────────────────────────────────
function onModeChange(mode, btn) {
  currentMode = mode;

  // update toggle buttons
  document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // show/hide the right controls
  document.getElementById('file-controls').style.display   = mode === 'file'   ? 'flex' : 'none';
  document.getElementById('period-controls').style.display = mode === 'period' ? 'flex' : 'none';

  // init calendar on first switch to period mode
  if (mode === 'period') initCalendar();

  reloadAll();
}

async function onPeriodChange(period, btn) {
  // update active button
  document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentPeriod = period;
  await reloadAll();
}

// ── INIT ──────────────────────────────────────────────────
async function init() {
  await reloadAll();
}

async function reloadAll() {
  try {
    if (currentMode === 'file') {
      // FILE MODE: load all reports for dropdown, show selected report's data
      const reports = await _fetchReports();
      if (!reports || reports.length === 0) {
        console.warn('No reports found');
        document.getElementById('report-select').innerHTML = '<option>no data</option>';
        return;
      }
      populateReportDropdown(reports);
      // keep current selection if it still exists, else pick latest
      const ids = reports.map(r => String(r.id));
      if (!ids.includes(String(currentReportId))) {
        currentReportId = reports[0].id;
      }
      await loadReport(currentReportId);

    } else {
      // PERIOD MODE: filter reports by date range from calendar
      const from = activeDateFrom;
      const to   = activeDateTo;
      const reports = await _fetchReports(from, to);
      if (!reports || reports.length === 0) {
        console.warn('No reports for this period');
        document.getElementById('report-select').innerHTML = '<option>no data for period</option>';
        return;
      }
      populateReportDropdown(reports);
      currentReportId = reports[0].id;
      await loadReport(currentReportId);
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function populateReportDropdown(reports) {
  const sel = document.getElementById('report-select');
  sel.innerHTML = reports.map(r => {
    const dateStr = r.created_at || r.date || '';
    const label   = dateStr ? dayjs(dateStr).format('DD MMM YYYY HH:mm') : `Report #${r.id}`;
    return `<option value="${r.id}">${label} — ${r.risk_level}</option>`;
  }).join('');
}

async function onReportChange(reportId) {
  currentReportId = parseInt(reportId);
  await loadReport(currentReportId);
}

async function refreshData() {
  await reloadAll();
}

// ── LOAD REPORT ───────────────────────────────────────────
async function loadReport(reportId) {
  try {
    const [summary, regions, carriers, reasons, trend, customersRes] = await Promise.all([
      _fetchSummary(reportId),
      _fetchRegions(reportId),
      _fetchCarriers(reportId),
      _fetchReasons(reportId),
      _fetchTrend(),
      _fetchCustomers(reportId, { perPage: 200 }), // fetch enough to compute metrics
    ]);

    const customers = customersRes.data || customersRes || [];

    updateKPIs(summary, customers);
    updateRiskBadge(summary.risk_level);
    updateFraudBanner(summary.fraud_indicators);

    // If API returns plain strings (just names), compute rates from customer data
    const isPlainStrings = arr => Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string';

    const regionData  = isPlainStrings(regions)  ? buildRegionMetrics(summary, customers)  : (regions  || []);
    const carrierData = isPlainStrings(carriers)  ? buildCarrierMetrics(summary, customers) : (carriers || []);
    const reasonData  = isPlainStrings(reasons)   ? buildReasonMetrics(customers)           : (reasons  || []);

    renderRegionChart(regionData);
    renderCarrierChart(carrierData);
    renderTrendChart(trend || []);
    renderReasonsChart(reasonData);

    updateCustomerTable(customers);
  } catch (err) {
    console.error('Failed to load report:', reportId, err);
  }
}

// ── KPI UPDATES ───────────────────────────────────────────
function updateKPIs(summary, customers) {
  document.getElementById('kpi-total').textContent = summary.total_deliveries  || 0;
  document.getElementById('kpi-fail').textContent  = summary.total_failures    || 0;
  document.getElementById('kpi-ok').textContent    = summary.total_successes   || 0;

  // Spring Boot uses failure_rate_percent; fallback to failure_rate
  const rate = summary.failure_rate_percent ?? summary.failure_rate ?? 0;
  document.getElementById('kpi-rate').textContent = parseFloat(rate).toFixed(1) + '% rate';

  const sent = (customers || []).filter(c => c.whatsapp_sent).length;
  document.getElementById('kpi-sent').textContent     = sent;
  document.getElementById('kpi-sent-sub').textContent = `of ${(customers || []).length} total`;

  const fraudRaw = summary.fraud_indicators;
  let fraudCount = 0;
  if (Array.isArray(fraudRaw)) fraudCount = fraudRaw.filter(f => f && f !== 'NONE').length;
  else if (typeof fraudRaw === 'string') {
    try { const parsed = JSON.parse(fraudRaw); fraudCount = parsed.filter(f => f && f !== 'NONE').length; } catch {}
  }
  document.getElementById('kpi-fraud').textContent = fraudCount || 'none';
}

function updateRiskBadge(level) {
  const badge = document.getElementById('risk-badge');
  badge.textContent = level || '—';
  badge.className = 'badge';
  if (level === 'HIGH' || level === 'CRITICAL') badge.classList.add('badge-danger');
  else if (level === 'MEDIUM') badge.classList.add('badge-warn');
  else badge.classList.add('badge-success');
}

function updateFraudBanner(indicators) {
  const banner = document.getElementById('fraud-banner');
  const list   = document.getElementById('fraud-list');

  // Handle both JSON string (MySQL) and parsed array
  let items = indicators;
  if (typeof indicators === 'string') {
    try { items = JSON.parse(indicators); } catch { items = []; }
  }
  items = (items || []).filter(i => i && i !== 'NONE');

  if (items.length === 0) { banner.style.display = 'none'; return; }
  list.innerHTML = items.map(i => `<li>${i}</li>`).join('');
  banner.style.display = 'block';
}

// ── START ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

// ── COMPUTE METRICS FROM CUSTOMER DATA ───────────────────
// Called when /regions or /carriers returns plain strings
// (Claude only stores names, not rates). We compute rates
// from the full report summary + customer list instead.

function buildRegionMetrics(summary, customers) {
  // If we already have objects with rates, use them
  if (!summary) return [];
  
  // Count failures per region from customer list
  const counts = {};
  (customers || []).forEach(c => {
    const r = c.region || 'Unknown';
    counts[r] = (counts[r] || 0) + 1;
  });

  const totalFail = summary.total_failures || 1;

  return Object.entries(counts)
    .map(([region, failures]) => ({
      region,
      failure_rate: parseFloat(((failures / totalFail) * (summary.failure_rate_percent ?? summary.failure_rate ?? 100)).toFixed(1)),
    }))
    .sort((a, b) => b.failure_rate - a.failure_rate);
}

function buildCarrierMetrics(summary, customers) {
  const counts = {};
  (customers || []).forEach(c => {
    const carrier = c.carrier || c.transportadora || 'Unknown';
    if (carrier !== 'Unknown') counts[carrier] = (counts[carrier] || 0) + 1;
  });

  const totalFail = summary.total_failures || 1;

  return Object.entries(counts)
    .map(([carrier, failures]) => ({
      carrier,
      failure_rate: parseFloat(((failures / totalFail) * (summary.failure_rate_percent ?? summary.failure_rate ?? 100)).toFixed(1)),
    }))
    .sort((a, b) => b.failure_rate - a.failure_rate);
}

function buildReasonMetrics(customers) {
  const counts = {};
  (customers || []).forEach(c => {
    const r = c.failure_reason || 'Unknown';
    counts[r] = (counts[r] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
