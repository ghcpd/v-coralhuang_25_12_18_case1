// Enhanced Task Dashboard with loading states, inline updates, and keyboard highlighting

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
      updatedAt: new Date(base + i * 6 * 3600 * 1000).toISOString()
    });
  }
  return tasks;
}

// Mock API with simulated loading
async function listTasks() {
  const delay = 400; // Simulate network latency
  await new Promise((r) => setTimeout(r, delay));
  return seededTasks();
}

// Mock status update with simulated delay
async function updateTaskStatus(taskId, newStatus) {
  // Simulate network call
  await new Promise((r) => setTimeout(r, 300));
  // Random 90% success rate for demo purposes
  if (Math.random() > 0.1) {
    return { success: true, status: newStatus };
  } else {
    throw new Error("Network error: Failed to update task");
  }
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
  loadError: null,
  updatingTaskIds: new Set(), // For tracking which rows are updating
  recentlyUpdatedIds: new Set() // For highlighting
};

// Elements
const elQ = document.getElementById("q");
const elStatus = document.getElementById("status");
const elReset = document.getElementById("reset");
const elResetFromEmpty = document.getElementById("resetFromEmpty");
const elTbody = document.getElementById("tbody");
const elSummary = document.getElementById("summary");
const elPageSize = document.getElementById("pageSize");
const elPrev = document.getElementById("prev");
const elNext = document.getElementById("next");
const elPageInfo = document.getElementById("pageInfo");

const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elLoadingError = document.getElementById("loadingError");
const elLoadingIndicator = document.getElementById("loadingIndicator");
const elEmptyState = document.getElementById("emptyState");
const elActiveStateIndicators = document.getElementById("activeStateIndicators");

// Helper: Check if status can transition to next state
function getNextStatus(currentStatus) {
  const transitions = {
    "TODO": "IN_PROGRESS",
    "IN_PROGRESS": "DONE",
    "DONE": null // Can't transition from DONE
  };
  return transitions[currentStatus] || null;
}

// Helper: Get status badge HTML
function getStatusBadgeHtml(status) {
  const classes = {
    "TODO": "status-todo",
    "IN_PROGRESS": "status-in-progress",
    "DONE": "status-done"
  };
  const className = classes[status] || "";
  return `<span class="status-badge ${className}">${status}</span>`;
}

// Helper: Highlight matching search terms in text
function highlightText(text, query) {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts
    .map(part => {
      if (regex.test(part)) {
        return `<span class="highlight">${part}</span>`;
      }
      return part;
    })
    .join('');
}

// Derived: Apply query, filter, and sort
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

// Update active state indicators
function updateStateIndicators() {
  let indicators = [];
  
  if (state.q.trim()) {
    indicators.push(`<span class="state-indicator">Search: "${state.q.trim()}"</span>`);
  }
  if (state.status !== "ALL") {
    indicators.push(`<span class="state-indicator">Status: ${state.status}</span>`);
  }
  if (state.sortKey) {
    const dir = state.sortDir === "asc" ? "↑" : "↓";
    indicators.push(`<span class="state-indicator">Sort: ${state.sortKey} ${dir}</span>`);
  }
  
  elActiveStateIndicators.innerHTML = indicators.join("");
}

// Main render function
function render() {
  const full = applyQueryFilterSort();
  const total = full.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  elSummary.textContent = `${total} item${total !== 1 ? 's' : ''}`;
  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;

  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // Show/hide empty state
  const hasNoResults = total === 0;
  if (hasNoResults) {
    elTbody.innerHTML = "";
    elEmptyState.style.display = "block";
  } else {
    elEmptyState.style.display = "none";
    const q = state.q.trim().toLowerCase();
    
    elTbody.innerHTML = pageItems
      .map((t) => {
        const nextStatus = getNextStatus(t.status);
        const isUpdating = state.updatingTaskIds.has(t.id);
        const isHighlighting = state.recentlyUpdatedIds.has(t.id);
        const rowClass = isUpdating ? "row-updating" : "";
        const highlightClass = isHighlighting ? "row-highlight" : "";
        const titleHtml = q ? highlightText(t.title, q) : t.title;
        
        return `
          <tr data-id="${t.id}" class="${rowClass} ${highlightClass}">
            <td>${t.id}</td>
            <td>${titleHtml}</td>
            <td>${t.assignee}</td>
            <td>
              <div class="status-cell">
                ${getStatusBadgeHtml(t.status)}
                ${nextStatus ? `<button class="status-action" data-id="${t.id}" data-next="${nextStatus}" ${isUpdating ? 'disabled' : ''}>
                  ${isUpdating ? '<span class="status-action-loading loading-spinner"></span>' : 'Next'}
                </button>` : ''}
              </div>
            </td>
            <td>${formatDate(t.createdAt)}</td>
          </tr>
        `;
      })
      .join("");
  }

  updateStateIndicators();
}

// Modal Functions
function openModal(task) {
  document.getElementById("modalId").textContent = task.id;
  document.getElementById("modalTitle").textContent = task.title;
  document.getElementById("modalAssignee").textContent = task.assignee;
  document.getElementById("modalStatus").innerHTML = getStatusBadgeHtml(task.status);
  document.getElementById("modalCreatedAt").textContent = formatDate(task.createdAt);
  
  elBackdrop.style.display = "flex";
}

function closeModal() {
  elBackdrop.style.display = "none";
}

// Init: Load tasks
async function init() {
  try {
    state.isLoading = true;
    elLoadingError.style.display = "none";
    elLoadingIndicator.style.display = "block";
    render();

    state.all = await listTasks();
    state.isLoading = false;
    elLoadingIndicator.style.display = "none";
  } catch (err) {
    state.isLoading = false;
    elLoadingError.style.display = "block";
    elLoadingError.textContent = `Error loading tasks: ${err.message}`;
    elLoadingIndicator.style.display = "none";
  }

  render();
}

// Event Listeners

// Search input
elQ.addEventListener("input", (e) => {
  state.q = e.target.value;
  state.page = 1;
  render();
});

// Status filter
elStatus.addEventListener("change", (e) => {
  state.status = e.target.value;
  state.page = 1;
  render();
});

// Reset button
function handleReset() {
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
}

elReset.addEventListener("click", handleReset);
elResetFromEmpty.addEventListener("click", handleReset);

// Page size
elPageSize.addEventListener("change", (e) => {
  state.pageSize = Number(e.target.value);
  state.page = 1;
  render();
});

// Pagination
elPrev.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  render();
});

elNext.addEventListener("click", () => {
  state.page = state.page + 1;
  render();
});

// Click row -> modal
elTbody.addEventListener("click", async (e) => {
  // Handle status update button
  const statusBtn = e.target.closest(".status-action");
  if (statusBtn) {
    e.stopPropagation();
    const taskId = statusBtn.getAttribute("data-id");
    const nextStatus = statusBtn.getAttribute("data-next");
    const task = state.all.find((x) => x.id === taskId);
    
    if (task && nextStatus) {
      state.updatingTaskIds.add(taskId);
      render();

      try {
        const result = await updateTaskStatus(taskId, nextStatus);
        task.status = nextStatus;
        task.updatedAt = new Date().toISOString();
        
        // Highlight for 2 seconds
        state.recentlyUpdatedIds.add(taskId);
        render();
        setTimeout(() => {
          state.recentlyUpdatedIds.delete(taskId);
          render();
        }, 2000);
      } catch (err) {
        // Show error in row
        const tr = elTbody.querySelector(`tr[data-id="${taskId}"]`);
        if (tr) {
          const errorDiv = document.createElement("div");
          errorDiv.className = "row-error";
          errorDiv.textContent = "Update failed: " + err.message;
          tr.appendChild(errorDiv);
          
          setTimeout(() => errorDiv.remove(), 3000);
        }
      } finally {
        state.updatingTaskIds.delete(taskId);
        render();
      }
    }
    return;
  }

  // Handle row click for modal
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const task = state.all.find((x) => x.id === id);
  if (task) openModal(task);
});

// Close modal
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

    // Update table header appearance
    document.querySelectorAll("th").forEach((t) => {
      t.classList.remove("sort-asc", "sort-desc");
    });
    if (state.sortKey) {
      th.classList.add(`sort-${state.sortDir}`);
    }

    state.page = 1;
    render();
  });
});

// Keyboard support: Escape to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

// Init on page load
init();
