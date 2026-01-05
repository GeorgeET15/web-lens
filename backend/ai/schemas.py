from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class IntentElement(BaseModel):
    role: str
    name: str
    confidence: str # "high" | "medium" | "low"

class IntentSummary(BaseModel):
    summary: str
    element: Optional[IntentElement] = None

class Outcome(BaseModel):
    status: str # "success" | "failure"
    duration_ms: float
    retries: int

class Reasoning(BaseModel):
    primary_reason: str
    secondary_factors: Optional[List[str]] = None

class ScreenshotRef(BaseModel):
    path: str
    label: str

class Evidence(BaseModel):
    screenshots: List[ScreenshotRef]
    dom_state: Optional[str] = None # "not_found" | "hidden" | "obscured" | "unstable"

class RunSummary(BaseModel):
    run_id: str
    status: str
    timestamp: str

class ExecutionContext(BaseModel):
    scenario_name: Optional[str] = None
    variables: Optional[dict] = None
    previous_runs: Optional[List[RunSummary]] = None

class ExecutionInsightInput(BaseModel):
    run_id: str
    block_id: str
    block_type: str
    intent: IntentSummary
    outcome: Outcome
    reasoning: Reasoning
    guidance: List[str]
    evidence: Evidence
    context: ExecutionContext
