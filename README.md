# WebLens v1.0.0: Zero-Code Visual Web Testing Platform

WebLens is a professional-grade visual web testing platform designed to enable the creation, execution, and analysis of web tests without writing code. It prioritizes semantic intent, deterministic execution, and complete explainability.

---

## SECTION 1 — WHAT IS WEBLENS

### Problem Space
Web testing has traditionally been bifurcated into two camps: brittle "record-and-playback" tools that break on every UI change, and high-maintenance code-based frameworks (Selenium, Playwright) that require engineering resources. WebLens solves this by shifting focus from *procedural scripts* to *semantic intent*.

### Audience
WebLens is built for non-developers, QA engineers, Product Managers, and Founders who need reliable regression testing without the overhead of maintaining a codebase or learning selector syntax.

### "Zero-Code" in Practice
In WebLens, "Zero-Code" does not mean a simplified wrapper for code. It means the system eliminates the concept of selectors (CSS/XPath), keyboard macros, and procedural scripts entirely. Users specify *what* should happen (e.g., "Click the login button"), and WebLens’s semantic engine handles the *how*.

### Differentiation
- **Intent-First**: We capture the user's goal, not the technical implementation.
- **Deterministic**: Every execution follows a strict, non-ambiguous path.
- **Explainable**: Successes and failures are presented through a Trace–Analysis–Feedback system that shows exactly why a block behaved as it did.

- **Modules**:
    - **/backend**: Python execution engine and semantic resolution logic.
    - **/frontend**: React-based visual editor and dashboard (Vite-powered).
    - **/docs**: Canonical governance, architecture, and release documentation.
    - **/website**: The WebLens public marketing site.

---

## SECTION 2 — CORE PHILOSOPHY & NON-GOALS

### Guiding Rules
1. **Semantic Intent**: Interactions are defined by their accessible meaning (e.g., "Click Search"), making them resilient to layout changes.
2. **Deterministic Execution**: Tests must run the same way every time. If a flow is incomplete, it cannot run.
3. **Honest Failure**: WebLens does not perform "AI guessing" or hidden fallbacks. If an element cannot be found with high confidence, the test fails explicitly.
4. **Explainability**: Every step must provide visual and logical proof of its outcome.

### Explicit NON-GOALS
- **No Manual Selectors**: Users are forbidden from entering CSS or XPath selectors.
- **No Keyboard Macros**: WebLens avoids recording raw keystroke timings or low-level input events.
- **No "AI Guessing"**: We do not use probabilistic agents to "figure out" a broken flow.
- **No Escape Hatches**: There is no "Custom Script" block. The system enforces the Zero-Code constraint strictly.
- **No Partial Execution**: Flows that are structurally invalid or have missing configurations are blocked from starting.

---

## SECTION 3 — USER EXPERIENCE OVERVIEW

### User Journey
- **Visual Flow Editor**: Users build tests on a spatial infinite canvas using a block-based system.
- **Downward Execution**: The primary logic flow moves vertically.
- **Sideways Branching**: Conditional logic (`IF`) and loops (`REPEAT`) expand horizontally to maintain visual clarity.
- **Draft vs Runnable**: The system maintains a strict state machine. A flow is a "Draft" until all blocks are valid; only "Runnable" flows can be sent to execution.
- **Save / Load**: Flows are persisted as JSON objects, allowing for versioning and sharing.
- **Insights**: Post-execution, the user is presented with a detailed report linking the editor blocks to actual browser outcomes.

### Interaction Model
1. **Build**: Drag blocks from the Library onto the canvas.
2. **Pick**: Use the Visual Inspector to select elements semantically.
3. **Navigate**: Use the embedded browser to reach the desired app state.
4. **Run**: Execute the test and monitor progress in real-time.
5. **Understand**: Use TAF insights to analyze failures.

---

## SECTION 4 — VISUAL INSPECTOR

### Embedded Browser
WebLens includes an integrated browser environment for test authoring.

### Browse Mode vs Pick Mode
- **Browse Mode**: The browser behaves like a standard user agent, allowing navigation and interaction.
- **Pick Mode**: Interactivity is intercepted. Hovering over elements highlights their semantic boundaries.

### Semantic Element Capture
When an element is "picked," WebLens does not save a selector. Instead, it captures a **Semantic Signature**:
- **Role**: (e.g., `button`, `link`, `heading`)
- **Accessible Name**: The text used by screen readers (e.g., "Submit Order").
- **Contextual Anchors**: Surrounding semantic landmarks.

### Confidence Scoring
WebLens calculates a confidence score during both picking and resolution. If the semantic signatures are ambiguous (e.g., three "Delete" buttons), the system requires the user to provide more context or fails the pick.

---

## SECTION 5 — BLOCK SYSTEM

### Navigation
- **Open Page**: Loads a specific URL. Requires a valid URL string.
- **Refresh Page**: Reloads the current context.
- **Go Back / Forward**: Standard browser history navigation.

### Interaction
- **Click Element**: Performs a semantic click. Requires a Picked Element.
- **Type Text**: Inputs characters into an element. Requires a Picked Element and text value.
- **Select Option**: Interacts with dropdowns. Requires a Picked Element and the target option text.
- **Upload File**: Handles file inputs via the browser engine. WebLens uses an abstract `FileRef` model; local filesystem paths are never stored or exposed. Resolution occurs within a secure browser sandbox to maintain Zero-Code and privacy guarantees.

### Logic & Control
- **If / Else**: Branches the flow based on a condition (e.g., "If element 'Success' exists").
- **Repeat Until**: Loops a sequence of blocks until a condition is met.
- **Wait For Page Load**: Pauses execution until the document and network idle.

### Verification
- **Verify Text**: Asserts that an element contains specific text.
- **Verify Element**: Asserts that an element is visible/present on the page.
- **Verify URL**: Asserts the current browser location.

### Data
- **Save Text**: Extracts text from an element and saves it to a global variable for later use.

---

## SECTION 6 — FLOW MODEL & JSON

### Canonical Data Structure
The Flow JSON is the single source of truth. The Editor UI is merely a visual projection of this structure.

### Save / Load Invariants
- **Lossless Persistence**: Every property in the canonical Flow JSON is persisted exactly. Save/Load operations are lossless.
- **Full Rehydration**: The Editor UI state is reconstructed entirely from the Flow JSON. No UI-only or derived state is stored in the persistence layer.
- **Independence**: The Flow JSON contains all information required for execution; it does not depend on the Editor's runtime state.

### Schema Components
- **Block IDs**: Unique UUIDs for every block.
- **Graph Links**: Definition of `next_block` and branch keys (`then`, `else`, `body`).
- **ElementRef**: A detailed object containing the semantic signature (role, name, etc.), NOT a selector.
- **Global Variables**: A key-value store for data passed between blocks.

---

## SECTION 7 — BACKEND ARCHITECTURE

### API Layer (FastAPI)
The backend provides a robust API for flow management and execution.

### Validation Gate (`/flow/validate`)
Before any execution, the flow is put through a validation gate. This gate enforces:
- Connectivity (no orphaned blocks).
- Parameter completeness (no empty "Type Text" blocks).
- Loop safety (no infinite loops detected statically).

### Interpreter & ExecutionContext
The Interpreter walks the Flow JSON block-by-block. It maintains an `ExecutionContext` which tracks variables, browser state, and the execution trace.

**Completeness Assumption**: The Interpreter assumes the flow is structurally sound and all block parameters are populated. This is guaranteed by the Validation Gate; bypassing the gate with an incomplete flow WILL trigger a terminal execution error rather than a soft-failure or fallback. This ensures that only well-defined intents are ever processed by the browser engine.

---

## SECTION 8 — EXECUTION MODEL

### Determinism
WebLens executes tests step-by-step. There is no parallelization within a single flow to ensure predictable results.

### Semantic Resolution
During execution, the `ElementResolver` searches for an element matching the **Semantic Signature**. Resolution is deterministic: the system identifies a single unambiguous match or triggers an explicit failure. There is no heuristic "guessing" or auto-correction of broken intents.

### Retry & Timeout
If an element is not found, WebLens uses a deterministic polling strategy up to a defined timeout. It does *not* attempt to interact with alternative elements; it either resolves the target or fails honestly.

### Error Philosophy
Failures are treated as valuable data. An "Honest Failure" (e.g., "I found the button but it was covered by a popup") is preferred over a false positive or an automated "fix" that masking a regression.

---

## SECTION 9 — EXECUTION INSIGHTS (TAF 2.0)

WebLens utilizes the **Trace–Analysis–Feedback (TAF)** 2.0 system for explainable debugging. TAF prioritizes **Deterministic Evidence** over AI speculation.

1. **Trace (Factual Reality)**: A chronological, immutable log of exactly what happened in the browser (e.g., "Found 'Button' after 3 retries").
2. **Analysis (Logic & Reasoning)**: Explains the internal reasoning based on observed state (e.g., "WebLens used a semantic strategy because role 'button' matched").
3. **Feedback (Actionable Guidance)**: Provides specific, non-speculative advice to the user (e.g., "The interaction was blocked by a modal; ensure the previous step closes it").

### The Determinism Contract
AI-generated insights are strictly separated from TAF. TAF reflects reality; AI reflects probability. AI summaries must never contradict or replace the factual Trace.


### Execution Artifacts

For each executed block, WebLens captures:
- **Timestamped Result**: The success/failure status of the specific block.
- **Per-Block Screenshot**: A visual capture of the browser state immediately following the block's execution.
- **TAF Entries**: The specific Trace, Analysis, and Feedback entries generated by the block.
- **Metrics**: Execution duration and resolution metadata.

**Immutability**: All execution artifacts are immutable once captured. They are stored as a read-only historical record and cannot be modified by the user or the system post-execution.


---

## SECTION 10 — SAFETY GUARANTEES

- **Immutable Artifacts**: Once a test is run, its screenshots and logs cannot be altered.
- **No Partial Execution**: A test either runs to completion or fails; it never leaves the browser in an intermediate "zombie" state.
- **Privacy**: The Visual Inspector only records during explicit "Pick Mode."
- **Data Integrity**: Global variables are scoped to the execution and cleared afterward.

---

## SECTION 11 — WHAT WEBLENS IS NOT

- **Not an AI Agent**: WebLens does not guess your intent or try to complete a test on its own.
- **Not a Low-Code Tool**: We do not provide "Script Blocks" or "Code View."
- **Not a Selenium Wrapper**: WebLens does not expose the underlying WebDriver/Playwright APIs to the user.
- **Not a Macro Recorder**: We do not playback raw mouse movements or timings.

---

## SECTION 12 — CURRENT STATUS & ROADMAP

### v1.0.0 Stable (Current)
- **Spatial Flow Editor**: Hardware-accelerated infinite canvas with real-time state synchronization.
- **Semantic Element Resolution**: Hybrid MAWS (Multi-Attribute Weighted Scoring) engine with Zero-Code constraints.
- **TAF 2.0 Engine**: Tiered Trace, Analysis, and Feedback for deterministic explainability.
- **Isolated AI Architecture**: 4 specialized read-only AI roles (Translator, Investigator, Stability Advisor, Companion).
- **Data-Driven Scenarios**: Fully isolated parameter injection for CSV-based regression testing.

### roadmap
- **Cloud Grid Integration**: Scaling test execution to remote clusters.
- **API Block Layer**: Unified testing for visual and non-visual endpoints.
- **Advanced Flow Composition**: Nested flows and modular templates.


---

## SECTION 14 — AI ARCHITECTURE (READ-ONLY)

WebLens integrates AI as an advisory layer, strictly decoupled from the deterministic execution engine. AI is distributed across four isolated roles:

### 1. The Translator (Drafting)
Converts natural language intent into a non-runnable **Draft Flow**. It prioritizes user intent but leaves all semantic picking to the user.

### 2. The Investigator (Root Cause)
Analyzes TAF evidence after a failure. It identifies likely causes by correlating logs and screenshots without proposing code-based fixes.

### 3. The Stability Advisor (Pattern Matching)
Compares multiple execution runs to identify flakiness, drift, or systematic regressions across different environments.

### 4. The Companion (Interactive Help)
Provides real-time, context-aware assistance within the Editor, answering platform-specific questions using the WebLens Manifesto as a source of truth.

---

## SECTION 15 — HOW TO USE THIS README

This README serves as the canonical reference for the WebLens platform. 
1. **New Features**: Any new block or system must respect the philosophies of Semantic Intent and Determinism.
2. **Maintenance**: Guardrails (like the validation gate) must never be weakened to allow "quick fixes."
3. **Documentation**: All feature documentation should link back to these core sections to ensure consistency.

---
*Last Updated: December 2025 | WebLens v1.0.0 Stable Release*
