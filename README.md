# WebLens v1.0.0: Local-First Visual Web Testing Application

WebLens is a free, professional-grade visual web testing application designed to run entirely on your local machine. It enables the creation, execution, and analysis of web tests without writing code, prioritizing semantic intent, deterministic execution, and complete explainability.

> [!IMPORTANT]
> WebLens is **FREE TO USE** but **NOT OPEN SOURCE**. It is a proprietary local application. 

---

## SECTION 1 — PRODUCT POSTURE

- **Local-First**: All test flows, traces, and execution data are stored and processed on your machine.
- **No Accounts**: No sign-up, login, or cloud dependency required.
- **Privacy by Design**: No telemetry is collected by default. Your interaction signatures and visual evidence never leave your environment.
- **Proprietary & Free**: WebLens is free for personal, educational, and commercial use under the [LICENSE.txt](LICENSE.txt). Redistribution or modification of the source code is prohibited.

---

## SECTION 2 — CORE PHILOSOPHY & NON-GOALS

### Guiding Rules
1. **Semantic Intent**: Interactions are defined by their accessible meaning (e.g., "Click Search"), making them resilient to layout changes.
2. **Deterministic Execution**: Tests must run the same way every time. If a flow is incomplete, it cannot run.
3. **Honest Failure**: WebLens does not perform "AI guessing" or hidden fallbacks. If an element cannot be found with high confidence, the test fails explicitly.
4. **Explainability**: Every step must provide visual and logical proof of its outcome via the TAF (Trace–Analysis–Feedback) subsystem.

### Explicit NON-GOALS
- **No Cloud Default**: WebLens will NOT run tests in the cloud by default or require a cloud connection for core functionality.
- **No Manual Selectors**: Users are forbidden from entering CSS or XPath selectors.
- **No "AI Mutation"**: We do not allow AI to automatically execute or mutate flows. AI is for commentary and drafting only.
- **No Auto-Healing**: We reject probabilistic "auto-healing" that hides regressions. Failures are reported as factual deviations.
- **No Multi-Tenant Accounts**: The application is a single-user local tool.
- **No Package-Manager Dependency**: Primary distribution is via native binaries, not `pip` or `npm` installs.

---

## SECTION 3 — SYSTEM ARCHITECTURE

- **/backend**: Python execution engine and semantic resolution logic.
- **/frontend**: React-based visual editor and dashboard.
- **/docs**: Canonical governance, architecture, and system specifications.
- **/launcher.py**: Central entry point for local execution and process management.

---

## SECTION 4 — BLOCK SYSTEM OVERVIEW

WebLens implements a library of immutable logic blocks, ensuring comprehensive coverage of web automation without technical hacks.

### Categories
- **Navigation**: Open Page, Refresh, Wait for Load.
- **Interaction**: Click, Type, Select, Scroll.
- **Logic**: If Condition, Repeat Until, Explicit Delay.
- **Verification**: Assert Visible, Verify Text, Network Check.

---

## SECTION 5 — DISTRIBUTION & UPDATES

### Distribution
WebLens is distributed exclusively via **GitHub Releases** as native installers/packages. 
- **Linux**: Primary support (.deb, .rpm, or standalone binaries).
- **Windows/macOS**: Planned for future releases.

### Updates
WebLens follows a manual update model. Users choose when to upgrade by downloading the latest release. There are no forced or background updates.

---

## SECTION 6 — LICENSE & LEGAL

WebLens is licensed under a proprietary agreement. 
- **Permitted**: Free use for any purpose (Personal, Commercial, Academic).
- **Prohibited**: Redistribution, modification, reverse engineering, or building competing products.

Refer to [LICENSE.txt](LICENSE.txt) for the full legal text.

---

*Last Updated: January 2026 | WebLens v1.0.0 Product-Verified Stable*
