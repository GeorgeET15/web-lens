# WebLens v1.0.0: Local-First Visual Web Testing with AI Intelligence

WebLens is a professional-grade visual web testing application designed to run on your local machine with optional cloud-sync capabilities. It enables the creation, execution, and analysis of web tests without writing code, leveraging AI for intent-based flow generation and resilient element resolution.

> [!IMPORTANT]
> WebLens is **FREE TO USE** but **NOT OPEN SOURCE**. It is a proprietary application.

---

## SECTION 1 — PRODUCT POSTURE

- **Local-First Architecture**: Your primary data remains local. Optional **Cloud-Sync (Supabase)** allows persisting flows and executions across devices.
- **AI-Powered (Genie)**: Natural language "Intent to Flow" generation ensures you can build complex test cases by simply describing your goals.
- **Privacy & Ownership**: Your interaction signatures and visual evidence stay in your controlled environment.
- **Proprietary & Free**: WebLens is free for personal, educational, and commercial use. Refer to [LICENSE.txt](LICENSE.txt).

---

## SECTION 2 — CORE PHILOSOPHY

1. **Semantic Intent**: Interactions are defined by accessible meaning (e.g., "Click Login"), making them resilient to UI layout changes.
2. **Deterministic Execution**: Tests run exactly as defined. If a path is ambiguous, the system requests clarification or fails explicitly.
3. **Active Healing**: Detects UI drift and provides a developer-controlled workflow to update test definitions with one click.
4. **Explainability**: The **TAF (Trace–Analysis–Feedback)** subsystem provides complete visual and logical proof for every action.
5. **No "Magic" Fallbacks**: We reject hidden AI guessing. All AI suggestions (Healing or Generation) are user-reviewed and approved.

---

## SECTION 3 — FEATURE HIGHLIGHTS

### 🧞 Genie AI (Intent-to-Flow)
Build tests using natural language. Genie understands your intent, suggests block sequences, and handles variable injection (`{{variable_name}}`) automatically. Features include:
- **Multi-Turn Chat**: Refine your flow through conversation.
- **Context Awareness**: Genie knows your global and environment variables.
- **Manual Approval**: Review and "Add to Flow" ensures total developer control.

### 🔄 Smart Flow Management
- **Cloud-Synced Tracking**: Flows are strictly sorted by `Last Loaded` (recency), synced to the backend to preserve your workspace order.
- **Unified Storage**: Seamlessly manage local and cloud-synced flows in a single sorted view.

### 🛡️ Semantic Debugger & Active Healing
Complete transparency into element resolution. View MAWS (Multi-Attribute Weighted Scoring) in real-time and heal UI drift with a single click after reviewing side-by-side diffs.

---

## SECTION 4 — SYSTEM ARCHITECTURE

- **/backend**: Python execution engine, MAWS resolution logic, and AI service layer (Gemini).
- **/frontend**: React-based visual editor with indigo-themed AI integration.
- **/docs**: Specifications and architecture governance.
- **/launcher.py**: Local entry point for services.

---

## SECTION 5 — DISTRIBUTION & UPDATES

WebLens is distributed via **GitHub Releases**. Updates are manual, giving you full control over your testing environment version.

- **Current Version**: v1.0.0
- **Supported Platforms**: Linux (Native), Standalone Binaries.

---

## SECTION 6 — LICENSE & LEGAL

Licensed under [LICENSE.txt](LICENSE.txt). 
- Permitted: Free use for any purpose.
- Prohibited: Redistribution, modification, or reverse engineering.

---

*Last Updated: January 2026 | WebLens v1.0.0 Feature-Complete Stable*

