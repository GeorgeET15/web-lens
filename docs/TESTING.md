# How to Test the Visual Web Testing Platform

## Quick Start

### 1. Start the Backend

```bash
cd backend
source venv/bin/activate  # or: venv\Scripts\activate on Windows
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend should start at `http://localhost:8000`

### 2. Start the Frontend

In a new terminal:

```bash
cd visual-web-testing-frontend
npm run dev
```

The frontend should start at `http://localhost:5173`

### 3. Open the Application

Open your browser and navigate to `http://localhost:5173`

---

## Testing the Visual Editor

### Building a Test Flow

1. **Look at the left panel** - This is the Blockly visual editor
2. **Click on the categories** in the toolbox:
   - **Navigation** - Contains "Open page" block
   - **Interaction** - Contains "Click" and "Enter text" blocks
   - **Verification** - Contains "Wait for element" and "Verify element" blocks
   - **Logic** - Contains "If element" and "Repeat until" blocks

3. **Drag blocks** from the toolbox to the workspace
4. **Connect blocks** by snapping them together vertically

### Example Test Flow to Build

Create a simple login test:

1. Drag **"Open page"** block
   - Set URL to: `https://example.com`

2. Drag **"Enter text"** block and connect below
   - Field: `username`
   - Identifier: `#username`
   - Text: `testuser`

3. Drag **"Click"** block and connect below
   - Element: `login button`
   - Identifier: `#login-btn`

4. Drag **"Verify element is visible"** block and connect below
   - Element: `success message`
   - Identifier: `.success`

---

## Testing Execution

### Run a Test

1. **Click "Run Test"** button in the top bar
2. **Watch the right panel** - Execution timeline will show:
   - Real-time events as they occur
   - Timestamps for each step
   - Success/failure indicators

3. **Watch the left panel** - Blockly blocks will highlight:
   - **Blue glow** = Currently executing
   - **Green border** = Successfully completed
   - **Red border** = Failed

### What to Expect

- Events stream in real-time from the backend
- Each block highlights as it executes
- Timeline shows human-readable messages (no technical jargon)
- Status indicator shows: Ready  Running  Completed/Failed

---

## Testing Features

### 1. Block Highlighting

**Test:** Run a flow and observe block highlighting

**Expected:**
- Only one block glows blue at a time (active)
- Completed blocks turn green
- Failed blocks turn red
- Highlighting clears when you run a new test

### 2. Real-Time Events

**Test:** Watch the timeline while test runs

**Expected:**
- Events appear immediately as they occur
- Timestamps are accurate
- Messages are in plain English
- No code or technical details visible

### 3. Responsive Layout

**Test:** Resize your browser window

**Expected:**
- **Desktop (>1024px)**: Editor on left, timeline on right (side-by-side)
- **Mobile (<1024px)**: Editor on top, timeline on bottom (stacked)
- Layout switches smoothly when resizing

### 4. Flow Export

**Test:** Build a flow and click "Export Flow"

**Expected:**
- Downloads a JSON file
- File contains Flow JSON matching backend schema
- Can be used with backend API directly

### 5. Error Handling

**Test:** Create a flow that will fail (e.g., verify non-existent element)

**Expected:**
- Timeline shows error message in plain English
- Failed block highlighted in red
- Status shows "Failed"
- Error banner appears at bottom

---

## Testing with Sample Flows

### Using Pre-built Examples

The `examples/` directory contains sample flows:

1. **login-test.json** - Simple login flow
2. **conditional-flow.json** - If/else logic
3. **repeat-until.json** - Loop example

**To test:**
1. Open a sample JSON file
2. Copy the contents
3. Use the backend API directly:

```bash
curl -X POST http://localhost:8000/api/execute/start \
  -H "Content-Type: application/json" \
  -d @examples/login-test.json
```

---

## Troubleshooting

### Backend Issues

**Backend won't start:**
```bash
# Check if port 8000 is in use
lsof -i :8000

# Install dependencies
cd backend
pip install -r requirements.txt
```

**No events streaming:**
- Check browser console for errors
- Verify backend is running at `http://localhost:8000`
- Check CORS settings in `backend/main.py`

### Frontend Issues

**Frontend won't start:**
```bash
# Install dependencies
npm install

# Clear cache and restart
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Blocks not highlighting:**
- Check browser console for errors
- Verify event metadata includes `block_id`
- Check that blocks are properly connected

**Layout issues:**
- Clear browser cache
- Check responsive breakpoint (1024px)
- Inspect CSS in DevTools

---

## Advanced Testing

### Testing Backend API Directly

**Start execution:**
```bash
curl -X POST http://localhost:8000/api/execute/start \
  -H "Content-Type: application/json" \
  -d '{
    "flow": {
      "name": "Test Flow",
      "entry_block": "block_1",
      "blocks": [...]
    },
    "headless": true
  }'
```

**Stream events (SSE):**
```bash
curl -N http://localhost:8000/api/execute/stream/{run_id}?flow_json=...
```

**Get status:**
```bash
curl http://localhost:8000/api/execute/status/{run_id}
```

### Testing with Real Websites

**Safe test sites:**
- `https://example.com` - Simple static page
- `https://httpbin.org/forms/post` - Form testing
- `https://the-internet.herokuapp.com/` - Various test scenarios

**Note:** Always test responsibly and respect robots.txt

---

## What to Look For

###  Good Signs

- Blocks highlight smoothly
- Events appear in real-time
- No technical jargon in UI
- Layout responds to window size
- Error messages are clear
- Timeline auto-scrolls

###  Red Flags

- Blocks don't highlight
- Events delayed or missing
- Technical errors shown to user
- Layout broken on mobile
- Crashes or freezes
- Stack traces visible

---

## Demo Scenarios

### Scenario 1: Happy Path
1. Build simple 3-block flow
2. Run test
3. Watch blocks highlight
4. Verify all green

### Scenario 2: Error Handling
1. Build flow with invalid selector
2. Run test
3. Watch it fail gracefully
4. Verify error message is clear

### Scenario 3: Conditional Logic
1. Use "If element" block
2. Add then/else branches
3. Run test
4. Verify correct branch executes

### Scenario 4: Loop
1. Use "Repeat until" block
2. Set max iterations
3. Run test
4. Watch loop iterations in timeline

---

## Performance Testing

**Test:** Run a flow with 10+ blocks

**Expected:**
- Highlighting keeps up with execution
- Timeline doesn't lag
- Memory usage stays reasonable
- No visual glitches

---

## Browser Compatibility

**Test in:**
- Chrome (primary)
- Firefox
- Safari
- Edge

**Expected:**
- All features work
- Highlighting visible
- Layout responsive
- Events stream correctly

---

## Questions to Answer

1.  Do blocks highlight in real-time?
2.  Are events human-readable?
3.  Does layout work on mobile?
4.  Can you build a flow visually?
5.  Does execution work end-to-end?
6.  Are errors handled gracefully?
7.  Is the UI clean and simple?
8.  No code visible anywhere?

---

## Getting Help

**Check logs:**
- Backend: Terminal running uvicorn
- Frontend: Browser DevTools Console
- Network: Browser DevTools Network tab

**Common issues:**
- CORS errors  Check backend CORS settings
- 404 errors  Verify backend is running
- Blank screen  Check browser console
- No highlighting  Verify block IDs match

---

## Success Criteria

The platform is working correctly if:

1.  You can build a test flow visually
2.  Clicking "Run Test" executes the flow
3.  Blocks highlight as they execute
4.  Timeline shows real-time events
5.  Layout is responsive
6.  No technical details visible
7.  Errors are user-friendly
8.  Everything feels smooth and polished

---

## Next Steps After Testing

Once basic testing is complete:

1. **Add more block types** - Extend the visual vocabulary
2. **Add flow persistence** - Save/load flows
3. **Add screenshots** - Capture execution screenshots
4. **Add scheduling** - Run tests on schedule
5. **Add reporting** - Generate test reports
6. **Add collaboration** - Share flows with team

---

**Happy Testing! **
