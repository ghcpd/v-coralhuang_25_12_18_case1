// Baseline demo: all operations are local (no loading / error UI, no inline updates)

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

// "Mock API" (delay + simulated failures)
async function listTasks({ failChance = 0.08, delay = 420 } = {}) {
  await new Promise((r) => setTimeout(r, delay));
  if (Math.random() < failChance) throw new Error('Simulated network error');
  return seededTasks();
}

// Simulated update API for inline status updates
async function updateTaskStatusMock(taskId, nextStatus, { delay = 650, failChance = 0.12 } = {}) {
  await new Promise((r) => setTimeout(r, delay));
  if (Math.random() < failChance) throw new Error('Update failed');
  return { id: taskId, status: nextStatus, updatedAt: new Date().toISOString() };
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
  error: null
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

const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elModalBody = document.getElementById("modalBody");

// new elements
const elBanner = document.getElementById('bannerArea');
const elBannerText = document.getElementById('bannerText');
const elBannerAction = document.getElementById('bannerAction');
const elBannerMeta = document.getElementById('bannerMeta');
const elRefresh = document.getElementById('refresh');
const elActive = document.getElementById('activeFilters');
const elEmpty = document.getElementById('emptyState');
const elEmptyReset = document.getElementById('emptyReset');
const elEmptyRefresh = document.getElementById('emptyRefresh');

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
      const cmp = va.localeCompare(vb, undefined, { numeric: true });
      return dir === "asc" ? cmp : -cmp;
    });
  }

  return out;
}

function highlight(text, q) {
  if (!q) return escapeHtml(text);
  const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function render() {
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

  // active filters
  const active = [];
  if (state.q.trim()) active.push({ t: 'Search', v: state.q });
  if (state.status !== 'ALL') active.push({ t: 'Status', v: state.status });
  if (state.sortKey) active.push({ t: 'Sort', v: `${state.sortKey} ${state.sortDir}` });
  elActive.innerHTML = active.length ? active.map(a => `<span class="pill" title="${a.t}"><strong style="margin-right:6px;color:var(--muted)">${a.t}:</strong> ${escapeHtml(a.v)}</span>`).join('') : '<span class="muted">No active filters</span>';

  // banner (loading / error)
  if (state.loading) {
    elBanner.style.display = 'flex';
    elBannerText.textContent = 'Loading tasks — please wait';
    elBannerAction.innerHTML = '<div class="loading-bar" style="width:64px"></div>';
    elBannerMeta.textContent = 'Live demo';
  } else if (state.error) {
    elBanner.style.display = 'flex';
    elBannerText.innerHTML = `<span class="error">${escapeHtml(state.error)}</span>`;
    elBannerAction.innerHTML = '<button id="bannerRetry" class="btn-ghost tiny">Retry</button>';
    elBannerMeta.textContent = '';
    // attach retry
    setTimeout(()=>{ const b=document.getElementById('bannerRetry'); if(b) b.addEventListener('click', () => fetchAndRender()); }, 20);
  } else {
    elBanner.style.display = 'none';
  }

  // table rows
  if (!pageItems.length) {
    elTbody.innerHTML = '';
    elEmpty.style.display = 'block';
  } else {
    elEmpty.style.display = 'none';
    elTbody.innerHTML = pageItems
      .map((t) => {
        const title = highlight(t.title, state.q);
        const updating = t._updating ? `<span class="spinner" aria-hidden="true"></span>` : '';
        const statusClass = t.status === 'TODO' ? 's-todo' : t.status === 'IN_PROGRESS' ? 's-ing' : 's-done';
        const statusAction = `<button class="status-action" data-id="${t.id}" ${t._updating? 'disabled': ''}>${t.status}${t._updating? ' ' + updating : ''}</button>`;
        const recent = t._recent ? ' recent' : '';
        const err = t._error ? `<div style="color:var(--danger);font-size:12px;margin-top:6px">${escapeHtml(t._error)}</div>` : '';
        return `
          <tr class="interactive${recent}" data-id="${t.id}">
            <td style="white-space:nowrap">${t.id}</td>
            <td><div style="max-width:520px">${title}</div></td>
            <td>${escapeHtml(t.assignee || '')}</td>
            <td class="status"><div style="display:flex;gap:8px;align-items:center"><div class="status-pill ${statusClass}">${statusAction}</div>${err}</div></td>
            <td style="white-space:nowrap">${formatDate(t.createdAt)}</td>
          </tr>
        `;
      })
      .join('');
  }

  // sorting indicators
  document.querySelectorAll('th[data-key]').forEach(th => {
    const k = th.getAttribute('data-key');
    const s = th.querySelector('.sort');
    if (!s) return;
    if (state.sortKey === k) s.textContent = state.sortDir === 'asc' ? '▲' : '▼';
    else s.textContent = '';
  });
}

function openModal(task) {
  elModalBody.innerHTML = `
    <div class="kv"><div class="k">Task ID</div><div class="v">${task.id}</div></div>
    <div class="kv"><div class="k">Title</div><div class="v">${escapeHtml(task.title)}</div></div>
    <div class="kv"><div class="k">Assignee</div><div class="v">${escapeHtml(task.assignee)}</div></div>
    <div class="kv"><div class="k">Status</div><div class="v">${task.status}</div></div>
    <div class="kv"><div class="k">Created At</div><div class="v">${formatDate(task.createdAt)}</div></div>
  `;
  elBackdrop.style.display = "flex";
}

function closeModal() {
  elBackdrop.style.display = "none";
}

// Events
elQ.addEventListener("input", (e) => {
  state.q = e.target.value;
  state.page = 1;
  render();
});

elStatus.addEventListener("change", (e) => {
  state.status = e.target.value;
  state.page = 1;
  render();
});

elReset.addEventListener("click", () => {
  state.q = "";
  state.status = "ALL";
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;
  state.error = null;

  elQ.value = "";
  elStatus.value = "ALL";
  elPageSize.value = "10";

  render();
});

elPageSize.addEventListener("change", (e) => {
  state.pageSize = Number(e.target.value);
  state.page = 1;
  render();
});

elPrev.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  render();
});

elNext.addEventListener("click", () => {
  state.page = state.page + 1;
  render();
});

// Click row -> modal
elTbody.addEventListener("click", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  // status click
  const statusBtn = e.target.closest('.status-action');
  if (statusBtn) {
    const tid = statusBtn.getAttribute('data-id');
    handleStatusClick(tid);
    return;
  }

  const task = state.all.find((x) => x.id === id);
  if (task) openModal(task);
});

elClose.addEventListener("click", closeModal);
elBackdrop.addEventListener("click", (e) => {
  if (e.target === elBackdrop) closeModal();
});

// Sort by header
document.querySelectorAll("th[data-key]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.getAttribute("data-key");
    if (!key) return;

    if (state.sortKey !== key) {
      state.sortKey = key;
      state.sortDir = "asc";
    } else {
      // cycle: asc -> desc -> none
      if (state.sortDir === "asc") state.sortDir = "desc";
      else if (state.sortDir === "desc") {
        state.sortKey = null;
        state.sortDir = null;
      } else state.sortDir = "asc";
    }

    state.page = 1;
    render();
  });
});

// status transitions: TODO -> IN_PROGRESS -> DONE
function nextStatus(current){
  if (current === 'TODO') return 'IN_PROGRESS';
  if (current === 'IN_PROGRESS') return 'DONE';
  return 'DONE';
}

async function handleStatusClick(id){
  const task = state.all.find(t => t.id === id);
  if (!task) return;
  if (task._updating) return; // prevent duplicate
  const from = task.status;
  const to = nextStatus(from);
  if (from === to) return;

  // optimistic UI: mark updating
  task._updating = true;
  task._error = null;
  render();

  try {
    const res = await updateTaskStatusMock(id, to);
    // apply
    task.status = res.status;
    task._updating = false;
    task._recent = true;
    // clear recent after a short time
    setTimeout(() => { task._recent = false; render(); }, 1600);
    render();
  } catch (err) {
    task._updating = false;
    task._error = err && err.message ? err.message : 'Failed to update';
    render();
    // revert error after a bit
    setTimeout(() => { task._error = null; render(); }, 2400);
  }
}

// refresh / fetch handling
async function fetchAndRender(){
  state.loading = true; state.error = null; render();
  try {
    const rows = await listTasks();
    // keep small per-row state (don't wipe UI flags if ids match)
    const old = Object.fromEntries((state.all||[]).map(t=>[t.id,t]));
    state.all = rows.map(r => Object.assign({}, r, old[r.id] ? { _recent: old[r.id]._recent } : {}));
    state.loading = false; state.error = null; render();
  } catch (err) {
    state.loading = false; state.error = err && err.message ? err.message : 'Unknown error'; render();
  }
}

elRefresh.addEventListener('click', () => fetchAndRender());
elEmptyReset.addEventListener('click', () => { elReset.click(); });
elEmptyRefresh.addEventListener('click', () => fetchAndRender());

// Init
(async function init() {
  await fetchAndRender();
})();
