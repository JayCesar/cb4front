// ── charts.js ─────────────────────────────────────────────
// Creates and updates all Chart.js instances.
// Called from dashboard.js whenever new data arrives.
// ─────────────────────────────────────────────────────────

const COLORS = {
  danger:  '#E24B4A',
  warn:    '#EF9F27',
  ok:      '#1D9E75',
  neutral: '#888780',
  info:    '#378ADD',
};

// Map failure rate to a color
function rateColor(rate) {
  // absolute thresholds (when failure_rate is % of total deliveries)
  if (rate >= 35) return COLORS.danger;
  if (rate >= 25) return COLORS.warn;
  return COLORS.ok;
}

// Color bars relative to each other within the same chart
// top 25% = red, middle 50% = yellow, bottom 25% = green
function relativeColors(values) {
  if (!values || values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values.map(v => {
    const pct = (v - min) / range; // 0 = lowest, 1 = highest
    if (pct >= 0.75) return COLORS.danger;
    if (pct >= 0.35) return COLORS.warn;
    return COLORS.ok;
  });
}

// Shared Chart.js defaults
const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

// Store chart instances so we can update them later
const charts = {};

// ── region bar chart ──────────────────────────────────────
function renderRegionChart(data) {
  // Normalize: handles [{region, failure_rate}] OR plain strings ["Grande SP", ...]
  const normalized = data.map((d, i) => {
    if (typeof d === 'string') return { region: d, failure_rate: 0 };
    return {
      region:       d.region || d.name || String(d),
      failure_rate: d.failure_rate ?? d.failure_rate_percent ?? d.rate ?? 0,
    };
  });
  const sorted = [...normalized].sort((a, b) => b.failure_rate - a.failure_rate);
  const labels = sorted.map(d => d.region);
  const values = sorted.map(d => parseFloat((+d.failure_rate).toFixed(1)));
  const colors = relativeColors(values);

  if (charts.region) {
    charts.region.data.labels = labels;
    charts.region.data.datasets[0].data   = values;
    charts.region.data.datasets[0].backgroundColor = colors;
    charts.region.update();
    return;
  }

  charts.region = new Chart(document.getElementById('chartRegion'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 18,
      }],
    },
    options: {
      ...BASE_OPTS,
      indexAxis: 'y',
      scales: {
        x: {
          min: 0, max: 100,
          ticks: { callback: v => v + '%', font: { size: 11 } },
          grid: { color: 'rgba(128,128,128,0.1)' },
        },
        y: { ticks: { font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

// ── carrier bar chart ─────────────────────────────────────
function renderCarrierChart(data) {
  // Normalize: handles [{carrier, failure_rate}] OR plain strings
  const normalized = data.map(d => {
    if (typeof d === 'string') return { carrier: d, failure_rate: 0 };
    return {
      carrier:      d.carrier || d.name || String(d),
      failure_rate: d.failure_rate ?? d.failure_rate_percent ?? d.rate ?? 0,
    };
  });
  const sorted = [...normalized].sort((a, b) => b.failure_rate - a.failure_rate);
  const labels = sorted.map(d => d.carrier);
  const values = sorted.map(d => parseFloat((+d.failure_rate).toFixed(1)));
  const colors = relativeColors(values);

  if (charts.carrier) {
    charts.carrier.data.labels = labels;
    charts.carrier.data.datasets[0].data   = values;
    charts.carrier.data.datasets[0].backgroundColor = colors;
    charts.carrier.update();
    return;
  }

  charts.carrier = new Chart(document.getElementById('chartCarrier'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 18,
      }],
    },
    options: {
      ...BASE_OPTS,
      indexAxis: 'y',
      scales: {
        x: {
          min: 0, max: 100,
          ticks: { callback: v => v + '%', font: { size: 11 } },
          grid: { color: 'rgba(128,128,128,0.1)' },
        },
        y: { ticks: { font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

// ── trend line chart ──────────────────────────────────────
function renderTrendChart(data) {
  // data: [{ created_at, failure_rate_percent }] sorted oldest → newest
  // Smart label: if any two points share the same day, show time (HH:mm); otherwise show date
  const dates = data.map(d => dayjs(d.created_at || d.date || ''));
  const dayStrs = dates.map(d => d.format('DD MMM'));
  const hasDuplicateDays = dayStrs.length !== new Set(dayStrs).size;
  const labels = dates.map(d => hasDuplicateDays ? d.format('DD MMM HH:mm') : d.format('DD MMM'));
  const values = data.map(d => parseFloat((d.failure_rate_percent ?? d.failure_rate ?? 0).toFixed(1)));

  if (charts.trend) {
    charts.trend.data.labels = labels;
    charts.trend.data.datasets[0].data = values;
    charts.trend.update();
    return;
  }

  charts.trend = new Chart(document.getElementById('chartTrend'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'failure rate %',
        data: values,
        borderColor: COLORS.danger,
        backgroundColor: 'rgba(226,75,74,0.08)',
        borderWidth: 2,
        pointBackgroundColor: COLORS.danger,
        pointRadius: 4,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      ...BASE_OPTS,
      scales: {
        y: {
          min: 0,
          ticks: { callback: v => v + '%', font: { size: 11 } },
          grid: { color: 'rgba(128,128,128,0.1)' },
        },
        x: {
          ticks: {
            font: { size: 10 },
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
          },
          grid: { display: false },
        },
      },
    },
  });
}

// ── reasons doughnut ──────────────────────────────────────
function renderReasonsChart(data) {
  // data: [{ reason, count }] — also handles plain strings or arrays
  const normalized = data.map(d => {
    if (typeof d === 'string') return { reason: d, count: 1 };
    // { reason, count } or { name, count } or { failure_reason, count }
    return {
      reason: d.reason || d.name || d.failure_reason || String(d),
      count:  d.count  || d.total || d.failures || 1,
    };
  });
  const sorted = [...normalized].sort((a, b) => b.count - a.count);
  const labels = sorted.map(d => d.reason);
  const values = sorted.map(d => d.count);
  const palette = [COLORS.danger, COLORS.warn, COLORS.neutral, COLORS.info, COLORS.ok, '#AFA9EC'];

  if (charts.reasons) {
    charts.reasons.data.labels = labels;
    charts.reasons.data.datasets[0].data = values;
    charts.reasons.update();
    return;
  }

  charts.reasons = new Chart(document.getElementById('chartReasons'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette,
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      ...BASE_OPTS,
      cutout: '62%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: { size: 11 },
            boxWidth: 10,
            padding: 8,
            // shorten long labels
            generateLabels(chart) {
              return Chart.defaults.plugins.legend.labels.generateLabels(chart).map(item => {
                const text = String(item.text || '');
                item.text = text.length > 28 ? text.slice(0, 26) + '…' : text;
                return item;
              });
            },
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed} failures`,
          },
        },
      },
    },
  });
}
