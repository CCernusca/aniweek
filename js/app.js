const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const form = document.getElementById("user-form");
const usernameInput = document.getElementById("username");
const statusEl = document.getElementById("status");
const weekGrid = document.getElementById("week-grid");
const unscheduledSection = document.getElementById("unscheduled");
const unscheduledList = document.getElementById("unscheduled-list");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const userName = usernameInput.value.trim();
  if (!userName) return;

  setStatus(`Loading ${userName}'s schedule...`);
  weekGrid.hidden = true;
  unscheduledSection.hidden = true;

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

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function render(entries) {
  const scheduled = entries.filter((e) => e.nextAiringEpisode);
  const unscheduled = entries.filter((e) => !e.nextAiringEpisode);

  renderWeekGrid(scheduled);
  renderUnscheduled(unscheduled);
}

function renderWeekGrid(scheduled) {
  weekGrid.innerHTML = "";
  const todayIndex = new Date().getDay();

  const byDay = Array.from({ length: 7 }, () => []);
  for (const entry of scheduled) {
    const airDate = new Date(entry.nextAiringEpisode.airingAt * 1000);
    byDay[airDate.getDay()].push({ entry, airDate });
  }

  byDay.forEach((dayEntries) => dayEntries.sort((a, b) => a.airDate - b.airDate));

  for (let day = 0; day < 7; day++) {
    const column = document.createElement("div");
    column.className = "day-column" + (day === todayIndex ? " today" : "");

    const heading = document.createElement("h3");
    heading.textContent = DAY_NAMES[day];
    column.appendChild(heading);

    for (const { entry, airDate } of byDay[day]) {
      column.appendChild(buildAnimeCard(entry, airDate));
    }

    weekGrid.appendChild(column);
  }

  weekGrid.hidden = false;
}

function buildAnimeCard(entry, airDate) {
  const card = document.createElement("a");
  card.className = "anime-card";
  card.href = entry.siteUrl;
  card.target = "_blank";
  card.rel = "noopener";

  const img = document.createElement("img");
  img.src = entry.cover;
  img.alt = "";
  card.appendChild(img);

  const meta = document.createElement("div");
  meta.className = "meta";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = entry.title;
  meta.appendChild(title);

  const time = document.createElement("div");
  time.className = "time";
  const timeStr = airDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  time.textContent = `Ep ${entry.nextAiringEpisode.episode} · ${timeStr}`;
  meta.appendChild(time);

  card.appendChild(meta);
  return card;
}

function renderUnscheduled(unscheduled) {
  unscheduledList.innerHTML = "";
  if (unscheduled.length === 0) {
    unscheduledSection.hidden = true;
    return;
  }

  for (const entry of unscheduled) {
    const li = document.createElement("li");
    li.textContent = entry.title;
    unscheduledList.appendChild(li);
  }

  unscheduledSection.hidden = false;
}
