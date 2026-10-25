
const $ = id => document.getElementById(id);
const STORAGE_KEY = "maevriz_student_hub_v3";
const DEFAULT_BG = "#0b1020";
const DEFAULT_ACCENT = "#8b7bff";

let data = loadData();
let currentFilter = "all";
let currentView = "list";
let editingId = null;
let calendarDate = new Date();
let selectedDate = localDate(new Date());

const selects = {};

function loadData() {
  const fallback = {
    subjects: [], tasks: [],
    background: DEFAULT_BG, accent: DEFAULT_ACCENT
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);

    return {
      subjects: Array.isArray(saved.subjects)
        ? [...new Set(saved.subjects.filter(
            s => typeof s === "string" && s.trim()
          ))] : [],
      tasks: Array.isArray(saved.tasks)
        ? saved.tasks.filter(t =>
            t && typeof t.id === "string" &&
            typeof t.title === "string" &&
            typeof t.completed === "boolean"
          ).map(t => ({
            id: t.id,
            title: t.title,
            subject: typeof t.subject === "string" ? t.subject : "",
            deadline: typeof t.deadline === "string" ? t.deadline : "",
            priority: ["Low", "Medium", "High"].includes(t.priority)
              ? t.priority : "Medium",
            category: typeof t.category === "string" ? t.category : "",
            notes: typeof t.notes === "string" ? t.notes : "",
            completed: t.completed
          })) : [],
      background: validHex(saved.background) ? saved.background : DEFAULT_BG,
      accent: validHex(saved.accent) ? saved.accent : DEFAULT_ACCENT
    };
  } catch (error) {
    console.error("Loading saved data failed:", error);
    return fallback;
  }
}

function validHex(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    alert("Saving failed. Browser storage may be blocked or full.");
    console.error(error);
    return false;
  }
}

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(value) {
  if (!value) return "No deadline";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric"
  });
}

// Reusable professional dropdown.
function makeSelect(id, options, initialValue, onChange) {
  const host = $(id);
  host.classList.add("custom-select");
  host.replaceChildren();

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  const arrow = document.createElement("span");
  arrow.className = "chevron";
  arrow.textContent = "⌄";
  arrow.setAttribute("aria-hidden", "true");
  trigger.append(label, arrow);

  const menu = document.createElement("div");
  menu.className = "select-menu hidden";
  menu.setAttribute("role", "listbox");

  const control = {
    host, trigger, label, menu, options,
    value: initialValue,
    onChange,
    setOptions(nextOptions, preferred) {
      this.options = nextOptions;
      const stillValid = nextOptions.some(o => o.value === this.value);
      this.value = preferred !== undefined
        ? preferred
        : stillValid ? this.value : nextOptions[0].value;
      this.render();
    },
    setValue(value, notify = false) {
      if (!this.options.some(o => o.value === value)) {
        value = this.options[0]?.value ?? "";
      }
      this.value = value;
      this.render();
      if (notify) this.onChange?.(value);
    },
    render() {
      const chosen = this.options.find(o => o.value === this.value);
      this.label.textContent = chosen ? chosen.label : "Choose...";
      this.trigger.setAttribute("aria-expanded",
        String(!this.menu.classList.contains("hidden")));
      this.menu.replaceChildren();

      this.options.forEach(option => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "select-option";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(option.value === this.value));
        item.textContent = option.label;

        if (option.value === this.value) {
          const check = document.createElement("span");
          check.className = "option-check";
          check.textContent = "✓";
          item.appendChild(check);
        }

        item.addEventListener("click", () => {
          this.value = option.value;
          this.close();
          this.render();
          this.onChange?.(this.value);
        });

        this.menu.appendChild(item);
      });
    },
    open() {
      closeAllMenus(this);
      this.menu.classList.remove("hidden");
      this.trigger.setAttribute("aria-expanded", "true");
    },
    close() {
      this.menu.classList.add("hidden");
      this.trigger.setAttribute("aria-expanded", "false");
    }
  };

  trigger.addEventListener("click", () => {
    const isOpen = !menu.classList.contains("hidden");
    isOpen ? control.close() : control.open();
  });

  trigger.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "Enter" ||
        event.key === " ") {
      event.preventDefault();
      control.open();
      menu.querySelector(".select-option")?.focus();
    }
  });

  menu.addEventListener("keydown", event => {
    const items = [...menu.querySelectorAll(".select-option")];
    const index = items.indexOf(document.activeElement);

    if (event.key === "Escape") {
      control.close();
      trigger.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  });

  host.append(trigger, menu);
  control.render();
  selects[id] = control;
  return control;
}

function closeAllMenus(except) {
  Object.values(selects).forEach(control => {
    if (control !== except) control.close();
  });
}

document.addEventListener("click", event => {
  Object.values(selects).forEach(control => {
    if (!control.host.contains(event.target)) control.close();
  });
});

const taskSubjectSelect = makeSelect(
  "taskSubjectControl",
  [{ value: "", label: "No subject" }],
  "",
  () => {}
);

const taskPrioritySelect = makeSelect(
  "taskPriorityControl",
  [
    { value: "Low", label: "Low priority" },
    { value: "Medium", label: "Medium priority" },
    { value: "High", label: "High priority" }
  ],
  "Medium",
  () => {}
);

const filterSubjectSelect = makeSelect(
  "filterSubjectControl",
  [{ value: "all", label: "All subjects" }],
  "all",
  renderAll
);

const filterPrioritySelect = makeSelect(
  "filterPriorityControl",
  [
    { value: "all", label: "All priorities" },
    { value: "High", label: "High priority" },
    { value: "Medium", label: "Medium priority" },
    { value: "Low", label: "Low priority" }
  ],
  "all",
  renderAll
);

// Custom subject manager.
$("subjectForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("newSubject").value.trim();

  if (!name) return;

  if (data.subjects.some(s => s.toLowerCase() === name.toLowerCase())) {
    $("subjectMessage").textContent = "That subject already exists.";
    return;
  }

  data.subjects.push(name);
  if (!saveData()) {
    data.subjects.pop();
    return;
  }

  $("newSubject").value = "";
  $("subjectMessage").textContent = "Subject added successfully.";
  renderAll();
});

function renderSubjects() {
  const list = $("subjectList");
  list.replaceChildren();

  if (!data.subjects.length) {
    list.appendChild(emptyMessage("No subjects yet. Add your first one above."));
    return;
  }

  data.subjects.forEach(subject => {
    const row = document.createElement("div");
    row.className = "subject-row";

    const name = document.createElement("strong");
    name.className = "subject-name";
    name.textContent = subject;

    const actions = document.createElement("div");
    actions.className = "subject-actions";

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "small-button";
    rename.textContent = "Rename";
    rename.addEventListener("click", () => renameSubject(subject));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small-button danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteSubject(subject));

    actions.append(rename, remove);
    row.append(name, actions);
    list.appendChild(row);
  });
}

function renameSubject(oldName) {
  const result = prompt("Enter the new subject name:", oldName);
  if (result === null) return;

  const name = result.trim();
  if (!name) return alert("Subject name cannot be empty.");

  if (data.subjects.some(s =>
      s.toLowerCase() === name.toLowerCase() && s !== oldName)) {
    return alert("That subject already exists.");
  }

  const before = JSON.stringify(data);
  data.subjects = data.subjects.map(s => s === oldName ? name : s);
  data.tasks.forEach(t => {
    if (t.subject === oldName) t.subject = name;
  });

  if (!saveData()) {
    data = JSON.parse(before);
    return;
  }
  renderAll();
}

function deleteSubject(subject) {
  if (!confirm(`Delete "${subject}"? Its tasks will remain unassigned.`)) return;

  const before = JSON.stringify(data);
  data.subjects = data.subjects.filter(s => s !== subject);
  data.tasks.forEach(t => {
    if (t.subject === subject) t.subject = "";
  });

  if (!saveData()) {
    data = JSON.parse(before);
    return;
  }
  renderAll();
}

function renderSubjectOptions() {
  const taskOptions = [
    { value: "", label: "No subject" },
    ...data.subjects.map(s => ({ value: s, label: s }))
  ];

  const filterOptions = [
    { value: "all", label: "All subjects" },
    ...data.subjects.map(s => ({ value: s, label: s }))
  ];

  taskSubjectSelect.setOptions(taskOptions);
  filterSubjectSelect.setOptions(filterOptions);
}

// Create and edit tasks.
$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  const deadline = $("taskDeadline").value;

  if (!title) return $("formMessage").textContent = "Enter a task title.";
  if (deadline && !isValidDate(deadline)) {
    return $("formMessage").textContent = "Choose a valid deadline.";
  }

  const fields = {
    title,
    subject: taskSubjectSelect.value,
    deadline,
    priority: taskPrioritySelect.value,
    category: $("taskCategory").value.trim(),
    notes: $("taskNotes").value.trim()
  };

  const before = JSON.stringify(data);

  if (editingId) {
    const task = data.tasks.find(t => t.id === editingId);
    if (!task) return cancelEdit();
    Object.assign(task, fields);
  } else {
    data.tasks.push({
      id: makeId(),
      ...fields,
      completed: false
    });
  }

  if (!saveData()) {
    data = JSON.parse(before);
    return;
  }

  $("formMessage").textContent = editingId ? "Task updated!" : "Task added!";
  cancelEdit(false);
  renderAll();
});

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d;
}

function startEdit(task) {
  editingId = task.id;
  $("taskTitle").value = task.title;
  $("taskDeadline").value = task.deadline;
  $("taskCategory").value = task.category;
  $("taskNotes").value = task.notes;

  taskSubjectSelect.setValue(task.subject);
  taskPrioritySelect.setValue(task.priority);

  $("formHeading").textContent = "Edit task";
  $("saveTaskButton").innerHTML = "Save changes";
  $("cancelEditButton").classList.remove("hidden");
  $("formMessage").textContent = "";
  $("taskEditor").scrollIntoView({ behavior: "smooth" });
  $("taskTitle").focus();
}

function cancelEdit(clearMessage = true) {
  editingId = null;
  $("taskForm").reset();
  taskSubjectSelect.setValue("");
  taskPrioritySelect.setValue("Medium");
  $("formHeading").textContent = "Create a task";
  $("saveTaskButton").innerHTML = "<span>＋</span> Add task";
  $("cancelEditButton").classList.add("hidden");
  if (clearMessage) $("formMessage").textContent = "";
}

$("cancelEditButton").addEventListener("click", () => cancelEdit());

// Status filters.
document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(b => {
      const active = b.dataset.filter === currentFilter;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });

    renderAll();
  });
});

$("searchTasks").addEventListener("input", renderAll);

function getVisibleTasks() {
  const query = $("searchTasks").value.trim().toLowerCase();
  const subject = filterSubjectSelect.value;
  const priority = filterPrioritySelect.value;

  return data.tasks.filter(task => {
    if (currentFilter === "active" && task.completed) return false;
    if (currentFilter === "completed" && !task.completed) return false;
    if (subject !== "all" && task.subject !== subject) return false;
    if (priority !== "all" && task.priority !== priority) return false;

    const text = [
      task.title, task.subject, task.category, task.notes, task.priority
    ].join(" ").toLowerCase();

    return text.includes(query);
  });
}

function toggleComplete(task) {
  const old = task.completed;
  task.completed = !task.completed;
  if (!saveData()) task.completed = old;
  renderAll();
}

function deleteTask(task) {
  if (!confirm(`Delete "${task.title}"?`)) return;

  const before = data.tasks;
  data.tasks = data.tasks.filter(t => t.id !== task.id);

  if (!saveData()) {
    data.tasks = before;
    return;
  }

  if (editingId === task.id) cancelEdit();
  renderAll();
}

function addTag(parent, text, className = "") {
  const tag = document.createElement("span");
  tag.className = "tag " + className;
  tag.textContent = text;
  parent.appendChild(tag);
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card" + (task.completed ? " is-complete" : "");

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "task-checkbox";
  check.checked = task.completed;
  check.setAttribute("aria-label", "Complete " + task.title);
  check.addEventListener("change", () => toggleComplete(task));

  const content = document.createElement("div");
  content.className = "task-content";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;
  content.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  addTag(meta, task.subject || "No subject");
  addTag(meta, task.priority, "priority-" + task.priority);
  if (task.category) addTag(meta, task.category);

  if (task.deadline) {
    let dueLabel = "Due " + formatDate(task.deadline);
    const today = localDate(new Date());

    if (!task.completed && task.deadline < today) {
      dueLabel = "Overdue · " + formatDate(task.deadline);
    } else if (!task.completed && task.deadline === today) {
      dueLabel = "Due today";
    }
    addTag(meta, dueLabel);
  } else {
    addTag(meta, "No deadline");
  }

  content.appendChild(meta);

  if (task.notes) {
    const notes = document.createElement("p");
    notes.className = "task-notes";
    notes.textContent = task.notes;
    content.appendChild(notes);
  }

  const actions = document.createElement("div");
  actions.className = "subject-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "small-button";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => startEdit(task));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-button";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => deleteTask(task));

  actions.append(edit, remove);
  card.append(check, content, actions);
  return card;
}

function emptyMessage(message) {
  const box = document.createElement("div");
  box.className = "empty-state";
  const title = document.createElement("strong");
  title.textContent = message;
  box.appendChild(title);
  return box;
}

function renderList(tasks) {
  const list = $("taskList");
  list.replaceChildren();
  $("listCount").textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("strong");
    title.textContent = "Nothing here yet";
    const message = document.createElement("p");
    message.textContent = "Add a task or adjust your filters.";
    empty.append(title, message);
    list.appendChild(empty);
    return;
  }

  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.deadline) return b.deadline ? 1 : 0;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  tasks.forEach(task => list.appendChild(createTaskCard(task)));
}

function renderCalendar(tasks) {
  const grid = $("calendarGrid");
  grid.replaceChildren();

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const offset = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = localDate(new Date());

  $("calendarMonth").textContent = calendarDate.toLocaleDateString("en-MY", {
    month: "long", year: "numeric"
  });

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    const el = document.createElement("div");
    el.className = "calendar-weekday";
    el.textContent = day;
    grid.appendChild(el);
  });

  for (let i = 0; i < offset; i++) grid.appendChild(document.createElement("div"));

  for (let day = 1; day <= days; day++) {
    const date = localDate(new Date(year, month, day));
    const due = tasks.filter(t => t.deadline === date);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    if (date === today) button.classList.add("today");
    if (date === selectedDate) button.classList.add("selected");
    button.setAttribute("aria-label", `${formatDate(date)}, ${due.length} tasks`);

    const number = document.createElement("span");
    number.className = "calendar-day-number";
    number.textContent = day;
    button.appendChild(number);

    if (due.length) {
      const dot = document.createElement("span");
      dot.className = "calendar-dot";
      button.appendChild(dot);
    }

    button.addEventListener("click", () => {
      selectedDate = date;
      renderCalendar(tasks);
    });

    grid.appendChild(button);
  }

  const box = $("selectedDayTasks");
  box.replaceChildren();
  const heading = document.createElement("h3");
  heading.className = "day-heading";
  heading.textContent = "Tasks for " + formatDate(selectedDate);
  box.appendChild(heading);

  const dueTasks = tasks.filter(t => t.deadline === selectedDate);
  if (!dueTasks.length) {
    box.appendChild(emptyMessage("No matching tasks due this day."));
  } else {
    dueTasks.forEach(t => box.appendChild(createTaskCard(t)));
  }
}

$("previousMonth").addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar(getVisibleTasks());
});

$("nextMonth").addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar(getVisibleTasks());
});

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;

    document.querySelectorAll("[data-view]").forEach(b => {
      const active = b.dataset.view === currentView;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });

    renderAll();
  });
});

function renderProgress() {
  const total = data.tasks.length;
  const complete = data.tasks.filter(t => t.completed).length;
  const remaining = total - complete;
  const percent = total ? Math.round(complete / total * 100) : 0;

  $("totalCount").textContent = total;
  $("completedCount").textContent = complete;
  $("remainingCount").textContent = remaining;
  $("progressPercent").textContent = percent + "%";
  $("progressFill").style.width = percent + "%";
  $("progressBar").setAttribute("aria-valuenow", percent);

  $("progressMessage").textContent = total === 0
    ? "Add a task to start your progress."
    : percent === 100
      ? "All tasks complete. Fantastic work!"
      : `${complete} of ${total} tasks completed. Keep going!`;

  const box = $("subjectProgress");
  box.replaceChildren();

  if (!data.subjects.length) {
    box.appendChild(emptyMessage("Add subjects to see progress here."));
    return;
  }

  data.subjects.forEach(subject => {
    const list = data.tasks.filter(t => t.subject === subject);
    const done = list.filter(t => t.completed).length;
    const ratio = list.length ? Math.round(done / list.length * 100) : 0;

    const row = document.createElement("div");
    row.className = "subject-progress-row";

    const label = document.createElement("div");
    label.className = "subject-progress-label";

    const name = document.createElement("span");
    name.textContent = subject;
    const count = document.createElement("span");
    count.textContent = `${done}/${list.length} · ${ratio}%`;

    label.append(name, count);

    const track = document.createElement("div");
    track.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = ratio + "%";
    track.appendChild(fill);

    row.append(label, track);
    box.appendChild(row);
  });
}

function renderAll() {
  renderSubjectOptions();
  renderSubjects();
  renderProgress();

  const tasks = getVisibleTasks();
  $("taskList").classList.toggle("hidden", currentView !== "list");
  $("calendarView").classList.toggle("hidden", currentView !== "calendar");

  if (currentView === "list") renderList(tasks);
  else renderCalendar(tasks);
}

// Theme settings.
function applyTheme() {
  document.documentElement.style.setProperty("--bg", data.background);
  document.documentElement.style.setProperty("--accent", data.accent);
  $("themeBackground").value = data.background;
  $("themeAccentHex").value = data.accent;

  document.querySelectorAll(".swatch").forEach(button => {
    const active = button.dataset.color.toLowerCase() === data.accent.toLowerCase();
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

$("themePalette").addEventListener("click", event => {
  const button = event.target.closest("[data-color]");
  if (!button) return;

  data.accent = button.dataset.color;
  applyTheme();
  saveData();
});

$("themeBackground").addEventListener("input", event => {
  data.background = event.target.value;
  applyTheme();
  saveData();
});

$("themeAccentHex").addEventListener("change", event => {
  const value = event.target.value.trim();
  if (!validHex(value)) {
    alert("Enter a valid hex colour, for example #8b7bff.");
    event.target.value = data.accent;
    return;
  }

  data.accent = value;
  applyTheme();
  saveData();
});

$("resetTheme").addEventListener("click", () => {
  data.background = DEFAULT_BG;
  data.accent = DEFAULT_ACCENT;
  applyTheme();
  saveData();
});

applyTheme();
renderAll();
