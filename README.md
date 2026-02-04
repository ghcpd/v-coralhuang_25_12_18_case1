# Task Dashboard — Polished Demo

This is an improved UI polish of the baseline Task Dashboard demo (vanilla HTML/CSS/JS). The original functionality is preserved (search, filter, sort, pagination, details), with added visual quality, clearer states, inline updates, and a persistent usage guide.

How to run
- Open `index.html` in your browser (no build steps, no server required).
- The UI uses a small simulated delay for fetching and updating data and may occasionally simulate failures to demonstrate error handling.

Key UI & interaction improvements
- Modern, consistent visual system: improved spacing, typography, colors, and subtle shadows/animations.
- Structured layout: header, main content, and a persistent usage guide sidebar that explains how to use the UI.
- Loading / error feedback: a banner shows loading and simulated errors with a retry action. Refresh button re-fetches mock data.
- Active filter summary: visible pills show the active search, status filter, and sorting state.
- Empty-state view: a clear message when no tasks match filters, with actions to Reset filters or Refresh data.
- Sorting indicators: column headers show ▲ / ▼ for active sorting and cycle through ascending → descending → none.

Inline status updates
- Click the status pill in a table row to advance its status: `TODO → IN_PROGRESS → DONE`.
- While updating the status a row-level spinner and disabled action prevent duplicate clicks.
- On success the row is briefly highlighted (subtle pulse) and the UI updates immediately.
- On simulated failure an inline error message appears and the state reverts; the error clears automatically after a short delay.

Usability details
- Matching keywords in titles are highlighted while searching (case-insensitive).
- Table rows are interactive with pointer cursor and hover lift; clicking a row (outside the status button) opens a read-only details modal.
- Recently updated tasks are visually marked for a short duration without affecting sorting/filtering.

Design notes
- No external libraries were added; changes are incremental and focused on delivering clearer feedback and improved polish.
- Mock APIs simulate network delay and occasional failures so the UI's loading and error states can be observed.

If you want further tweaks (timings, colors, or different failure probability) tell me which area you'd like tuned and I can make a targeted change.
