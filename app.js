// Enhanced Task Management Dashboard

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

// Mock API with configurable delay and error simulation
async function listTasks() {
  // Simulate random failures (5% chance)
  if (Math.random() < 0.05) {
    throw new Error("Failed to load tasks. Please try again.");
  }

  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500)); // 500-1000ms delay
  return seededTasks();
}

// Mock status update API
async function updateTaskStatus(taskId, newStatus) {
  // Simulate random failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error("Failed to update task status. Please try again.");
  }

  await new Promise((r) => setTimeout(r, 300 + Math.random() * 700)); // 300-1000ms delay

  // Simulate server-side validation
  const validTransitions = {
    TODO: ["IN_PROGRESS"],
    IN_PROGRESS: ["DONE"],
    DONE: [] // No further transitions
  };

  const task = state.all.find(t => t.id === taskId);
  if (!task) {
    throw new Error("Task not found.");
  }

  if (!validTransitions[task.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${task.status} to ${newStatus}.`);
  }

  // Update the task
  task.status = newStatus;
  return task;
}

// State
const state = {
  all: [],
  q: "",
  status: "ALL",
  sortKey: null,
  sortDir: null,
  page: 1,
  pageSize: 10,
  loading: false,
  error: null,
  updatingTasks: new Set(), // Track tasks being updated
  recentlyUpdated: new Set() // Track recently updated tasks
};

// Elements
const elQ = document.getElementById("q");
const elStatus = document.getElementById("status");
const elReset = document.getElementById("reset");
const elResetEmpty = document.getElementById("reset-empty");
const elTbody = document.getElementById("tbody");
const elSummary = document.getElementById("summary");
const elPageSize = document.getElementById("pageSize");
const elPrev = document.getElementById("prev");
const elNext = document.getElementById("next");
const elPageInfo = document.getElementById("pageInfo");
const elLoadingOverlay = document.getElementById("loading-overlay");
const elErrorContainer = document.getElementById("error-container");
const elEmptyState = document.getElementById("empty-state");

const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elModalBody = document.getElementById("modalBody");

// Status transition map
const statusTransitions = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: null
};

function getStatusBadgeClass(status) {
  switch (status) {
    case "TODO": return "status-todo";
    case "IN_PROGRESS": return "status-in-progress";
    case "DONE": return "status-done";
    default: return "";
  }
}

function highlightSearchTerms(text, query) {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

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

  // Update sort indicators
  document.querySelectorAll("th[data-key]").forEach(th => {
    th.classList.remove("sort-asc", "sort-desc");
    const key = th.getAttribute("data-key");
    if (state.sortKey === key) {
      th.classList.add(state.sortDir === "asc" ? "sort-asc" : "sort-desc");
    }
  });

  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;

  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // Show/hide empty state
  if (total === 0) {
    elEmptyState.style.display = "block";
    elTbody.innerHTML = "";
  } else {
    elEmptyState.style.display = "none";
    elTbody.innerHTML = pageItems
      .map(
        (t) => `
        <tr data-id="${t.id}" class="${state.updatingTasks.has(t.id) ? 'loading-row' : ''} ${state.recentlyUpdated.has(t.id) ? 'updated' : ''}">
          <td>${t.id}</td>
          <td>${highlightSearchTerms(t.title, state.q)}</td>
          <td>${t.assignee}</td>
          <td class="status-cell">
            <span class="status-badge ${getStatusBadgeClass(t.status)}">${t.status.replace('_', ' ')}</span>
            ${state.updatingTasks.has(t.id) ? '<div class="loading-spinner"></div>' : ''}
            <div class="status-actions">
              ${statusTransitions[t.status] ? `<button class="status-action" data-action="${statusTransitions[t.status]}">Mark as ${statusTransitions[t.status].replace('_', ' ')}</button>` : ''}
            </div>
          </td>
          <td>${formatDate(t.createdAt)}</td>
        </tr>
      `
      )
      .join("");
  }
}

function showLoading() {
  state.loading = true;
  elLoadingOverlay.style.display = "flex";
}

function hideLoading() {
  state.loading = false;
  elLoadingOverlay.style.display = "none";
}

function showError(message) {
  state.error = message;
  elErrorContainer.innerHTML = `
    <div class="error-message">
      <span>⚠️</span>
      <span>${message}</span>
    </div>
  `;
}

function clearError() {
  state.error = null;
  elErrorContainer.innerHTML = "";
}

async function handleStatusUpdate(taskId, newStatus) {
  if (state.updatingTasks.has(taskId)) return; // Prevent duplicate updates

  state.updatingTasks.add(taskId);
  render();

  try {
    await updateTaskStatus(taskId, newStatus);
    state.recentlyUpdated.add(taskId);

    // Remove from recently updated after 2 seconds
    setTimeout(() => {
      state.recentlyUpdated.delete(taskId);
      render();
    }, 2000);

    clearError();
  } catch (error) {
    showError(error.message);
  } finally {
    state.updatingTasks.delete(taskId);
    render();
  }
}

function openModal(task) {
  elModalBody.innerHTML = `
    <div class="task-detail">
      <div class="task-detail-label">Task ID</div>
      <div class="task-detail-value">${task.id}</div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Title</div>
      <div class="task-detail-value">${task.title}</div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Assignee</div>
      <div class="task-detail-value">${task.assignee}</div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Status</div>
      <div class="task-detail-value">
        <span class="status-badge ${getStatusBadgeClass(task.status)}">${task.status.replace('_', ' ')}</span>
      </div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Created At</div>
      <div class="task-detail-value">${formatDate(task.createdAt)}</div>
    </div>
  `;
  elBackdrop.style.display = "flex";
}

function closeModal() {
  elBackdrop.style.display = "none";
}

function resetAllFilters() {
  state.q = "";
  state.status = "ALL";
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;

  elQ.value = "";
  elStatus.value = "ALL";
  elPageSize.value = "10";

  clearError();
  render();
}

// Event listeners
elQ.addEventListener("input", (e) => {
  state.q = e.target.value;
  state.page = 1;
  clearError();
  render();
});

elStatus.addEventListener("change", (e) => {
  state.status = e.target.value;
  state.page = 1;
  clearError();
  render();
});

elReset.addEventListener("click", resetAllFilters);
elResetEmpty.addEventListener("click", resetAllFilters);

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

  const taskId = tr.getAttribute("data-id");
  const actionBtn = e.target.closest(".status-action");

  if (actionBtn) {
    // Handle status update
    const newStatus = actionBtn.getAttribute("data-action");
    handleStatusUpdate(taskId, newStatus);
  } else {
    // Handle modal open
    const task = state.all.find((x) => x.id === taskId);
    if (task) openModal(task);
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
    render();
  });
});

// Init
(async function init() {
  try {
    showLoading();
    clearError();
    state.all = await listTasks();
    render();
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
})();
