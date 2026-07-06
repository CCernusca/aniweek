# aniweek

A little webapp for visualising when during the week anime which the user is watching are airing, using data from AniList.

## Features

- Enter any public AniList username to load their current "Watching" list
- Anime laid out in a 7-day grid (Sun–Sat) by next airing time, converted to your local timezone
- Today's column highlighted
- Anime with no known upcoming episode listed separately
- No account, login, or backend required — all data comes live from the public AniList GraphQL API

## Usage

1. Open `index.html` in a browser (see Setup below for serving it locally).
2. Enter an AniList username in the input field.
3. Click "Load schedule" to see that user's currently-watching anime arranged by air day/time.

The AniList profile must be public for its watching list to be readable.

## Setup

This is a static site — no build step or dependencies.

Serve the project root with any static file server, for example:

```bash
npx serve .
# or
python -m http.server 8000
```

Then open the printed local URL in your browser.

Opening `index.html` directly via `file://` also works in most browsers since the app only makes external `fetch` calls to AniList's API.

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.
