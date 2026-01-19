import logging
import json
import uuid
import queue
import time
import os
import shutil
import copy
from pathlib import Path
from threading import Thread
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import HTTPException

import config
from models import FlowGraph, ExecutionResult, ExecutionReport, EnvironmentConfig
from browser_engine import SeleniumEngine
from interpreter import BlockInterpreter

logger = logging.getLogger(__name__)

# --- Unified State ---
event_queues: Dict[str, queue.Queue] = {}
execution_history: Dict[str, ExecutionReport] = {}
MAX_HISTORY_ENTRIES = 100 # Memory safety limit
# environments: Dict[str, EnvironmentConfig] = {} # Removed for Supabase persistence
suite_executions: Dict[str, Any] = {}

def clean_report_for_disk(report: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepares report for disk storage. 
    We now keep screenshots to allow shared links to be 'live' with full evidence.
    """
    return copy.deepcopy(report)

def render_html_report(report: Dict[str, Any]) -> str:
    """Render a premium HTML report using the dedicated template."""
    run_id = report.get('run_id', 'unknown')
    flow_name = report.get('flow_name', 'Untitled Flow')
    success = report.get('success', False)
    
    # Load template (Expected in backend root)
    backend_dir = Path(__file__).parent
    template_path = backend_dir / "report_template.html"
    
    if not template_path.exists():
        return f"<html><body style='background:#09090b;color:#fff;padding:40px;font-family:sans-serif;'><h1>WebLens Report</h1><p>Template file missing at {template_path}</p></body></html>"
        
    with open(template_path, "r") as f:
        html = f.read()
    
    status_text = "PASSED" if success else "FAILED"
    status_class = "success" if success else "failed"
    
    error_html = ""
    if not success and report.get('error'):
        err = report['error']
        error_html = f"""
        <div class="error-section">
            <div class="error-title">{err.get('title', 'Execution Error')}</div>
            <div class="error-details">
                <strong>Reason:</strong> {err.get('reason', 'Unknown error')}<br/>
                <strong>Intent:</strong> {err.get('intent', 'N/A')}
            </div>
            {f'<div class="error-suggestion"><strong>Suggestion:</strong> {err["suggestion"]}</div>' if err.get('suggestion') else ''}
        </div>
        """
    
    blocks_html = ""
    for block in report.get('blocks', []):
        b_type = block.get('block_type', 'unknown')
        duration = block.get('duration_ms', 0)
        b_status = block.get('status', 'success')
        trace_items = "".join([f'<li class="trace-item">{t}</li>' for t in block.get('taf', {}).get('trace', [])])
        
        screenshot_html = ""
        if block.get('screenshot'):
            screenshot_html = f'<div class="screenshot-frame"><img src="{block["screenshot"]}" loading="lazy"/></div>'
            
        data_html = ""
        if block.get('tier_2_evidence'):
            evidence_json = json.dumps(block['tier_2_evidence'], indent=2)
            data_html = f'<div class="data-evidence"><strong>Data Evidence:</strong><pre>{evidence_json}</pre></div>'
            
        blocks_html += f"""
        <div class="block">
            <div class="block-header">
                <div class="block-info">
                    <div class="block-status {b_status}"></div>
                    <div class="block-type">{b_type}</div>
                </div>
                <div class="block-duration">{duration:.0f}ms</div>
            </div>
            <div class="block-content">
                <ul class="trace-list">{trace_items}</ul>
                {data_html}
                {screenshot_html}
            </div>
        </div>
        """
        
    timestamp = report.get('started_at', 0)
    execution_time = datetime.fromtimestamp(timestamp).strftime('%B %d, %Y at %I:%M %p')
    
    html = html.replace('{{run_id}}', run_id)
    html = html.replace('{{flow_name}}', flow_name)
    html = html.replace('{{status_text}}', status_text)
    html = html.replace('{{status_class}}', status_class)
    html = html.replace('{{execution_time}}', execution_time)
    html = html.replace('{{error_html}}', error_html)
    html = html.replace('{{blocks_html}}', blocks_html)
    
    return html

def generate_pdf_report(report: Dict[str, Any]) -> bytes:
    """Generate PDF report using WeasyPrint from standard HTML template."""
    try:
        from weasyprint import HTML
        
        # Reuse the standard HTML rendering logic (dark mode)
        html_content = render_html_report(report)
        
        # Convert HTML to PDF
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        return pdf_bytes
    except ImportError:
        logger.error("WeasyPrint not installed. Install with: pip install weasyprint")
        # Return a minimal error PDF instead of crashing
        error_html = """
        <html>
        <body style="font-family: sans-serif; padding: 40px; background: #09090b; color: #fff;">
            <h1>PDF Generation Error</h1>
            <p>WeasyPrint library is not installed.</p>
            <p>Install it with: <code>pip install weasyprint</code></p>
        </body>
        </html>
        """
        return error_html.encode('utf-8')
    except Exception as e:
        logger.error(f"PDF generation failed: {e}", exc_info=True)
        # Return error message as plain text instead of crashing
        error_msg = f"PDF generation failed: {str(e)}"
        return error_msg.encode('utf-8')

def execute_flow_background(run_id: str, flow_data: Dict[str, Any], headless: bool, 
                            variables: Optional[Dict[str, str]] = None, 
                            environment_id: Optional[str] = None,
                            inline_environment: Optional[EnvironmentConfig] = None,
                            user_id: Optional[str] = None):
    """Executes flow in background and pushes events to queue."""
    logger.info(f"[{run_id}] Starting background execution (Foundation)")
    
    q = event_queues.get(run_id)
    if not q:
        logger.error(f"[{run_id}] Event queue not found!")
        return

    browser_engine = None
    try:
        # 1. Notify Start
        q.put({"type": "execution_start", "data": {"run_id": run_id}})

        # 2. Resolve final variable set
        merged_variables = {}
        env = inline_environment
        if not env and environment_id:
            from database import db
            if user_id:
                try:
                    resp = db.client.table("environments").select("*").eq("id", environment_id).eq("user_id", user_id).execute()
                    if resp.data:
                        env = EnvironmentConfig(**resp.data[0])
                except Exception as e:
                    logger.error(f"[{run_id}] Failed to fetch environment {environment_id}: {e}")
            
        if env:
            merged_variables.update(env.variables)
            q.put({"type": "block_execution", "data": {
                "block_id": "system",
                "type": "trace",
                "message": f"Environment '{env.name}' applied."
            }})

        if variables:
            merged_variables.update(variables)

        # 3. Parse Flow
        flow = FlowGraph(**flow_data)

        # 4. Setup Engine
        browser_engine = SeleniumEngine(headless=headless)
        
        # 5. Define Callback for Real-Time Updates
        def on_event(event_type, block_id, data):
            data['block_id'] = block_id
            q.put({"type": "block_execution", "data": data})

        # 6. Execute with Interpreter
        interpreter = BlockInterpreter(browser_engine, on_event=on_event)
        
        # EXPOSE REPORT LIVE: Add to history immediately so /api/reports/ can fetch current state
        if interpreter.context:
            # Memory Management: Prune oldest entries if history is too large
            if len(execution_history) >= MAX_HISTORY_ENTRIES:
                oldest_id = next(iter(execution_history))
                del execution_history[oldest_id]
                logger.info(f"Pruned oldest execution {oldest_id} to maintain memory safety.")
                
            execution_history[run_id] = interpreter.context.report
            
        result = interpreter.execute_flow(
            flow, 
            run_id=run_id, 
            initial_variables=merged_variables,
            scenario_name=flow.name
        )

        # 7. Capture and Persist Final Report
        if interpreter.context:
            report = interpreter.context.report
            execution_history[run_id] = report
            
            try:
                full_report_dict = report.model_dump(mode='json')
                
                # --- Supabase Integration ---
                from database import db
                if db.is_enabled():
                    # 1. Upload Screenshots
                    # Note: We duplicate the dict to avoid modifying the in-memory object used for the UI immediate response
                    cloud_report = copy.deepcopy(full_report_dict)
                    
                    if 'blocks' in cloud_report:
                        for idx, block in enumerate(cloud_report['blocks']):
                            if block.get('screenshot'):
                                # Use unique filename: step_index + block_id
                                filename = f"step_{idx}_{block.get('block_id', 'unknown')}"
                                logger.info(f"[{run_id}] Uploading screenshot for step {idx} (block: {block.get('block_id')})")
                                
                                # Upload
                                url = db.upload_screenshot(block['screenshot'], run_id, filename)
                                if url:
                                    block['screenshot'] = url
                                else:
                                    logger.warning(f"[{run_id}] Failed to upload screenshot for step {idx}")
                                    block['screenshot'] = None # Failed/Disabled
                    
                    # 2. Save Execution Record
                    # ONLY save to Supabase if we have a valid user_id
                    if user_id:
                        db.save_execution(user_id=user_id, report=cloud_report)
                    else:
                        logger.info(f"[{run_id}] Skipping Supabase sync (Anonymous execution)")

                # --- Local Fallback / Legacy ---
                # Save HTML
                html_path = config.EXECUTIONS_DIR / f"{run_id}.html"
                html_content = render_html_report(full_report_dict)
                with open(html_path, "w") as f:
                    f.write(html_content)

                # Save JSON (clean)
                report_path = config.EXECUTIONS_DIR / f"{run_id}.json"
                clean_dict = clean_report_for_disk(full_report_dict)
                with open(report_path, "w") as f:
                    json.dump(clean_dict, f, indent=2)
            except Exception as pe:
                logger.error(f"[{run_id}] Failed to persist reports: {pe}")

        q.put({"type": "execution_complete", "data": {"result": "success" if result.success else "failed", "run_id": run_id}})

    except Exception as e:
        logger.error(f"[{run_id}] Execution failed: {e}", exc_info=True)
        q.put({"type": "error", "data": {"message": str(e)}})
    finally:
        if browser_engine:
            try:
                browser_engine.close()
            except Exception as e:
                logger.debug(f"[{run_id}] Cleanup: Error closing browser: {e}")
        
        # Cleanup event queue after a short delay to allow final reads
        q.put(None)
        
        import threading
        def delayed_cleanup():
            time.sleep(600) # Keep for 10 minutes for slower UI receivers
            if run_id in event_queues:
                del event_queues[run_id]
                logger.debug(f"[{run_id}] Cleaned up event queue.")
                
        threading.Thread(target=delayed_cleanup, daemon=True).start()

def start_execution(flow_data: Dict[str, Any], headless: bool = True, 
                    variables: Optional[Dict[str, str]] = None, 
                    environment_id: Optional[str] = None,
                    inline_environment: Optional[EnvironmentConfig] = None,
                    user_id: Optional[str] = None) -> str:
    """Unified entry point for any flow execution."""
    run_id = str(uuid.uuid4())
    event_queues[run_id] = queue.Queue()
    
    thread = Thread(target=execute_flow_background, args=(
        run_id, 
        flow_data, 
        headless, 
        variables,
        environment_id,
        inline_environment,
        user_id
    ))
    thread.start()
    return run_id

def delete_execution_data(run_id: str, user_id: Optional[str] = None) -> bool:
    """Permanently deletes an execution record from memory, disk, and cloud."""
    logger.info(f"[{run_id}] Deleting execution data...")
    
    # 1. Remove from Queue/Memory
    if run_id in execution_history:
        del execution_history[run_id]
        
    if run_id in event_queues:
        # If running, this might detach listeners but not kill thread.
        # Ideally we shouldn't delete running executions without stopping them first.
        del event_queues[run_id]

    # 2. Remove Local Files
    try:
        json_path = config.EXECUTIONS_DIR / f"{run_id}.json"
        if json_path.exists():
            os.remove(json_path)
            
        html_path = config.EXECUTIONS_DIR / f"{run_id}.html"
        if html_path.exists():
            os.remove(html_path)
    except Exception as e:
        logger.error(f"[{run_id}] Failed to delete local files: {e}")

    # 3. Remove from Cloud (if configured)
    from database import db
    if db.is_enabled() and user_id:
        try:
            db.delete_execution(run_id, user_id)
        except Exception as e:
            logger.error(f"[{run_id}] Failed to delete from Supabase: {e}")
            
    return True

def clear_all_executions(user_id: Optional[str] = None) -> bool:
    """Permanently clears ALL execution history."""
    logger.info("Clearing ALL execution history...")
    
    # 1. Clear Memory
    execution_history.clear()
    # Note: We don't clear event_queues as that would break active connections
    
    # 2. Clear Local Disk
    try:
        if config.EXECUTIONS_DIR.exists():
            # Delete all .json and .html files
            for file in config.EXECUTIONS_DIR.glob("*"):
                if file.suffix in ['.json', '.html']:
                    try:
                        os.remove(file)
                    except Exception as e:
                        logger.debug(f"Failed to remove file {file} during history clearing: {e}")
    except Exception as e:
        logger.error(f"Failed to clear local executions directory: {e}")

    # 3. Clear Cloud
    from database import db
    if db.is_enabled() and user_id:
        db.clear_user_history(user_id)
        
    return True
