const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COLOR = "#7c8cff";
const USERNAME_KEY = "aniweek:username";

const form = document.getElementById("user-form");
const usernameInput = document.getElementById("username");
const statusEl = document.getElementById("status");
const weekTable = document.getElementById("week-table");
const notAiringSection = document.getElementById("not-airing");
const notAiringList = document.getElementById("not-airing-list");

const modalOverlay = document.getElementById("modal-overlay");
const modal = document.getElementById("modal");
const modalCover = document.getElementById("modal-cover");
const modalTitle = document.getElementById("modal-title");
const modalAiring = document.getElementById("modal-airing");
const modalDescription = document.getElementById("modal-description");
const modalLink = document.getElementById("modal-link");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const userName = usernameInput.value.trim();
  if (!userName) return;

  localStorage.setItem(USERNAME_KEY, userName);
  setStatus(`Loading ${userName}'s anime...`);
  weekTable.hidden = true;
  notAiringSection.hidden = true;

  try {
    const entries = await fetchWatchingList(userName);
    if (entries.length === 0) {
      setStatus(`No anime in ${userName}'s watching list.`);
      return;
    }
    render(entries);
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
});

const savedUsername = localStorage.getItem(USERNAME_KEY);
if (savedUsername) {
  usernameInput.value = savedUsername;
  form.requestSubmit();
}

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayHeading(date) {
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatAiringLine(nextAiringEpisode) {
  const airDate = new Date(nextAiringEpisode.airingAt * 1000);
  return `Episode ${nextAiringEpisode.episode} airs ${formatDayHeading(airDate)} at ${formatTime(airDate)}`;
}

function render(entries) {
  const today = startOfDay(new Date());
  const weekEnd = new Date(today.getTime() + 7 * DAY_MS);

  const thisWeek = [];
  const notThisWeek = [];

  for (const entry of entries) {
    const slot = thisWeekSlot(entry, today, weekEnd);
    if (slot) {
      thisWeek.push(slot);
    } else {
      notThisWeek.push(entry);
    }
  }

  renderWeekTable(thisWeek, today);
  renderNotAiring(notThisWeek);
}

// AniList only ever exposes the *next* (future) airing time. Once this
// week's episode has aired, nextAiringEpisode already points a week ahead,
// so we back-compute last week's slot to keep already-aired episodes visible.
function thisWeekSlot(entry, today, weekEnd) {
  if (!entry.nextAiringEpisode) return null;

  const nextDate = new Date(entry.nextAiringEpisode.airingAt * 1000);
  if (nextDate >= today && nextDate < weekEnd) {
    return { entry, airDate: nextDate, episode: entry.nextAiringEpisode.episode, aired: false };
  }

  if (entry.nextAiringEpisode.episode > 1) {
    const prevDate = new Date(nextDate.getTime() - 7 * DAY_MS);
    if (prevDate >= today && prevDate < weekEnd) {
      return { entry, airDate: prevDate, episode: entry.nextAiringEpisode.episode - 1, aired: true };
    }
  }

  return null;
}

function renderWeekTable(thisWeek, today) {
  weekTable.innerHTML = "";

  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * DAY_MS));
  const byDay = Array.from({ length: 7 }, () => []);

  for (const slot of thisWeek) {
    const dayIndex = Math.floor((startOfDay(slot.airDate) - today) / DAY_MS);
    byDay[dayIndex].push(slot);
  }

  byDay.forEach((dayEntries) => dayEntries.sort((a, b) => a.airDate - b.airDate));

  days.forEach((day, index) => {
    const column = document.createElement("div");
    column.className = "day-column" + (index === 0 ? " today" : "");

    const heading = document.createElement("h3");
    heading.textContent = formatDayHeading(day);
    column.appendChild(heading);

    for (const slot of byDay[index]) {
      column.appendChild(buildAnimeBox(slot));
    }

    weekTable.appendChild(column);
  });

  weekTable.hidden = false;
}

function buildAnimeBox({ entry, airDate, episode, aired }) {
  const box = document.createElement("button");
  box.type = "button";
  box.className = "anime-box" + (aired ? " aired" : "");
  applyColor(box, entry.color);
  box.addEventListener("click", () => openModal(entry));

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = entry.title;
  box.appendChild(title);

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = aired ? `Ep ${episode} · Aired ${formatTime(airDate)}` : `Ep ${episode} · ${formatTime(airDate)}`;
  box.appendChild(time);

  return box;
}

function renderNotAiring(notThisWeek) {
  notAiringList.innerHTML = "";
  if (notThisWeek.length === 0) {
    notAiringSection.hidden = true;
    return;
  }

  for (const entry of notThisWeek) {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "anime-bar";
    applyColor(bar, entry.color);

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = entry.title;
    bar.appendChild(title);

    if (entry.nextAiringEpisode) {
      const next = document.createElement("span");
      next.className = "next-air";
      const airDate = new Date(entry.nextAiringEpisode.airingAt * 1000);
      next.textContent = `Ep ${entry.nextAiringEpisode.episode} · ${formatDayHeading(airDate)}, ${formatTime(airDate)}`;
      bar.appendChild(next);
    }

    bar.addEventListener("click", () => openModal(entry));
    notAiringList.appendChild(bar);
  }

  notAiringSection.hidden = false;
}

function applyColor(el, color) {
  const bg = color || DEFAULT_COLOR;
  el.style.backgroundColor = bg;
  el.style.color = contrastTextColor(bg);
}

function contrastTextColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#10121a";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? "#10121a" : "#f5f6fa";
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function stripMarkup(text) {
  return text.replace(/<[^>]*>/g, "").trim();
}

function openModal(entry) {
  modalCover.src = entry.cover;
  modalTitle.textContent = entry.title;
  modalDescription.textContent = stripMarkup(entry.description);
  modalLink.href = entry.siteUrl;

  modalAiring.textContent = entry.nextAiringEpisode
    ? formatAiringLine(entry.nextAiringEpisode)
    : "Not currently airing";

  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
}
