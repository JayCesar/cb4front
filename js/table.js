// ── table.js ──────────────────────────────────────────────
// Sets up the Tabulator customer table.
// Called from dashboard.js with real data from the API.
// ─────────────────────────────────────────────────────────

let customerTable = null;

function initCustomerTable(data) {
  const reasonBadge = (cell) => {
    const v = cell.getValue() || '';
    let cls = 'badge-info';
    if (v.includes('risco') || v.includes('Risco'))   cls = 'badge-danger';
    else if (v.includes('Extravio') || v.includes('Recusado')) cls = 'badge-warn';
    return `<span class="badge ${cls}" title="${v}">${v.length > 30 ? v.slice(0,28)+'…' : v}</span>`;
  };

  const whatsappBtn = (cell) => {
    const row  = cell.getRow().getData();
    const sent = row.whatsapp_sent;
    const cls  = sent ? 'btn-whatsapp sent' : 'btn-whatsapp';
    const lbl  = sent ? '&#10003; sent' : 'send';
    return `<button class="${cls}" data-id="${row.id}" onclick="handleSend(this, '${row.id}')">${lbl}</button>`;
  };

  customerTable = new Tabulator('#customer-table', {
    data,
    layout: 'fitColumns',
    pagination: true,
    paginationSize: 15,
    paginationSizeSelector: [10, 15, 25, 50],
    movableColumns: false,
    placeholder: 'no customers found',
    columns: [
      { title: 'name',          field: 'name',           widthGrow: 2, minWidth: 140 },
      { title: 'whatsapp',      field: 'whatsapp',       widthGrow: 1.5, minWidth: 120,
        formatter: (cell) => `<span style="font-family:monospace;font-size:12px;">${cell.getValue()}</span>` },
      { title: 'reason',        field: 'failure_reason', widthGrow: 2.5, minWidth: 160,
        formatter: reasonBadge },
      { title: 'region',        field: 'region',         widthGrow: 1,   minWidth: 100 },
      { title: 'carrier',       field: 'carrier',              widthGrow: 1.2, minWidth: 110 },
      { title: 'attempted at',  field: 'delivery_attempted_at', widthGrow: 1.5, minWidth: 130,
        formatter: (cell) => {
          const v = cell.getValue();
          if (!v) return '<span style="color:var(--muted)">—</span>';
          return dayjs(v).format('DD MMM YYYY HH:mm');
        }
      },
      { title: 'attempts',      field: 'attempts',             width: 80,  hozAlign: 'center' },
      { title: 'whatsapp',      field: 'whatsapp_sent',        width: 90,
        formatter: whatsappBtn, hozAlign: 'center', headerSort: false },
    ],
  });

  updateCustomerCount();
}

function updateCustomerTable(data) {
  if (!customerTable) { initCustomerTable(data); return; }
  customerTable.replaceData(data);
  updateCustomerCount();
}

function updateCustomerCount() {
  if (!customerTable) return;
  const total = customerTable.getData('active').length;
  document.getElementById('cust-count').textContent = `(${total} total)`;
}

function onSearch(value) {
  if (!customerTable) return;
  if (!value) {
    customerTable.clearFilter();
    applyRegionFilter();
    return;
  }
  customerTable.setFilter([
    [
      { field: 'name',           type: 'like', value },
      { field: 'failure_reason', type: 'like', value },
      { field: 'region',         type: 'like', value },
    ],
  ]);
  updateCustomerCount();
}

function onRegionFilter(region) {
  if (!customerTable) return;
  applyRegionFilter(region);
}

function applyRegionFilter(region) {
  if (!customerTable) return;
  const search = document.getElementById('search-input').value;
  customerTable.clearFilter();

  const filters = [];
  if (region) filters.push({ field: 'region', type: '=', value: region });
  if (search) filters.push([
    { field: 'name',           type: 'like', value: search },
    { field: 'failure_reason', type: 'like', value: search },
  ]);

  if (filters.length) customerTable.setFilter(filters);
  updateCustomerCount();
}

async function handleSend(btn, customerId) {
  if (btn.classList.contains('sent')) return;
  btn.textContent = '…';
  btn.disabled = true;

  try {
    await markWhatsappSent(customerId);
    btn.innerHTML   = '&#10003; sent';
    btn.classList.add('sent');

    // update KPI counter
    const sent  = document.querySelectorAll('.btn-whatsapp.sent').length;
    const total = customerTable.getData().length;
    document.getElementById('kpi-sent').textContent = sent;
    document.getElementById('kpi-sent-sub').textContent = `of ${total} total`;
  } catch (err) {
    btn.textContent = 'retry';
    btn.disabled = false;
    console.error('Failed to mark sent:', err);
  }
}

function exportCSV() {
  if (!customerTable) return;
  customerTable.download('csv', `customers_${dayjs().format('YYYY-MM-DD')}.csv`);
}
