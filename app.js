// Циклическая логика модулей — см. docs/core-cycle-logic.md и docs/reading-module.md
const CURRENT_MODULE_KEY = "vybiraika:currentModule";

const MODULES = [
  {
    id: "languages",
    title: "Языки",
    storageKey: "vybiraika:languages:v1",
    hasNote: false,
    showTime: false,
    defaultTitles: [
      "DE — учение слов",
      "DE — внесение слов",
      "IT — учение слов",
      "IT — внесение слов",
      "IT — упражнения",
      "FR — учение слов",
      "FR — внесение слов",
      "EN — учение слов",
      "EN — внесение слов",
      "Русский",
    ],
  },
  {
    id: "reading",
    title: "Чтение",
    storageKey: "vybiraika:reading:v1",
    hasNote: true,
    showTime: true,
    defaultTitles: [
      "Другое вечера",
      "Книга",
      "МЖ и Opernwelt",
      "Программки / 2 Read в метро / Telegram",
      "Рабочее",
      "AI-беседы и вопросы",
      "Книга",
      "МЖ и Opernwelt",
      "Программки / 2 Read в метро / Telegram",
      "Другое вечера",
      "Книга",
      "Другое вечера",
      "Книга",
    ],
  },
];

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getModule(id) {
  return MODULES.find((m) => m.id === id) || MODULES[0];
}

function loadCurrentModuleId() {
  const saved = localStorage.getItem(CURRENT_MODULE_KEY);
  return MODULES.some((m) => m.id === saved) ? saved : MODULES[0].id;
}

function loadModuleState(module) {
  try {
    const raw = localStorage.getItem(module.storageKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Не удалось прочитать localStorage", e);
  }
  return {
    activities: module.defaultTitles.map((title) => ({ id: makeId(), title })),
    log: [],
  };
}

function saveState() {
  localStorage.setItem(currentModule.storageKey, JSON.stringify(state));
}

let currentModule = getModule(loadCurrentModuleId());
let state = loadModuleState(currentModule);

// --- Основной алгоритм (см. docs/core-cycle-logic.md, раздел 3) ---
function getNextActivity() {
  const { activities, log } = state;
  if (activities.length === 0) return null;
  if (log.length === 0) return activities[0];

  const last = log[log.length - 1];
  const lastIndex = activities.findIndex((a) => a.id === last.activityId);

  // Активность из последней записи лога больше не в цикле — открытый вопрос
  // из документации. Решение для MVP: начинаем цикл заново с активности №1.
  if (lastIndex === -1) return activities[0];

  const nextIndex = (lastIndex + 1) % activities.length;
  return activities[nextIndex];
}

// Предзаполнение уточнения — по названию активности, см. core-cycle-logic.md раздел 8
function getLastNoteForTitle(title) {
  for (let i = state.log.length - 1; i >= 0; i--) {
    if (state.log[i].title === title) return state.log[i].note || "";
  }
  return "";
}

function markDone() {
  const activity = getNextActivity();
  if (!activity) return;
  const today = new Date();
  const entry = {
    activityId: activity.id,
    title: activity.title, // снимок названия на момент отметки
    date: today.toISOString().slice(0, 10),
    ts: today.getTime(),
  };
  if (currentModule.hasNote) {
    entry.note = document.getElementById("today-note-input").value.trim();
  }
  state.log.push(entry);
  saveState();
  renderAll();
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(ts) {
  const d = new Date(ts);
  const date = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

// --- Рендер: "Сегодня" ---
function renderToday() {
  const activity = getNextActivity();
  const titleEl = document.getElementById("today-activity");
  const btn = document.getElementById("btn-done");
  const emptyHint = document.getElementById("today-empty-hint");
  const noteWrap = document.getElementById("today-note-wrap");
  const noteInput = document.getElementById("today-note-input");

  if (!activity) {
    titleEl.textContent = "—";
    btn.disabled = true;
    emptyHint.classList.remove("hidden");
    noteWrap.classList.add("hidden");
  } else {
    titleEl.textContent = activity.title;
    btn.disabled = false;
    emptyHint.classList.add("hidden");
    if (currentModule.hasNote) {
      noteWrap.classList.remove("hidden");
      noteInput.value = getLastNoteForTitle(activity.title);
    } else {
      noteWrap.classList.add("hidden");
    }
  }

  const recentList = document.getElementById("recent-list");
  recentList.innerHTML = "";
  state.log
    .slice(-5)
    .reverse()
    .forEach((entry) => recentList.appendChild(renderLogItem(entry)));
}

function renderLogItem(entry) {
  const li = document.createElement("li");
  const title = document.createElement("span");
  title.className = "log-item-title";
  title.textContent = entry.note ? `${entry.title} — ${entry.note}` : entry.title;
  const date = document.createElement("span");
  date.className = "log-item-date";
  date.textContent = currentModule.showTime ? formatDateTime(entry.ts) : formatDate(entry.date);
  li.appendChild(title);
  li.appendChild(date);
  return li;
}

// --- Рендер: "История" ---
function renderHistory() {
  const list = document.getElementById("history-list");
  const emptyEl = document.getElementById("history-empty");
  list.innerHTML = "";
  if (state.log.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  state.log
    .slice()
    .reverse()
    .forEach((entry) => list.appendChild(renderLogItem(entry)));
}

// --- Рендер: "Активности" ---
function renderActivities() {
  const list = document.getElementById("activities-list");
  list.innerHTML = "";
  state.activities.forEach((activity, index) => {
    const li = document.createElement("li");

    const title = document.createElement("span");
    title.className = "activity-title";
    title.textContent = activity.title;
    li.appendChild(title);

    const upBtn = document.createElement("button");
    upBtn.className = "activity-btn";
    upBtn.textContent = "↑";
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveActivity(index, -1);
    li.appendChild(upBtn);

    const downBtn = document.createElement("button");
    downBtn.className = "activity-btn";
    downBtn.textContent = "↓";
    downBtn.disabled = index === state.activities.length - 1;
    downBtn.onclick = () => moveActivity(index, 1);
    li.appendChild(downBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "activity-btn danger";
    delBtn.textContent = "✕";
    delBtn.onclick = () => deleteActivity(index);
    li.appendChild(delBtn);

    list.appendChild(li);
  });
}

function moveActivity(index, dir) {
  const target = index + dir;
  if (target < 0 || target >= state.activities.length) return;
  const arr = state.activities;
  [arr[index], arr[target]] = [arr[target], arr[index]];
  saveState();
  renderAll();
}

function deleteActivity(index) {
  state.activities.splice(index, 1);
  saveState();
  renderAll();
}

function addActivity(title) {
  state.activities.push({ id: makeId(), title });
  saveState();
  renderAll();
}

function renderAll() {
  document.getElementById("module-title").textContent = currentModule.title;
  renderToday();
  renderHistory();
  renderActivities();
}

// --- Переключение модуля ---
function switchModule(moduleId) {
  currentModule = getModule(moduleId);
  state = loadModuleState(currentModule);
  localStorage.setItem(CURRENT_MODULE_KEY, currentModule.id);
  document.getElementById("module-select").value = currentModule.id;
  renderAll();
}

document.getElementById("module-select").addEventListener("change", (e) => {
  switchModule(e.target.value);
});

// --- Навигация по вкладкам ---
function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(`view-${name}`).classList.remove("hidden");
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

document.getElementById("btn-done").addEventListener("click", markDone);

document.getElementById("add-activity-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("new-activity-input");
  const title = input.value.trim();
  if (!title) return;
  addActivity(title);
  input.value = "";
});

document.getElementById("module-select").value = currentModule.id;
renderAll();

// --- PWA: регистрация service worker ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed", e));
  });
}
