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

// "Mock API" (delay + simulated failure)
async function listTasks() {
  // simulate network latency
  await new Promise((r) => setTimeout(r, 300));
  // simulate failure 15% of the time
  if (Math.random() < 0.15) throw new Error("Failed to fetch tasks. Please try again.");
  return seededTasks();
}

// Mock update API: update status with simulated latency and 15% failure
async function updateTaskStatus(id, newStatus) {
  await new Promise((r) => setTimeout(r, 300));
  if (Math.random() < 0.15) throw new Error("Failed to update task status.");
  return true;
}

// State
const state = {
  // Set of ids currently being updated
  updating: new Set(),
  // Temporary errors per id
  updateErrors: new Map(),
  // Id of the last updated task (for highlight)
  lastUpdatedId: null,

  all: [],
  q: "",
  status: "ALL",
  sortKey: null,
  sortDir: null, // "asc" | "desc" | null
  page: 1,
  pageSize: 10
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

const elLoading = document.getElementById("loadingOverlay");
const elError = document.getElementById("errorMessage");
const elErrorText = document.getElementById("errorText");
const elRetry = document.getElementById("retryBtn");
const elEmptyState = document.getElementById("emptyState");
const elResetEmpty = document.getElementById("resetEmpty");

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

function render() {
  // update active styles for controls
  if (state.q.trim()) elQ.classList.add('active-input'); else elQ.classList.remove('active-input');
  if (state.status !== 'ALL') elStatus.classList.add('active-input'); else elStatus.classList.remove('active-input');

  // update sort indicators
  document.querySelectorAll('th[data-key]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (state.sortKey === th.getAttribute('data-key')) {
      th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

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

  // build rows
  elTbody.innerHTML = pageItems
    .map((t) => {
      // highlight matches in title
      let title = t.title.replace(/(<|>)/g, '\\$1'); // escape HTML
      const q = state.q.trim();
      if (q) {
        const re = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'ig');
        title = title.replace(re, (m) => `<span class="search-highlight">${m}</span>`);
      }

      const isUpdating = state.updating.has(t.id);
      const errorMsg = state.updateErrors.get(t.id);

      return `
      <tr data-id="${t.id}" class="${state.lastUpdatedId === t.id ? 'highlight' : ''}">
        <td>${t.id}</td>
        <td>${title}</td>
        <td>${t.assignee}</td>
        <td>
          <span class="status-cell ${isUpdating ? 'loading' : ''} status-${t.status}" data-id="${t.id}" >${t.status}</span>
          ${errorMsg ? `<div class="status-error">${errorMsg}</div>` : ''}
        </td>
        <td>${formatDate(t.createdAt)}</td>
      </tr>
    `;
    })
    .join('');

  // empty state handling
  if (full.length === 0) {
    elEmptyState.style.display = 'block';
  } else {
    elEmptyState.style.display = 'none';
  }
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
  // Reset filter/search/sort/pagination
  state.q = "";
  state.status = "ALL";
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;

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
  // Status cell click -> inline update
  const statusEl = e.target.closest('.status-cell');
  if (statusEl) {
    const id = statusEl.getAttribute('data-id');
    if (!id) return;
    // prevent if already updating
    if (state.updating.has(id)) return;

    const task = state.all.find((x) => x.id === id);
    if (!task) return;

    // determine next status
    const next = {TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'DONE'}[task.status] || task.status;
    if (next === task.status) return; // no change

    // start update
    state.updating.add(id);
    state.updateErrors.delete(id);
    render(); // show loading state for row

    updateTaskStatus(id, next)
      .then(() => {
        task.status = next;
        state.lastUpdatedId = id;
        // clear update state and trigger highlight reset
        setTimeout(() => {
          state.lastUpdatedId = null;
          render();
        }, 2000);
      })
      .catch((err) => {
        state.updateErrors.set(id, err.message || 'Update failed');
      })
      .finally(() => {
        state.updating.delete(id);
        render();
      });
    return;
  }

  // Otherwise row click -> modal
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

// Init and fetch helper
async function loadTasks() {
  elLoading.style.display = 'flex';
  elError.style.display = 'none';
  elEmptyState.style.display = 'none';

  try {
    const tasks = await listTasks();
    state.all = tasks;
    state.page = 1;
    render();
  } catch (err) {
    elErrorText.textContent = err.message || 'Failed to fetch tasks.';
    elError.style.display = 'block';
  } finally {
    elLoading.style.display = 'none';
  }
}

// Retry after error
elRetry.addEventListener('click', () => {
  elError.style.display = 'none';
  loadTasks();
});

// Empty state reset
elResetEmpty.addEventListener('click', () => {
  elQ.value = '';
  elStatus.value = 'ALL';
  state.q = '';
  state.status = 'ALL';
  state.page = 1;
  render();
});

// Init
(async function init() {
  await loadTasks();
})();

