// Enhanced Task Dashboard with status updates, loading states, and UI polish

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
      createdAt: new Date(base + i * 6 * 3600 * 1000).toISOString(),
      lastUpdated: null // Track recently updated tasks
    });
  }
  return tasks;
}

// Mock API with simulated loading
async function listTasks() {
  await new Promise((r) => setTimeout(r, 600));
  return seededTasks();
}

// Mock status update with random failure for demo
async function updateTaskStatus(taskId, newStatus) {
  await new Promise((r) => setTimeout(r, 400));
  // Uncomment below to simulate occasional failures
  // if (Math.random() < 0.15) throw new Error("Update failed. Please try again.");
  return { success: true };
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
  isLoading: false,
  error: null,
  updatingRows: new Set(), // Track rows being updated
  recentlyUpdated: new Set() // Track rows that need highlight
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
const elErrorMsg = document.getElementById("errorMsg");
const elLoadingOverlay = document.getElementById("loadingOverlay");
const elEmptyState = document.getElementById("emptyState");
const elSortIndicator = document.getElementById("sortIndicator");
const elResetFromEmpty = document.getElementById("resetFromEmpty");

// Utility functions
function getStatusBadgeClass(status) {
  if (status === "TODO") return "todo";
  if (status === "IN_PROGRESS") return "in-progress";
  if (status === "DONE") return "done";
  return "";
}

function getNextStatus(currentStatus) {
  if (currentStatus === "TODO") return "IN_PROGRESS";
  if (currentStatus === "IN_PROGRESS") return "DONE";
  if (currentStatus === "DONE") return null; // No transition from DONE
  return null;
}

function highlightSearchTerms(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function showError(message) {
  state.error = message;
  elErrorMsg.textContent = message;
  elErrorMsg.classList.add("show");
  setTimeout(() => {
    elErrorMsg.classList.remove("show");
    state.error = null;
  }, 4000);
}

function updateSortIndicator() {
  if (state.sortKey && state.sortDir) {
    elSortIndicator.textContent = `Sorted by ${state.sortKey} (${state.sortDir})`;
    elSortIndicator.style.display = "inline-block";
  } else {
    elSortIndicator.style.display = "none";
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

function render() {
  const full = applyQueryFilterSort();
  const total = full.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  elSummary.textContent = `${total} item${total !== 1 ? 's' : ''}`;
  elPageInfo.textContent = total === 0 ? '—' : `Page ${state.page} / ${pageCount}`;
  updateSortIndicator();

  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // Show empty state
  if (total === 0) {
    elEmptyState.style.display = "block";
    elTbody.innerHTML = "";
  } else {
    elEmptyState.style.display = "none";
    const q = state.q.trim().toLowerCase();
    elTbody.innerHTML = pageItems
      .map((t) => {
        const highlightedTitle = highlightSearchTerms(t.title, q);
        const isUpdating = state.updatingRows.has(t.id);
        const isRecent = state.recentlyUpdated.has(t.id);
        const statusBadgeClass = getStatusBadgeClass(t.status);
        const nextStatus = getNextStatus(t.status);
        const nextStatusText = nextStatus ? `Next: ${nextStatus}` : "Done";
        const canUpdate = nextStatus !== null && !isUpdating;
        
        return `
          <tr data-id="${t.id}" class="${isRecent ? 'recently-updated' : ''}">
            <td>${t.id}</td>
            <td>${highlightedTitle}</td>
            <td>${t.assignee}</td>
            <td><span class="status-badge ${statusBadgeClass}">${t.status}</span></td>
            <td>${formatDate(t.createdAt)}</td>
            <td style="text-align: center;">
              <div class="row-actions">
                ${isUpdating 
                  ? `<div class="row-loading"></div>` 
                  : `<button 
                      class="status-update-btn" 
                      data-id="${t.id}"
                      ${!canUpdate ? 'disabled' : ''}
                      type="button"
                    >${nextStatusText}</button>`
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }
}

function openModal(task) {
  elModalBody.innerHTML = `
    <div class="kv"><div class="k">Task ID</div><div class="v">${task.id}</div></div>
    <div class="kv"><div class="k">Title</div><div class="v">${task.title}</div></div>
    <div class="kv"><div class="k">Assignee</div><div class="v">${task.assignee}</div></div>
    <div class="kv"><div class="k">Status</div><div class="v"><span class="status-badge ${getStatusBadgeClass(task.status)}">${task.status}</span></div></div>
    <div class="kv"><div class="k">Created At</div><div class="v">${formatDate(task.createdAt)}</div></div>
  `;
  elBackdrop.style.display = "flex";
}

function closeModal() {
  elBackdrop.style.display = "none";
}

async function setLoading(isLoading) {
  state.isLoading = isLoading;
  elLoadingOverlay.style.display = isLoading ? "flex" : "none";
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

  render();
});

elResetFromEmpty.addEventListener("click", () => {
  elReset.click();
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

// Click row -> modal (but not on button click)
elTbody.addEventListener("click", (e) => {
  if (e.target.closest("button")) return; // Ignore button clicks
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const task = state.all.find((x) => x.id === id);
  if (task) openModal(task);
});

// Status update buttons
elTbody.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("status-update-btn")) return;
  
  const taskId = e.target.getAttribute("data-id");
  const task = state.all.find((t) => t.id === taskId);
  if (!task) return;
  
  const nextStatus = getNextStatus(task.status);
  if (!nextStatus || state.updatingRows.has(taskId)) return;
  
  state.updatingRows.add(taskId);
  render();
  
  try {
    await updateTaskStatus(taskId, nextStatus);
    task.status = nextStatus;
    task.lastUpdated = new Date().toISOString();
    
    // Highlight recently updated
    state.recentlyUpdated.add(taskId);
    render();
    
    // Clear highlight after animation
    setTimeout(() => {
      state.recentlyUpdated.delete(taskId);
      render();
    }, 1500);
    
  } catch (err) {
    showError(err.message || "Failed to update task status");
  } finally {
    state.updatingRows.delete(taskId);
    render();
  }
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
    
    // Update header styles
    document.querySelectorAll("th[data-key]").forEach((h) => {
      h.classList.remove("sort-asc", "sort-desc");
    });
    if (state.sortDir === "asc") th.classList.add("sort-asc");
    else if (state.sortDir === "desc") th.classList.add("sort-desc");
    
    render();
  });
});

// Init
(async function init() {
  await setLoading(true);
  try {
    state.all = await listTasks();
    render();
  } catch (err) {
    showError("Failed to load tasks");
  } finally {
    await setLoading(false);
  }
})();
