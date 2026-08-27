// Модуль "Языки": реализация циклической логики из docs/core-cycle-logic.md
const STORAGE_KEY = "vybiraika:languages:v1";

const DEFAULT_ACTIVITIES = [
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
].map((title) => ({ id: makeId(), title }));

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Не удалось прочитать localStorage", e);
  }
  return { activities: DEFAULT_ACTIVITIES, log: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

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

function markDone() {
  const activity = getNextActivity();
  if (!activity) return;
  const today = new Date();
  state.log.push({
    activityId: activity.id,
    title: activity.title, // снимок названия на момент отметки
    date: today.toISOString().slice(0, 10),
    ts: today.getTime(),
  });
  saveState();
  renderAll();
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// --- Рендер: "Сегодня" ---
function renderToday() {
  const activity = getNextActivity();
  const titleEl = document.getElementById("today-activity");
  const btn = document.getElementById("btn-done");
  const emptyHint = document.getElementById("today-empty-hint");

  if (!activity) {
    titleEl.textContent = "—";
    btn.disabled = true;
    emptyHint.classList.remove("hidden");
  } else {
    titleEl.textContent = activity.title;
    btn.disabled = false;
    emptyHint.classList.add("hidden");
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
  title.textContent = entry.title;
  const date = document.createElement("span");
  date.className = "log-item-date";
  date.textContent = formatDate(entry.date);
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
  renderToday();
  renderHistory();
  renderActivities();
}

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

renderAll();

// --- PWA: регистрация service worker ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed", e));
  });
}
