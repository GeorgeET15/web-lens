# WebLens: AI Master Knowledge Base (The "Bible")

## 📖 Introduction
This document is the **definitive source of truth** for all Artificial Intelligence agents operating on the WebLens platform. It consolidates architectural invariants, coding standards, feature definitions, and change policies into a single "Constitution."

**If it contradicts this document, it is wrong.**

---

## 🏗️ 1. Architecture & Identity

### The "Dual-Core" Engine
WebLens uses a split-brain architecture to ensure separation of concerns:
-   **Control Plane (Frontend)**: React + Vite + TypeScript.
    -   *State*: `FlowEditor.tsx` manages the graph using `dnd-kit` for drag-and-drop.
    -   *Streaming*: Real-time updates via EventSource (`/api/status/{run_id}`).
    -   *Inspector*: **Singleton Service**. Managed via `InspectorService` in backend. Starts via REST, broadcasts updates via WebSocket (`ws://inspector`) to all connected clients.
-   **Execution Plane (Backend)**: Python + FastAPI + Selenium.
    -   Responsibility: Browser orchestration, block interpretation, AI inference.
    -   *Strict Rule*: Stateless execution for flows (isolated instances). The Inspector, however, is a stateful **Singleton** resource shared across the instance.

### The "Hybrid" Intelligence
-   **Deterministic Layer**: Selenium WebDriver executes exact commands (`Click`, `Type`).
-   **Probabilistic Layer**: "WebLens AI" (Smart Eyes) heals broken selectors and performs visual assertions.
-   **Capability Guard**: The Inspector prevents logical errors (e.g., picking a `div` for `Enter Text`) by checking element capabilities (`editable`, `clickable`) before confirming.

---

## ⚖️ 2. The "Invariants" (Constitution)
*Derived from `WEBLENS_V1_INVARIANTS.md` (Frozen Status)*

### Zero-Code Contract
1.  **No Manual Selectors**: Users are FORBIDDEN from entering distinct CSS/XPath. Resolution is purely semantic.
2.  **No Code Blocks**: There is no "Run Script" block. Code injection is strictly blocked to maintain security and determinism.

### Deterministic Execution
3.  **Single-Threaded**: Flows execute block-by-block. No parallelism within a single flow.
4.  **Honest Failure**: If an element is ambiguous, the test FAILS. The AI does *not* guess "close enough" matches unless explicitly in "Self-Healing" mode.

### State & Safety
5.  **Strict Interpolation**: A missing variable (`{{unknown}}`) causes an immediate crash. Silent failures are forbidden.
6.  **Scenario Isolation**: Every scenario run starts with a pristine browser state (Cookies/Storage cleared).

---

## 📦 3. Feature Registry (Complete Block List)

### Navigation & Browser Control
-   **Open Page**: Navigates to a URL. Waits for `document.readyState === 'complete'`.
-   **Refresh Page**: Reloads the current page.
-   **Wait For Page Load**: Explicit wait for network idle (default 15s).
-   **Switch Tab**: Shifts focus. `to_newest=true` jumps to the latest opened tab.
-   **Confirm/Dismiss Dialog**: Handles native JS alerts (`window.confirm`, `window.alert`).
-   **Delay**: Hard wait in seconds.

### Interaction (User Actions)
-   **Click Element**: Smart click. Uses **Confidence-Based Retry**:
    -   *High Confidence*: Fast Fail (2 retries, 0.2s interval).
    -   *Low Confidence*: Patient (5 retries, 2.0s interval).
    -   *Fallback*: Scrolls to center; if blocked, attempts JS click.
-   **Enter Text**: Types into inputs. `clear_first=true` by default. Can use `{{variables}}`.
-   **Select Option**: Dropdown picker. Supports selection by Text, Value, or Index.
-   **Upload File**: Injects a local file path into an `<input type="file">`.
-   **Submit Form**: Triggers form submission on a target element.
-   **Submit Current Input**: Presses "Enter" on the currently focused element.
-   **Activate Primary Action**: Heuristic search for "Submit", "Login", "Search" buttons via strict CSS selectors and text analysis.
-   **Scroll To Element**: Scrolls the viewport until the element is center/top/bottom.

### Logic & Flow Control
-   **If Condition**: Conditional branching. Supports `Element Visible`.
-   **Repeat Until**: Conditional loop. **MUST** have a `max_iterations` guard (Default: 10).
-   **Wait Until Visible**: Pauses execution until an element appears (Timeout error if failed).
-   **AI Command**: (Internal) Placeholder for generative steps.

### Assertions (Verifications)
-   **Assert Visible**: Fails if element is missing.
-   **Verify Text**: Fails if text doesn't match/contain target.
-   **Verify Page Title**: Fails if `<title>` doesn't match.
-   **Verify URL**: Fails if URL doesn't contain string.
-   **Verify Element Enabled**: Checks `disabled` attribute.
-   **Verify Page Content**: Broad check for text anywhere in the `<body>`.
-   **Verify Network Request**: Checks if a specific API call (URL/Method) happened.
-   **Verify Performance**: Fails if metric (e.g., `page_load_time`) exceeds `threshold_ms`.
-   **Visual Verify**: Uses Gemini Vision to diff screenshots against a baseline.

### Data & State
-   **Save Text**: Extracts `innerText` to a variable.
-   **Save Page Content**: Dumps full HTML/Text to a variable.
-   **Use Saved Value**: Injects a variable into another block (Legacy wrapper).
-   **Get Cookies**: Dumps all cookies to the report.
-   **Get Local/Session Storage**: Dumps storage keys to the report.
-   **Observe Network**: Starts a background network execution listener.

### Developer Tools
-   **Export Flow**: Generates native automation code from the visual flow.
    -   *Formats*: Playwright (Python/Java), Selenium (Python/Java).
    -   *Logic*: Maps blocks to `async` Playwright calls or synchronous Selenium `WebDriverWait` chains.

---

## 🛡️ 4. Technical Deep Dive

### The "Smart Wait" Protocol
The `browser_engine.py` implements a deterministic stability guard before every action:
1.  **ReadyState**: Waits for `document.readyState === 'complete'`.
2.  **Font Guard**: Waits for `document.fonts.ready`.
3.  **Visual Animation Guard**: Tracks x/y coordinates of key elements over 100ms. If they move >0.5px, resets the timer.

### MAWS Scoring Algorithm (Multi-Attribute Weighted Scoring)
Element resolution (`resolution.py`) assigns points to candidates. Threshold > 5 points.
-   **Test ID** (`data-testid`): **20 points** (Golden Standard)
-   **Exact Name Match** (`innerText`): **15 points**
-   **ARIA Label**: **8 points**
-   **Partial Name**: **8 points**
-   **Role Match**: **5 points**
-   **Placeholder/Title**: **3 points**
-   **Tag Name**: **1 point**
*Proximity Bonus*: +5 points if near a declared anchor.

### AI Service Internals
-   **Smart Eyes**: Uses `GeminiProvider` with a multimodal prompt to ignore dynamic content ("dates", "ads") while flagging structural breaks.
-   **Self-Healing**: Triggered if confidence drops below 0.7. Proposes candidates from the top 5 MAWS results to the user.
-   **Structural Hashing**: Captures a DOM tree string (tags + roles only) and SHA256 hashes it to detect layout drift.

### Type Safety (Zero Tolerance)
-   **Frontend**: `any` is **BANNED**. Use `unknown` or specific interfaces.
-   **Backend**: All API inputs must use Pydantic models.

### Observability
-   **Logging**: `print()` is **BANNED**. Use `logging.getLogger(__name__)`.
-   **Traceability**: Every TAF (Test Action Framework) event must include: `timestamp`, `block_id`, `screenshot_path` (optional).

### Change Control Policy
-   **Allowed**: Bug fixes, Performance optimizations, Documentation, New Blocks (if semantic).
-   **Forbidden**: Changing block behavior (e.g., Double Click), Breaking Schema changes, Removing Validation.

---

## 💾 5. Data Model Schema (FlowGraph)

### Core Structure (Pydantic V2)
All flows **MUST** strictly adhere to this schema.
-   `id` (str): Unique UUID.
-   `name` (str): Human-readable name.
-   `entry_block` (str): ID of the first block.
-   `blocks` (List[Block]): Flat list of all blocks.
-   `variables` (Dict[str, str]): Initial global variables.
-   `scenario_sets` (List[ScenarioSet]): Data-driven test cases.

### Block Protocol
All 35 block types inherit from `BaseBlock`:
-   `id` (str): UUID4 (Frontend generated).
-   `type` (str): Discriminator key.
-   `next_block` (Optional[str]): Pointer to next block ID.
-   **Validation Invariant**: All referenced IDs (`next_block`, `then_blocks`, `else_blocks`) **MUST** exist in the `blocks` list.

### Key Types
-   **ElementRef**: `{ "role": str, "name": str, "metadata": dict }`. **SELECTOR-FREE**.
-   **Condition**: `{ "kind": "element_visible" | "text_match" | ..., "element": ElementRef }`.

---

## ⚙️ 6. Environment & Configuration

### File System Layout (Standard)
-   **Data Directory**: `~/.local/share/weblens` (Linux) / `AppData/WebLens` (Windows).
    -   Override with `WEBLENS_DATA_DIR` env var.
-   `flows/`: JSON flow files.
-   `executions/`: Run reports and screenshots.
-   `logs/`: Application logs.

### Key Variables (.env)
-   `HEADLESS` (bool): Defaults to `True`. Set `False` for visual debugging.
-   `GEMINI_API_KEY`: Required for "Smart Eyes" and Self-Healing.

---

## 🧩 7. Data Flow & Reference

### Flow JSON Schema (v1)
```json
{
  "id": "uuid",
  "blocks": [
    {
      "id": "b1",
      "type": "open_page",
      "params": { "url": "..." },
      "next": "b2"
    }
  ],
  "variables": { ... }
}
```

### Selector Heuristics (Severity Order)
1.  **Semantic High**: `testId`, `aria-label`, `label[for]`.
2.  **Semantic Medium**: `placeholder`, `title`, `name`.
3.  **Semantic Low**: `innerText` (button/link only).
4.  **Structural**: `nav > a`, `header > img` (Last Resort).

---

## 🚑 6. Troubleshooting
-   **"Browser Hangs"**: Check `driver.quit()` in `browser_engine.py`. Zombied processes are a known risk.
-   **"Chat History Leaks"**: Ensure `currentFlowId` is part of the `messages` dependency array in `FlowEditor.tsx`.
-   **"Infinite Loops"**: Verify `RepeatUntil` condition isn't strictly tautological (always true).
