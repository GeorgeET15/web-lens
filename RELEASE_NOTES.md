# Release Notes - WebLens v1.0.0

The first official release of **WebLens** — the deterministic, zero-code web testing engine.

## Key Features

### 🚀 Deterministic Execution
- **Zero-Code Contract**: No CSS selectors, XPath, or flaky IDs. Interaction is driven by semantic intent and visual regions.
- **SmartWait**: Automatic page stability detection ensures interactions happen only when the system is ready.
- **MAWS (Multi-Attribute Weighted Scoring)**: Robust element resolution that adapts to UI changes without breaking.

### 🔍 Inspector Authority
- **Live Interaction**: Select elements directly from a live browser session.
- **Semantic Metadata**: Elements are captured with roles, labels, and visual context, enabling durable test definitions.

### 📝 TAF Logging (Trace, Analysis, Feedback)
- **Clear Attribution**: Failures are automatically tagged with an owner (USER, APP, ENGINE, or SYSTEM).
- **Evidence-Rich**: Detailed traces and computed analysis for every step.

### 🤖 AI Advisory Layer
- **Flow Translation**: Draft flows from natural language descriptions.
- **Investigative Commentary**: Analytical summaries of test runs to aid debugging.
- **Non-Authoritative**: AI is strictly read-only and subordinated to human confirmation.

## Technical Improvements
- **Local-First Architecture**: High privacy and security with browser profile isolation.
- **Universal Packaging**: Standalone binary with embedded frontend and backend.
- **FastAPI Core**: High-performance streaming results for real-time monitoring.

## Installation
Refer to [INSTALL.md](file:///home/georgeet15/Desktop/web-lens/INSTALL.md) for platform-specific setup instructions.
