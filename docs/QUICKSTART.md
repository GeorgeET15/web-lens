# Quick Start Guide

## Running the Backend

### 1. Install Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Start the Server
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### 3. Test with Example Flow
```bash
# In another terminal
curl -X POST http://localhost:8000/api/flows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "flow": '$(cat ../examples/login-test.json)',
    "headless": true
  }'
```

## API Endpoints

### Get Block Types
```bash
curl http://localhost:8000/api/blocks/types
```

### Validate Flow
```bash
curl -X POST http://localhost:8000/api/flows/validate \
  -H "Content-Type: application/json" \
  -d @../examples/login-test.json
```

### Execute Flow
```bash
curl -X POST http://localhost:8000/api/flows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "flow": '$(cat ../examples/login-test.json)',
    "headless": true
  }'
```

## Using Docker

### Build and Run
```bash
# From project root
docker-compose up --build
```

### Access Services
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173 (when implemented)

## Testing

### Run Backend Tests
```bash
cd backend
source venv/bin/activate
python test_backend.py
```

## Example Flow Structure

```json
{
  "name": "My Test Flow",
  "description": "Optional description",
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
      "selector": "#button",
      "selector_type": "css",
      "next_block": null
    }
  ]
}
```

## Common Issues

### Chrome/ChromeDriver Issues
If you get browser errors, ensure Chrome is installed:
```bash
# Ubuntu/Debian
sudo apt-get install google-chrome-stable

# Or use Docker which includes Chrome
docker-compose up
```

### Python Environment Issues
Always activate the virtual environment:
```bash
cd backend
source venv/bin/activate
```

## Next Steps

1. **Frontend**: Integrate Blockly editor using `frontend/blockly-blocks.json`
2. **Serialization**: Use `frontend/src/utils/block-serializer.ts` to convert blocks to JSON
3. **API Integration**: Call `/api/flows/execute` with serialized flow
4. **Display Results**: Show execution logs and status to users

## Documentation

- [Architecture](../ARCHITECTURE.md) - System design and extension guide
- [README](../README.md) - Project overview
- [API Docs](http://localhost:8000/docs) - Interactive API documentation (when server is running)
