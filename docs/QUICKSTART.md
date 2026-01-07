# WebLens v1.0.0 Quick Start Guide

WebLens is a local-first application. You can run the entire system on your machine using the provided launcher or by starting the backend and frontend separately.

## 1. Quick Setup (using Launcher)

The easiest way to start WebLens is using the `launcher.py` script.

```bash
# From the repository root
python3 launcher.py
```

This will automatically build and start both the backend (Port 8000) and the frontend (Port 8080).

---

## 2. Advanced: Manual Development Setup

### Backend (Python/FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend (React/Vite)
```bash
cd weblens-website
npm install
npm run dev -- --port 8080
```

---

## 3. Example Flow Structure (Semantic Intent)

WebLens uses **Semantic Element Capture** instead of CSS/XPath selectors. Below is a compliant Flow JSON:

```json
{
  "name": "Search Test",
  "description": "Verifies search functionality on example.com",
  "entry_block": "block_1",
  "blocks": [
    {
      "id": "block_1",
      "type": "open_page",
      "url": "https://example.com",
      "next_block": "block_2"
    },
    {
      "id": "block_2",
      "type": "click_element",
      "target_intent": {
        "role": "button",
        "name": "Search",
        "structuralIntent": "primary_action"
      },
      "next_block": null
    }
  ]
}
```

---

## 4. Common Troubleshooting

### Chrome/ChromeDriver
WebLens uses Selenium for deterministic browser control. Ensure Google Chrome is installed on your host.

```bash
# Ubuntu/Debian
sudo apt-get install google-chrome-stable
```

### Permissions
Since WebLens runs tests locally, ensure it has permission to write to its `environments/` and `executions/` directories.

---

## 5. Documentation Links

- [README](../README.md) - System overview and License
- [Architecture](ARCHITECTURE.md) - High-level system design
- [Invariants](WEBLENS_V1_INVARIANTS.md) - Frozen v1 rules
- [API Docs](http://localhost:8000/docs) - Interactive API reference (Requires running backend)
