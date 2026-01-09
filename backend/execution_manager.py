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
environments: Dict[str, EnvironmentConfig] = {
    "prod": EnvironmentConfig(id="prod", name="Production", variables={}), 
    "staging": EnvironmentConfig(id="staging", name="Staging", variables={})
}
suite_executions: Dict[str, Any] = {}

def clean_report_for_disk(report: Dict[str, Any]) -> Dict[str, Any]:
    """Remove heavy base64 images from report for compact storage."""
    report_copy = copy.deepcopy(report)
    if 'blocks' in report_copy:
        for block in report_copy['blocks']:
            if 'screenshot' in block:
                block['screenshot'] = None
    if 'result' in report_copy and report_copy['result'] and 'screenshot' in report_copy['result']:
        report_copy['result']['screenshot'] = None
    return report_copy

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
                            inline_environment: Optional[EnvironmentConfig] = None):
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
            env = environments.get(environment_id)
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
        # 6. Execute with Interpreter
        interpreter = BlockInterpreter(browser_engine, on_event=on_event)
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
            browser_engine.close()
        q.put(None)

def start_execution(flow_data: Dict[str, Any], headless: bool = True, variables: Optional[Dict[str, str]] = None) -> str:
    """Unified entry point for any flow execution."""
    run_id = str(uuid.uuid4())
    event_queues[run_id] = queue.Queue()
    
    thread = Thread(target=execute_flow_background, args=(
        run_id, 
        flow_data, 
        headless, 
        variables
    ))
    thread.start()
    return run_id
