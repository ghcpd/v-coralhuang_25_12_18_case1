# Task Dashboard — Enhanced Demo

This is an enhanced frontend demo of the baseline Task Dashboard. The baseline behavior is preserved and improved with modernized styling, clear feedback, and richer interactions.

## Run

1. Open `index.html` in a modern browser (no build steps required).
2. The app runs entirely in the browser using local mock data.

## Key UI & Interaction Improvements ✅

- **Structured layout**: Header, main content area, and a persistent **Usage Guide** sidebar.
- **Improved visual system**: modern typography, spacing, card surfaces, consistent color tokens, hover/press states, and subtle transitions.
- **Loading & error states**: visible loading skeletons and a banner for load errors. There's a **Simulate load failure** checkbox in the controls to test failure handling.
- **Active filters & sorting indicators**: applied filters show as pills with quick clear buttons.
- **Empty state**: friendly empty-state view with a clear `Reset view` action.
- **Search highlights**: matching text in task titles is highlighted while searching.
- **Row interactivity**: table rows show pointer/hover feedback and are actionable (click to view details).
- **Brief animations**: recently updated rows are briefly highlighted.

## Inline Status Updates (how it works) 🔧

- Click the **Status** button in a row to advance the state along this order:
  `TODO → IN_PROGRESS → DONE`
- While updating:
  - The row shows a small spinner in the status cell.
  - Duplicate actions are prevented.
- On success:
  - Task status updates immediately.
  - The row is visually highlighted for ~3 seconds.
- On failure:
  - An inline error message is shown in the row and the status remains unchanged.

Note: Updates are handled by a mock `updateTaskStatus` (simulates delay and an occasional failure) — no backend required.

## Usage Guide Sidebar

The right-side guide is persistent and briefly explains how to: search, filter, sort, paginate, and update task status inline. On small screens the sidebar stacks below the table.

## Design Decisions

- Keep baseline behavior and data model intact while incrementally enhancing UI and UX.
- Use simple client-side state and avoid complex abstractions — changes are localized and readable.
- Make failure modes testable (simulate checkbox) so that error UI can be validated without external servers.

## Notes

- This is a purely front-end demo using only HTML/CSS/vanilla JS.
- If you want additional adjustments (e.g., keyboard shortcuts, more granular animations, or accessibility refinements), tell me which areas to focus on next.
