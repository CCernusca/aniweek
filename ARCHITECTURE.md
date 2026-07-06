# Architecture

## Overview

aniweek is a static, client-only web app. There is no backend, build step, or bundler — plain HTML/CSS/JS served as-is. All anime data is fetched directly from the public [AniList GraphQL API](https://anilist.co/graphiql) from the browser at request time; nothing is cached or stored server-side.

## File layout

```
index.html         Page shell: topbar (title + form), week table container, not-airing section, modal markup
css/style.css       All styling (dark theme, topbar, week table grid, colored boxes/bars, modal, responsive breakpoints)
js/anilist.js       AniList API client: builds/sends the GraphQL query, normalizes the response
js/app.js           UI logic: form handling, rendering the week table and not-airing bars, modal popup
assets/favicon.svg  Favicon: two boxes styled like a `.day-column.today` tile (dark surface fill, accent-color outline/text), "A" and "W"
```

No module bundler or package manager is used; the two scripts are loaded as plain `<script>` tags in dependency order (`anilist.js` before `app.js`) and communicate via global functions.

## Data flow

1. User submits an AniList username via the form in the topbar (`index.html`).
2. `js/app.js` calls `fetchWatchingList(userName)` (`js/anilist.js`).
3. `anilist.js` POSTs a GraphQL query to `https://graphql.anilist.co` requesting the user's `MediaListCollection` filtered to `type: ANIME, status: CURRENT`, including each media's `title { english romaji }`, `description`, `coverImage { large color }`, and `nextAiringEpisode`.
4. The response is flattened and normalized into a plain array of `{ id, siteUrl, title, description, cover, color, nextAiringEpisode }` objects, where `title` is `title.english || title.romaji` (English preferred, romaji fallback — AniList's `title.userPreferred` is deliberately not used since it follows the queried account's own language setting, not English).
5. `app.js` builds a 7-day window `[today, today + 7 days)` (`today` = local midnight) and, for each entry, computes at most one "this week" slot via `thisWeekSlot()`:
   - if `nextAiringEpisode`'s air date falls inside the window, that's the slot (upcoming, not yet aired)
   - otherwise, since AniList's `nextAiringEpisode` is always a future timestamp, an episode may have already aired earlier today, pushing `nextAiringEpisode` a week ahead; `thisWeekSlot()` back-computes `airingAt - 7 days` (episode number minus 1) and uses that instead if it falls inside the window — this is what keeps already-aired episodes visible in today's column instead of the anime disappearing until next week
   - if neither falls in the window (or there's no `nextAiringEpisode` at all), the entry goes to **not this week** instead
   Entries with a slot are bucketed by calendar date (`Math.floor((airDate - today) / DAY_MS)`, not day-of-week) and rendered as a colored `.anime-box` (aired slots get an `.aired` class for dimmed styling and an "Aired" time label). Entries without one are rendered as a full-width `.anime-bar` below the week table, showing their next known air date/time if any.
   Bucketing by calendar date (rather than weekday number) avoids misplacing anime whose next episode is weeks away into a same-weekday slot in the current week.
6. Each day column header shows both weekday and date (e.g. "Monday, Jul 6"), built from hardcoded `DAY_NAMES`/`MONTH_NAMES` arrays rather than `toLocaleDateString`, so labels stay in English regardless of the browser's locale. Times use `toLocaleTimeString("en-US", ...)` for the same reason. Column 0 (today) is highlighted. Box/bar background uses the media's AniList cover color (falls back to the app accent color), with text color chosen via a relative-luminance check for contrast.
7. Clicking any box or bar calls `openModal(entry)`, which fills the modal (`#modal-overlay`) with cover image, title, airing info (always the true upcoming episode from `entry.nextAiringEpisode`, regardless of whether the grid is showing an aired or upcoming slot), plain-text description (HTML tags stripped), and the AniList link, then unhides the overlay. Clicking the overlay background (not its content) or pressing Escape calls `closeModal()`.
8. The submitted username is saved to `localStorage` (`aniweek:username`) and auto-filled + auto-submitted on the next page load, so returning users don't need to retype it.

## Why no backend

The AniList GraphQL API is public and CORS-enabled for browser requests, so a static frontend can query it directly. This keeps the app deployable to any static host (GitHub Pages, Netlify, S3, etc.) with zero server maintenance. If future features need write access (AniList OAuth, saving custom layouts, etc.), that would require introducing a backend for token handling — not needed for the current read-only visualisation use case.

## Extension points

- Additional list statuses (e.g. `PLANNING`, `PAUSED`) can be added by extending the GraphQL query's `status` filter or querying multiple statuses at once.
- Per-episode (rather than just next-episode) schedules would require the `airingSchedule` field on `Media` instead of `nextAiringEpisode`.
