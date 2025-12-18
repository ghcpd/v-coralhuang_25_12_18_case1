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

// "Mock API" (delay only). Accepts an options object to allow simulating failures
let simulateFail = false;
async function listTasks(opts = {}) {
  const delay = opts.delay ?? 350;
  await new Promise((r) => setTimeout(r, delay));
  if (opts.simulateFail) throw new Error('Simulated load failure');
  return seededTasks();
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
  rowLoading: {}, // id -> boolean
  rowError: {}, // id -> message
  recent: {} // id -> timeoutId
};

// Elements
const elQ = document.getElementById("q");
const elStatus = document.getElementById("status");
const elReset = document.getElementById("reset");
const elReload = document.getElementById("reload");
const elSimFail = document.getElementById("simulateFail");
const elResetEmpty = document.getElementById("resetEmpty");
const elActiveFilters = document.getElementById("activeFilters");
const elTbody = document.getElementById("tbody");
const elSummary = document.getElementById("summary");
const elPageSize = document.getElementById("pageSize");
const elPrev = document.getElementById("prev");
const elNext = document.getElementById("next");
const elPageInfo = document.getElementById("pageInfo");
const elLoadingOverlay = document.getElementById("loadingOverlay");
const elErrorArea = document.getElementById("errorArea");
const elEmpty = document.getElementById("emptyState");
const elLoadMsg = document.getElementById("loadMsg");

const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elModalBody = document.getElementById("modalBody");

// Derived
function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
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
      const cmp = va.localeCompare(vb, undefined, {numeric:true});
      return dir === "asc" ? cmp : -cmp;
    });
  }

  return out;
}

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

  // Active filter chips
  const chips = [];
  if (state.q) chips.push(`<span class="chip">Search: "${state.q}"</span>`);
  if (state.status !== 'ALL') chips.push(`<span class="chip">Status: ${state.status}</span>`);
  if (state.sortKey) chips.push(`<span class="chip">Sort: ${state.sortKey} ${state.sortDir}</span>`);
  elActiveFilters.innerHTML = chips.join(' ');

  // Empty state
  if (total === 0) {
    elEmpty.style.display = '';
    elTbody.innerHTML = '';
    return;
  } else {
    elEmpty.style.display = 'none';
  }

  // Render rows with interactive status UI and search highlights
  const q = state.q.trim();
  const re = q ? new RegExp('(' + escapeRegex(q) + ')','ig') : null;

  elTbody.innerHTML = pageItems
    .map((t) => {
      const title = re ? t.title.replace(re, '<mark>$1</mark>') : t.title;
      const rowBusy = state.rowLoading[t.id];
      const rowErr = state.rowError[t.id];
      const recentClass = state.recent[t.id] ? 'recent-updated' : '';

      const statusClass = `status-${t.status}`;
      const nextEnabled = t.status !== 'DONE';
      const statusBtn = `<div style="display:flex;align-items:center"><button data-action="advance" data-id="${t.id}" class="status-btn ${statusClass}" ${rowBusy ? 'disabled' : ''}>${t.status}</button>${rowBusy?'<span style="margin-left:8px" class="muted">Updating…</span>':'<button data-action="advance" data-id="'+t.id+'" class="status-action" title="Advance">›</button>'}</div>`;

      return `
      <tr data-id="${t.id}" class="${recentClass} ${rowErr? 'row-error':''} ${rowBusy? 'row-loading':''}">
        <td>${t.id}</td>
        <td>${title}</td>
        <td>${t.assignee}</td>
        <td>${statusBtn}${rowErr?'<div style="color:var(--danger);font-size:13px;margin-top:6px">'+rowErr+'</div>':''}</td>
        <td>${formatDate(t.createdAt)}</td>
      </tr>
    `
    })
    .join("");

  // ensure headers reflect current sort
  updateSortHeaders();
}

function openModal(task) {
  elModalBody.innerHTML = `
    <div class="kv"><div class="k">Task ID</div><div class="v">${task.id}</div></div>
    <div class="kv"><div class="k">Title</div><div class="v">${task.title}</div></div>
    <div class="kv"><div class="k">Assignee</div><div class="v">${task.assignee}</div></div>
    <div class="kv"><div class="k">Status</div><div class="v">${task.status}</div></div>
    <div class="kv"><div class="k">Created At</div><div class="v">${formatDate(task.createdAt)}</div></div>
  `;
  elBackdrop.style.display = "flex";
}

function closeModal() {
  elBackdrop.style.display = "none";
}

// Helpers: loading & error
function setLoading(on){ state.loading = on; elLoadingOverlay.style.display = on ? '' : 'none'; elLoadMsg.textContent = on ? 'Loading tasks' : ''; }
function setLoadError(err){ state.loadError = err; if (err){ elErrorArea.style.display=''; elErrorArea.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><div style="color:var(--danger);font-weight:600">Error:</div><div class="muted">${(err.message||String(err))}</div><div style="margin-left:auto"><button class="retry">Retry</button></div></div>`; } else { elErrorArea.style.display='none'; elErrorArea.textContent=''; } }

// Status transition helper
function nextStatus(curr){ if (curr === 'TODO') return 'IN_PROGRESS'; if (curr === 'IN_PROGRESS') return 'DONE'; return curr; }

async function updateStatus(id){ if (state.rowLoading[id]) return; const task = state.all.find(t=>t.id===id); if(!task) return;
  const target = nextStatus(task.status);
  if(target === task.status) return;
  state.rowLoading[id] = true; state.rowError[id] = null; render();

  // simulate update API
  try{
    await new Promise((r)=>setTimeout(r, 600));
    // random failure simulation (15% chance)
    if (Math.random() < 0.15){ throw new Error('Network error updating status'); }

    // success
    task.status = target;
    state.rowLoading[id] = false;
    state.recent[id] = true;
    // clear recent marker after short duration
    if (state.recent[id]){ clearTimeout(state.recent[id]); }
    state.recent[id] = setTimeout(()=>{ delete state.recent[id]; render(); }, 2500);
    render();
  }catch(err){
    state.rowLoading[id] = false; state.rowError[id] = err.message || String(err); render();
    // clear error after some time and revert
    setTimeout(()=>{ delete state.rowError[id]; render(); }, 3000);
  }
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

  elQ.value = "";
  elStatus.value = "ALL";
  elPageSize.value = "10";
  elSimFail.checked = false;

  render();
});

elResetEmpty.addEventListener('click', ()=>{ elReset.click(); });

elReload.addEventListener('click', ()=>{ loadTasks(); });
elSimFail.addEventListener('change', (e)=>{ simulateFail = e.target.checked; });

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

// Click row -> modal, but avoid opening when status action was clicked
elTbody.addEventListener("click", (e) => {
  const actionBtn = e.target.closest('button[data-action]');
  if (actionBtn){ const id = actionBtn.getAttribute('data-id'); if (actionBtn.getAttribute('data-action') === 'advance'){ updateStatus(id); } return; }

  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const task = state.all.find((x) => x.id === id);
  if (task) openModal(task);
});

elClose.addEventListener("click", closeModal);
elBackdrop.addEventListener("click", (e) => {
  if (e.target === elBackdrop) closeModal();
});

// Sort by header (with visual indicator)
function updateSortHeaders(){
  document.querySelectorAll("th[data-key]").forEach((th)=>{
    const key = th.getAttribute('data-key');
    if (state.sortKey===key && state.sortDir){
      th.innerHTML = th.textContent + (state.sortDir==='asc' ? ' ▲' : ' ▼');
    } else {
      th.innerHTML = th.textContent.replace(/[▲▼]/g,'').trim();
    }
  });
}
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
    updateSortHeaders();
    render();
  });
});


// Load tasks with UI feedback
async function loadTasks(){
  setLoading(true); setLoadError(null);
  try{
    const tasks = await listTasks({ simulateFail, delay: 700 });
    state.all = tasks;
    setLoading(false);
    render();
  }catch(err){
    setLoading(false);
    setLoadError(err);
    render();
  }
}

// Retry handler for errors
elErrorArea.addEventListener('click', (e)=>{ if (e.target && e.target.matches('button.retry')){ loadTasks(); } });

// Init
(async function init() {
  loadTasks();
})();
