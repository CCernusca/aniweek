# Architecture

## Overview

aniweek is a static, client-only web app. There is no backend, build step, or bundler — plain HTML/CSS/JS served as-is. All anime data is fetched directly from the public [AniList GraphQL API](https://anilist.co/graphiql) from the browser at request time; nothing is cached or stored server-side.

## File layout

```
index.html       Page shell: username form, week grid container, unscheduled section
css/style.css     All styling (dark theme, CSS grid for the week view, responsive breakpoints)
js/anilist.js     AniList API client: builds/sends the GraphQL query, normalizes the response
js/app.js         UI logic: form handling, rendering the week grid and unscheduled list
```

No module bundler or package manager is used; the two scripts are loaded as plain `<script>` tags in dependency order (`anilist.js` before `app.js`) and communicate via global functions.

## Data flow

1. User submits an AniList username via the form in `index.html`.
2. `js/app.js` calls `fetchWatchingList(userName)` (`js/anilist.js`).
3. `anilist.js` POSTs a GraphQL query to `https://graphql.anilist.co` requesting the user's `MediaListCollection` filtered to `type: ANIME, status: CURRENT`, including each media's `nextAiringEpisode`.
4. The response is flattened and normalized into a plain array of `{ id, siteUrl, title, cover, nextAiringEpisode }` objects.
5. `app.js` splits entries into:
   - **scheduled** — has a `nextAiringEpisode`, bucketed into one of 7 day-of-week columns using `new Date(airingAt * 1000).getDay()` (browser-local timezone)
   - **unscheduled** — no upcoming episode known (e.g. between seasons), listed separately
6. Each day column is rendered sorted by air time; the current weekday column is highlighted.

## Why no backend

The AniList GraphQL API is public and CORS-enabled for browser requests, so a static frontend can query it directly. This keeps the app deployable to any static host (GitHub Pages, Netlify, S3, etc.) with zero server maintenance. If future features need write access (AniList OAuth, saving custom layouts, etc.), that would require introducing a backend for token handling — not needed for the current read-only visualisation use case.

## Extension points

- Additional list statuses (e.g. `PLANNING`, `PAUSED`) can be added by extending the GraphQL query's `status` filter or querying multiple statuses at once.
- Per-episode (rather than just next-episode) schedules would require the `airingSchedule` field on `Media` instead of `nextAiringEpisode`.
- Persisting a username (e.g. via `localStorage`) would avoid re-entering it on each visit.
