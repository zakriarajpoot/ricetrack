// Updated dashboard.js with delete functionality

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  const STORAGE_KEY = 'rice_shop_sales';

  const q = id => document.getElementById(id);
  const els = {
    userId: q('user-id'),
    totalRevenue: q('total-revenue'),
    totalProfit: q('total-profit'),
    totalQuantity: q('total-quantity'),
    saleForm: q('sale-form'),
    resetBtn: q('reset-data'),
    downloadBtn: q('download-csv'),
    salesTableBody: q('sales-table-body'),
    topRiceTypes: q('top-rice-types'),
    startDate: q('start-date'),
    endDate: q('end-date'),
    applyFilter: q('apply-filter'),
    clearFilter: q('clear-filter'),
    toggleActions: q('toggle-actions'),
    actionSection: q('action-section'),
    dateInput: q('date'),
    riceTypeInput: q('rice-type'),
    quantityInput: q('quantity'),
    priceInput: q('price'),
    costInput: q('cost')
  };

  let sales = [];
  let dateFilter = { start: null, end: null };

  function loadSales() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      sales = parsed;
    } catch (err) {
      console.error('Failed to parse saved sales', err);
      sales = [];
    }
  }

  function saveSales() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }

  function filterSalesByDate() {
    if (!dateFilter.start || !dateFilter.end) return sales;
    const start = new Date(dateFilter.start);
    const end = new Date(dateFilter.end);
    end.setHours(23,59,59,999);
    return sales.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
  }

  function calculateMetrics() {
    const filtered = filterSalesByDate();
    let totalRevenue = 0, totalCost = 0, totalQuantity = 0;
    filtered.forEach(s => {
      totalRevenue += s.quantity * s.price;
      totalCost += s.quantity * s.cost;
      totalQuantity += s.quantity;
    });
    return { totalRevenue, totalProfit: totalRevenue - totalCost, totalQuantity };
  }

  function calculateTopRiceTypes() {
    const map = {};
    filterSalesByDate().forEach(s => {
      if (!map[s.riceType]) map[s.riceType] = { quantity: 0, revenue: 0 };
      map[s.riceType].quantity += s.quantity;
      map[s.riceType].revenue += s.quantity * s.price;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a,b) => b.quantity - a.quantity)
      .slice(0,5);
  }

  function updateDashboard() {
    const m = calculateMetrics();
    els.totalRevenue.textContent = `PKR ${m.totalRevenue.toFixed(2)}`;
    els.totalProfit.textContent = `PKR ${m.totalProfit.toFixed(2)}`;
    els.totalQuantity.textContent = `${m.totalQuantity.toFixed(2)} kg`;
    renderSalesTable();
    renderTopRice();
  }

  function renderSalesTable() {
    const rows = filterSalesByDate();
    els.salesTableBody.innerHTML = '';
    if (!rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="8" class="text-center py-4 text-gray-500">No sales data available</td>`;
      els.salesTableBody.appendChild(tr);
      return;
    }
    rows.forEach((r, index) => {
      const revenue = r.quantity * r.price;
      const profit = revenue - r.quantity * r.cost;
      const tr = document.createElement('tr');
      tr.className = 'animate-row';
      tr.innerHTML = `
        <td class="px-3 py-2">${r.date}</td>
        <td class="px-3 py-2">${escapeHtml(String(r.riceType))}</td>
        <td class="px-3 py-2">${r.quantity.toFixed(2)}</td>
        <td class="px-3 py-2">${r.price.toFixed(2)}</td>
        <td class="px-3 py-2">${r.cost.toFixed(2)}</td>
        <td class="px-3 py-2">${revenue.toFixed(2)}</td>
        <td class="px-3 py-2">${profit.toFixed(2)}</td>
        <td class="px-3 py-2 text-center"><button class="btn btn-danger btn-delete" data-index="${index}">🗑</button></td>
      `;
      els.salesTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        const i = parseInt(e.currentTarget.getAttribute('data-index'));
        sales.splice(i, 1);
        saveSales();
        updateDashboard();
      });
    });
  }

  function renderTopRice() {
    const top = calculateTopRiceTypes();
    els.topRiceTypes.innerHTML = '';
    if (!top.length) {
      els.topRiceTypes.innerHTML = `<div class="top-rice-card"><p>No data available</p></div>`;
      return;
    }
    top.forEach(item => {
      const div = document.createElement('div');
      div.className = 'top-rice-card p-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg';
      div.innerHTML = `<h3 class="font-bold text-lg">${escapeHtml(item.name)}</h3>
        <p>Quantity Sold: ${item.quantity.toFixed(2)} kg</p>
        <p>Revenue: PKR ${item.revenue.toFixed(2)}</p>`;
      els.topRiceTypes.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"]|'/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const riceType = els.riceTypeInput.value.trim();
    const date = els.dateInput.value;
    const quantity = parseFloat(els.quantityInput.value);
    const price = parseFloat(els.priceInput.value);
    const cost = parseFloat(els.costInput.value);
    if (!riceType || !date || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || isNaN(cost) || cost < 0) {
      alert('Please enter valid values in all fields.');
      return;
    }
    const newSale = { riceType, date, quantity, price, cost };
    sales.push(newSale);
    saveSales();
    updateDashboard();
    e.target.reset();
    els.dateInput.focus();
  }

  function onResetData() {
    if (!confirm('Delete all sales data? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    sales = [];
    dateFilter = { start: null, end: null };
    els.startDate.value = '';
    els.endDate.value = '';
    updateDashboard();
  }

  function onDownloadCSV() {
    const data = filterSalesByDate();
    if (!data.length) return alert('No sales data to export.');
    let csv = 'Date,Rice Type,Quantity (kg),Price (PKR/kg),Cost (PKR/kg),Revenue (PKR),Profit (PKR)\n';
    data.forEach(s => {
      const revenue = s.quantity * s.price;
      const profit = revenue - s.quantity * s.cost;
      csv += `${s.date},"${s.riceType}",${s.quantity.toFixed(2)},${s.price.toFixed(2)},${s.cost.toFixed(2)},${revenue.toFixed(2)},${profit.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rice_sales_data.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onApplyFilter() {
    const s = els.startDate.value;
    const e = els.endDate.value;
    if (!s || !e) return alert('Select both start and end dates.');
    if (new Date(s) > new Date(e)) return alert('Start date must be <= end date.');
    dateFilter = { start: s, end: e };
    updateDashboard();
  }

  function onClearFilter() {
    dateFilter = { start: null, end: null };
    els.startDate.value = '';
    els.endDate.value = '';
    updateDashboard();
  }

  function toggleActions() {
    if (!els.actionSection) return;
    const sec = els.actionSection;
    if (sec.classList.contains('hidden')) {
      sec.classList.remove('hidden');
      setTimeout(() => sec.classList.add('open'), 20);
    } else {
      sec.classList.remove('open');
      sec.addEventListener('transitionend', function hideOnce() {
        sec.classList.add('hidden');
        sec.removeEventListener('transitionend', hideOnce);
      });
    }
  }

  if (els.saleForm) els.saleForm.addEventListener('submit', onFormSubmit);
  if (els.resetBtn) els.resetBtn.addEventListener('click', onResetData);
  if (els.downloadBtn) els.downloadBtn.addEventListener('click', onDownloadCSV);
  if (els.applyFilter) els.applyFilter.addEventListener('click', onApplyFilter);
  if (els.clearFilter) els.clearFilter.addEventListener('click', onClearFilter);
  if (els.toggleActions) els.toggleActions.addEventListener('click', toggleActions);

  els.userId && (els.userId.textContent = 'USR-1001');
  loadSales();
  updateDashboard();
}
