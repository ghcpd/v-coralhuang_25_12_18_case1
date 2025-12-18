# Task Dashboard Demo (improved)

## Quick start
This demo is a plain HTML / CSS / JavaScript single page app with no build tools or server requirements.

- Open `index.html` in a browser.
- OR run a local static server (recommended for the best experience):
  - `python -m http.server 8000` or `npx serve` from the project root and visit `http://localhost:8000`.

The demo uses only client-side code and local mock data.  No backend or external libraries are required.

---
## What was improved (summary)
I kept the baseline behavior intact (search, filter, sort, pagination, read-only modal details) and added:

- **Layout + Usage Guide Sidebar** — a persistent, responsive sidebar with concise usage instructions. 
- **Visual polish** — clear spacing, typography, hover states, color system for status badges, sorting indicators, and subtle animations.
- **Loading / Error state UX** — loading overlay while fetching tasks, simulated failures with a retry action and inline error messages.
- **Inline status updates** — click the status cell to cycle `TODO → IN_PROGRESS → DONE` with row-level loading, prevention of duplicate updates, success highlight, and inline errors.
- **Search keyword highlight** — matching query keywords are highlighted in task titles.
- **Empty state view** — when filters/search produce zero results, a friendly empty-state card appears with a reset button.
- **Accessibility / feedback** — active styling on inputs and headers, explicit sort direction indicators, hover & cursor cues for interactive rows and status buttons.

---
## UX details (high level)
- **Loading indicator** — shows a centered overlay while tasks are being fetched.
- **Simulated failures** — `listTasks()` and `updateTaskStatus()` randomly fail (15%) and show a friendly error message with a retry button.
- **Inline status updates** — clicking a status cell will:
  - show a loading spinner/feedback on the cell
  - prevent multiple updates at once
  - on success the status is updated and the full row briefly highlights
  - on failure an inline error message is shown for that row and the status reverts.
- **Search highlights** — the search query is case-insensitive and matching parts of the title are wrapped in `span.search-highlight` which a subtle background color highlights.
- **Empty state** — when there are no results for the current filters, a small card with `Reset` is shown.

---
## Design decisions
- **No framework / no build tools** — the demo keeps everything in vanilla HTML/CSS/JS (as required).
- **Persistent usage guide** — appears in a left sidebar (non-modal) so the user always has a reference. On narrow screens the layout stacks and the sidebar occupies full width.
- **Colours & typography** — a small color palette is used (blues for TODO, amber for in-progress, green for done), consistent borders and paddings and subtle CSS hover and animations keep it lightweight and production-y.
- **Glossy polish** — subtle `highlight` animation for recent updates, sort indicator arrows in headers and active input styling to make interactions explicit.

---
## Files changed
- `index.html` — layout + sidebar + loading / error / empty elements + styles
- `app.js` — fetch helpers, inline status update flow, search highlight, error handling, empty state visibility, sort indicators, `updateTaskStatus` mock API
- `README.md` — this document

If you'd like to tweak the mock failure rate or latency, both are in `app.js` (search for `listTasks()` / `updateTaskStatus()`):

```js
// simulate latency and failure
await new Promise(r => setTimeout(r, 300));
if (Math.random() < 0.15) throw new Error('Failed ...');
```

---
## Notes / limitations
- The demo uses local mock data via `seededTasks()` — no persistence.
- The inline update is fully simulated on the client; no real backend.
- Focused on incremental, non-architectural improvements (no re-architecting, no frameworks).

---
## License
This educational demo is intentionally minimal and is provided as-is for learning/assessment purposes.
