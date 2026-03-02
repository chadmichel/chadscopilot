const STORAGE_KEY = "ux_starts_sketch_todos_v1";

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function clampString(s, max) {
  const str = (s ?? "").toString().trim();
  return str.length > max ? str.slice(0, max).trim() : str;
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : uid(),
        text: typeof t.text === "string" ? t.text : "",
        done: !!t.done,
        createdAt: typeof t.createdAt === "string" ? t.createdAt : nowIso()
      }))
      .filter((t) => t.text.trim().length > 0);
  } catch {
    return null;
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function seedTodos() {
  const seeded = [
    { id: uid(), text: "Review pull requests", done: false, createdAt: nowIso() },
    { id: uid(), text: "Write project brief for next sprint", done: true, createdAt: nowIso() },
    { id: uid(), text: "Refine onboarding flow sketch", done: false, createdAt: nowIso() }
  ];
  saveTodos(seeded);
  return seeded;
}

function formatRelative(iso) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min === 1) return "1 minute ago";
  if (min < 60) return `${min} minutes ago`;
  const hours = Math.floor(min / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

const els = {
  seedBtn: document.getElementById("seedBtn"),
  statsBadge: document.getElementById("statsBadge"),
  addForm: document.getElementById("addForm"),
  newTodoInput: document.getElementById("newTodoInput"),
  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  todoList: document.getElementById("todoList"),
  footerStats: document.getElementById("footerStats"),
  clearDoneBtn: document.getElementById("clearDoneBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  selectedEmpty: document.getElementById("selectedEmpty"),
  selectedPanel: document.getElementById("selectedPanel"),
  selectedStatus: document.getElementById("selectedStatus"),
  selectedMeta: document.getElementById("selectedMeta"),
  selectedText: document.getElementById("selectedText"),
  toggleSelectedBtn: document.getElementById("toggleSelectedBtn"),
  deleteSelectedBtn: document.getElementById("deleteSelectedBtn")
};

let todos = loadTodos() ?? seedTodos();
let selectedId = null;
let filter = "all"; // all | active | done
let search = "";

function filteredTodos() {
  const q = search.trim().toLowerCase();
  return todos.filter((t) => {
    if (filter === "active" && t.done) return false;
    if (filter === "done" && !t.done) return false;
    if (q && !t.text.toLowerCase().includes(q)) return false;
    return true;
  });
}

function updateStats() {
  const total = todos.length;
  const doneCount = todos.filter((t) => t.done).length;
  const active = total - doneCount;

  els.statsBadge.textContent = `${total} total • ${active} active • ${doneCount} done`;
  els.footerStats.textContent = `${total} item${total === 1 ? "" : "s"}`;

  els.clearDoneBtn.disabled = doneCount === 0;
  els.clearAllBtn.disabled = total === 0;
}

function setSelected(id) {
  selectedId = id;
  renderSelected();
  renderList();
}

function renderSelected() {
  const t = todos.find((x) => x.id === selectedId) || null;
  if (!t) {
    els.selectedEmpty.classList.remove("d-none");
    els.selectedPanel.classList.add("d-none");
    return;
  }

  els.selectedEmpty.classList.add("d-none");
  els.selectedPanel.classList.remove("d-none");

  els.selectedStatus.textContent = t.done ? "Done" : "Active";
  els.selectedStatus.className = `badge ${t.done ? "text-bg-success" : "text-bg-secondary"}`;
  els.selectedMeta.textContent = `Created ${formatRelative(t.createdAt)}`;
  els.selectedText.value = t.text;
  els.toggleSelectedBtn.textContent = t.done ? "Mark active" : "Mark done";
  els.toggleSelectedBtn.className = `btn ${t.done ? "btn-secondary" : "btn-success"}`;
}

function renderList() {
  const shown = filteredTodos();

  if (shown.length === 0) {
    els.todoList.innerHTML = `
      <li class="list-group-item">
        <div class="text-muted">No tasks match your filters.</div>
      </li>
    `;
    return;
  }

  els.todoList.innerHTML = "";

  for (const t of shown) {
    const li = document.createElement("li");
    li.className = `list-group-item ${t.id === selectedId ? "active" : ""}`;
    li.dataset.todoId = t.id;

    const row = document.createElement("div");
    row.className = "todo-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input mt-0";
    checkbox.checked = t.done;
    checkbox.ariaLabel = t.done ? "Mark as active" : "Mark as done";

    const text = document.createElement("div");
    text.className = `todo-text ${t.done ? "done" : ""}`;
    text.textContent = t.text;

    const actions = document.createElement("div");
    actions.className = "todo-actions btn-group";

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.className = `btn btn-sm ${t.id === selectedId ? "btn-light" : "btn-outline-secondary"}`;
    selectBtn.textContent = "Details";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-sm btn-outline-danger";
    delBtn.textContent = "Delete";

    actions.append(selectBtn, delBtn);
    row.append(checkbox, text, actions);
    li.append(row);

    li.addEventListener("click", (e) => {
      const target = e.target;
      if (target === checkbox || target === delBtn || target === selectBtn) return;
      setSelected(t.id);
    });

    checkbox.addEventListener("click", (e) => e.stopPropagation());
    checkbox.addEventListener("change", () => {
      toggleTodo(t.id);
    });

    selectBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setSelected(t.id);
    });

    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTodo(t.id);
    });

    els.todoList.append(li);
  }
}

function commit() {
  saveTodos(todos);
  updateStats();
  renderSelected();
  renderList();
}

function addTodo(text) {
  const trimmed = clampString(text, 140);
  if (!trimmed) return;
  todos = [{ id: uid(), text: trimmed, done: false, createdAt: nowIso() }, ...todos];
  commit();
}

function toggleTodo(id) {
  todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  commit();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  if (selectedId === id) selectedId = null;
  commit();
}

function clearDone() {
  todos = todos.filter((t) => !t.done);
  if (selectedId && !todos.some((t) => t.id === selectedId)) selectedId = null;
  commit();
}

function clearAll() {
  todos = [];
  selectedId = null;
  commit();
}

function wireFilters() {
  const buttons = Array.from(document.querySelectorAll("[data-filter]"));
  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter || "all";
      for (const b of buttons) b.classList.toggle("active", b === btn);
      renderList();
    });
  }
}

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo(els.newTodoInput.value);
  els.newTodoInput.value = "";
  els.newTodoInput.focus();
});

els.searchInput.addEventListener("input", () => {
  search = els.searchInput.value;
  renderList();
});

els.clearSearchBtn.addEventListener("click", () => {
  els.searchInput.value = "";
  search = "";
  renderList();
});

els.seedBtn.addEventListener("click", () => {
  todos = seedTodos();
  selectedId = null;
  search = "";
  els.searchInput.value = "";
  filter = "all";
  document.querySelector('[data-filter="all"]')?.classList.add("active");
  document.querySelector('[data-filter="active"]')?.classList.remove("active");
  document.querySelector('[data-filter="done"]')?.classList.remove("active");
  commit();
});

els.clearDoneBtn.addEventListener("click", clearDone);
els.clearAllBtn.addEventListener("click", clearAll);

els.selectedText.addEventListener("input", () => {
  const t = todos.find((x) => x.id === selectedId);
  if (!t) return;
  const newText = clampString(els.selectedText.value, 140);
  todos = todos.map((x) => (x.id === selectedId ? { ...x, text: newText } : x));
  commit();
});

els.toggleSelectedBtn.addEventListener("click", () => {
  if (!selectedId) return;
  toggleTodo(selectedId);
});

els.deleteSelectedBtn.addEventListener("click", () => {
  if (!selectedId) return;
  deleteTodo(selectedId);
});

wireFilters();
commit();
els.newTodoInput.focus();

