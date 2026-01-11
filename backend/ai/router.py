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
    
    if not intent:
        raise HTTPException(status_code=400, detail="Missing intent")
        
    result = await ai_service.generate_flow_from_intent(intent, history, variables)
    if "error" in result:
        error_msg = str(result["error"])
        if "429" in error_msg or "Quota exceeded" in error_msg or "ResourceExhausted" in error_msg:
            raise HTTPException(status_code=429, detail=f"AI Rate Limit Exceeded: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
        
    return result

@router.post("/analyze-failure")
async def analyze_failure(request: Dict[str, Any]):
    """Analyze a test failure using AI."""
    summary = await ai_service.analyze_failure(request)
    return {"summary": summary}
