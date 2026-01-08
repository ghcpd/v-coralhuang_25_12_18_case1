// Enhanced demo: loading/error UI, inline updates, search highlighting, and usage guide integration

function pad(n, len) {
  const s = String(n);
  return s.length >= len ? s : "0".repeat(len - s.length) + s;
}

function formatDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1, 2);
  const dd = pad(d.getDate(), 2);
  const hh = pad(d.getHours(), 2);
  const mi = pad(d.getMinutes(), 2);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function seededTasks() {
  const assignees = ["Alice", "Bob", "Carol", "David", "Eve"];
  const base = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const tasks = [];
  for (let i = 1; i <= 57; i++) {
    const status = i % 3 === 0 ? "DONE" : i % 3 === 1 ? "TODO" : "IN_PROGRESS";
    tasks.push({
      id: `T-${pad(i, 4)}`,
      title: `Task ${i} - ${i % 2 === 0 ? "Quarterly" : "Weekly"} report`,
      assignee: assignees[i % assignees.length],
      status,
      createdAt: new Date(base + i * 6 * 3600 * 1000).toISOString()
    });
  }
  return tasks;
}

// Global settings
let simulateFailure = false;

// "Mock API" (delay + optional failure)
async function listTasks() {
  await new Promise((r) => setTimeout(r, 550)); // make loading noticeable
  if (simulateFailure) throw new Error("Failed to load tasks (simulated)");
  return seededTasks();
}

// Mock update API for inline status change
async function updateTaskStatus(id, newStatus) {
  await new Promise((r) => setTimeout(r, 600));
  // Simulate transient failure 18% of the time
  if (Math.random() < 0.18) throw new Error("Network error while updating status");
  return { id, status: newStatus, updatedAt: new Date().toISOString() };
}

// State
const state = {
  all: [],
  q: "",
  status: "ALL",
  sortKey: null,
  sortDir: null, // "asc" | "desc" | null
  page: 1,
  pageSize: 10,
  loading: false,
  loadError: null,
  updatingIds: new Set(),
  recentIds: new Set()
};

// Elements
const elQ = document.getElementById("q");
const elStatus = document.getElementById("status");
const elReset = document.getElementById("reset");
const elTbody = document.getElementById("tbody");
const elSummary = document.getElementById("summary");
const elPageSize = document.getElementById("pageSize");
const elPrev = document.getElementById("prev");
const elNext = document.getElementById("next");
const elPageInfo = document.getElementById("pageInfo");
const elSimFail = document.getElementById("simulateFail");
const elBannerArea = document.getElementById("bannerArea");
const elLoadingOverlay = document.getElementById("loadingOverlay");
const elActiveFilters = document.getElementById("activeFilters");

const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elModalBody = document.getElementById("modalBody");

// Utilities
function escapeHtml(s) {
  return String(s).replace(/[&<>"]+/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));
}

function highlight(text, q) {
  if (!q) return escapeHtml(text);
  try {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${esc})`, "ig");
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  } catch (err) {
    return escapeHtml(text);
  }
}

// Derived
function applyQueryFilterSort() {
  let out = [...state.all];

  const q = state.q.trim().toLowerCase();
  if (q) out = out.filter((t) => t.title.toLowerCase().includes(q));

  if (state.status !== "ALL") out = out.filter((t) => t.status === state.status);

  if (state.sortKey && state.sortDir) {
    const k = state.sortKey;
    const dir = state.sortDir;
    out.sort((a, b) => {
      const va = String(a[k]);
      const vb = String(b[k]);
      const cmp = va.localeCompare(vb);
      return dir === "asc" ? cmp : -cmp;
    });
  }

  return out;
}

function showBanner(type, message, actions = []) {
  elBannerArea.innerHTML = `
    <div class="banner ${type}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div>${escapeHtml(message)}</div><div id="bannerActions"></div></div>
    </div>
  `;
  const ba = document.getElementById("bannerActions");
  actions.forEach((a) => {
    const btn = document.createElement("button");
    btn.className = 'btn secondary';
    btn.textContent = a.label;
    btn.addEventListener('click', a.onClick);
    ba.appendChild(btn);
  });
}

function clearBanner() {
  elBannerArea.innerHTML = '';
}

function render() {
  // Loading overlay
  elLoadingOverlay.style.display = state.loading ? 'flex' : 'none';

  if (state.loadError) {
    showBanner('error', state.loadError, [
      { label: 'Retry', onClick: () => loadTasks() },
      { label: 'Reset view', onClick: () => resetView() }
    ]);
  } else clearBanner();

  const full = applyQueryFilterSort();
  const total = full.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  elSummary.textContent = `${total} items`;
  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;

  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // Update sort indicators
  document.querySelectorAll('th[data-key]').forEach(th => {
    const key = th.getAttribute('data-key');
    const el = document.getElementById('sort-' + key);
    if (!el) return;
    if (state.sortKey === key) el.textContent = state.sortDir === 'asc' ? '▲' : '▼';
    else el.textContent = '';
  });

  // Active filters pills
  elActiveFilters.innerHTML = '';
  if (state.q) {
    const p = document.createElement('div'); p.className='pill'; p.innerHTML = `Search: <strong>${escapeHtml(state.q)}</strong> <button style="margin-left:8px;" aria-label="clear search">×</button>`;
    p.querySelector('button').addEventListener('click', () => { state.q=''; elQ.value=''; state.page=1; render(); });
    elActiveFilters.appendChild(p);
  }
  if (state.status !== 'ALL') {
    const p = document.createElement('div'); p.className='pill'; p.innerHTML = `Status: <strong>${escapeHtml(state.status)}</strong> <button style="margin-left:8px;" aria-label="clear status">×</button>`;
    p.querySelector('button').addEventListener('click', () => { state.status='ALL'; elStatus.value='ALL'; state.page=1; render(); });
    elActiveFilters.appendChild(p);
  }
  if (state.sortKey) {
    const p = document.createElement('div'); p.className='pill'; p.innerHTML = `Sort: <strong>${escapeHtml(state.sortKey)} ${state.sortDir}</strong> <button style="margin-left:8px;" aria-label="clear sort">×</button>`;
    p.querySelector('button').addEventListener('click', () => { state.sortKey=null; state.sortDir=null; state.page=1; render(); });
    elActiveFilters.appendChild(p);
  }

  // Empty state
  if (!state.loading && total === 0) {
    elTbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty">
          <div>
            <div style="font-weight:700">No tasks match your filters</div>
            <div class="muted" style="margin-top:6px">Try adjusting filters or reset the view to see all tasks.</div>
          </div>
          <div>
            <button id="emptyReset" class="btn">Reset view</button>
          </div>
        </div>
      </td></tr>
    `;
    document.getElementById('emptyReset').addEventListener('click', resetView);
    return;
  }

  // Skeleton during loading
  if (state.loading) {
    const skeletonRows = new Array(state.pageSize).fill(0).map(() => `
      <tr>
        <td colspan="5" style="padding:14px"><div style="height:14px;background:#f1f5f9;border-radius:6px;width:60%"></div></td>
      </tr>
    `).join('');
    elTbody.innerHTML = skeletonRows;
    return;
  }

  // Render rows
  elTbody.innerHTML = pageItems.map((t) => {
    const isUpdating = state.updatingIds.has(t.id);
    const isRecent = state.recentIds.has(t.id);
    const title = highlight(t.title, state.q);
    const statusCls = `status-${t.status}`;
    const statusCell = isUpdating ? `<div class="status-spinner" aria-hidden="true"></div>` : `<button class="status-btn ${statusCls}" data-action="status">${escapeHtml(t.status)}</button>`;
    const err = t._error ? `<div class="row-error">${escapeHtml(t._error)}</div>` : '';
    return `
      <tr data-id="${t.id}" class="${isRecent ? 'recent' : ''}" tabindex="0">
        <td style="white-space:nowrap">${escapeHtml(t.id)}</td>
        <td><div>${title}</div>${err}</td>
        <td>${escapeHtml(t.assignee)}</td>
        <td>${statusCell}</td>
        <td>${formatDate(t.createdAt)}</td>
      </tr>
    `;
  }).join('');
}

function resetView() {
  state.q = '';
  state.status = 'ALL';
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;

  elQ.value = '';
  elStatus.value = 'ALL';
  elPageSize.value = '10';

  render();
}

// Click row / inline status handlers
elTbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action="status"]');
  if (btn) {
    const tr = btn.closest('tr');
    const id = tr.getAttribute('data-id');
    await handleStatusAdvance(id);
    return;
  }

  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.getAttribute('data-id');
  const task = state.all.find(x => x.id === id);
  if (task) openModal(task);
});

// Keyboard support for rows
elTbody.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const tr = e.target.closest('tr');
  if (!tr) return;
  e.preventDefault();
  const id = tr.getAttribute('data-id');
  const task = state.all.find(x => x.id === id);
  if (task) openModal(task);
});

async function handleStatusAdvance(id) {
  if (state.updatingIds.has(id)) return; // prevent duplicates
  const task = state.all.find(x => x.id === id);
  if (!task) return;
  const order = ['TODO','IN_PROGRESS','DONE'];
  const cur = task.status;
  const idx = order.indexOf(cur);
  if (idx === -1 || idx === order.length -1) return; // can't advance
  const next = order[idx+1];

  // Set updating
  state.updatingIds.add(id);
  task._error = null;
  render();

  try {
    const res = await updateTaskStatus(id, next);
    // apply update
    task.status = res.status;
    task.updatedAt = res.updatedAt;
    // briefly mark as recent
    state.recentIds.add(id);
    setTimeout(() => { state.recentIds.delete(id); render(); }, 3000);
  } catch (err) {
    task._error = err.message || 'Failed to update';
  } finally {
    state.updatingIds.delete(id);
    render();
  }
}

// Header sorting
document.querySelectorAll('th[data-key]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.getAttribute('data-key');
    if (!key) return;
    if (state.sortKey !== key) { state.sortKey = key; state.sortDir = 'asc'; }
    else { if (state.sortDir === 'asc') state.sortDir='desc'; else if (state.sortDir==='desc') { state.sortKey=null; state.sortDir=null } else state.sortDir='asc'; }
    state.page = 1; render();
  })
})

// Modal
function openModal(task) {
  elModalBody.innerHTML = `
    <div class="kv"><div class="k">Task ID</div><div class="v">${escapeHtml(task.id)}</div></div>
    <div class="kv"><div class="k">Title</div><div class="v">${escapeHtml(task.title)}</div></div>
    <div class="kv"><div class="k">Assignee</div><div class="v">${escapeHtml(task.assignee)}</div></div>
    <div class="kv"><div class="k">Status</div><div class="v">${escapeHtml(task.status)}</div></div>
    <div class="kv"><div class="k">Created At</div><div class="v">${formatDate(task.createdAt)}</div></div>
  `;
  elBackdrop.style.display = 'flex';
}
function closeModal(){ elBackdrop.style.display='none' }

// UI events
elQ.addEventListener('input', (e) => { state.q = e.target.value; state.page = 1; render(); });
elStatus.addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; render(); });

elReset.addEventListener('click', () => { resetView(); loadTasks(); });

elPageSize.addEventListener('change', (e) => { state.pageSize = Number(e.target.value); state.page = 1; render(); });
elPrev.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); render(); });
elNext.addEventListener('click', () => { state.page = state.page + 1; render(); });

elClose.addEventListener('click', closeModal);
elBackdrop.addEventListener('click', (e) => { if (e.target === elBackdrop) closeModal(); });

elSimFail.addEventListener('change', (e) => { simulateFailure = !!e.target.checked; });

// Load tasks with loading / error handling
async function loadTasks() {
  state.loading = true; state.loadError = null; render();
  try {
    const data = await listTasks();
    state.all = data;
  } catch (err) {
    state.loadError = err.message || 'Failed to load tasks';
  } finally {
    state.loading = false; render();
  }
}

// Init
(async function init() {
  await loadTasks();
})();
