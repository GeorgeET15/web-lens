# Future AI Feature Proposals for WebLens

WebLens uses AI to *assist* and *analyze*, not to *execute* (which remains deterministic). Here are proposals for the next wave of AI features:

## 1. Smart Assertions ("Natural Language Logic")
**Concept:** rigorous logic checks from plain English.
- **User Input:** "Verify the table is sorted by date descending."
- **AI Action:** Generates a loop block that scrapes the 'Date' column, parses timestamps, and asserts `row[i] > row[i+1]`.
- **Value:** Complex logic without complex block assembly.

## 2. Visual Semantic Diff ("Smart Eyes")
**Concept:** Ignore noise, flag real issues.
- **Problem:** Pixel-perfect diffs fail when a dynamic ad loads or a date changes.
- **AI Solution:** A vision model reviews before/after screenshots. It flags "Layout Broken" or "Button Missing" but ignores "Timestamp changed" or "Ad banner different".
- **Deterministic Check:** The AI *suggests* a baseline update; the user approves it.

## 3. Auto-Data Generation ("Synthetic Users")
**Concept:** Realistic test data on demand.
- **User Input:** "I need 50 users with valid varied US addresses and edge-case names."
- **AI Action:** Generates a CSV/JSON matrix attached to the flow.
- **Value:** fast setup for data-driven testing.

## 4. Accessibility (A11y) Copilot
**Concept:** Deep accessibility audits beyond basic contrast checks.
- **AI Action:** Analyzes the page structure for screen-reader logic. "This modal traps focus, but the 'Close' button is not reachable via keyboard."
- **Value:** Compliance and usability testing without deep expertise.

## 5. "Heal-Proposals" (Not Auto-Heal)
**Concept:** When a selector breaks, AI finds the new one but *asks permission*.
- **Workflow:** Test Fails -> AI analyzes DOM -> AI says: "It looks like `.btn-primary` became `.btn-new-style`. Update test?" -> User clicks "Yes".
- **Philosophy:** Keeps testing deterministic (code doesn't change mid-run) but makes maintenance instant.

## 6. Performance Anomaly Detection
**Concept:** Detecting "Slowness" before it becomes a timeout.
- **AI Action:** Analyzes trace logs over weeks. "The 'Checkout' step usually takes 200ms, but today it averaged 1.5s. Potential regression."

## Summary
These features keep the **"Human in the Loop"** for decisions but use **"AI for Draft & Analysis"** to speed up the work.
