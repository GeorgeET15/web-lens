# Manual Regression Test Plan: InspectorService & AI

## 1. Inspector Service Regression
**Goal**: Verify the new `InspectorService` singleton architecture correctly handles identifying, attaching, and managing the Selenium driver.

### 1.1 Live Inspector Lifecycle
- [ ] **Start Inspector**:
    - **Action**: Click "Pick Element" in the Flow Editor.
    - **Expected**: Chrome window opens to the target URL. WebSocket status in UI goes green/connected.
- [ ] **Picking**:
    - **Action**: Click an element in the opened Chrome window.
    - **Expected**: The element is highlighted in the Chrome window, and the selection immediately appears in the WebLens UI (via WebSocket broadcast).
- [ ] **Stop/Close**:
    - **Action**: Close the Chrome window manually.
    - **Expected**: WebLens UI detects the closure (after a brief poll) and updates status to "Disconnected".

### 1.2 Concurrency / Re-connection
- [ ] **Multiple Tabs (Same User)**:
    - **Action**: Open WebLens in two separate browser tabs (Tab A and Tab B).
    - **Action**: Start Inspector in Tab A.
    - **Action**: Switch to Tab B.
    - **Expected**: Tab B should show the Inspector as "Connected" (or allow connecting to the existing session). Both tabs should receive "Picked Element" events if you pick something.
    - **Note**: The backend is a *Singleton*. There is only one active Inspector Driver. It should broadcast to all connected WebSocket clients.
- [ ] **Resync**:
    - **Action**: Reload the page in the Inspector Chrome window (wiping the injected JS).
    - **Action**: Click "Resync" in the WebLens Inspector Modal.
    - **Expected**: "Resync successful" toast. Picking validation resumes working.

### 1.3 Embedded Browser (Headless Mode)
- [ ] **Snapshot Generation**:
    - **Action**: Open the "Embedded Browser" tab (if enabled) or use an AI feature that requires a snapshot.
    - **Expected**: Backend correctly starts a headless instance (if not already running) and returns a screenshot.

## 2. AI Features (End-to-End)
**Goal**: Ensure the AI endpoints (refactored to `api.ts`) correctly communicate with the backend.

### 2.1 "Ask WebLens AI" (Element Level)
- [ ] **Trigger**:
    - **Action**: Pick an element (e.g., a button).
    - **Action**: Click the "Ask AI" button in the Element Picker.
    - **Input**: "What does this button do?"
    - **Expected**: AI analyzes the HTML/Screenshot context and returns a sensible text description.

### 2.2 Flow Generation (Magic Wand)
- [ ] **Generation**:
    - **Action**: Use the "Magic Wand" / AI Input at the top of the editor.
    - **Prompt**: "Go to example.com and verify the title is 'Example Domain'".
    - **Expected**: A valid flow with `Open Page` and `Verify Page Title` blocks is generated and added to the canvas.

### 2.3 Execution Analysis (Insight Panel)
- [ ] **Analyze Failure**:
    - **Action**: Run a flow that is destined to fail (e.g., Verify Title "Wrong").
    - **Action**: Click the failed block in the report.
    - **Action**: Click "Ask WebLens AI for Summary".
    - **Expected**: AI returns a diagnosis of *why* it failed (e.g., "Expected 'Wrong' but found 'Example Domain'").

## 3. General Frontend Regression
**Goal**: Verify the API refactor didn't break core CRUD.

- [ ] **Login/Signup**: Log out and log back in.
- [ ] **Save Flow**: Create a dummy flow and save it. Reload page to ensure persistence.
- [ ] **Delete Execution**: Run a flow, then delete the execution record from the list.
