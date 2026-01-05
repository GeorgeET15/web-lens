# Strategic Roadmap — WebLens

This roadmap outlines the long-term technical and product vision for WebLens. Every enhancement is evaluated against the non-negotiable principles of **Zero-Code**, **Deterministic Execution**, and **Explainability**.

---

## I. FEATURE CATEGORIZATION & EVALUATION

### 1. Core Enhancements
*Reinforces existing philosophy and increases base reliability.*

- **Deterministic "Smart Wait"**: Implement logic to automatically wait for animations and network idle *before* resolution.
- **Shadow DOM Support**: Ensure the inspector and resolver can bridge into web component boundaries.
- **Proximity Anchors**: Extend semantic signatures to include relative landmarks (e.g., "Field labeled 'Email'").
- **Schema Versioning**: Implement migration layers for Flow JSON to ensure long-term durability of saved tests.
- **Live Snapping Guides**: Add visual feedback during drafting to communicate spatial logic constraints clearly.

### 2. Optional Premium Features
*Adds significant value for power users without increasing cognitive load.*

- **Minimap Navigation**: Interactive canvas overview for managing large, complex test suites.
- **Multi-Block Lasso**: Efficient bulk management (drag, copy, delete) for flow segments.
- **Immutable Share Links**: Direct, read-only access to specific TAF execution reports for collaboration.
- **Auto-Layout Engine**: A "Zero-Touch" organization tool that aligns blocks to a rigid tree-graph structure.
- **Environment Management**: Scoped variable sets (Staging vs. Production) that are injected at run-time.

### 3. High-Risk / Guarded Features
*Requires strict architectural constraints to prevent "Technical Leakage".*

- **Visual Regression (Pixel-Diffing)**: 
    - **Constraint**: Must be a per-block opt-in verification. 
    - **Philosophical Risk**: Can lead to "brittle" tests. Must be presented as a secondary verification, never the primary resolution signal.
- **Advanced Loops (For Each)**: 
    - **Constraint**: Must enforce a global iteration cap (e.g., max 50 cycles). 
    - **Risk**: Infinite execution loops.
- **Network Insights**: 
    - **Constraint**: Only display 4xx/5xx errors related to the active block's duration. 
    - **Risk**: Diluting the platform into a developer console.
- **Intent Plugin System**: 
    - **Constraint**: New blocks must be schema-validated and intent-first. No "Script Block" plugins allowed.

### 4. Defer / Do Not Implement
- **AI-Driven Flow Synthesis**: Violates "Explainability." Users must build the flow; WebLens must only execute it.
- **Auto-Healing of Selectors**: WebLens has no selectors. "Auto-healing" of semantic signatures risks false positives.
- **Keyboard Macros**: Raw input playback is non-deterministic and brittle.

---

## II. PHASED ROLLOUT PLAN

### Phase 1: UX & Clarity (Next 30 Days)
Focus on the drafting experience for large-scale flows.
- **Minimap**: Interactive overview.
- **Lasso Tool**: Bulk block management.
- **Live Snapping**: Visual feedback for logic connections.

### Phase 2: Reliability & Semantic Strength (Next 60 Days)
Deepen the resolution engine's ability to handle complex modern apps.
- **Shadow DOM Bridge**: Full component support.
- **Smart Wait**: Animation-aware execution.
- **Relative Anchors**: Multi-landmark semantic signatures.

### Phase 3: Insight & Collaboration (Next 90 Days)
Turn execution data into actionable team outcomes.
- **Shareable Reports**: Immutable links to TAF reports.
- **Environment Toggles**: Easy switching between target URLs.
- **Schema Migration**: Formal versioning of saved flows.

### Phase 4: Expansion (Optional / Post-90 Days)
Scaling execution beyond the desktop.
- **Headless CLI**: Execution in CI/CD environments.
- **Execution Heatmaps**: Identifying unstable app areas.

---

## III. PREMIUM DIFFERENTIATORS
*Features that provide a "Premium" feel without adding complexity.*

1. **Auto-Layout Engine**: The ability to build a messy flow and click "Align" to see it instantly transform into a perfect, professional tree-graph.
2. **The TAF "Time Machine"**: A slider in the Execution Explorer that lets you scrub through the screenshots of every block at 60fps.
3. **Semantic Anchoring**: The UI should feel like it "understands" the app, showing the user the specific role and name of every element as they hover in the inspector.

---

## IV. ARCHITECTURAL GUARANTEES (THE "NEVER" LIST)

- **NEVER** allow a user to type a CSS selector or XPath.
- **NEVER** "auto-run" a fix when a test fails. A failure is data; WebLens must report it honestly.
- **NEVER** turn WebLens into a developer tool. If it requires a console or a debugger, it has failed its Zero-Code mission.
- **NEVER** hide the reason for a block's behavior. Every decision made by the resolver must be fully documented in the TAF Analysis.
