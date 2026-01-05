# System Validation Test Plan — WebLens

This document serves as the canonical validation suite for WebLens. It is designed to prove system integrity, enforce architectural guardrails, and prevent regressions. Every test case is derived from the core philosophies of **Semantic Intent**, **Deterministic Execution**, and **Explainability**.

---

## 1. EDITOR & UX TESTS

### T-UX-01: Spatial Canvas Integrity
- **Preconditions**: Empty workspace.
- **Steps**:
    1. Drag three blocks onto the canvas.
    2. Pan the workspace as far as possible in any direction.
    3. Use "Reset View" or pan back.
- **Expected Result**: Workspace pans infinitely; blocks maintain their absolute spatial positions relative to each other.
- **Failure Signals**: Jittery movement, lost blocks, or incorrect zoom levels.

### T-UX-02: Branch Rendering (Downward/Sideways Logic)
- **Preconditions**: An `if_condition` block added to the flow.
- **Steps**:
    1. Add a block to the `then` branch.
    2. Add a block to the `else` branch.
    3. Nest a `repeat_until` within the `then` branch.
- **Expected Result**: Primary flow runs vertically; branches rendered sideways to avoid visual clutter. Nested blocks properly indented.
- **Failure Signals**: Overlapping blocks, parent/child lines disconnected.

### T-UX-03: Draft vs Runnable State
- **Preconditions**: A flow with one empty `type_text` block.
- **Steps**:
    1. Observe the "Run Test" button state.
    2. Fill in the required text parameter.
- **Expected Result**: Initially, "Run Test" is disabled (Draft). Once parameters are valid, it becomes enabled (Runnable).
- **Failure Signals**: Ability to run an unconfigured flow.

---

## 2. VISUAL INSPECTOR TESTS

### T-INS-01: Mode Decoupling
- **Preconditions**: Inspector open on a target website.
- **Steps**:
    1. Attempt to select an element while in **Browse Mode**.
    2. Toggle to **Pick Mode** and attempt to navigate (click a link).
- **Expected Result**: Browse Mode allows navigation but ignores picks. Pick Mode allows selection but intercepts clicks for capture.
- **Failure Signals**: Accidental navigation in Pick Mode; accidental selection in Browse Mode.

### T-INS-02: Semantic Signature Capture
- **Preconditions**: Pick Mode active.
- **Steps**:
    1. Highlight and pick a "Submit" button.
    2. Inspect the captured block parameters.
- **Expected Result**: Signature contains `role="button"` and `name="Submit"`. No CSS selectors or XPaths recorded.
- **Failure Signals**: Presence of technical selectors (e.g., `#btn-123`, `.primary-cta`) in the JSON.

### T-INS-03: Hidden / Ambiguous Elements
- **Preconditions**: A page with two identical "Delete" buttons in different containers.
- **Steps**: Pick one of the buttons.
- **Expected Result**: Inspector captures enough semantic context (anchors) to distinguish the button or triggers an explicit "Ambiguous Target" failure.
- **Failure Signals**: Silent capture of a non-unique signature.

---

## 3. BLOCK SYSTEM TESTS

### T-BLK-01: Navigation (Open Page)
- **Steps**: Configure `open_page` with `https://example.com`.
- **Expected Result**: Browser context navigates to the URL; execution waits for document idle.
- **Failure Signals**: Block success before page load; navigation to `about:blank`.

### T-BLK-02: Logic (If / Else)
- **Steps**: Create a condition checking if `role="alert"` exists. Add different "Log" actions to then/else.
- **Expected Result**: Execution follows the correct sideways branch based on real-time browser state.
- **Failure Signals**: Execution of both branches; incorrect decision logic.

### T-BLK-03: Data (Save Value)
- **Steps**: Use `save_text` on a heading. Use the saved variable in a subsequent `type_text` block using `{{variable_name}}` syntax.
- **Expected Result**: Value extracted correctly and injected into the target block.
- **Failure Signals**: Variable remains null; literal `{{variable_name}}` string typed into browser.

---

## 4. FLOW VALIDATION & STATE TESTS

### T-VAL-01: /flow/validate Gate
- **Preconditions**: A flow with an orphaned block (not connected to root).
- **Steps**: Attempt to "Run Test".
- **Expected Result**: Backend rejects the flow; UI highlights the specific orphan block with a red border.
- **Failure Signals**: Interpreter attempts to run the disconnected graph.

### T-VAL-02: Multi-Error Feedback
- **Preconditions**: Multiple blocks with missing parameters.
- **Steps**: Hover over the error indicators.
- **Expected Result**: Each block provides specific feedback (e.g., "Missing URL", "No element picked").
- **Failure Signals**: Generic "Flow Invalid" message with no block-level orientation.

---

## 5. EXECUTION ENGINE TESTS

### T-EXE-01: Deterministic Stepping
- **Steps**: Run a 5-step flow.
- **Expected Result**: Blocks execute sequentially (A -> B -> C).
- **Failure Signals**: Parallel block execution; skipping blocks.

### T-EXE-02: Semantic Resolution (Success vs Failure)
- **Preconditions**: Element `role="button", name="Pay"` is on screen.
- **Steps**: Run a `click` block with that signature. Hide the button and run again.
- **Expected Result**: 1. Unambiguous match. 2. Explicit failure (No matching element).
- **Failure Signals**: Clicking a similar button (e.g., "Cancel"); "AI auto-healing" to a different button.

### T-EXE-03: Loop Safety
- **Preconditions**: `repeat_until` condition that always evaluates to false.
- **Steps**: Set a timeout of 30s. Run the test.
- **Expected Result**: Execution terminates with a "Timeout" or "Safety Max Iterations Reached" error.
- **Failure Signals**: Infinite loop hanging the runner process.

---

## 6. EXECUTION INSIGHT (TAF) TESTS

### T-TAF-01: Per-Block Artifacts
- **Steps**: Run a valid flow. Open Execution Explorer.
- **Expected Result**: Every block in the sequence has an attached timestamp, duration, and screenshot.
- **Failure Signals**: Missing screenshots; "Success" blocks with no trace entries.

### T-TAF-02: Immutability
- **Steps**: Attempt to modify a result or delete a screenshot from the Execution Explorer.
- **Expected Result**: UI is read-only; backend rejects any mutation requests for historical runs.
- **Failure Signals**: Editable text fields in the explorer; successful deletion of artifacts.

### T-TAF-03: Editor Linkage
- **Steps**: Click a block in the spatial editor after a run.
- **Expected Result**: Execution timeline jumps to that block's specific result.
- **Failure Signals**: No bi-directional highlighting.

---

## 7. SAVE / LOAD & PERSISTENCE TESTS

### T-PER-01: Lossless JSON Persistence
- **Steps**: Build a complex nested flow. Save and reload.
- **Expected Result**: JSON schema is identical; all parameters, coordinates, and linkages are preserved.
- **Failure Signals**: Lost branches; reset block parameters; blocks shifting positions on the canvas.

### T-PER-02: Rehydration Integrity
- **Steps**: Save a flow with active validation errors. Reload.
- **Expected Result**: Errors are correctly re-calculated and displayed immediately upon load.
- **Failure Signals**: Loaded flow appears "Runnable" when it should be a "Draft".

---

## 8. SAFETY & GUARDRAIL TESTS

### T-SAF-01: Zero-Code Enforcement (Selectors)
- **Steps**: Attempt to paste a CSS selector into a block parameter field via console or DOM manipulation.
- **Expected Result**: Input is rejected or ignored by the schema validator. No UI field exists for manual input.
- **Failure Signals**: Test execution succeeds using a raw selector.

### T-SAF-02: Zero-Code Enforcement (Macros)
- **Steps**: Rapidly click or type while recording.
- **Expected Result**: WebLens only captures distinct **Semantic Intents**, not the raw timing or frequency of inputs.
- **Failure Signals**: Success of a "double-click" test that relies on record-time speed.

---

## 9. REGRESSION & NEGATIVE TESTS

### T-NEG-01: Dynamic Page Change
- **Preconditions**: A "Loading" overlay appears after a click, obscuring the next target button for 3 seconds.
- **Steps**: Execute the flow.
- **Expected Result**: WebLens polls/retries semantically until the overlay disappears, then succeeds within the timeout.
- **Failure Signals**: "Element Intercepted" error before the timeout; clicking through the overlay.

### T-NEG-02: Honest Failure (Vanish Element)
- **Preconditions**: Target element is removed from the DOM mid-test.
- **Steps**: Execute `click`.
- **Expected Result**: Explicit failure marked on the specific block with a "Target element vanished" status.
- **Failure Signals**: Generic "Internal Server Error"; system hanging while searching for a non-existent node.
