# WebLens v1 Invariants

**Version**: 1.0.0  
**Status**: FROZEN  
**Last Updated**: 2025-12-29

---

## PURPOSE

This document defines the **immutable guarantees** of WebLens v1. These invariants MUST NOT change in any v1.x release. Violations of these invariants constitute a breaking change and require a major version bump (v2.0.0).

---

## SECTION 1 — ZERO-CODE CONTRACT

### Invariant 1.1: No Manual Selectors
**Rule**: Users are FORBIDDEN from entering CSS, XPath, or any technical selector syntax.

**Rationale**: WebLens's core value proposition is semantic intent. Exposing selectors would undermine this philosophy and create brittle tests.

**Enforcement**:
- No text input fields accept selector syntax
- No "Advanced" or "Custom Selector" modes
- No escape hatches to raw WebDriver commands

**Allowed in v1.x**: Bug fixes to semantic resolution logic  
**NOT Allowed in v1.x**: Adding a "CSS Selector" field to any block

---

### Invariant 1.2: No Code Blocks
**Rule**: There is NO "Custom Script" block, "JavaScript Executor" block, or any mechanism to inject arbitrary code.

**Rationale**: The Zero-Code constraint is absolute. Allowing code blocks would create a two-tier system where power users bypass the semantic layer.

**Enforcement**:
- Block palette contains ONLY predefined block types
- No eval() or script injection capabilities
- No "Advanced Mode" that reveals code

**Allowed in v1.x**: New predefined block types (if semantically sound)  
**NOT Allowed in v1.x**: A block that accepts JavaScript as a parameter

---

### Invariant 1.3: Semantic Element Capture
**Rule**: Element picking captures ONLY semantic properties (role, accessible name, region, structural intent). Never CSS/XPath selectors.

**Rationale**: Semantic signatures are resilient to layout changes. Selectors are brittle.

**Enforcement**:
- `ElementRef` model contains: `role`, `name`, `testId`, `ariaLabel`, `region`, `structuralIntent`
- `ElementRef` model NEVER contains: `cssSelector`, `xpathSelector`, `querySelector`

**Allowed in v1.x**: Adding new semantic properties (e.g., `ariaDescription`)  
**NOT Allowed in v1.x**: Storing raw selectors in `ElementRef`

---

## SECTION 2 — DETERMINISTIC EXECUTION GUARANTEES

### Invariant 2.1: Single-Threaded Flow Execution
**Rule**: Flows execute block-by-block in a strict sequential order. No parallelization within a single flow.

**Rationale**: Determinism requires predictable execution order. Parallel execution introduces race conditions.

**Enforcement**:
- Interpreter uses a single-threaded event loop
- Blocks execute synchronously (await completion before next block)
- No "Run in Parallel" block type

**Allowed in v1.x**: Performance optimizations that preserve execution order  
**NOT Allowed in v1.x**: Parallel block execution

---

### Invariant 2.2: Honest Failure (No AI Guessing)
**Rule**: If an element cannot be resolved with high confidence, the test FAILS explicitly. No heuristic fallbacks or "best guess" logic.

**Rationale**: False positives mask regressions. Honest failures provide actionable feedback.

**Enforcement**:
- Resolution logic returns a single match or fails
- No "Did you mean?" suggestions that auto-apply
- No probabilistic element selection

**Allowed in v1.x**: Improving resolution accuracy (stricter matching)  
**NOT Allowed in v1.x**: Fuzzy matching that auto-selects "close enough" elements

---

### Invariant 2.3: No Partial Execution
**Rule**: Flows that are structurally invalid or have missing configurations are BLOCKED from starting.

**Rationale**: Partial execution creates ambiguous states. The validation gate ensures only complete flows run.

**Enforcement**:
- Validation gate checks: connectivity, parameter completeness, loop safety
- Invalid flows cannot be sent to `/api/execute`
- No "Run Anyway" override button

**Allowed in v1.x**: Stricter validation rules  
**NOT Allowed in v1.x**: Allowing incomplete flows to execute

---

## SECTION 3 — SAVED VALUES RESTRICTIONS

### Invariant 3.1: Evidence-Compatible Usage Only
**Rule**: Saved Values (variables) can ONLY be used in blocks that produce evidence (e.g., `EnterText`, `VerifyText`). They CANNOT be used in control flow or navigation.

**Rationale**: Control flow decisions must be deterministic and inspectable. Variable-driven branching would make flows opaque.

**Enforcement**:
- `IfConditionBlock` does NOT accept variable interpolation in conditions
- `OpenPageBlock` URL field does NOT accept variables
- `RepeatUntilBlock` condition does NOT accept variables

**Allowed in v1.x**: Using variables in `EnterText`, `VerifyText`, `VerifyPageContent`  
**NOT Allowed in v1.x**: Using variables in `If` conditions or `OpenPage` URLs

---

### Invariant 3.2: Strict Interpolation (Fail on Missing)
**Rule**: If a block references a variable that doesn't exist, execution FAILS immediately.

**Rationale**: Silent fallbacks (e.g., empty string) hide bugs. Explicit failures surface configuration errors.

**Enforcement**:
- Variable resolver throws error if key not found
- No default values or "undefined" placeholders

**Allowed in v1.x**: Better error messages for missing variables  
**NOT Allowed in v1.x**: Auto-substituting empty strings for missing variables

---

## SECTION 4 — SCENARIO ISOLATION

### Invariant 4.1: Independent Scenario Execution
**Rule**: Each scenario in a suite executes in a fresh browser context. No state leakage between scenarios.

**Rationale**: Scenarios must be independent to avoid cascading failures.

**Enforcement**:
- New browser session per scenario
- Cookies/localStorage cleared between scenarios
- No shared global state

**Allowed in v1.x**: Performance optimizations (e.g., browser pooling) that preserve isolation  
**NOT Allowed in v1.x**: Reusing browser sessions across scenarios

---

### Invariant 4.2: Immutable CSV Schema
**Rule**: Scenario CSV format is LOCKED. Columns must match global variables exactly.

**Rationale**: Schema changes would break existing scenario files.

**Enforcement**:
- CSV validation rejects mismatched columns
- No auto-adding or auto-removing columns

**Allowed in v1.x**: Better error messages for schema mismatches  
**NOT Allowed in v1.x**: Auto-fixing CSV schemas

---

## SECTION 5 — TAF EXPLAINABILITY REQUIREMENTS

### Invariant 5.1: Immutable Execution Artifacts
**Rule**: Once a test is run, its screenshots, logs, and TAF entries are IMMUTABLE. They cannot be edited or deleted by users.

**Rationale**: Execution artifacts are the source of truth for debugging. Mutability would undermine trust.

**Enforcement**:
- Execution reports stored as read-only JSON
- No "Edit Report" or "Delete Screenshot" buttons
- Artifacts persisted to immutable storage

**Allowed in v1.x**: Archiving old reports (entire report, not selective)  
**NOT Allowed in v1.x**: Allowing users to modify execution logs

---

### Invariant 5.2: Per-Block Evidence
**Rule**: Every executed block MUST produce a TAF entry with: timestamp, status, screenshot, and resolution metadata.

**Rationale**: Explainability requires granular evidence. Skipping blocks or batching evidence would reduce debuggability.

**Enforcement**:
- Interpreter captures evidence after each block
- No "Skip Screenshot" optimization flag

**Allowed in v1.x**: Compressing screenshots for storage efficiency  
**NOT Allowed in v1.x**: Skipping screenshots for "fast mode"

---

## SECTION 6 — FLOW JSON SCHEMA

### Invariant 6.1: Schema Version Pinning
**Rule**: Flow JSON schema is versioned. v1.x flows use schema version `"1"`.

**Rationale**: Schema versioning enables future migrations without breaking old flows.

**Enforcement**:
- Flow JSON includes `"schemaVersion": "1"` field
- Backend rejects flows with unknown schema versions

**Allowed in v1.x**: Additive schema changes (new optional fields)  
**NOT Allowed in v1.x**: Removing or renaming existing fields

---

### Invariant 6.2: Lossless Persistence
**Rule**: Save/Load operations are LOSSLESS. Every property in the Flow JSON is persisted exactly.

**Rationale**: Users must trust that their flows are saved completely. Lossy persistence would cause silent data loss.

**Enforcement**:
- No "derived" or "computed" fields in JSON (all explicit)
- Load operation reconstructs exact editor state

**Allowed in v1.x**: Adding new fields (with defaults for old flows)  
**NOT Allowed in v1.x**: Dropping fields during save

---

## SECTION 7 — SEMANTIC RESOLUTION RULES

### Invariant 7.1: Multi-Attribute Weighted Scoring (MAWS)
**Rule**: Element resolution uses a weighted scoring algorithm based on: `testId`, `name`, `ariaLabel`, `role`, `placeholder`, `title`, `tagName`.

**Rationale**: MAWS provides deterministic, explainable resolution. Changing the algorithm would alter test behavior.

**Enforcement**:
- Resolution logic in `resolution.py` uses fixed scoring weights
- Threshold for "high confidence" is fixed

**Allowed in v1.x**: Bug fixes that preserve scoring behavior  
**NOT Allowed in v1.x**: Changing score weights or threshold

---

### Invariant 7.2: Structural Intent as Last Resort
**Rule**: Structural intent (e.g., "Cart Icon", "Hamburger Menu") is used ONLY when semantic signals are absent. It is NOT a first-class resolution strategy.

**Rationale**: Structural intent is fragile. It should be a fallback, not a default.

**Enforcement**:
- Structural resolver is invoked only after semantic resolution fails
- TAF warnings are shown for structural intent usage

**Allowed in v1.x**: Improving structural intent accuracy  
**NOT Allowed in v1.x**: Prioritizing structural intent over semantic signals

---

## SECTION 8 — VALIDATION GATE

### Invariant 8.1: Pre-Execution Validation
**Rule**: ALL flows must pass validation before execution. No "Run Anyway" bypass.

**Rationale**: The validation gate enforces completeness and prevents runtime errors.

**Enforcement**:
- `/api/execute` endpoint rejects invalid flows
- Validation checks: connectivity, parameter completeness, loop safety

**Allowed in v1.x**: Adding new validation rules  
**NOT Allowed in v1.x**: Removing existing validation checks

---

## SECTION 9 — BLOCK SEMANTICS

### Invariant 9.1: Block Type Stability
**Rule**: Existing block types CANNOT have their semantics changed. New blocks can be added, but old blocks must behave identically.

**Rationale**: Changing block behavior would break existing flows.

**Enforcement**:
- `ClickElementBlock` always performs a single click (no double-click mode)
- `EnterTextBlock` always clears field first (unless `clear_first=false`)

**Allowed in v1.x**: Adding new block types  
**NOT Allowed in v1.x**: Changing how `ClickElement` behaves

---

### Invariant 9.2: No Expression Logic
**Rule**: Block parameters accept ONLY literal values or variable references. No expressions (e.g., `{{var1 + var2}}`).

**Rationale**: Expressions introduce complexity and reduce explainability.

**Enforcement**:
- Text fields accept: `"Hello"` or `{{username}}`
- Text fields reject: `{{firstName + " " + lastName}}`

**Allowed in v1.x**: Simple variable substitution  
**NOT Allowed in v1.x**: Arithmetic, string concatenation, or conditional expressions

---

## SECTION 10 — CHANGE CONTROL SUMMARY

### What is ALLOWED in v1.x:
✅ Bug fixes that preserve semantics  
✅ Performance optimizations with identical behavior  
✅ Documentation updates  
✅ UI polish (colors, spacing) without changing functionality  
✅ New block types (if semantically sound)  
✅ Additive schema changes (new optional fields)

### What is NOT ALLOWED in v1.x:
❌ Changing execution order  
❌ Adding selector-based logic  
❌ Partial execution  
❌ Expression logic in block parameters  
❌ AI healing or guessing  
❌ Removing validation checks  
❌ Changing block semantics  
❌ Breaking schema changes

---

## ENFORCEMENT

This document is the CONTRACT between WebLens v1 and its users. Any violation of these invariants in a v1.x release is considered a CRITICAL BUG and must be reverted immediately.

For questions or clarifications, refer to:
- `README.md` (Core Philosophy)
- `ARCHITECTURE.md` (Technical Implementation)
- `CHANGE_POLICY.md` (Release Guidelines)

---

**END OF INVARIANTS DOCUMENT**
