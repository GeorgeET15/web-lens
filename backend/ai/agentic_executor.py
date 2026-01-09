import json
import logging
import time
import uuid
from typing import Dict, Any, List, Optional
from models import FlowGraph, ExecutionResult
from browser_engine import SeleniumEngine
from interpreter import BlockInterpreter
from .ai_service import AIService

logger = logging.getLogger(__name__)

class AgenticExecutor:
    """
    Orchestrates "Plan-then-Execute" (Agentic) runs.
    
    1. Plans the flow using LLM Translator.
    2. Parses the plan into a FlowGraph.
    3. Executes the FlowGraph using the standard interpreter.
    """
    
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    async def plan_intent(self, user_intent: str, existing_engine: Optional[SeleniumEngine] = None) -> Dict[str, Any]:
        """
        Plan a natural language intent with perception-aware dynamic context.
        Returns the planned blocks and metadata.
        """
        logger.info(f"[EXPERIMENTAL] Agentic Planning: Starting for intent: '{user_intent}'")
        
        # Perception Phase (Use existing engine if provided, else headless)
        engine = existing_engine or SeleniumEngine(headless=True)
        should_close = existing_engine is None
        
        try:
            # 1. Discover URL and Perceive Page
            target_url = None
            if "Navigate to " in user_intent and " and then: " in user_intent:
                target_url = user_intent.split("Navigate to ")[1].split(" and then: ")[0].strip()
            
            page_context = "Unknown (Initial navigation failed or not provided)"
            if target_url:
                try:
                    logger.info(f"[EXPERIMENTAL] Perception Phase: Navigating to {target_url}...")
                    engine.open_page(target_url)
                    time.sleep(2) # Wait for redirects/SPA stability
                    page_context = self._perceive_page(engine)
                    logger.info("Perception Phase: Context captured.")
                except Exception as e:
                    logger.warning(f"Perception Phase failed: {e}. Planning blindly.")
            else:
                # No navigation requested, perceive current state of the existing engine
                try:
                    logger.info("Perception Phase: Perceiving current page state...")
                    page_context = self._perceive_page(engine)
                    
                    # Ensure context is not just an empty string
                    if not page_context or page_context.strip() == "":
                        current_url = engine.get_current_url()
                        page_context = f"Blank Page (URL: {current_url}). No interactive elements detected."
                        
                    logger.info(f"[EXPERIMENTAL] Perception Phase: Current context captured (len={len(page_context)}).")
                except Exception as e:
                    logger.warning(f"Current page perception failed: {e}. Planning blindly.")

            # 2. Plan Phase (with context)
            plan_response = await self.ai_service.plan_agentic(user_intent, page_context=page_context)
            logger.info(f"[EXPERIMENTAL] Agentic Planning: Plan received (len={len(plan_response)})")
            
            # 3. Extract Blocks
            blocks = self._extract_blocks(plan_response)
            if not blocks:
                logger.error(f"Agentic Planning FAILED: No JSON blocks found in response: {plan_response}")
                raise Exception("AI failed to generate a valid plan for this intent.")
            
            # 4. Preparation Phase (Flatten & Link)
            flattened_blocks = []
            for i, block_data in enumerate(blocks):
                # Flatten params into top-level
                params = block_data.get("params", {})
                flat_block = {
                    "id": block_data.get("id", f"ai_block_{uuid.uuid4().hex[:8]}"),
                    "type": block_data.get("type"),
                    "label": block_data.get("label", ""),
                    **params
                }
                
                # Link to next block
                if i < len(blocks) - 1:
                    next_id = blocks[i+1].get("id")
                    if not next_id:
                        next_id = f"ai_block_{uuid.uuid4().hex[:8]}"
                        blocks[i+1]["id"] = next_id
                    flat_block["next_block"] = next_id
                    
                flattened_blocks.append(flat_block)

            explanation = plan_response.split("---JSON_END---")[-1].strip()

            return {
                "success": True,
                "planned_blocks": flattened_blocks,
                "explanation": explanation,
                "original_plan": plan_response
            }
        finally:
            if should_close:
                engine.close()

    def _perceive_page(self, engine: SeleniumEngine) -> str:
        """Extract a semantic summary of the current page for the AI using perception.js."""
        from pathlib import Path
        perception_path = Path(__file__).parent / "perception.js"
        
        script = "return 'Could not load perception script.';"
        if perception_path.exists():
            script = perception_path.read_text()
            
        try:
            return engine.execute_script(script)
        except Exception as e:
            logger.warning(f"Perception script execution failed: {e}")
            return "Could not extract page context."

    def _extract_blocks(self, response: str) -> List[Dict[str, Any]]:
        """Extract JSON blocks from LLM response reliably."""
        try:
            start_tag = "---JSON_START---"
            end_tag = "---JSON_END---"
            
            # Find the last start tag to avoid catching instructions or "thinking" tags
            start_idx = response.rfind(start_tag)
            if start_idx == -1:
                logger.warning("No JSON start tag found in agentic response.")
                return []
                
            end_idx = response.find(end_tag, start_idx)
            if end_idx == -1:
                logger.warning("No JSON end tag found after start tag in agentic response.")
                return []
            
            json_str = response[start_idx + len(start_tag):end_idx].strip()
            json_str = response[start_idx + len(start_tag):end_idx].strip()
            if not json_str:
                logger.warning("JSON payload between tags is empty.")
                return []
                
            return json.loads(json_str)
        except Exception as e:
            print(f"DEBUG: _extract_blocks failed: {e}", flush=True)
            print(f"DEBUG: Full LLM response: {response}", flush=True)
            logger.error(f"Failed to extract blocks from agentic plan: {e}")
            logger.info(f"DEBUG: Full response from LLM for failed parse: {response}")
            return []
