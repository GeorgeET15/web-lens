"""
FastAPI backend for visual web testing platform.

Provides REST API for flow validation and execution with Real-Time Streaming (SSE).
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request, Depends
from fastapi.responses import Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ValidationError, Field
from typing import Dict, Any, List, Optional
import logging
import time
import json
import asyncio
import uuid
import queue
import os
import shutil
import requests
import sys
from pathlib import Path
from threading import Thread
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from datetime import datetime

class CachedStaticFiles(StaticFiles):
    """Custom StaticFiles handler to add Cache-Control headers."""
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        # Add aggressive caching for bundled assets
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

import config
from export_utils import encode_weblens, decode_weblens, validate_weblens

# Load environment variables from .env file
load_dotenv()
# Also check data directory for .env
data_dir_env = Path(os.getenv('WEBLENS_DATA_DIR', str(Path.home() / '.local' / 'share' / 'weblens'))) / '.env'
if data_dir_env.exists():
    load_dotenv(data_dir_env)

# Define backend base directory for internal files
BACKEND_DIR = Path(__file__).parent


# Import internal modules
# Assuming these exist based on file listing:
from models import FlowGraph, ExecutionResult, BlockType, ConditionKind, FlowState, EnvironmentConfig

from browser_engine import SeleniumEngine, BrowserEngineError
from selenium.common.exceptions import UnexpectedAlertPresentException
from interpreter import BlockInterpreter
# We need event classes structure roughly match what frontend expects
# Defining a simple internal event structure for the stream if imports fail, 
# but better to try reusing existing if possible.
# For simplicity in this patch, I'll construct the JSON events directly in the stream.

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Visual Web Testing Platform API",
    description="Zero-code visual web testing platform backend",
    version="1.0.0"
)

# AI Capabilities
from ai.router import router as ai_router
app.include_router(ai_router)

# AI Startup Diagnostic
from ai.ai_service import ai_service
logger.info(f"AI Capability Status: {'ENABLED' if ai_service.is_enabled() else 'DISABLED (Check .env for API keys)'}")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,  # Required for WebSocket connections
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"422 Unprocessable Entity for {request.url.path}: {exc.errors()}")
    try:
        body = await request.body()
        logger.debug(f"Request body: {body}")
    except Exception:
        pass
        
    # Fix: Pydantic v2 errors contain non-serializable 'ctx' objects (Exceptions)
    # We must remove them before returning JSON
    errors = exc.errors()
    for error in errors:
        error.pop('ctx', None)
        error.pop('url', None)
        
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "body": str(exc.body)},
    )


# --- Data Models ---

class FlowMigration:
    """Handles schema migrations for test flows."""
    CURRENT_VERSION = 1
    
    @classmethod
    def migrate(cls, flow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Upgrade flow data to CURRENT_VERSION."""
        version = flow_data.get("schema_version", 0)
        
        # Legacy -> V1
        if version < 1:
            flow_data["schema_version"] = 1
            # Perform any V1 specific transforms if needed
            logger.info(f"Migrated flow '{flow_data.get('name')}' to Version 1")
            version = 1
            
        return flow_data

def migrate_flow(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to migrate flow within a request."""
    if "flow" in request_data:
        request_data["flow"] = FlowMigration.migrate(request_data["flow"])
    return request_data

class FlowValidationResponse(BaseModel):
    valid: bool
    errors: List[str] = []
    message: str

class FlowExecutionRequest(BaseModel):
    flow: Dict[str, Any]
    headless: bool = True
    variables: Dict[str, str] = Field(default_factory=dict, description="Execution-specific variables")
    environment_id: Optional[str] = Field(None, description="ID of the environment to use")
    environment: Optional[EnvironmentConfig] = Field(None, description="Inline environment config")


class BlockTypesResponse(BaseModel):
    block_types: List[str]
    selector_types: List[str]
    condition_types: List[str]

class ExecutionStartResponse(BaseModel):
    run_id: str
    message: str

class FlowStateResponse(BaseModel):
    state: str
    is_runnable: bool
    errors: List[str] = []


# --- Unified Execution Manager Integration ---
from execution_manager import (
    event_queues, 
    execution_history, 
    # environments,  # Removed for Supabase persistence
    suite_executions,
    render_html_report,
    clean_report_for_disk,
    execute_flow_background,
    start_execution as start_background_execution,
    generate_pdf_report,
    delete_execution_data,
    clear_all_executions
)


# --- Helper Functions ---
# (Logic moved to execution_manager.py)


# --- Routes ---

# --- Inspector State ---
active_inspector: Optional[SeleniumEngine] = None
ai_inspector: Optional[SeleniumEngine] = None
inspector_clients: List[Any] = []  # WebSocket clients (using Any for simplicity)

# --- Routes ---

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/inspector/status")
async def get_inspector_status():
    """Return status of both Live and AI inspectors."""
    return {
        "live": "online" if (active_inspector and active_inspector.driver) else "offline",
        "ai": "online" if (ai_inspector and ai_inspector.driver) else "offline"
    }

from fastapi import Depends, Header

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extracts user_id from Supabase JWT."""
    if not authorization:
        return None
        
    try:
        token = authorization.replace("Bearer ", "")
        from database import db
        if not db.is_enabled() or not db.client:
            return None
            
        user = db.client.auth.get_user(token)
        if user and user.user:
            return user.user.id
    except Exception as e:
        logger.error(f"Auth validation failed: {e}")
        
    return None

@app.get("/api/blocks/types", response_model=BlockTypesResponse)
async def get_block_types():
    return BlockTypesResponse(
        block_types=[bt.value for bt in BlockType],
        selector_types=[], # Purged for Zero-Code
        condition_types=[ct.value for ct in ConditionKind]
    )


@app.get("/api/version/check")
async def check_version():
    """Check for updates via GitHub Releases API."""
    current_version = "1.0.0"
    
    try:
        response = requests.get(
            "https://api.github.com/repos/weblens/weblens/releases/latest",
            timeout=5
        )
        if response.status_code == 200:
            latest = response.json()
            latest_version = latest['tag_name'].lstrip('v')
            
            return {
                "current": current_version,
                "latest": latest_version,
                "update_available": latest_version > current_version,
                "download_url": latest['html_url'],
                "release_notes": latest.get('body', '')
            }
    except Exception as e:
        logger.warning(f"Version check failed: {e}")
        # Fail gracefully
        return {
            "current": current_version, 
            "latest": current_version, 
            "update_available": False,
            "error": str(e)
        }
    
    return {"current": current_version, "latest": current_version, "update_available": False}


class InspectorStartRequest(BaseModel):
    url: str


class HealStepRequest(BaseModel):
    run_id: str
    block_id: str
    attributes: Optional[List[str]] = None


class DraftRequest(BaseModel):
    intent: str
    flow_id: Optional[str] = None


@app.post("/api/assets/upload")
async def upload_asset(file: UploadFile = File(...)):
    """Upload a file to test_assets/uploads."""
    try:
        # Use safe directory from config
        upload_dir = config.DATA_DIR / "test_assets" / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Sanitize filename (basic)
        filename = os.path.basename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "id": filename,
            "name": file.filename,
            "source": "uploaded"
        }
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/flows/{flow_id}/heal-step")
async def heal_flow_step(
    flow_id: str,
    request: HealStepRequest,
    user_id: Optional[str] = Depends(get_current_user)
):
    """
    Apply 'actual' semantic attributes from a run back to the flow definition.
    This effectively 'heals' the flow when UI drift is detected.
    """
    if not db.is_enabled():
        raise HTTPException(status_code=503, detail="Persistence disabled")

    # 1. Fetch Execution Record
    exec_resp = db.client.table("executions").select("report").eq("id", request.run_id).execute()
    if not exec_resp.data:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    report = exec_resp.data[0]['report']
    blocks = report.get('blocks', [])
    target_exec = next((b for b in blocks if b['block_id'] == request.block_id), None)
    
    if not target_exec or not target_exec.get('actual_attributes'):
        raise HTTPException(status_code=400, detail="No healing data available for this step")
    
    actuals = target_exec['actual_attributes']
    
    # 2. Fetch Flow
    flow_resp = db.client.table("flows").select("graph").eq("id", flow_id).execute()
    if not flow_resp.data:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    graph = flow_resp.data[0]['graph']
    
    # 3. Find and Update Block
    blocks = graph.get('blocks', [])
    block_to_heal = next((b for b in blocks if b['id'] == request.block_id), None)
    
    if not block_to_heal:
        raise HTTPException(status_code=404, detail="Block not found in flow")
    
    # Update ElementRef metadata
    if 'params' in block_to_heal and 'element' in block_to_heal['params']:
        element = block_to_heal['params']['element']
        
        # Determine which attributes to heal
        to_heal = request.attributes if request.attributes is not None else ['name', 'role', 'testId', 'ariaLabel', 'placeholder', 'title', 'tagName']
        
        # Update name and role from actuals
        if 'name' in to_heal:
            element['name'] = actuals.get('name', element['name'])
        if 'role' in to_heal:
            element['role'] = actuals.get('role', element['role'])
        
        # Merge metadata (testId, ariaLabel, etc)
        if 'metadata' not in element:
            element['metadata'] = {}
            
        # Comprehensive Healing: Capture selected semantic signals
        for attr in ['testId', 'ariaLabel', 'placeholder', 'title', 'tagName']:
            if attr in to_heal and actuals.get(attr):
                element['metadata'][attr] = actuals[attr]
        
        # Add audit trail
        element['metadata']['last_healed_at'] = int(time.time())
        element['metadata']['previous_confidence'] = target_exec.get('confidence_score')
    
    # 4. Save Flow
    db.save_flow(user_id or "anonymous", graph)
    
    return {
        "success": True, 
        "message": f"Step {request.block_id} healed successfully.",
        "updated_attributes": actuals
    }


            
@app.post("/api/inspector/start")
async def start_inspector(request: InspectorStartRequest):
    """Start the Live Inspector browser session."""
    global active_inspector
    
    # Close existing if any
    if active_inspector:
        try:
            active_inspector.close()
        except Exception:
            pass
        active_inspector = None

    try:
        # Launch NON-HEADLESS browser
        active_inspector = SeleniumEngine(headless=False)
        
        # URL Fix: Prepend https if missing
        target_url = request.url
        if not target_url.startswith("http"):
            target_url = f"https://{target_url}"
            
        active_inspector.open_page(target_url)
        
        # Inject Inspector Script matches "inspector.js" in the same directory
        try:
            with open(BACKEND_DIR / "inspector.js", "r") as f:
                script = f.read()
                if active_inspector.driver:
                    # Robust Injection: Use CDP to ensure it runs on every new page
                    try:
                        active_inspector.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                            'source': script
                        })
                        logger.info("CDP injection setup for inspector")
                    except Exception as cdp_err:
                        logger.warning(f"CDP injection failed (driver may not support it): {cdp_err}")
                    
                    # Also inject into the current page immediately
                    active_inspector.driver.execute_script(script)
        except Exception as e:
            logger.error(f"Failed to inject inspector script: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to inject inspector script: {e}")
        
        return {"status": "started", "message": "Inspector launched in new window"}
    except Exception as e:
        logger.error(f"Failed to start inspector: {e}")
        if active_inspector:
            active_inspector.close()
            active_inspector = None
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inspector/stop")
async def stop_inspector():
    global active_inspector
    if active_inspector:
        active_inspector.close()
        active_inspector = None
    return {"status": "stopped"}

@app.post("/api/inspector/resync")
async def resync_inspector():
    """Force re-injection of the inspector script into the active browser."""
    global active_inspector
    if not active_inspector or not active_inspector.driver:
        raise HTTPException(status_code=400, detail="Inspector not running")
    
    try:
        # Wait for page to be ready if it's currently navigating
        try:
            WebDriverWait(active_inspector.driver, 5).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except:
            pass # Continue anyway if wait times out
            
        with open(BACKEND_DIR / "inspector.js", "r") as f:
            script = f.read()
            # 1. Re-setup CDP
            try:
                active_inspector.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                    'source': script
                })
            except: pass
            
            # 2. Immediate injection
            active_inspector.driver.switch_to.default_content()
            active_inspector.driver.execute_script(script)
            
        return {"status": "resynced", "message": "Inspector script re-injected"}
    except Exception as e:
        logger.error(f"Resync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/scrape-interactions")
async def ai_scrape_interactions():
    """Execute autonomous scraping in the active inspector for AI context."""
    global active_inspector
    if not active_inspector or not active_inspector.driver:
        return {"status": "error", "message": "Inspector not running", "elements": []}
    
    try:
        # Ensure we are on top-level frame
        active_inspector.driver.switch_to.default_content()
        
        # Execute the scraping function added to inspector.js
        elements = active_inspector.driver.execute_script("return window.__scrapeInteractions ? window.__scrapeInteractions() : []")
        
        # Add basic page context
        page_title = active_inspector.driver.title
        current_url = active_inspector.driver.current_url
        
        return {
            "status": "success",
            "page_title": page_title,
            "url": current_url,
            "elements": elements
        }
    except Exception as e:
        logger.error(f"AI Scrape failed: {e}")
        return {"status": "error", "message": str(e), "elements": []}


@app.websocket("/ws/inspector")
async def inspector_websocket(websocket: WebSocket):
    global active_inspector 
    try:
        await websocket.accept()
    except Exception as e:
        logger.error(f"Failed to accept WebSocket connection: {e}")
        return
    
    inspector_clients.append(websocket)
    
    # Send initial status
    initial_status = "running" if (active_inspector and active_inspector.driver) else "not_running"
    try:
        await websocket.send_json({"type": "inspector_status", "status": initial_status})
    except Exception:
        pass
    
    current_mode = "pick"
    last_url = ""
    if active_inspector and active_inspector.driver:
        try:
            last_url = active_inspector.driver.current_url
        except: pass
    
    try:
        while True:
            # Poll the browser for picked elements (V1 Implementation)
            if active_inspector and active_inspector.driver:
                try:
                    # 1. Aggressive Check: Ensure window is actually open
                    if not active_inspector.driver.window_handles:
                        raise Exception("No open windows")
                    
                    # 2. Re-injection Fallback: Ensure script is active (with iframe safety)
                    try:
                        # Always ensure we are looking at the top-level document first
                        active_inspector.driver.switch_to.default_content()
                        
                        is_active = active_inspector.driver.execute_script("return !!window.__visualInspectorActive")
                        if not is_active:
                            logger.info("Inspector script missing. Re-injecting from WebSocket loop.")
                            with open(BACKEND_DIR / "inspector.js", "r") as f:
                                script = f.read()
                                # We also re-setup CDP just in case it was lost during a crash/reload
                                try:
                                    active_inspector.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                                        'source': script
                                    })
                                except: pass
                                active_inspector.driver.execute_script(script)
                    except Exception as e:
                        # Page is likely navigating or busy, skip this poll
                        pass

                    # 3. Check for element selection
                    picked_data = active_inspector.driver.execute_script("return window.__lastPicked")
                    
                    if picked_data:
                        # CAPTURE FULL CONTEXT
                        html_context = ""
                        screenshot_context = ""
                        
                        try:
                            html_context = active_inspector.driver.page_source
                        except Exception as e:
                            logger.error(f"Failed to capture HTML context: {e}")
                            
                        try:
                            # Optimize: Resize for screenshot to reduce payload size if needed, 
                            # but for now we take full window.
                            screenshot_context = active_inspector.driver.get_screenshot_as_base64()
                        except Exception as e:
                            logger.error(f"Failed to capture Screenshot context: {e}")

                        await websocket.send_json({
                            "type": "picked_element", 
                            "element": picked_data,
                            "html_context": html_context,
                            "screenshot_context": screenshot_context
                        })
                        active_inspector.driver.execute_script("window.__lastPicked = null")
                    
                    # 4. URL Tracking
                    current_url = active_inspector.driver.current_url
                    if current_url != last_url:
                        logger.info(f"Inspector URL changed: {last_url} -> {current_url}")
                        last_url = current_url
                        await websocket.send_json({"type": "url_changed", "url": current_url})
                        
                except Exception as e:
                    # Check for window closure
                    msg = str(e).lower()
                    # CRITICAL FIX: Only break if the window is TRULY gone.
                    # "Target frame detached" is a common transient error during navigation.
                    try:
                        handles = active_inspector.driver.window_handles
                        if not handles:
                             logger.info("Inspector window closed (no handles). Terminating WebSocket.")
                             active_inspector = None
                             try:
                                 await websocket.send_json({"type": "inspector_status", "status": "stopped"})
                             except: pass
                             break
                    except Exception:
                        # If we can't even get handles, the driver might be dead or window closed
                        logger.info("WebDriver unreachable or window closed. Terminating.")
                        active_inspector = None
                        try:
                            await websocket.send_json({"type": "inspector_status", "status": "stopped"})
                        except: pass
                        break
                    
                    # Otherwise, browser might be just busy or navigating, continue polling
                    logger.debug(f"Transient inspector error during poll: {e}")
                    pass
            
            # Check for incoming messages (e.g. "stop") with timeout to allow polling loop
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.2)
                # Handle commands if any
            except asyncio.TimeoutError:
                continue
            except Exception:
                break
                
    except Exception as e:
        logger.error(f"Inspector WS error: {e}")
    finally:
        if websocket in inspector_clients:
            inspector_clients.remove(websocket)


# --- Embedded Inspector Endpoints ---

class EmbeddedInteractRequest(BaseModel):
    action: str  # click, type, navigate, snapshot
    selector: Optional[str] = None
    value: Optional[str] = None
    url: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

@app.post("/api/inspector/embedded/start")
async def start_embedded_inspector(request: InspectorStartRequest):
    """Start the Embedded (Headless) Inspector."""
    global active_inspector
    
    # Reuse existing inspector if available
    try:
        if not active_inspector:
            # Launch HEADLESS browser
            active_inspector = SeleniumEngine(headless=True)

        target_url = request.url
        if not target_url.startswith("http"):
            target_url = f"https://{target_url}"
            
        # If we are already on the page, just snapshot? 
        # Or always open_page (which reloads)? 
        # User might want refresh. open_page handles navigation.
        active_inspector.open_page(target_url)
        
        # Return Snapshot
        return active_inspector.get_snapshot()
        
    except Exception as e:
        logger.error(f"Failed to start embedded inspector: {e}")
        if active_inspector:
            try:
                active_inspector.close()
            except:
                pass
            active_inspector = None
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inspector/embedded/interact")
async def interact_embedded_inspector(request: EmbeddedInteractRequest):
    """Interact with the page and get new snapshot."""
    global active_inspector
    
    if not active_inspector or not active_inspector.driver:
         raise HTTPException(status_code=400, detail="Inspector not running")

    old_url = active_inspector.driver.current_url
    try:
        if request.action == "click":
            if request.x is not None and request.y is not None:
                # Translate absolute coordinates to viewport coordinates
                scroll_x = active_inspector.execute_script("return window.scrollX;")
                scroll_y = active_inspector.execute_script("return window.scrollY;")
                vx = request.x - scroll_x
                vy = request.y - scroll_y
                
                # Use elementFromPoint to find the element and click it
                active_inspector.driver.execute_script(
                    f"document.elementFromPoint({vx}, {vy}).click()"
                )
            await asyncio.sleep(1) # Wait for potential navigation
            
        elif request.action == "navigate" and request.url:
             active_inspector.open_page(request.url)

        snapshot = active_inspector.get_snapshot()
        new_url = active_inspector.driver.current_url
        
        # Navigation Detection
        if old_url != new_url:
            snapshot['taf'] = {
                "trace": ["Page changed"],
                "analysis": [f"WebLens detected a navigation from {old_url} to {new_url}."],
                "feedback": ["You can now select elements on this new page or continue browsing."]
            }
            
        return snapshot

    except Exception as e:
        logger.error(f"Interaction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flow/validate", response_model=FlowStateResponse)
async def validate_flow(request: FlowExecutionRequest):
    """
    Validate flow completeness without executing.
    Returns validation errors if any.
    
    This is the pre-execution check - UI should call this before attempting to run.
    """
    try:
        flow = FlowGraph(**request.flow)
    except ValidationError as e:
        return FlowStateResponse(
            state="invalid",
            is_runnable=False,
            errors=[f"Flow structure error: {str(e)}"]
        )
    
    validation_errors = flow.validate_completeness()
    state = flow.get_state()
    
    return FlowStateResponse(
        state=state.value,
        is_runnable=len(validation_errors) == 0,
        errors=validation_errors
    )


@app.post("/api/execute/start", response_model=ExecutionStartResponse)
async def start_execution(
    request: FlowExecutionRequest, 
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = Depends(get_current_user)
):
    """
    Start async execution and return run_id.
    
    CRITICAL: This is the EXECUTION GATE.
    Flows with incomplete blocks are REJECTED before execution begins.
    """
    # STEP 1: Parse and validate flow structure
    try:
        # Apply migration
        migrated_flow = FlowMigration.migrate(request.flow)
        flow = FlowGraph(**migrated_flow)
    except ValidationError as e:
        logger.error(f"Flow validation failed for '{request.flow.get('name')}': {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "Invalid flow structure",
                "validation_errors": [str(e)],
                "state": "invalid"
            }
        )
    
    # STEP 2: EXECUTION GATE - Validate completeness and root entry
    validation_errors = flow.validate_completeness()
    
    # Ensure entry_block is a true root (not referenced as a child/next of anything else)
    entry_id = flow.entry_block
    is_root = True
    for b in flow.blocks:
        if b.next_block == entry_id:
            is_root = False
            break
        if entry_id in (getattr(b, "then_blocks", []) or []):
            is_root = False
            break
        if entry_id in (getattr(b, "else_blocks", []) or []):
            is_root = False
            break
        if entry_id in (getattr(b, "body_blocks", []) or []):
            is_root = False
            break
            
    if not is_root:
        validation_errors.append(f"Deterministic Violation: Block {entry_id} is not a root block. Flows must start from the very beginning.")

    if validation_errors:
        logger.error(f"Completeness validation failed for '{flow.name}': {validation_errors}")
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "Cannot execute incomplete flow",
                "validation_errors": validation_errors,
                "state": "draft"
            }
        )
    
    # HANDOFF: Verify Auth for Cloud Features
    if user_id:
        logger.info(f"Authenticated execution for user: {user_id}")
    else:
        logger.warning("Anonymous execution - data will NOT be saved to Supabase.")

    # Hand off to unified execution manager
    run_id = start_background_execution(
        request.flow, 
        request.headless, 
        request.variables,
        environment_id=request.environment_id,
        inline_environment=request.environment,
        user_id=user_id
    )
    
    return ExecutionStartResponse(run_id=run_id, message="Execution started")


@app.get("/api/status/{run_id}")
async def stream_status(run_id: str):
    """SSE Endpoint for execution status."""
    if run_id not in event_queues:
        raise HTTPException(status_code=404, detail="Run ID not found")
    
    def event_generator():
        q = event_queues[run_id]
        while True:
            item = q.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"
        
        del event_queues[run_id]

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Keep legacy sync endpoint
@app.post("/api/flows/execute", response_model=ExecutionResult)
async def execute_flow(request: FlowExecutionRequest):
    # Reuse background logic but wait? No, just keep original implementation for backup
    # (Simplified for brevity - relying on the import from original file if needed, 
    # but re-implementing basic sync here to avoid complex merge)
    
    try:
        migrated_flow = FlowMigration.migrate(request.flow)
        flow = FlowGraph(**migrated_flow)
        engine = SeleniumEngine(headless=request.headless)
        interpreter = BlockInterpreter(engine)
        try:
             return interpreter.execute_flow(flow)
        finally:
             engine.close()
    except Exception as e:
        return ExecutionResult(success=False, message=str(e), logs=[])



# --- Flow Persistence (Supabase) ---

@app.get("/api/user/stats")
async def get_user_stats_endpoint(user_id: Optional[str] = Depends(get_current_user)):
    """Fetch user statistics."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    from database import db
    if not db.is_enabled():
        return {"flows": 0, "executions": 0, "screenshots": 0}
        
    return db.get_user_stats(user_id)

@app.get("/api/flows")
async def list_flows(user_id: Optional[str] = Depends(get_current_user)):
    """List flows from Supabase (if authenticated) or local disk."""
    flows = []
    
    # 1. Try Cloud
    if user_id:
        from database import db
        if db.is_enabled():
            try:
                response = db.client.table("flows").select("*").eq("user_id", user_id).execute()
                for record in response.data:
                    # Convert DB record to lightweight flow summary
                    flows.append({
                        "id": record['id'],
                        "name": record['name'],
                        "description": record.get('description'),
                        "updated_at": record['updated_at'],
                        "last_run": record.get('last_run'),
                        "source": "cloud",
                        "graph": record['graph'],
                        "chat_history": record.get('chat_history', {})
                    })
            except Exception as e:
                logger.error(f"Failed to fetch cloud flows: {e}")

    # 2. Add Local Flows (Legacy/Demo)
    # ... (Keep existing local logic if any, but currently we just return empty list or what's in memory?)
    # For now, let's just return what we have.
    
    return flows

@app.post("/api/flows")
async def save_flow(request: FlowExecutionRequest, user_id: Optional[str] = Depends(get_current_user)):
    """Save flow to Supabase."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required to save flows")
        
    from database import db
    if not db.is_enabled():
        raise HTTPException(status_code=503, detail="Cloud storage unavailable")
        
    flow_id = db.save_flow(user_id, request.flow)
    if not flow_id:
        raise HTTPException(status_code=500, detail="Failed to save flow")
        
    return {"id": flow_id, "message": "Flow saved successfully"}


@app.post("/api/usage/track-flow/{flow_id}")
async def track_flow_usage(flow_id: str, user_id: Optional[str] = Depends(get_current_user)):
    """Track flow usage in Supabase."""
    if not user_id:
        # We only track usage for authenticated users on cloud flows
        return {"status": "skipped", "message": "Authentication required for cloud usage tracking"}
        
    from database import db
    if not db.is_enabled():
        return {"status": "skipped", "message": "Cloud storage unavailable"}
        
    success = db.track_flow_usage(flow_id, user_id)
    if not success:
        logger.warning(f"Failed to track usage for flow {flow_id}")
        
    return {"status": "success" if success else "failed"}


@app.delete("/api/flows/{flow_id}")
async def delete_flow(flow_id: str, user_id: Optional[str] = Depends(get_current_user)):
    """Delete flow from Supabase."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    from database import db
    if not db.is_enabled():
        raise HTTPException(status_code=503, detail="Cloud storage unavailable")
        
    try:
        response = db.client.table("flows").delete().eq("id", flow_id).eq("user_id", user_id).execute()
        return {"message": "Flow deleted"}
    except Exception as e:
        logger.error(f"Failed to delete flow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/flows/local")
async def save_flow_local(request: FlowExecutionRequest):
    """Save flow to local backend storage (no auth required)."""
    import json
    from pathlib import Path
    
    try:
        # Create flows directory if it doesn't exist
        flows_dir = BACKEND_DIR / 'flows'
        flows_dir.mkdir(exist_ok=True)
        
        # Generate or use existing flow ID
        flow_id = request.flow.get('id') or str(uuid.uuid4())
        flow_path = flows_dir / f'{flow_id}.json'
        
        # Save flow with metadata
        flow_data = {
            'id': flow_id,
            'name': request.flow.get('name', 'Untitled Flow'),
            'description': request.flow.get('description', ''),
            'graph': request.flow,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        with open(flow_path, 'w') as f:
            json.dump(flow_data, f, indent=2)
        
        logger.info(f"[LOCAL_SAVE] Saved flow {flow_id} to {flow_path}")
        return {"id": flow_id, "message": "Flow saved locally"}
    except Exception as e:
        logger.error(f"[LOCAL_SAVE] Failed to save flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/flows/local")
async def list_flows_local():
    """List all locally saved flows (no auth required)."""
    import json
    from pathlib import Path
    
    try:
        flows_dir = BACKEND_DIR / 'flows'
        if not flows_dir.exists():
            return []
        
        flows = []
        for flow_file in flows_dir.glob('*.json'):
            try:
                with open(flow_file, 'r') as f:
                    flow_data = json.load(f)
                    flows.append({
                        'id': flow_data.get('id', flow_file.stem),
                        'name': flow_data.get('name', 'Untitled'),
                        'updated_at': flow_data.get('updated_at'),
                        'source': 'local'
                    })
            except Exception as e:
                logger.warning(f"Failed to read flow {flow_file}: {e}")
        
        return flows
    except Exception as e:
        logger.error(f"Failed to list local flows: {e}")
        return []


@app.get("/api/flows/{flow_id}/export")
async def export_flow(flow_id: str, user_id: Optional[str] = Depends(get_current_user)):
    """Export flow as .weblens file."""
    from database import db
    
    logger.info(f"[EXPORT] Starting export for flow_id: {flow_id}, user_id: {user_id}")
    
    # Try to fetch from Supabase first
    if db.is_enabled() and user_id:
        logger.info(f"[EXPORT] Supabase is enabled, attempting cloud lookup...")
        try:
            response = db.client.table("flows").select("*").eq("id", flow_id).eq("user_id", user_id).execute()
            logger.info(f"[EXPORT] Supabase response: {len(response.data) if response.data else 0} flows found")
            
            if response.data and len(response.data) > 0:
                flow_data = response.data[0]
                logger.info(f"[EXPORT] Found flow in Supabase: {flow_data.get('name')}")
                flow_graph = flow_data.get('graph', {})
                
                # Encode to .weblens format
                weblens_content = encode_weblens(
                    flow_graph,
                    flow_name=flow_data.get('name'),
                    flow_description=flow_data.get('description')
                )
                
                # Generate filename
                safe_name = flow_data.get('name', 'flow').replace(' ', '_').replace('/', '_')
                filename = f"{safe_name}.weblens"
                
                logger.info(f"[EXPORT] Successfully encoded flow to .weblens: {filename}")
                return Response(
                    content=weblens_content,
                    media_type="application/x-weblens",
                    headers={
                        "Content-Disposition": f'attachment; filename="{filename}"',
                        "Content-Type": "application/x-weblens"
                    }
                )
            else:
                logger.warning(f"[EXPORT] Flow {flow_id} not found in Supabase for user {user_id}")
        except Exception as e:
            logger.error(f"[EXPORT] Failed to export flow from Supabase: {e}")
    else:
        logger.info(f"[EXPORT] Supabase disabled or no user_id, skipping cloud lookup")
    
    # If not found in cloud or cloud disabled, check local storage
    logger.info(f"[EXPORT] Attempting local storage lookup...")
    try:
        import json
        from pathlib import Path
        
        # Check local storage directory
        local_storage_path = BACKEND_DIR / 'flows' / f'{flow_id}.json'
        logger.info(f"[EXPORT] Checking path: {local_storage_path}")
        logger.info(f"[EXPORT] Path exists: {local_storage_path.exists()}")
        
        if local_storage_path.exists():
            logger.info(f"[EXPORT] Found flow in local storage, reading file...")
            with open(local_storage_path, 'r') as f:
                flow_data = json.load(f)
                flow_graph = flow_data.get('graph', flow_data)  # Handle both wrapped and unwrapped formats
                
                logger.info(f"[EXPORT] Loaded flow: {flow_data.get('name', 'Unknown')}")
                
                # Encode to .weblens format
                weblens_content = encode_weblens(
                    flow_graph,
                    flow_name=flow_data.get('name', 'Untitled Flow'),
                    flow_description=flow_data.get('description', '')
                )
                
                # Generate filename
                safe_name = flow_data.get('name', 'flow').replace(' ', '_').replace('/', '_')
                filename = f"{safe_name}.weblens"
                
                logger.info(f"[EXPORT] Successfully encoded flow to .weblens: {filename}")
                return Response(
                    content=weblens_content,
                    media_type="application/x-weblens",
                    headers={
                        "Content-Disposition": f'attachment; filename="{filename}"',
                        "Content-Type": "application/x-weblens"
                    }
                )
        else:
            logger.warning(f"[EXPORT] Flow file does not exist at {local_storage_path}")
            # List what files DO exist
            flows_dir = BACKEND_DIR / 'flows'
            if flows_dir.exists():
                existing_files = list(flows_dir.glob('*.json'))
                logger.info(f"[EXPORT] Available flows in local storage: {[f.name for f in existing_files]}")
            else:
                logger.warning(f"[EXPORT] Flows directory does not exist: {flows_dir}")
    except Exception as e:
        logger.error(f"[EXPORT] Failed to export flow from local storage: {e}", exc_info=True)
    
    logger.error(f"[EXPORT] Flow {flow_id} not found in any storage location")
    raise HTTPException(
        status_code=404, 
        detail=f"Flow '{flow_id}' not found. Please save the flow before exporting."
    )


@app.post("/api/flows/import")
async def import_flow(file: UploadFile = File(...), user_id: Optional[str] = Depends(get_current_user)):
    """Import .weblens file."""
    # Validate file extension
    if not file.filename or not file.filename.endswith('.weblens'):
        raise HTTPException(status_code=400, detail="Invalid file type. Expected .weblens file")
    
    # Read file content
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Validate and decode
    is_valid, error_msg = validate_weblens(content_str)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid .weblens file: {error_msg}")
    
    try:
        metadata, flow_graph = decode_weblens(content_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Save to Supabase if enabled and user is authenticated
    from database import db
    if db.is_enabled() and user_id:
        try:
            flow_id = db.save_flow(user_id, flow_graph)
            if flow_id:
                return {
                    "success": True,
                    "flow_id": flow_id,
                    "message": "Flow imported successfully",
                    "metadata": metadata
                }
        except Exception as e:
            logger.error(f"Failed to save imported flow: {e}")
            raise HTTPException(status_code=500, detail="Failed to save imported flow")
    
    # If cloud storage is disabled, return the flow data for local handling
    return {
        "success": True,
        "flow_id": None,
        "message": "Flow validated successfully (cloud storage disabled)",
        "metadata": metadata,
        "flow": flow_graph
    }


@app.get("/api/executions/{run_id}")
async def get_execution_report(run_id: str):
    """Retrieve execution report by ID, from memory, disk, or Supabase."""
    if run_id in execution_history:
        report = execution_history[run_id]
        if hasattr(report, 'dict'):
            return report.dict()
        return report
    
    # Try disk
    report_path = config.EXECUTIONS_DIR / f"{run_id}.json"
    if report_path.exists():
        try:
            with open(report_path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading report from disk: {e}")
            
    # Try Supabase fallback (Public sharing support)
    from database import db
    if db.is_enabled():
        try:
            # Query by run_id (which is id in executions table)
            response = db.client.table("executions").select("report").eq("id", run_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]['report']
        except Exception as e:
            logger.error(f"Failed to fetch execution {run_id} from Supabase: {e}")
            
    raise HTTPException(status_code=404, detail="Execution report not found")


# --- Auth Routes (Proxy Mode) ---

from models import AuthRequest

@app.post("/api/auth/signup")
async def auth_signup(creds: AuthRequest):
    """Register new user via backend proxy."""
    from database import db
    if not db.is_enabled():
         raise HTTPException(status_code=503, detail="Auth service unavailable")
         
    try:
        response = db.client.auth.sign_up({
            "email": creds.email,
            "password": creds.password,
        })
        if not response.user:
             raise Exception("Signup failed")
             
        return {"message": "Signup successful! Check your email."}
    except Exception as e:
        logger.error(f"Signup failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
async def auth_login(creds: AuthRequest):
    """Login user via backend proxy and return session."""
    from database import db
    if not db.is_enabled():
         raise HTTPException(status_code=503, detail="Auth service unavailable")

    try:
        response = db.client.auth.sign_in_with_password({
            "email": creds.email,
            "password": creds.password,
        })
        
        if not response.session:
            raise Exception("Invalid credentials")

        return {
            "user": {
                "id": response.user.id,
                "email": response.user.email
            },
            "session": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in
            }
        }
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(status_code=401, detail="Login failed: Invalid credentials")


@app.get("/api/executions/{run_id}/report/json")
async def download_report_json(run_id: str):
    """Download execution report as JSON file."""
    report = await get_execution_report(run_id)
    
    # Strip heavy images to keep download size small
    clean_report = clean_report_for_disk(report)
    
    from fastapi.responses import Response
    import json
    flow_name = clean_report.get('flow_name', 'untitled').replace(' ', '_').lower()
    return Response(
        content=json.dumps(clean_report, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={flow_name}_report_{run_id}.json"}
    )


@app.get("/api/executions/{run_id}/report/html")
async def download_report_html(run_id: str):
    """Download execution report as HTML file (premium view)."""
    # 1. Try to serve pre-rendered HTML first (this is the most efficient and has images)
    html_path = config.EXECUTIONS_DIR / f"{run_id}.html"
    flow_name_slug = "untitled"
    
    try:
        report = await get_execution_report(run_id)
        flow_name_slug = report.get('flow_name', 'untitled').replace(' ', '_').lower()
    except: pass

    if html_path.exists():
        try:
            with open(html_path, "r") as f:
                html_content = f.read()
            from fastapi.responses import Response
            return Response(
                content=html_content,
                media_type="text/html",
                headers={"Content-Disposition": f"attachment; filename={flow_name_slug}_report_{run_id}.html"}
            )
        except Exception as e:
            logger.warning(f"Error reading pre-rendered HTML: {e}")
        
    # 2. Fallback: Re-render from report (might miss images if images were stripped from JSON)
    report = await get_execution_report(run_id)
    html_content = render_html_report(report)
    
    from fastapi.responses import Response
    return Response(
        content=html_content,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename={flow_name_slug}_report_{run_id}.html"}
    )


@app.get("/api/executions/{run_id}/report/pdf")
async def download_report_pdf(run_id: str):
    """Download execution report as PDF file with embedded screenshots."""
    report = await get_execution_report(run_id)
    
    # Generate PDF
    pdf_bytes = generate_pdf_report(report)
    
    from fastapi.responses import Response
    flow_name = report.get('flow_name', 'untitled').replace(' ', '_').lower()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={flow_name}_report_{run_id}.pdf"}
    )


@app.get("/api/reports/{run_id}")
async def get_report_share(run_id: str):
    """Alias for getting a report for public sharing."""
    return await get_execution_report(run_id)

@app.get("/api/executions")
async def list_executions(user_id: Optional[str] = Depends(get_current_user)):
    """List recent executions from memory, disk, and Supabase (if authenticated)."""
    results = {}
    
    # 1. Load from disk first
    if config.EXECUTIONS_DIR.exists():
        for f in config.EXECUTIONS_DIR.glob("*.json"):
            try:
                with open(f, "r") as report_file:
                    data = json.load(report_file)
                    results[data["run_id"]] = {
                        "run_id": data["run_id"],
                        "scenario_name": data.get("scenario_name"),
                        "started_at": data["started_at"],
                        "finished_at": data.get("finished_at"),
                        "success": data.get("success")
                    }
            except:
                continue
                
    # 2. Load from Supabase (if authenticated)
    if user_id:
        from database import db
        if db.is_enabled():
            try:
                # Fetch recent executions for this user
                # We limit to 50 for performance
                response = db.client.table("executions").select("id, status, created_at, report").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
                for record in response.data:
                    run_id = record['id']
                    # Use created_at as fallback for started_at if not in report
                    report = record.get('report') or {}
                    
                    # Merge/Overwrite local with cloud (cloud is source of truth for history)
                    results[run_id] = {
                        "run_id": run_id,
                        "scenario_name": report.get("scenario_name", "Cloud Execution"),
                        "started_at": report.get("started_at", 0),
                        "finished_at": report.get("finished_at"),
                        "success": record.get("status") == "completed"
                    }
            except Exception as e:
                logger.error(f"Failed to fetch cloud executions: {e}")

    # 3. Add from memory (overwriting disk/cloud if same run_id - memory is most recent active state)
    for run_id, report in execution_history.items():
        results[run_id] = {
            "run_id": run_id, 
            "scenario_name": getattr(report, "scenario_name", None),
            "started_at": getattr(report, "started_at", 0), 
            "finished_at": getattr(report, "finished_at", None),
            "success": getattr(report, "success", False)
        }
        
    # 4. Sort by started_at descending and limit to 50
    sorted_executions = sorted(
        results.values(), 
        key=lambda x: x["started_at"], 
        reverse=True
    )
    
    return sorted_executions[:50]


    
    return sorted_executions[:50]


@app.delete("/api/executions/{run_id}")
async def delete_execution(run_id: str, request: Request, user_id: Optional[str] = Depends(get_current_user)):
    """Delete a specific execution."""
    # We call execution_manager which handles local + cloud
    success = delete_execution_data(run_id, user_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete execution")
        
    return {"status": "deleted", "run_id": run_id}


@app.delete("/api/executions")
async def clear_execution_history(request: Request, user_id: Optional[str] = Depends(get_current_user)):
    """Clear ALL execution history."""
    success = clear_all_executions(user_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear history")
        
    return {"status": "cleared"}


@app.get("/api/environments", response_model=List[EnvironmentConfig])
async def list_environments(user_id: str = Depends(get_current_user)):
    """List all available environments from Supabase."""
    if not user_id:
        return []
    
    from database import db
    envs_data = db.get_environments(user_id)
    return [EnvironmentConfig(**env) for env in envs_data]


@app.post("/api/environments", response_model=EnvironmentConfig)
async def create_environment(request: EnvironmentConfig, user_id: str = Depends(get_current_user)):
    """Create or update an environment in Supabase."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    from database import db
    env_data = db.save_environment(user_id, request.dict())
    if not env_data:
        raise HTTPException(status_code=500, detail="Failed to save environment")
        
    return EnvironmentConfig(**env_data)


@app.delete("/api/environments/{env_id}")
async def delete_environment(env_id: str, user_id: str = Depends(get_current_user)):
    """Delete an environment from Supabase."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    from database import db
    success = db.delete_environment(user_id, env_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete environment")
        
    return {"status": "deleted"}


# ============================================================================
# SCENARIO EXPANSION ENDPOINTS (Post-V1 Feature)
# ============================================================================

from models import (
    ScenarioTemplate, Scenario, ScenarioSet, 
    ScenarioExecutionRequest, ScenarioExecutionResult, ScenarioSuiteReport
)
from scenarios import ScenarioTemplateGenerator, ScenarioValidator


@app.post("/api/scenarios/generate-template", response_model=ScenarioTemplate)
async def generate_scenario_template(flow: FlowGraph):
    """
    Generate CSV template from a RUNNABLE flow.
    
    Analyzes the flow to identify data input blocks and creates a CSV template
    with semantic column headers.
    """
    try:
        template = ScenarioTemplateGenerator.generate_template(flow)
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Template generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate template")


@app.post("/api/scenarios/download-template")
async def download_scenario_template(flow: FlowGraph):
    """
    Generate and download CSV template as a file.
    
    Returns CSV content with proper headers for download.
    """
    try:
        template = ScenarioTemplateGenerator.generate_template(flow)
        csv_content = ScenarioTemplateGenerator.template_to_csv(template)
        
        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=scenario_template.csv"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Template download error: {e}")
        raise HTTPException(status_code=500, detail="Failed to download template")


@app.post("/api/scenarios/validate")
async def validate_scenarios(
    csv_file: UploadFile = File(...),
    flow: str = Form(...)
):
    """
    Validate uploaded CSV against flow template.
    
    Returns parsed scenarios or validation errors.
    """
    logger.info(f"Received validation request. CSV: {csv_file.filename}, Flow string length: {len(flow)}")
    try:
        # Parse flow from JSON string
        try:
            flow_data = json.loads(flow)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in flow parameter: {e}")
            logger.debug(f"Raw flow content: {flow[:500]}...")
            raise HTTPException(status_code=400, detail=f"Invalid flow JSON: {str(e)}")

        try:
            flow_graph = FlowGraph(**flow_data)
        except ValidationError as e:
            logger.error(f"FlowGraph validation error: {e}")
            raise HTTPException(status_code=400, detail={"errors": e.errors(), "msg": "Flow schema validation failed"})
        
        # Generate template from flow
        template = ScenarioTemplateGenerator.generate_template(flow_graph)
        
        # Read CSV content
        csv_content = await csv_file.read()
        csv_text = csv_content.decode('utf-8')
        
        # Validate and parse
        scenarios, errors = ScenarioValidator.validate_and_parse(csv_text, template)
        
        if errors:
            logger.warning(f"CSV validation found {len(errors)} errors")
            raise HTTPException(status_code=400, detail={"errors": errors})
        
        logger.info(f"Successfully validated {len(scenarios)} scenarios")
        return {"scenarios": scenarios, "count": len(scenarios)}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected CSV validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scenarios/execute")
async def execute_scenarios_endpoint(request: ScenarioExecutionRequest, background_tasks: BackgroundTasks):
    """
    Execute flow with multiple scenarios as a background task.
    
    Returns a suite_id immediately which can be used to track progress.
    """
    import time
    suite_id = f"suite_{uuid.uuid4().hex[:8]}"
    
    # Initialize status
    suite_executions[suite_id] = {
        "suite_id": suite_id,
        "status": "running",
        "file_name": request.flow.name,
        "total": len(request.scenarios),
        "current": 0,
        "current_scenario": "",
        "current_step": "Initializing...",
        "results": [],
        "started_at": time.time(),
        "finished_at": None
    }
    
    # Start background task
    background_tasks.add_task(run_scenario_suite, suite_id, request)
    
    return {"suite_id": suite_id}


def run_scenario_suite(suite_id: str, request: ScenarioExecutionRequest):
    """Background worker for scenario suite execution."""
    import time
    status = suite_executions[suite_id]
    try:
        from scenarios import ScenarioTemplateGenerator
        from models import ScenarioExecutionResult, ScenarioSuiteReport, ExecutionReport
        
        results: List[ScenarioExecutionResult] = []
        
        for idx, scenario in enumerate(request.scenarios):
            status["current"] = idx + 1
            status["current_scenario"] = scenario.scenario_name
            status["current_step"] = "Preparing browser..."
            
            run_id = f"{scenario.scenario_name}_{uuid.uuid4().hex[:8]}"
            engine = SeleniumEngine(headless=True)
            
            try:
                def on_event(event_type, block_id, data):
                    if event_type == 'block_execution' and data.get('status') == 'running':
                        status["current_step"] = data.get('message', 'Executing block...')

                interpreter = BlockInterpreter(engine, on_event=on_event)
                
                # Build variables
                env_vars = {}
                if request.environment_id:
                    # Fetch environment from DB
                    from database import db
                    try:
                        resp = db.client.table("environments").select("*").eq("id", request.environment_id).execute()
                        if resp.data:
                            env_config = EnvironmentConfig(**resp.data[0])
                            env_vars = {
                                "BASE_URL": env_config.base_url or "",
                                **env_config.variables
                            }
                    except Exception as e:
                        logger.error(f"Failed to fetch environment {request.environment_id} for scenario: {e}")
                
                for var_name, value in scenario.values.items():
                    env_vars[var_name] = value
                
                execution_result = interpreter.execute_flow(
                    request.flow,
                    run_id=run_id,
                    initial_variables=env_vars,
                    scenario_name=scenario.scenario_name
                )
                
                # Store report in history for inspection
                if interpreter.context and interpreter.context.report:
                    execution_history[run_id] = interpreter.context.report

                res = ScenarioExecutionResult(
                    scenario_name=scenario.scenario_name,
                    run_id=run_id,
                    success=execution_result.success,
                    report=interpreter.context.report if interpreter.context else None
                )
                results.append(res)
                status["results"].append(res.dict())
                
            except Exception as e:
                logger.error(f"Scenario '{scenario.scenario_name}' failed: {e}")
                failed_report = ExecutionReport(
                    run_id=run_id,
                    scenario_name=scenario.scenario_name,
                    started_at=time.time(),
                    finished_at=time.time(),
                    success=False
                )
                res = ScenarioExecutionResult(
                    scenario_name=scenario.scenario_name,
                    run_id=run_id,
                    success=False,
                    report=failed_report
                )
                results.append(res)
                status["results"].append(res.dict())
            finally:
                engine.close()
        
        status["status"] = "completed"
        status["finished_at"] = time.time()
        
        # Save to history for permanent retrieval
        from models import ScenarioSuiteReport
        suite_report = ScenarioSuiteReport(
            suite_id=suite_id,
            flow_name=request.flow.name,
            started_at=status["started_at"],
            finished_at=status["finished_at"],
            results=results
        )
        # We need a place for suite history
        # (Assuming we might want to store it, but status is used for immediate dashboard)

    except Exception as e:
        logger.error(f"Suite execution error: {e}", exc_info=True)
        status["status"] = "failed"
        status["error"] = str(e)


@app.get("/api/scenarios/status/{suite_id}")
async def get_suite_status_stream(suite_id: str):
    """SSE stream for scenario suite progress updates."""
    async def event_generator():
        while True:
            status = suite_executions.get(suite_id)
            if not status:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Suite not found'})}\n\n"
                break
            
            yield f"data: {json.dumps(status)}\n\n"
            
            if status.get("status") in ["completed", "failed"]:
                break
            
            await asyncio.sleep(0.1)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/scenarios/suite/{suite_id}")
async def get_suite_report(suite_id: str):
    """Fetch a completed suite report."""
    status = suite_executions.get(suite_id)
    if not status:
        raise HTTPException(status_code=404, detail="Suite report not found")
    
    if status.get("status") != "completed":
         raise HTTPException(status_code=400, detail="Suite execution not finished")
         
    return status


@app.get("/api/scenarios/suite/{suite_id}/report/json")
async def download_suite_report_json(suite_id: str):
    """Download suite report as formatted JSON."""
    status = suite_executions.get(suite_id)
    if not status:
        raise HTTPException(status_code=404, detail="Suite report not found")
    
    # Clean all individual reports
    cleaned_status = dict(status)
    if 'results' in cleaned_status:
        cleaned_results = []
        for result in cleaned_status['results']:
            cleaned_result = dict(result)
            if 'report' in cleaned_result and cleaned_result['report']:
                cleaned_result['report'] = clean_report_for_disk(cleaned_result['report'])
            cleaned_results.append(cleaned_result)
        cleaned_status['results'] = cleaned_results
    
    from fastapi.responses import Response
    flow_name = cleaned_status.get('file_name', 'suite').replace(' ', '_').lower()
    return Response(
        content=json.dumps(cleaned_status, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={flow_name}_suite_{suite_id}.json"}
    )


@app.get("/api/scenarios/suite/{suite_id}/report/html")
async def download_suite_report_html(suite_id: str):
    """Download suite report as premium HTML."""
    status = suite_executions.get(suite_id)
    if not status:
        raise HTTPException(status_code=404, detail="Suite report not found")
    
    from datetime import datetime
    
    # Build suite HTML
    flow_name = status.get('file_name', 'Test Suite')
    total = status.get('total', 0)
    passed = sum(1 for r in status.get('results', []) if r.get('success'))
    failed = total - passed
    success = failed == 0
    
    started_at = status.get('started_at', 0)
    finished_at = status.get('finished_at', 0)
    execution_time = datetime.fromtimestamp(started_at).strftime('%B %d, %Y at %I:%M %p')
    duration = f"{(finished_at - started_at):.1f}s" if finished_at else "N/A"
    
    
    # Render each scenario with full execution details
    scenarios_html = ""
    for idx, result in enumerate(status.get('results', []), 1):
        scenario_name = result.get('scenario_name', f'Scenario {idx}')
        scenario_success = result.get('success', False)
        scenario_status = "success" if scenario_success else "failed"
        
        # Get full report data
        report = result.get('report', {})
        blocks = report.get('blocks', [])
        
        # Scenario header
        scenarios_html += f"""
        <div class="scenario-item">
            <div class="scenario-header">
                <div class="scenario-info">
                    <div class="block-status {scenario_status}"></div>
                    <div class="scenario-name">{scenario_name}</div>
                </div>
                <div class="scenario-badge {scenario_status}">
                    {'PASSED' if scenario_success else 'FAILED'}
                </div>
            </div>
            <div class="scenario-details">
        """
        
        # Render blocks if available
        if blocks:
            for b_idx, block in enumerate(blocks, 1):
                b_type = block.get('block_type', 'unknown')
                b_status = block.get('status', 'success')
                duration = block.get('duration_ms', 0)
                screenshot = block.get('screenshot', '')
                tier_2_evidence = block.get('tier_2_evidence')
                
                scenarios_html += f"""
                <div class="block-detail">
                    <div class="block-header">
                        <span class="block-number">Step {b_idx}</span>
                        <span class="block-type">{b_type}</span>
                        <span class="block-duration">{duration:.0f}ms</span>
                        <span class="block-badge {b_status}">{b_status.upper()}</span>
                    </div>
                """
                
                # Add screenshot if available
                if screenshot:
                    scenarios_html += f"""
                    <div class="screenshot-container">
                        <img src="{screenshot}" alt="Screenshot for {b_type}" class="screenshot-img" />
                    </div>
                    """
                
                # Add evidence if available
                if tier_2_evidence:
                    import json as json_lib
                    evidence_json = json_lib.dumps(tier_2_evidence, indent=2)
                    
                    scenarios_html += f"""
                    <div class="evidence-container">
                        <div class="evidence-header">
                            <div class="evidence-label">Data Evidence</div>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                Copy
                            </button>
                        </div>
                        <pre class="evidence-code">{evidence_json}</pre>
                    </div>
                    """
                
                scenarios_html += "</div>"  # Close block-detail
        else:
            scenarios_html += "<p class='no-details'>No execution details available</p>"
        
        scenarios_html += """
            </div>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WebLens Suite Report | {suite_id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg: #09090b;
                --card: #18181b;
                --border: #27272a;
                --muted: #71717a;
                --text: #e4e4e7;
                --indigo: #6366f1;
                --green: #22c55e;
                --red: #ef4444;
            }}
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: 'Inter', sans-serif; 
                background: var(--bg); 
                color: var(--text); 
                line-height: 1.6;
                padding: 40px 20px;
            }}
            .container {{ max-width: 1000px; margin: 0 auto; }}
            header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--border);
            }}
            .logo {{
                font-weight: 800;
                font-size: 1.5rem;
                letter-spacing: -0.02em;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            .logo span {{ color: var(--indigo); }}
            .status-badge {{
                padding: 6px 16px;
                border-radius: 99px;
                font-weight: 700;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }}
            .status-badge.success {{ background: rgba(34, 197, 94, 0.1); color: var(--green); border: 1px solid rgba(34, 197, 94, 0.2); }}
            .status-badge.failed {{ background: rgba(239, 68, 68, 0.1); color: var(--red); border: 1px solid rgba(239, 68, 68, 0.2); }}
            .meta-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }}
            .meta-item {{
                background: var(--card);
                padding: 20px;
                border-radius: 12px;
                border: 1px solid var(--border);
            }}
            .meta-label {{
                font-size: 0.7rem;
                font-weight: 700;
                color: var(--muted);
                text-transform: uppercase;
                margin-bottom: 8px;
                letter-spacing: 0.05em;
            }}
            .meta-value {{ font-weight: 500; font-size: 0.95rem; }}
            h2 {{ 
                font-size: 1.25rem; 
                margin-bottom: 24px; 
                display: flex;
                align-items: center;
                gap: 12px;
            }}
            h2::before {{
                content: '';
                width: 4px;
                height: 20px;
                background: var(--indigo);
                border-radius: 2px;
            }}
            .scenario-list {{ display: flex; flex-direction: column; gap: 12px; }}
            .scenario-item {{
                background: var(--card);
                border-radius: 12px;
                border: 1px solid var(--border);
                overflow: hidden;
                transition: border-color 0.2s;
            }}
            .scenario-item:hover {{ border-color: var(--indigo); }}
            .scenario-header {{
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .scenario-info {{ display: flex; align-items: center; gap: 12px; }}
            .scenario-name {{ font-weight: 600; font-size: 0.9rem; }}
            .block-status {{ width: 8px; height: 8px; border-radius: 50%; }}
            .block-status.success {{ background: var(--green); box-shadow: 0 0 8px var(--green); }}
            .block-status.failed {{ background: var(--red); box-shadow: 0 0 8px var(--red); }}
            .scenario-badge {{
                padding: 4px 12px;
                border-radius: 12px;
                font-weight: 700;
                font-size: 0.7rem;
                letter-spacing: 0.05em;
            }}
            .scenario-badge.success {{ background: rgba(34, 197, 94, 0.1); color: var(--green); }}
            .scenario-badge.failed {{ background: rgba(239, 68, 68, 0.1); color: var(--red); }}
            .scenario-details {{
                padding: 16px;
                background: var(--bg);
                border-top: 1px solid var(--border);
            }}
            .block-detail {{
                margin-bottom: 16px;
                padding: 12px;
                background: var(--card);
                border-radius: 8px;
                border: 1px solid var(--border);
            }}
            .block-header {{
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                font-size: 0.85rem;
            }}
            .block-number {{
                font-weight: 700;
                color: var(--muted);
                font-size: 0.75rem;
            }}
            .block-type {{
                font-weight: 600;
                color: var(--text);
            }}
            .block-duration {{
                font-size: 0.75rem;
                color: var(--muted);
                margin-left: auto;
            }}
            .block-badge {{
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 700;
                font-size: 0.65rem;
                letter-spacing: 0.05em;
            }}
            .block-badge.success {{ background: rgba(34, 197, 94, 0.1); color: var(--green); }}
            .block-badge.failed {{ background: rgba(239, 68, 68, 0.1); color: var(--red); }}
            .screenshot-container {{
                margin: 12px 0;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid var(--border);
            }}
            .screenshot-img {{
                width: 100%;
                height: auto;
                display: block;
            }}
            .evidence-container {{
                margin-top: 12px;
                padding: 12px;
                background: var(--bg);
                border-radius: 6px;
                border: 1px solid var(--border);
            }}
            .evidence-label {{
                font-size: 0.75rem;
                font-weight: 700;
                color: var(--muted);
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }}
            .evidence-code {{
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.75rem;
                color: var(--text);
                margin: 0;
                white-space: pre-wrap;
                word-break: break-word;
            }}
            .no-details {{
                color: var(--muted);
                font-size: 0.85rem;
                font-style: italic;
                padding: 12px;
            }}
            .evidence-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }}
            .copy-btn {{
                background: transparent;
                border: 1px solid var(--border);
                color: var(--muted);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.7rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s;
                font-family: 'JetBrains Mono', monospace;
                text-transform: uppercase;
            }}
            .copy-btn:hover {{
                border-color: var(--text);
                color: var(--text);
                background: rgba(255,255,255,0.05);
            }}
            footer {{
                margin-top: 60px;
                text-align: center;
                color: var(--muted);
                font-size: 0.75rem;
                border-top: 1px solid var(--border);
                padding-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="logo">Web<span>Lens</span> Suite Report</div>
                <div class="status-badge {'success' if success else 'failed'}">
                    {passed}/{total} PASSED
                </div>
            </header>

            <div class="meta-grid">
                <div class="meta-item">
                    <div class="meta-label">Flow Name</div>
                    <div class="meta-value">{flow_name}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Suite ID</div>
                    <div class="meta-value" style="font-family: monospace; font-size: 0.8rem;">{suite_id}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Executed On</div>
                    <div class="meta-value">{execution_time}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Duration</div>
                    <div class="meta-value">{duration}</div>
                </div>
            </div>

            <h2>Scenario Results</h2>
            <div class="scenario-list">
                {scenarios_html}
            </div>

            <footer>
                Generated by WebLens Engine &copy; 2026. All rights reserved.
            </footer>
        </div>
        </div>
        <script>
            function copyToClipboard(btn) {{
                // Decode HTML entities if needed, but here we pass the escaped string locally.
                // Actually, passing large JSON in onclick attribute is risky. 
                // Better approach: verify if we can select the sibling pre tag.
                const pre = btn.parentElement.nextElementSibling;
                const code = pre.innerText;
                
                navigator.clipboard.writeText(code).then(() => {{
                    const originalHtml = btn.innerHTML;
                    btn.innerHTML = 'Copied!';
                    btn.style.color = 'var(--green)';
                    btn.style.borderColor = 'var(--green)';
                    
                    setTimeout(() => {{
                        btn.innerHTML = originalHtml;
                        btn.style.color = '';
                        btn.style.borderColor = '';
                    }}, 2000);
                }}).catch(err => {{
                    console.error('Failed to copy: ', err);
                }});
            }}
        </script>
    </body>
    </html>
    """
    
    from fastapi.responses import Response
    flow_name_slug = flow_name.replace(' ', '_').lower()
    return Response(
        content=html_content,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename={flow_name_slug}_suite_{suite_id}.html"}
    )


@app.get("/api/scenarios/suite/{suite_id}/report/pdf")
async def download_suite_report_pdf(suite_id: str):
    """Download suite report as PDF with all scenario details."""
    status = suite_executions.get(suite_id)
    if not status:
        raise HTTPException(status_code=404, detail="Suite report not found")
    
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from datetime import datetime
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    flow_name = status.get('file_name', 'Test Suite')
    total = status.get('total', 0)
    passed = sum(1 for r in status.get('results', []) if r.get('success'))
    failed = total - passed
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("WebLens Suite Report", title_style))
    story.append(Paragraph(f"{flow_name}", styles['Heading2']))
    story.append(Spacer(1, 0.3*inch))
    
    # Summary table
    started_at = status.get('started_at', 0)
    finished_at = status.get('finished_at', 0)
    execution_time = datetime.fromtimestamp(started_at).strftime('%B %d, %Y at %I:%M %p')
    duration = f"{(finished_at - started_at):.1f}s" if finished_at else "N/A"
    
    summary_data = [
        ['Suite ID:', suite_id],
        ['Executed:', execution_time],
        ['Duration:', duration],
        ['Total Scenarios:', str(total)],
        ['Passed:', str(passed)],
        ['Failed:', str(failed)],
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 4*inch])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.4*inch))
    
    # Scenario results with full details
    story.append(Paragraph("Scenario Results", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    for idx, result in enumerate(status.get('results', []), 1):
        scenario_name = result.get('scenario_name', f'Scenario {idx}')
        scenario_success = result.get('success', False)
        
        # Scenario header
        status_text = "PASSED" if scenario_success else "FAILED"
        status_color = colors.green if scenario_success else colors.red
        
        header_text = f"<b>{idx}. {scenario_name}</b> - <font color='{'green' if scenario_success else 'red'}'>{status_text}</font>"
        story.append(Paragraph(header_text, styles['Heading3']))
        story.append(Spacer(1, 0.1*inch))
        
        # Get full report data
        report = result.get('report', {})
        blocks = report.get('blocks', [])
        
        if blocks:
            for b_idx, block in enumerate(blocks, 1):
                b_type = block.get('block_type', 'unknown')
                b_status = block.get('status', 'success')
                duration = block.get('duration_ms', 0)
                
                # Block header
                block_text = f"<b>Step {b_idx}: {b_type}</b> ({duration:.0f}ms) - {b_status.upper()}"
                story.append(Paragraph(block_text, styles['Normal']))
                
                # Screenshot
                if block.get('screenshot'):
                    try:
                        from io import BytesIO
                        from reportlab.platypus import Image as RLImage
                        import base64
                        
                        img_data = block['screenshot']
                        if img_data.startswith('data:image'):
                            img_data = img_data.split(',')[1]
                        
                        img_buffer = BytesIO(base64.b64decode(img_data))
                        img = RLImage(img_buffer, width=4*inch, height=2.4*inch)
                        story.append(Spacer(1, 0.05*inch))
                        story.append(img)
                    except Exception as e:
                        story.append(Paragraph(f"<i>Screenshot unavailable: {str(e)}</i>", styles['Normal']))
                
                # Evidence
                if block.get('tier_2_evidence'):
                    import json as json_lib
                    evidence_json = json_lib.dumps(block['tier_2_evidence'], indent=2)
                    if len(evidence_json) > 300:
                        evidence_json = evidence_json[:300] + "..."
                    story.append(Spacer(1, 0.05*inch))
                    story.append(Paragraph(f"<font name='Courier' size=7>{evidence_json}</font>", styles['Code']))
                
                story.append(Spacer(1, 0.1*inch))
        else:
            story.append(Paragraph(f"<i>No execution details available</i>", styles['Normal']))
        
        story.append(Spacer(1, 0.2*inch))
        
        # Add page break between scenarios for better readability
        if idx < len(status.get('results', [])):
            story.append(PageBreak())
    
    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    from fastapi.responses import Response
    flow_name_slug = flow_name.replace(' ', '_').lower()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={flow_name_slug}_suite_{suite_id}.pdf"}
    )


@app.post("/api/flows/update-with-set", response_model=FlowGraph)
async def update_flow_with_scenario_set(
    flow: FlowGraph,
    set_name: str,
    scenarios: List[Scenario]
):
    """
    Utility endpoint to add a named scenario set to a flow graph.
    Returns the updated flow graph with the new set included.
    """
    import time
    new_set = ScenarioSet(
        id=f"set_{uuid.uuid4().hex[:8]}",
        name=set_name,
        scenarios=scenarios,
        created_at=time.time()
    )
    
    flow.scenario_sets.append(new_set)
    return flow


# --- Static Files (Must be last) ---

# Determine frontend directory
try:
    # PyInstaller mode
    frontend_dir = Path(sys._MEIPASS) / "frontend"
except AttributeError:
    # Development mode (assuming cwd is backend/)
    # But often we run from root. launcher.py sets cwd to backend/
    # If cwd is backend/, then frontend is at ../frontend/dist
    frontend_dir = Path("..") / "frontend" / "dist"

if frontend_dir.exists():
    logger.info(f"Serving static files from {frontend_dir.absolute()}")
    app.mount("/", CachedStaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    logger.warning(f"Frontend directory not found at {frontend_dir.absolute()}. UI will not load.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
