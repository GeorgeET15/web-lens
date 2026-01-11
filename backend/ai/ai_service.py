import json
from typing import Optional, List, Dict, Any
from .providers.gemini import GeminiProvider

class AIService:
    def __init__(self):
        self.provider = GeminiProvider()
        
    def is_enabled(self) -> bool:
        """Check if the Gemini provider is available."""
        return self.provider.is_available()

    async def analyze_visual_diff(self, baseline_b64: str, current_b64: str, page_context: str) -> str:
        """Internal: Analyze visual differences using multimodal AI (Experimental)."""
        if not self.is_enabled():
            return "DECISION: FAIL\nEXPLANATION: AI Saliency Advisor is unavailable."
        
        prompt = f"""
        Analyze these two screenshots of a web page for meaningful visual regressions.
        Page Context: {page_context}
        
        Compare the baseline and the current state. 
        If there are significant layout shifts, missing elements, or broken styles, respond with 'DECISION: FAIL'.
        Otherwise, respond with 'DECISION: PASS'.
        Provide a short 'EXPLANATION:'.
        """
        return await self.provider.generate_multimodal(prompt, [baseline_b64, current_b64])

    async def analyze_failure(self, failure_context: Dict[str, Any]) -> str:
        """Analyze a test failure and provide a natural language summary and guidance."""
        if not self.is_enabled():
            return "AI Analysis is unavailable."
            
        prompt = f"""
        Analyze the following WebLens test failure and provide a concise, professional summary for a developer.
        Focus on identifying the root cause and suggesting a fix.
        
        Failure Context:
        {json.dumps(failure_context, indent=2)}
        
        Response Format:
        SUMMARY: <one sentence summary>
        GUIDANCE: <one sentence fix recommendation>
        """
        response = await self.provider.generate_text(prompt)
        return response

    async def propose_healing_candidate(self, target_ref: Dict[str, Any], candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Propose the most logical element to 'Heal' a low-confidence resolution.
        Analyze HTML snippets and scores to find the intended target.
        """
        if not self.is_enabled():
            return {"error": "AI Healing is unavailable."}

        # Truncate candidates to reduce prompt size (limit to top 5)
        refined_candidates = []
        for cand in candidates[:5]:
            refined_candidates.append({
                "score": cand.get("score"),
                "actuals": cand.get("actuals", {}),
                "breakdown": cand.get("breakdown", {})
            })

        prompt = f"""
        You are the WebLens Active Healing Advisor. 
        A semantic resolution for an element has dropped below safe confidence thresholds.
        
        TARGET INTENT:
        {json.dumps(target_ref, indent=2)}
        
        TOP CANDIDATES FOUND:
        {json.dumps(refined_candidates, indent=2)}
        
        TASK:
        Identify if any of these candidates is the logically intended element.
        The page structure might have changed slightly (e.g., a button became a div with a click listener, or a label changed from 'Submit' to 'Send').
        
        RESPONSE FORMAT (JSON ONLY):
        {{
            "decision": "HEAL" | "FAIL",
            "best_index": <0-indexed position in candidates>,
            "reasoning": "<concise explanation of why this candidate matches the intent despite the score dip>",
            "proposed_fix": "e.g., Update the name from 'Submit' to 'Send'"
        }}
        """
        
        try:
            response_text = await self.provider.generate_text(prompt)
            # Find the JSON block in case the LLM adds markdown or fluff
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "{" in response_text:
                response_text = response_text[response_text.find("{"):response_text.rfind("}")+1]
            
            return json.loads(response_text)
        except Exception as e:
            return {"error": f"Failed to generate healing proposal: {str(e)}"}

    async def generate_flow_from_intent(self, intent: str, history: List[Dict[str, str]] = None, variables: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Convert a natural language intent into a sequence of WebLens blocks,
        supporting multi-turn conversation context and variable awareness.
        """
        if not self.is_enabled():
            return {"error": "AI Flow Generation is unavailable."}

        history_context = ""
        if history:
            history_context = "\nCONVERSATION HISTORY:\n"
            for msg in history:
                role = "User" if msg["role"] == "user" else "Genie"
                history_context += f"{role}: {msg['content']}\n"

        variable_context = ""
        if variables:
            variable_context = "\nAVAILABLE VARIABLES (Global & Environment):\n"
            for k, v in variables.items():
                variable_context += f"- {k}: {v}\n"

        prompt = r"""
        You are the WebLens Flow Architect (the "Genie").
        Convert the following user intent into a valid visual testing flow JSON.
        {history_context}
        {variable_context}
        
        NEW INTENT:
        "{intent}"
        
        VALID BLOCK TYPES & SCHEMAS:
        - open_page: {{ "url": str }}
        - click_element: {{ "element": {{ "role": str, "name": str }} }}
        - enter_text: {{ "element": {{ "role": str, "name": str }}, "text": str }}
        - select_option: {{ "element": {{ "role": str, "name": str }}, "option_text": str }}
        - verify_text: {{ "element": {{ "role": str, "name": str }}, "match": {{ "mode": "equals" | "contains", "value": str }} }}
        - verify_page_title: {{ "title": str }}
        - verify_url: {{ "url_part": str }}
        - verify_page_content: {{ "match": {{ "mode": "contains", "value": str }} }}
        - scroll_to_element: {{ "element": {{ "role": str, "name": str }} }}
        - save_text: {{ "element": {{ "role": str, "name": str }}, "save_as": {{ "key": str, "label": str }} }}
        - refresh_page: {{}}
        - wait_until_visible: {{ "element": {{ "role": str, "name": str }}, "timeout_seconds": int }}
        - assert_visible: {{ "element": {{ "role": str, "name": str }} }}
        - if_condition: {{ 
             "condition": {{ "kind": "element_visible", "element": {{ "role": str, "name": str }} }},
             "then_blocks": [str], "else_blocks": [str] 
          }}
        - loop_until: {{ 
             "type": "repeat_until", 
             "condition": {{ "kind": "element_not_visible", "element": {{ "role": str, "name": str }} }},
             "body_blocks": [str]
          }}
        - delay: {{ "seconds": float }}
        
        STRICT RULES:
        1. Root must have "name", "entry_block" (string ID), and "blocks" (array).
        2. Every block MUST have "id", "type", and "next_block" (string ID or null).
        3. No "body" wrapper. Parameters are top-level in the block object.
        4. "next_block" links blocks in a linear chain.
        5. branch IDs in if_condition must exist in the "blocks" array.
        
        DESIGN GUIDELINES:
        - VARIABLE USAGE: If a value matches an AVAILABLE VARIABLE name, use the format {{VARIABLE_NAME}}.
        - EXAMPLE 1:
          AVAILABLE VARIABLES: {{ "BASE_URL": "google.com" }}
          INTENT: "Open the base url"
          CORRECT JSON: {{ "type": "open_page", "url": "{{{{BASE_URL}}}}", ... }}
        - EXAMPLE 2:
          AVAILABLE VARIABLES: {{ "USERNAME": "alex" }}
          INTENT: "Type alex into the login"
          CORRECT JSON: {{ "type": "enter_text", "text": "{{{{USERNAME}}}}", ... }}
          
        - If the user asks to "change", "add", or "modify" the existing flow, use the HISTORY context to provide an UPDATED version.
        - NEVER return just the delta. Always return the entire block list.
        - Maintain original IDs from the HISTORY for existing blocks.
        
        RESPONSE FORMAT:
        Return ONLY the JSON. No conversation.
        JSON MUST BE WRAPPED IN ---JSON-START--- AND ---JSON-END--- markers.

        FINAL REMINDER: Use {{VARIABLE_NAME}} syntax for any variables used.
        """.format(
            history_context=history_context,
            variable_context=variable_context,
            intent=intent
        )

        try:
            response_text = await self.provider.generate_text(prompt)
            if not response_text:
                return {"error": "Genie is silent. Please check your AI provider configuration."}

            json_str = response_text
            if "---JSON-START---" in response_text and "---JSON-END---" in response_text:
                json_str = response_text.split("---JSON-START---")[1].split("---JSON-END---")[0].strip()
            elif "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "{" in response_text:
                json_str = response_text[response_text.find("{"):response_text.rfind("}")+1]
            else:
                json_str = response_text.strip()
            
            # If the response doesn't look like JSON (e.g. just text), return it as a message
            if "{" not in json_str:
                return {"message": response_text.strip()}

            # Parse JSON first
            flow_data = json.loads(json_str)

            # Recursive helper to fix variable references in values only
            def fix_variables(obj):
                if isinstance(obj, dict):
                    return {k: fix_variables(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [fix_variables(item) for item in obj]
                elif isinstance(obj, str):
                    # Check if string matches a variable name exactly
                    if variables and obj in variables:
                        return "{{" + obj + "}}"
                    return obj
                return obj

            # safe post-process
            flow_data = fix_variables(flow_data)

            return flow_data
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Genie failure: {str(e)}")
            # If JSON parsing fails, maybe it's just a text response
            return {"message": response_text.strip()} if 'response_text' in locals() else {"error": str(e)}

# Singleton instance
ai_service = AIService()
