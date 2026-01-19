from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from .ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

def get_ai_config(request_headers: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract and parse X-AI-Config header."""
    import json
    import base64
    
    config_header = request_headers.get("x-ai-config")
    if not config_header:
        return None
        
    try:
        # Support both raw JSON and Base64 encoded JSON
        if config_header.strip().startswith("{"):
            return json.loads(config_header)
        else:
            decoded = base64.b64decode(config_header).decode('utf-8')
            return json.loads(decoded)
    except Exception as e:
        print(f"Failed to parse X-AI-Config: {e}")
        return None

@router.get("/status")
async def get_ai_status():
    """Return the status of AI capabilities."""
    return {
        "enabled": ai_service.is_enabled(),
        "provider": "Multi-Provider (BYOK)"
    }

@router.post("/visual-diff")
@router.post("/visual-diff")
async def analyze_visual_diff(request: Dict[str, Any], headers: Request):
    """Analyze visual differences between two screenshots."""
    ai_config = get_ai_config(headers.headers)
    baseline = request.get("baseline")
    current = request.get("current")
    context = request.get("context", "")
    
    if not baseline or not current:
        raise HTTPException(status_code=400, detail="Missing screenshots")
        
    result = await ai_service.analyze_visual_diff(baseline, current, context, ai_config)
    return {"result": result}

@router.post("/generate-flow")
@router.post("/generate-flow")
async def generate_flow(request: Dict[str, Any], headers: Request):
    """Generate a flow sequence from natural language intent."""
    ai_config = get_ai_config(headers.headers)
    intent = request.get("intent")
    history = request.get("history", []) # Optional chat history
    variables = request.get("variables", {}) # Optional variable context
    mode = request.get("mode", "build") # Optional mode (ask/build)
    current_flow = request.get("currentFlow") # Optional current flow context
    picked_element = request.get("pickedElement") # Optional picked element with context
    interaction_map = request.get("interactionMap") # Optional autonomous interaction map
    
    if not intent:
        raise HTTPException(status_code=400, detail="Missing intent")
        
    result = await ai_service.generate_flow_from_intent(intent, history, variables, mode, current_flow, picked_element, interaction_map, ai_config)
    
    # If the result contains a 'message' but NO 'error', it's an instruction or guidance (200 OK)
    if "message" in result and "error" not in result:
        return result
        
    if "error" in result:
        error_msg = str(result["error"])
        if "429" in error_msg or "Quota exceeded" in error_msg or "ResourceExhausted" in error_msg:
            raise HTTPException(status_code=429, detail=f"AI Rate Limit Exceeded: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
        
    return result

@router.post("/generate-smart-assert")
@router.post("/generate-smart-assert")
async def generate_smart_assert(request: Dict[str, Any], headers: Request):
    """Generate a validation sequence from natural language logic."""
    ai_config = get_ai_config(headers.headers)
    logic = request.get("logic")
    context = request.get("context", "") # HTML context if available
    
    if not logic:
        raise HTTPException(status_code=400, detail="Missing logic")
        
    result = await ai_service.generate_smart_assertion(logic, context, ai_config)
    return result

@router.patch("/flows/{flow_id}/chat")
async def update_flow_chat(flow_id: str, request: Dict[str, Any]):
    """
    Real-time Partial Update: Update ONLY the chat_history for a flow.
    Used for seamless sync without re-uploading the entire graph.
    """
    chat_history = request.get("chat_history")
    print(f"[AI Router] Updating chat for flow {flow_id}: {len(chat_history.get('messages', []))} messages")
    if chat_history is None:
        raise HTTPException(status_code=400, detail="Missing chat_history")
    
    from database import db
    if not db.is_enabled():
        return {"status": "skipped", "reason": "Cloud persistence disabled"}

    try:
        # Perform a partial update using Supabase
        response = db.client.table("flows").update({"chat_history": chat_history, "updated_at": "now()"}).eq("id", flow_id).execute()
        return {"status": "synced", "id": flow_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-failure")
@router.post("/analyze-failure")
async def analyze_failure(request: Dict[str, Any], headers: Request):
    """Analyze a test failure using AI."""
    ai_config = get_ai_config(headers.headers)
    summary = await ai_service.analyze_failure(request, ai_config)
    return {"summary": summary}
