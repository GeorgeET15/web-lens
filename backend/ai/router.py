from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from .ai_service import ai_service
from .schemas import ExecutionInsightInput

router = APIRouter(prefix="/api/ai", tags=["ai"])

from .ai_service import ai_service
from .schemas import ExecutionInsightInput

router = APIRouter(prefix="/api/ai", tags=["ai"])

class IntentRequest(BaseModel):
    intent: str

@router.post("/draft-flow")
async def draft_flow(request: IntentRequest):
    """Role 1: Converts natural language intent into a DRAFT flow."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        logger.info(f"AI Translator: Received intent '{request.intent}'")
        draft = await ai_service.draft_flow(request.intent)
        logger.info(f"AI Translator: Generated draft (len={len(draft)})")
        return {"review": draft}
    except Exception as e:
        logger.error(f"AI Translator failed: {e}")
        return {"review": f"Error: AI Translator failed to generate draft: {str(e)}"}

@router.post("/stability-audit")
async def summarize_scenarios(runs_data: List[dict]):
    """Role 2: Analyzes execution history for patterns of instability."""
    summary = await ai_service.analyze_stability(runs_data)
    return {"summary": summary}

@router.post("/investigate-run")
async def investgate_run(request: Dict[str, Any]):
    """Role 3: Explains a specific execution outcome using TAF evidence."""
    from .utils import strip_heavy_data
    
    flow = request.get("flow")
    result = request.get("result")
    
    if not flow or not result:
        return {"review": "Error: Missing flow or scenario result for investigation."}
    
    # Strip heavy data to prevent quota/token issues
    stripped_flow = strip_heavy_data(flow)
    stripped_report = strip_heavy_data(result.get("report", {}))
    
    payload = {
        **stripped_flow,
        "execution_report": stripped_report
    }
    
    review = await ai_service.investigate_run(payload)
    return {"review": review}

@router.post("/ask-companion")
async def ask_companion(insight: ExecutionInsightInput, query: str):
    """Role 4: Explains WebLens concepts and technical behaviors."""
    answer = await ai_service.ask_companion(insight, query)
    return {"answer": answer}

# Deprecated/Legacy compatibility aliases (optional)
@router.post("/scenario-review")
async def legacy_review(request: Dict[str, Any]):
    return await investgate_run(request)

@router.post("/inspect")
async def legacy_inspect(insight: ExecutionInsightInput, query: str):
    return await ask_companion(insight, query)

@router.post("/analyze-failure")
async def legacy_analyze(insight: ExecutionInsightInput):
    return {"summary": await ai_service.investigate_run(insight.model_dump())}
