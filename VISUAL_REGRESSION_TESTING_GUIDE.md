# Testing Semantic Visual Regression - Step-by-Step Guide

## 🎯 What We're Testing

The new **Semantic Visual Verify** block that uses:
1. **Pixel-diff** for fast comparison (threshold-based)
2. **AI Saliency Advisor** for intelligent semantic analysis when pixel diff exceeds threshold

---

## 📋 Test Scenario 1: Create a Baseline

### Step 1: Open WebLens UI
1. Navigate to `http://localhost:5173` in your browser
2. You should see the WebLens Flow Editor

### Step 2: Create a Simple Flow
1. Click **"+ New Flow"** or open the Flow Editor
2. Add these blocks:
   - **Open Page**: `https://example.com`
   - **Semantic Visual Verify**: 
     - Threshold: `0.01` (1%)
     - Baseline: Leave **empty** for the first run

### Step 3: Run the Flow (Baseline Capture)
1. Click **"Run Flow"**
2. The flow will:
   - Open example.com
   - Capture a screenshot (this becomes your baseline)
   - Skip comparison (no baseline ID provided)
3. **Copy the Run ID** from the execution report (e.g., `abc123-def456-...`)

---

## 📋 Test Scenario 2: Verify Against Baseline (Should PASS)

### Step 1: Update the Flow
1. Edit the **Semantic Visual Verify** block
2. Set **Baseline ID** to the Run ID you copied
3. Keep threshold at `0.01`

### Step 2: Run Again
1. Click **"Run Flow"**
2. Expected Result:
   - ✅ **PASS** - The page hasn't changed, pixel diff should be ~0%
   - Check the execution logs for: `"Visual state stable (within threshold)"`

---

## 📋 Test Scenario 3: Test AI Saliency (Cosmetic Change)

### Step 1: Simulate a Minor Change
Since we can't easily modify example.com, let's test with a different approach:

1. Create a new flow with:
   - **Open Page**: `https://www.google.com`
   - **Semantic Visual Verify**: Baseline = (empty)
2. Run it to capture baseline
3. Copy the Run ID

### Step 2: Test with Same Page
1. Update baseline ID
2. Run again - should PASS with ~0% diff

### Step 3: Test with Different Page (Major Change)
1. Change **Open Page** URL to: `https://www.bing.com`
2. Keep the Google baseline ID
3. Run the flow
4. Expected Result:
   - ❌ **FAIL** - Pixel diff will be very high (>1%)
   - AI should analyze and return: `DECISION: FAIL` with explanation about significant changes

---

## 📋 Test Scenario 4: Verify AI Fallback Logic

### Manual Test with Backend Script
Run the verification script I created:

```bash
cd /home/georgeet15/Desktop/web-lens/backend
./venv/bin/python3 verify_visual_regression.py
```

Expected output:
```
✅ PASS: Minor diff within threshold
✅ PASS: Major diff exceeds threshold
✅ PASS: AI correctly distinguished between salient and non-salient changes
```

---

## 🔍 What to Look For

### In the Execution Report:
1. **Pixel Difference**: Check the logs for percentage (e.g., "Pixel Difference: 0.24%")
2. **AI Decision**: If diff > threshold, look for "AI Decision: PASS/FAIL"
3. **AI Explanation**: The reasoning behind the decision

### In the Flow Editor:
1. **Block UI**: Threshold slider (0-10%)
2. **Baseline Input**: Accepts Run IDs or URLs
3. **AI Notice**: "AI will perform semantic analysis if pixel difference exceeds threshold"

---

## 🎨 Advanced: Testing with Custom Images

If you want to test with controlled images:

1. Create two similar images (e.g., same page with minor color change)
2. Upload them to a public URL or use base64
3. Modify the baseline fetching logic to accept direct image URLs
4. Run visual verify with these controlled inputs

---

## 🐛 Troubleshooting

### "Baseline not found"
- Ensure the Run ID is correct
- Check that the baseline run completed successfully
- Verify the screenshot was captured (check execution report)

### "AI analysis failed"
- Check that `GEMINI_API_KEY` is set in `.env`
- Verify the AI service is enabled
- Check backend logs for detailed error messages

### Pixel diff always 0% or 100%
- Ensure images are the same size
- Check that screenshots are being captured correctly
- Verify Pillow is installed: `pip list | grep Pillow`

---

## ✅ Success Criteria

You've successfully tested the feature if:
1. ✅ Baseline capture works (no comparison on first run)
2. ✅ Identical pages pass with ~0% diff
3. ✅ Different pages trigger AI analysis
4. ✅ AI correctly distinguishes cosmetic vs functional changes
5. ✅ Threshold slider affects when AI is invoked

---

## 🚀 Next Steps

Once verified, you can:
- Integrate visual regression into your CI/CD pipeline
- Create baseline libraries for critical user flows
- Adjust thresholds based on your app's visual volatility
- Use AI explanations to understand UI changes over time
