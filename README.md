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
4. **Explainability & Transparency**: Every step provides visual and logical proof via the TAF (Trace–Analysis–Feedback) subsystem. The **Semantic Debugger** exposes internal scoring calculations to the developer.
5. **Active (Developer-Controlled) Healing**: While we reject hidden "auto-healing," WebLens provides **Active Healing**—a tool for developers to review UI drift and manually update test definitions with one click.

### Explicit NON-GOALS
- **No Cloud Default**: WebLens will NOT run tests in the cloud by default.
- **No Manual Selectors**: Users are forbidden from entering CSS or XPath selectors.
- **No "AI Mutation"**: We do not allow AI to automatically execute or mutate flows.
- **No Hidden Auto-Healing**: We reject probabilistic healing that hides regressions. All healing is intentional and logged.
- **No Multi-Tenant Accounts**: The application is a single-user local tool.
- **No Package-Manager Dependency**: Primary distribution is via native binaries, not `pip` or `npm` installs.

---

## SECTION 3 — SYSTEM ARCHITECTURE

- **/backend**: Python execution engine and semantic resolution logic.
- **/frontend**: React-based visual editor and dashboard.
- **/docs**: Canonical governance, architecture, and system specifications.
- **/launcher.py**: Central entry point for local execution and process management.

---

## SECTION 4 — SEMANTIC DEBUGGER & ACTIVE HEALING

### Semantic Debugger
WebLens provides complete transparency into how elements are resolved on the page. The **Semantic Debugger** exposes:

- **Top 5 Candidates**: See all elements that matched your semantic criteria, ranked by the Multi-Attribute Weighted Scoring (MAWS) engine.
- **Scoring Breakdown**: View exactly how much each attribute (Name, Role, Test ID, ARIA Label, etc.) contributed to the final score.
- **Performance Metrics**: Track resolution time and DOM complexity for each lookup.
- **Confidence Health**: Visual indicators show when UI drift is detected (scores below 0.7 trigger warnings).

**Use Cases**:
- **Debugging Failed Lookups**: When a test fails, the debugger shows what the engine *almost* matched, helping you understand why.
- **Optimizing Selectors**: See which semantic signals are most effective for your application.
- **Understanding Drift**: Compare expected vs. actual attributes to diagnose UI changes.

### Active Healing
When the Semantic Debugger detects UI drift (e.g., a button's text changed from "Submit" to "Send"), **Active Healing** allows you to:

1. **Review Changes**: A modal shows a side-by-side diff of expected vs. actual attributes.
2. **Select Attributes**: Choose which semantic signals to update (Name, Role, Test ID, etc.).
3. **Apply with One Click**: The flow definition is updated immediately, and the change is logged with an audit trail.

**Key Principles**:
- **Manual Control**: Healing is never automatic. You decide when and what to heal.
- **Transparency**: All changes are logged with timestamps and previous confidence scores.
- **Selective Updates**: You can choose to update only specific attributes (e.g., update the Name but keep the Role).

---

## SECTION 5 — BLOCK SYSTEM OVERVIEW

WebLens implements a library of immutable logic blocks, ensuring comprehensive coverage of web automation without technical hacks.

### Categories
- **Navigation**: Open Page, Refresh, Wait for Load.
- **Interaction**: Click, Type, Select, Scroll.
- **Logic**: If Condition, Repeat Until, Explicit Delay.
- **Verification**: Assert Visible, Verify Text, Network Check.

---

## SECTION 6 — DISTRIBUTION & UPDATES

### Distribution
WebLens is distributed exclusively via **GitHub Releases** as native installers/packages. 
- **Linux**: Primary support (.deb, .rpm, or standalone binaries).
- **Windows/macOS**: Planned for future releases.

### Updates
WebLens follows a manual update model. Users choose when to upgrade by downloading the latest release. There are no forced or background updates.

---

## SECTION 7 — LICENSE & LEGAL

WebLens is licensed under a proprietary agreement. 
- **Permitted**: Free use for any purpose (Personal, Commercial, Academic).
- **Prohibited**: Redistribution, modification, reverse engineering, or building competing products.

Refer to [LICENSE.txt](LICENSE.txt) for the full legal text.

---

*Last Updated: January 2026 | WebLens v1.0.0 Product-Verified Stable*
