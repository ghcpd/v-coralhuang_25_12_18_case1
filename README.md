# Task Dashboard - Polished UI Demo

This project is a small, self-contained frontend demo (vanilla HTML/CSS/JS) showcasing a Task Management Dashboard with improved UI, feedback, and inline interactions.

How to run
- Open `index.html` in a modern browser (no build steps required).

Key UI & Interaction Improvements
- Modern, structured layout: header, main content, persistent usage guide sidebar.
- Improved spacing, typography, and a consistent color system.
- Polished table presentation: hover states, subtle elevation, and readable density.
- Loading state: a loading overlay appears while tasks are being fetched.
- Error handling: simulated load failures show an inline error with a Retry button and do not cause layout jumps.
- Active filters and sort status are displayed as chips for clarity.
- Search: matching keywords in task titles are highlighted.
- Empty state: a clear, friendly empty view is shown with a Reset action.
- Inline status updates: advance task status directly from the table with visual feedback:
  - Transition order enforced: TODO → IN_PROGRESS → DONE
  - Row-level loading indicator while updating
  - Prevent duplicate updates during an in-flight update
  - On success: the status updates immediately and the row is briefly highlighted
  - On failure: an inline row error message appears and reverts (clears) shortly after
- Rows are clearly interactive (hover, cursor) and clicking a row opens a details modal.

Design Decisions
- Incremental changes were made to the existing baseline; no frameworks or backend were introduced.
- Status updates are mocked client-side with a randomized failure rate to let reviewers exercise both success and error flows.
- The usage guide is implemented as a persistent sidebar that adapts on smaller screens.

Files changed
- index.html — Layout, styles, and usage guide sidebar, plus loading/error/empty placeholders.
- app.js — Loading/error handling, search highlighting, inline status updates with optimistic UI + feedback, and other interaction improvements.

Notes
- This demo is meant to show focused, incremental frontend improvements while keeping baseline functionality intact.

Enjoy exploring the improved Task Dashboard UI!
