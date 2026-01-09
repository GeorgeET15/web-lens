# WebLens LLM Verification Backend

**Version:** 1.0  
**Status:** Production  
**Binding:** Localhost-only  

---

## Purpose & Philosophy

The LLM Verification Bridge exposes WebLens as a **local verification backend** for LLM clients (e.g., Cursor, Claude, Copilot, Ollama, LM Studio).

**Core Principle:** LLMs are **untrusted clients** that can execute EXISTING flows only. WebLens remains the **sole authority** for execution, truth, and evidence.

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  LLM Client (Untrusted)                                 │
│  - Cursor, Copilot, Claude, Ollama, etc.                │
│  - Requests verification of existing flows              │
│  - Receives immutable TAF evidence                      │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP POST (localhost only)
                   │ JSON request/response
                   ▼
┌─────────────────────────────────────────────────────────┐
│  WebLens Verification Engine (Authority)                │
│  - Validates request against invariants                 │
│  - Executes flow deterministically                      │
│  - Returns TAF evidence package                         │
│  - NEVER accepts selectors, code, or mutations          │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Get Capabilities

```http
GET /api/llm/capabilities
```

**Response:**
```json
{
  "can_execute_flows": true,
  "can_create_flows": false,
  "can_pick_elements": false,
  "can_use_selectors": false,
  "can_modify_execution": false,
  "can_heal_flows": false,
  "execution_authority": "WebLens Engine",
  "truth_source": "TAF (Trace/Analysis/Feedback)",
  "element_picking_authority": "Inspector (Human Only)",
  "supported_actions": [
    "execute_existing_flow",
    "request_flow_list",
    "receive_taf_evidence"
  ],
  "rejected_actions": [
    "auto_pick_elements",
    "generate_selectors",
    "heal_flows",
    "modify_execution",
    "bypass_inspector"
  ],
  "invariants": [
    "Zero-Code Contract (no selectors)",
    "Inspector Authority (humans pick elements)",
    "Deterministic Execution (no probabilistic retries)",
    "TAF Immutability (ground truth)",
    "Local-First (no cloud dependencies)"
  ]
}
```

### 2. Execute Verification

```http
POST /api/llm/verify
Content-Type: application/json
```

**Request Schema:**
```json
{
  "flow_id": "string (required)",
  "scenario_id": "string (optional)",
  "intent_summary": "string (optional, logging only)",
  "execution_mode": "execute | dry_run",
  "metadata": {
    "key": "value"
  }
}
```

**Response Schema:**
```json
{
  "status": "success | failure",
  "execution_id": "string",
  "owner": "USER | APP | ENGINE | SYSTEM",
  "taf_summary": {
    "trace": ["string"],
    "analysis": ["string"],
    "feedback": ["string"]
  },
  "evidence": {
    "screenshots": ["string"],
    "final_url": "string",
    "duration_ms": 0,
    "blocks_executed": 0,
    "blocks_succeeded": 0,
    "blocks_failed": 0,
    "block_outcomes": [
      {
        "block_id": "string",
        "block_type": "string",
        "status": "success | failure | skipped",
        "duration_ms": 0,
        "error_message": "string"
      }
    ]
  },
  "error_message": "string",
  "warnings": ["string"],
  "flow_id": "string",
  "flow_name": "string",
  "scenario_id": "string",
  "executed_at": 0
}
```

### 3. Validate Request

```http
POST /api/llm/validate
Content-Type: application/json
```

**Purpose:** Check if a request is valid without executing.

**Request:** Same as `/verify`

**Response:**
```json
{
  "valid": true,
  "flow_id": "string",
  "flow_name": "string",
  "warnings": ["string"]
}
```

---

## Example Usage

### Example 1: Execute Existing Flow

```bash
curl -X POST http://localhost:8000/api/llm/verify \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "login_test",
    "execution_mode": "execute",
    "intent_summary": "Verify login functionality"
  }'
```

### Example 2: Dry Run Validation

```bash
curl -X POST http://localhost:8000/api/llm/verify \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "checkout_flow",
    "execution_mode": "dry_run"
  }'
```

### Example 3: Execute with Scenario

```bash
curl -X POST http://localhost:8000/api/llm/verify \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "user_registration",
    "scenario_id": "valid_user",
    "execution_mode": "execute"
  }'
```

---

## Rejected Behaviors (Hard Failures)

The following requests will be **explicitly rejected** with `400 Bad Request`:

### ❌ Selector Usage
```json
{
  "flow_id": "test",
  "metadata": {
    "selector": "#submit-btn"  // REJECTED
  }
}
```

### ❌ Element Picking
```json
{
  "flow_id": "test",
  "metadata": {
    "auto_pick": true  // REJECTED
  }
}
```

### ❌ Execution Control
```json
{
  "flow_id": "test",
  "metadata": {
    "retry_strategy": "exponential"  // REJECTED
  }
}
```

### ❌ Healing Logic
```json
{
  "flow_id": "test",
  "metadata": {
    "fallback_selector": ".btn-submit"  // REJECTED
  }
}
```

### ❌ DOM Access
```json
{
  "flow_id": "test",
  "metadata": {
    "dom_snapshot": true  // REJECTED
  }
}
```

---

## Security Posture

### Localhost-Only Binding
- **Enforced:** All requests must originate from `127.0.0.1`, `localhost`, or `::1`
- **Rejected:** Any remote requests (403 Forbidden)
- **Rationale:** LLM verification is LOCAL-ONLY (no cloud, no SaaS)

### No Authentication
- **Model:** Local trust only
- **Rationale:** If you control localhost, you control WebLens
- **Future:** Optional API key for multi-user systems

### Stateless Requests
- **Guarantee:** No session state
- **Guarantee:** No request correlation
- **Guarantee:** Each request is independent

### Hard Validation
- **Schema:** Pydantic validation with `additionalProperties: false`
- **Forbidden Fields:** Explicit rejection list (selectors, DOM, retries, etc.)
- **Invariant Checks:** Flow must be runnable, Inspector authority preserved

---

## Why This Is NOT AI Testing

| Aspect | AI Testing Tools (Mabl, Testim) | WebLens LLM Bridge |
|--------|----------------------------------|---------------------|
| **Element Location** | AI learns selectors over time | LLM uses existing flows with semantic ElementRefs |
| **Healing** | Auto-updates selectors on failure | No healing. LLM receives failure evidence, human decides |
| **Execution** | Cloud-based, proprietary | Local-only, deterministic |
| **Truth Model** | AI-interpreted logs | TAF (immutable, verbatim) |
| **Element Picking** | AI can pick elements | Only Inspector (human) can pick |
| **Selector Usage** | Selectors are core | Zero-Code contract (no selectors) |

**Key Difference:** WebLens LLM Bridge is a **read-only evidence consumer**. LLMs propose verification intents, WebLens executes deterministically, humans make decisions.

---

## Invariants Enforced

### 1. Zero-Code Contract
- **Rule:** No CSS/XPath selectors ever
- **Enforcement:** Schema validation rejects `selector` field
- **Violation:** 400 Bad Request

### 2. Inspector Authority
- **Rule:** Only humans can pick elements via Inspector
- **Enforcement:** LLM requests must reference existing flows with existing ElementRefs
- **Violation:** 400 Bad Request if flow contains invalid elements

### 3. Deterministic Execution
- **Rule:** Same flow + same app state = same outcome
- **Enforcement:** No fallback strategies, no probabilistic thresholds
- **Violation:** Execution fails if element not found (no retries)

### 4. TAF Immutability
- **Rule:** TAF logs are ground truth
- **Enforcement:** LLM receives raw TAF (no summarization, no rewriting)
- **Violation:** N/A (enforced by response builder)

### 5. Local-First
- **Rule:** No cloud dependencies
- **Enforcement:** Localhost-only binding
- **Violation:** 403 Forbidden for remote requests

---

## Integration Examples

### Cursor / Copilot

```typescript
// In your IDE extension
async function verifyUI(flowId: string) {
  const response = await fetch('http://localhost:8000/api/llm/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flow_id: flowId,
      execution_mode: 'execute'
    })
  });
  
  const result = await response.json();
  
  if (result.status === 'failure') {
    console.error('Verification failed:', result.taf_summary.trace);
  } else {
    console.log('Verification passed!');
  }
}
```

### Ollama / LM Studio

```python
import requests

def verify_flow(flow_id: str):
    """Execute WebLens flow via LLM bridge."""
    response = requests.post(
        'http://localhost:8000/api/llm/verify',
        json={
            'flow_id': flow_id,
            'execution_mode': 'execute'
        }
    )
    
    result = response.json()
    
    # LLM interprets TAF evidence (read-only)
    if result['status'] == 'failure':
        print(f"Failure owner: {result['owner']}")
        print(f"TAF trace: {result['taf_summary']['trace']}")
    
    return result
```

### Claude / ChatGPT (via MCP)

```json
{
  "tool": "weblens_verify",
  "parameters": {
    "flow_id": "login_test",
    "execution_mode": "execute"
  }
}
```

---

## Troubleshooting

### Error: "Forbidden: LLM verification bridge is localhost-only"
**Cause:** Request not from localhost  
**Solution:** Ensure client is on same machine as WebLens backend

### Error: "Flow 'X' does not exist"
**Cause:** LLM trying to execute non-existent flow  
**Solution:** Create flow in Inspector first, then reference by ID

### Error: "Request contains forbidden fields: selector"
**Cause:** LLM trying to use selectors  
**Solution:** Remove selector fields, use semantic ElementRefs only

### Error: "Flow 'X' is not runnable (state: draft)"
**Cause:** Flow not fully configured  
**Solution:** Complete flow configuration in Inspector

### Error: "Block 'Y' has invalid ElementRef"
**Cause:** ElementRef missing role/name  
**Solution:** Use Inspector to pick element correctly

---

## Future Enhancements (Out of Scope)

1. **Cryptographic Evidence:** Sign TAF logs with private key for auditability
2. **Multi-Agent Verification:** Multiple LLMs propose flows, WebLens executes all
3. **Formal Verification:** LLM generates TLA+ specs, WebLens verifies compliance
4. **API Key Authentication:** Optional for multi-user systems
5. **Rate Limiting:** Prevent LLM abuse (local DoS protection)

---

## Conclusion

The WebLens LLM Verification Bridge allows LLMs to **request verification** of existing flows while preserving all WebLens invariants:

✅ Zero-Code Contract (no selectors)  
✅ Inspector Authority (humans pick elements)  
✅ Deterministic Execution (no retries)  
✅ TAF Immutability (ground truth)  
✅ Local-First (no cloud)  

**This is NOT AI testing.** LLMs are read-only evidence consumers. WebLens remains the sole authority for execution and truth.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-08
