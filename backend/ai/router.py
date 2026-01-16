from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from .ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/status")
async def get_ai_status():
    """Return the status of AI capabilities."""
    return {
        "enabled": ai_service.is_enabled(),
        "provider": "Gemini"
    }

@router.post("/visual-diff")
async def analyze_visual_diff(request: Dict[str, Any]):
    """Analyze visual differences between two screenshots."""
    baseline = request.get("baseline")
    current = request.get("current")
    context = request.get("context", "")
    
    if not baseline or not current:
        raise HTTPException(status_code=400, detail="Missing screenshots")
        
    result = await ai_service.analyze_visual_diff(baseline, current, context)
    return {"result": result}

@router.post("/generate-flow")
async def generate_flow(request: Dict[str, Any]):
    """Generate a flow sequence from natural language intent."""
    intent = request.get("intent")
    history = request.get("history", []) # Optional chat history
    variables = request.get("variables", {}) # Optional variable context
    mode = request.get("mode", "build") # Optional mode (ask/build)
    current_flow = request.get("currentFlow") # Optional current flow context
    picked_element = request.get("pickedElement") # Optional picked element with context
    interaction_map = request.get("interactionMap") # Optional autonomous interaction map
    
    if not intent:
        raise HTTPException(status_code=400, detail="Missing intent")
        
    result = await ai_service.generate_flow_from_intent(intent, history, variables, mode, current_flow, picked_element, interaction_map)
    if "error" in result:
        error_msg = str(result["error"])
        if "429" in error_msg or "Quota exceeded" in error_msg or "ResourceExhausted" in error_msg:
            raise HTTPException(status_code=429, detail=f"AI Rate Limit Exceeded: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
        
    return result

@router.post("/generate-smart-assert")
async def generate_smart_assert(request: Dict[str, Any]):
    """Generate a validation sequence from natural language logic."""
    logic = request.get("logic")
    context = request.get("context", "") # HTML context if available
    
    if not logic:
        raise HTTPException(status_code=400, detail="Missing logic")
        
    result = await ai_service.generate_smart_assertion(logic, context)
    return result

@router.patch("/flows/{flow_id}/chat")
async def update_flow_chat(flow_id: str, request: Dict[str, Any]):
    """
    Real-time Partial Update: Update ONLY the chat_history for a flow.
    Used for seamless sync without re-uploading the entire graph.
    """
    chat_history = request.get("chat_history")
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
async def analyze_failure(request: Dict[str, Any]):
    """Analyze a test failure using AI."""
    summary = await ai_service.analyze_failure(request)
    return {"summary": summary}
