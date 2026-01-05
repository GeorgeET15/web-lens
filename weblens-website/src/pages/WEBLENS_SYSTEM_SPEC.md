# WebLens Authoritative System Specification

## 1. Engine Specification

| Parameter | Actual Value | Source |
|----------|--------------|--------|
| Engine Version | `1.0.0` | `weblens.spec:116` |
| Compatibility | `ECMAScript 2022+` (Implied) | `resolution.py:16` (Uses `const`/`let`, template literals) |
| Global Timeout | NOT EXPLICITLY DEFINED IN CODE | `interpreter.py` (Block timeouts exist, no global limit seen) |
| Poll Frequency | Stability Check: **10hz** (100ms interval)<br>Resolution Retry: 0.5s - 2.0s sleep | `browser_engine.py:591` (Stability)<br>`interpreter.py:163-171` (Resolution) |
| Max Recursion Depth | NOT EXPLICITLY DEFINED IN CODE | `interpreter.py`, `models.py` (No recursion limit checks found) |
| Memory Cap | NOT EXPLICITLY DEFINED IN CODE | `interpreter.py` (No resource limits enforced) |

## 2. Deployment & Installation Model

- **Is there ANY npm-based install path?**
  - **No**. The root `package.json` defines a workspace but no publishable CLI package. `weblens.spec` bundles `frontend/dist`.
  - Source: `package.json:2`, `weblens.spec:28`

- **Is there ANY pip-based install path?**
  - **No**. No `setup.py` or `pyproject.toml` definition for a pip package found.
  - Source: `backend/` file listing

- **Canonical Launch Mechanism**:
  - `launcher.py` boots a local `uvicorn` server (backend) and launches Chrome in App Mode (`--app=...`).
  - Source: `launcher.py:289`, `launcher.py:78`

- **Headless Mode**:
  - `SeleniumEngine` supports `--headless`. It relies on standard Chrome headless.
  - Source: `browser_engine.py:216`

## 3. Semantic Resolution (MAWS Algorithm)

| Attribute | Weight / Logic | Source |
|---------|----------------|--------|
| **TestID** | `15` | `resolution.py:91` |
| **Name (Exact Match)** | `10` | `resolution.py:95` |
| **ARIA Label** | `8` | `resolution.py:100` |
| **Role Match** | `5` | `resolution.py:104` |
| **Name (Partial)** | `5` | `resolution.py:96` |
| **Proximity (<400px)** | `+5` (Bonus) | `resolution.py:141` |
| **Placeholder/Title** | `3` | `resolution.py:108` |
| **Tag Match** | `1` | `resolution.py:114` |

- **Ambiguity Threshold**: Candidates must score `> 5` to be considered.
  - Source: `resolution.py:116`
- **Ambiguity Handling**: `check_matches` returns `multiple_matches` error if count > 1.
  - Source: `resolution.py:231` (inside `JS_FIND_IN_REGION`), `resolution.py:152` (native sort) - *Correction*: Native MAWS sorts by score and picks top. `JS_FIND_IN_REGION` enforces strict uniqueness.

## 4. Trace Analysis Framework (TAF) — Real Log Schema

The actual serialization format used in `interpreter.py` (BlockExecution) differs from the documentation mock.

```json
{
  "run_id": "uuid-string",
  "block_id": "block-id",
  "block_type": "click_element",
  "status": "failed",
  "duration_ms": 124.5,
  "taf": {
    "trace": ["Clicking on 'Submit'"],
    "analysis": ["Executing a standard mouse click..."],
    "feedback": []
  },
  "screenshot": "base64_string_if_captured"
}
```
- Source: `interpreter.py:651` (BlockExecution model usage).
- Note: TAF messages are categorized lists (`trace`, `analysis`, `feedback`), not a flat event stream.

## 5. Evidence Vault — Actual Artifacts

| Artifact | Generated? | Details | Source |
|--------|------------|---------|--------|
| **Screenshot** | **Yes** | Captured on `WebLensFailure` or completion. Base64 string. | `interpreter.py:302`, `browser_engine.py:177` |
| **DOM Snapshot** | **Partial** | `get_snapshot` returns structured interactable elements list, NOT full HTML. | `browser_engine.py:793` |
| **Network Logs** | **Partial** | `get_network_traffic` exists but returns traffic list, not strictly a HAR file. | `browser_engine.py:161` |
| **HAR File** | **No** | No HAR generation logic found. | `browser_engine.py` |
| **Cryptographic Hash** | **No** | No hashing logic found in `failures.py` or `models.py`. | `failures.py`, `models.py` |

- **Shadow DOM**: Recursive search supported in `JS_FIND_SEMANTIC`.
  - Source: `resolution.py:121`

## 6. Engine Rules (Authoritative)

1.  **Strict Zero-Code Interpolation**: Variables `{{var}}` raise `VariableMissingError` if undefined. No loose typing.
    - Source: `interpreter.py:130`
2.  **Element Capability Checks**: Engine verifies capability (e.g. 'clickable') before action.
    - Source: `interpreter.py:236`
3.  **Prohibited Saved Values**: Saved values cannot be used for URLs, Control Flow, or Element Names (Evidence-Compatible Mode).
    - Source: `models.py:733-762`
4.  **Stability Guard**: Engine waits for `document.readyState`, `fonts.ready`, and visual stability (pixels not moving) before actions.
    - Source: `browser_engine.py:541`

## 7. Roadmap Reality Check

| Feature | Claimed Version | Actual Status | Source |
|-------|----------------|---------------|--------|
| **Flow Translator** | v1.1.0 | **NOT PRESENT IN CODE** | `backend/` scan |
| **Stability Analysis** | v1.2.0 | **PARTIALLY IMPLEMENTED** | `browser_engine.py:541` (wait_for_stability) exists, but standalone analysis module not seen. |
| **Post-Run Investigation** | Future | **NOT PRESENT IN CODE** | `backend/` scan |
| **Vision / Multi-modal** | v2.0.0 | **PARTIALLY IMPLEMENTED** | `backend/ai` folder exists (found in file list), indicating foundational work. |

- *Note*: Version numbers in `Docs.tsx` (e.g. v1.1.0) do not match the codebase version (v1.0.0).
