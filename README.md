# Task Dashboard

A modern, polished task management web application built with vanilla HTML, CSS, and JavaScript. Features advanced search, filtering, sorting, pagination, inline status updates, and comprehensive UI feedback.

## How to Run

1. **Open in Browser**: Simply open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
   - No build tools, no dependencies, no installation required.
   - Works offline — all data is client-side.

2. **Live View**: Open the file directly from the file system or serve it with a simple HTTP server:
   ```bash
   python -m http.server 8000
   # or
   npx http-server
   ```
   Then navigate to `http://localhost:8000/index.html`

## Key UI and Interaction Improvements

### 1. **Modern Visual Design**
   - **Color System**: Gradient purple header, intentional status badge colors (yellow for TODO, blue for IN_PROGRESS, green for DONE)
   - **Spacing & Typography**: Clean, readable layout with consistent margins and modern sans-serif font stack
   - **Visual Hierarchy**: Clear primary (buttons, headers) and secondary elements; improved contrast
   - **Polished Table**: Hover states with subtle background changes, clear borders, readable density
   - **Animations**: Smooth transitions on buttons, loading spinner, highlight flash on updates, modal slide-in
   - **Responsive Design**: Adapts to smaller screens with stacked sidebar and full-width controls

### 2. **Loading and Error Feedback**
   - **Loading Indicator**: Spinning overlay appears while tasks are being fetched (600ms simulated delay)
   - **Error Messages**: Clear, dismissible error banner appears if data loading fails
   - **Layout Stability**: No layout jumps during loading — overlay maintains table dimensions
   - **Visual Clarity**: Loading overlay shows animated spinner; error messages have distinct styling

### 3. **Inline Task Status Updates**
   - **Status Transition Button**: Each task row has a "Next Status" button showing the next available transition
   - **Enforcement**: Tasks follow strict workflow: `TODO → IN_PROGRESS → DONE`
   - **Row-Level Feedback**:
     - While updating: Button replaced with small spinning loader, preventing accidental double-clicks
     - On success: Task status updates immediately; row briefly highlights in yellow (1.5s)
     - On failure: Error banner appears, row state reverts (mock implementation has simulated failures commented out)
   - **Mock Logic**: All updates are instant (no backend); logic supports real API integration

### 4. **Enhanced Usability**
   - **Keyword Highlighting**: Search terms are highlighted in yellow within task titles as you type
   - **Empty State**: When no tasks match filters/search, a friendly "No tasks found" message appears with a reset button
   - **Interactive Rows**: Table rows show cursor change and subtle background highlight on hover; clickable for details
   - **Recently Updated Marking**: Updated tasks briefly flash yellow background (animation-based) without breaking sorting/filtering
   - **Sort Indicators**: Column headers show ↑/↓ symbols indicating current sort direction
   - **Active Filters Display**: "Sorted by [key]" indicator appears below item count when sorting is active

### 5. **Persistent Usage Guide Sidebar**
   - **Always Visible**: Left sidebar shows concise instructions alongside main content (not a modal)
   - **Sections**:
     - **Search Tasks**: Explains keyword highlighting in search
     - **Filter & Sort**: Describes status dropdown and column-header sorting mechanics
     - **Pagination**: Shows how to select items per page and navigate
     - **Update Status**: Explains the status update button workflow
     - **Reset**: Notes the reset button clears all filters/sort/search
   - **Design**: Light gray background, distinct from main content, uses same color scheme
   - **Responsive**: On screens ≤900px, sidebar stacks above main content; collapsible via scroll

## Baseline Behavior Preservation

All original features remain intact and work as before:
- ✅ Task table with 57 seeded tasks
- ✅ Search by title
- ✅ Filter by status (ALL, TODO, IN_PROGRESS, DONE)
- ✅ Clickable table headers for sorting (ascending/descending/none cycle)
- ✅ Pagination (5, 10, 20 items per page)
- ✅ Modal task detail view (click row to view full task info)
- ✅ Reset button to clear all filters, sorts, and search
- ✅ Page info and prev/next navigation
- ✅ Fully accessible HTML structure (aria labels, semantic markup)

## How Inline Status Updates Work

### User Flow
1. User sees a task in TODO status
2. "Next: IN_PROGRESS" button appears in the Action column
3. User clicks the button
4. Button becomes a small spinning loader (prevents duplicate clicks)
5. After 400ms (mock delay):
   - Task status updates to IN_PROGRESS
   - Row background flashes yellow briefly (1.5s animation)
   - Task now shows "Next: DONE" button
6. Process repeats until task reaches DONE status
7. When task is DONE, button is disabled (no further transitions)

### Status Transition Rules
- **TODO** → IN_PROGRESS (enabled)
- **IN_PROGRESS** → DONE (enabled)
- **DONE** → (no further transition, button disabled)

### Error Handling
- If update fails, error banner shows with message
- Row loading state clears and button re-enables
- Original status is preserved (no optimistic update without success)
- Mock logic has failure simulation commented out; uncomment line ~59 in `app.js` to enable 15% failure rate

## Design Decisions

### Color and Typography
- **Primary Color**: #667eea (purple) — professional, modern feel
- **Status Colors**: Semantic — warm yellow (TODO), cool blue (IN_PROGRESS), natural green (DONE)
- **Font Stack**: System fonts (-apple-system, Segoe UI, etc.) for native feel and fast loading
- **Spacing**: 4px baseline grid (4, 8, 12, 16, 20, 24px) for consistency

### Sidebar Architecture
- **Rationale**: Constant visibility ensures users never forget available features
- **Placement**: Sticky position on left, stacks below on mobile (<900px)
- **Content**: Concise, instructional language avoiding jargon
- **Styling**: Visually distinct (white card, subtle shadow) but not obtrusive

### Loading & Error UX
- **Loading Overlay**: Semi-transparent white prevents accidental interactions during fetch
- **Spinner Animation**: Smooth 0.8s rotation for perceivable feedback
- **Error Messages**: Auto-dismiss after 4s to avoid permanent clutter
- **No Layout Shift**: Overlay positioned absolutely within card to maintain table dimensions

### Status Update Flow
- **Button-Based**: More discoverable than inline dropdowns
- **Instant Visual Feedback**: Yellow highlight confirms action without async wait
- **Row-Level Spinners**: Clear which row is being updated (important with pagination)
- **Graceful Degradation**: Disabled button on DONE status prevents "impossible" transitions

### Responsive Approach
- **Grid Layout**: `grid-template-columns: 260px 1fr` on desktop, `1fr` on mobile
- **Control Stacking**: Full-width controls on screens <900px for easier tapping
- **Sidebar Behavior**: Sticky on large screens, normal flow on mobile
- **Table Overflow**: Mobile devices see all columns (no horizontal scroll needed for MVP)

## Technical Notes

### State Management
- Single `state` object tracks: data, filters, sort, page, loading, updating rows, recently updated rows
- `render()` function re-generates table HTML based on current state
- Event listeners update state and call `render()` — simple one-way data flow

### Performance
- No external libraries or build tools
- Minimal reflows: `render()` only called when necessary
- CSS animations (highlight flash, spinner) use GPU-accelerated properties
- Table re-rendering efficient: pagination limits DOM nodes to max ~20 visible rows

### Accessibility
- Semantic HTML: `<header>`, `<aside>`, `<table>`, `<dialog>` concepts
- ARIA labels on interactive controls
- Keyboard navigation: Tab through controls, Enter to submit
- Color not sole indicator: Icons (↑/↓) and badges with contrast

### Mock API
- `listTasks()`: Returns 57 seeded tasks with 600ms delay (simulates network latency)
- `updateTaskStatus()`: Returns success after 400ms (simulate update latency)
- Failure simulation available (commented out ~59 in app.js) for testing error handling

## Browser Compatibility

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Uses: CSS Grid, ES6 async/await, CSS animations, `fetch`-like XMLHttpRequest (not needed here)
- Graceful degradation for older browsers (no hard failures, but layout may shift)

## Future Enhancements

- Real backend API integration (replace mock functions)
- Bulk status updates (checkbox multi-select)
- Task creation/editing inline
- Advanced filtering (by assignee, date range)
- Dark mode toggle
- Export tasks (CSV, JSON)
- Undo/redo for status changes
- Notification center for task events

---

**Built with**: Plain HTML, CSS, Vanilla JavaScript  
**No dependencies**: 100% client-side, no build tools, no framework  
**Last Updated**: December 2024
