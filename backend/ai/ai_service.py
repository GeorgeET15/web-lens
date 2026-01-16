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
        """
        Analyze visual differences using multimodal AI (Smart Eyes).
        Intelligently ignores dynamic noise (dates, ads) while flagging structural regressions.
        """
        if not self.is_enabled():
            return "DECISION: FAIL\nEXPLANATION: AI Saliency Advisor is unavailable."
        
        prompt = f"""
        You are the WebLens "Smart Eyes" visual regression engine. 
        Compare these two screenshots (Baseline vs. Current) and identify meaningful visual regressions.
        
        CONTEXT: {page_context}
        
        STRICT RULES:
        1. Ignore dynamic content like timestamps, changing ads, or rotating hero images if they don't break the layout.
        2. Flag critical regressions: missing buttons, broken images, layout shifts (elements overlapping), or CSS failures (missing styles).
        3. If there is a regression, respond with 'DECISION: FAIL'.
        4. If the changes are purely cosmetic/dynamic or it's a perfect match, respond with 'DECISION: PASS'.
        
        Provide a concise 'EXPLANATION:' focusing on what shifted or went missing.
        """
        return await self.provider.generate_multimodal(prompt, [baseline_b64, current_b64])

    async def generate_smart_assertion(self, logic: str, html_context: str = "") -> Dict[str, Any]:
        """
        Convert natural language validation logic into a deterministic block structure.
        Example: "Check if the cart icon has '3' items" -> verify_text or assert_visible.
        """
        if not self.is_enabled():
            return {"error": "AI Smart Assertions are unavailable."}

        prompt = f"""
        You are the WebLens Verification Architect.
        Convert the following validation logic into a precise WebLens block sequence.
        
        VALIDATION LOGIC: "{logic}"
        PAGE CONTEXT (HTML Snippet):
        {html_context[:4000]} 

        AVAILABLE BLOCK TYPES:
        - verify_text: {{ "element": ElementRef, "match": {{ "mode": "equals" | "contains", "value": str }} }}
        - assert_visible: {{ "element": ElementRef }}
        - verify_page_title: {{ "title": str }}
        - verify_url: {{ "url_part": str }}
        
        STRICT RULES:
        1. Return ONLY a list of blocks in JSON format.
        2. Use high-confidence semantic ElementRef (role and name).
        3. If the logic is complex, break it into multiple verify/assert blocks.
        
        RESPONSE FORMAT:
        ---JSON-START---
        [ {{ "id": str, "type": str, "params": {{...}}, "next_block": str | null }} ]
        ---JSON-END---
        """
        
        try:
            response_text = await self.provider.generate_text(prompt)
            json_str = response_text
            if "---JSON-START---" in response_text:
                json_str = response_text.split("---JSON-START---")[1].split("---JSON-END---")[0].strip()
            elif "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            
            return json.loads(json_str)
        except Exception as e:
            return {"error": str(e)}

    async def analyze_block_execution(self, context: Dict[str, Any]) -> str:
        """Analyze a test block execution (success or failure) and provide clean insights."""
        if not self.is_enabled():
            return "AI Commentary is unavailable."
            
        is_failure = context.get("status") == "failed" or "error" in context
        
        prompt = f"""
        You are the WebLens AI Insight generator. 
        Analyze the following execution context for a specific test block and provide a clear, empathetic, and jargon-free explanation.
        
        CONTEXT:
        {json.dumps(context, indent=2)}
        
        REQUIREMENTS:
        1. Use simple, human language. Avoid technical jargon like 'heuristic', 'semantic resolution', 'deterministic anomaly', 'DOM', or 'threshold'.
        2. IF FAILED: Explain what went wrong from a user's perspective (e.g., 'The login button couldn't be found') and provide a simple, actionable fix.
        3. IF SUCCESSFUL: Briefly describe what was accomplished (e.g., 'Successfully navigated to the dashboard').
        4. Focus ONLY on this specific block's results.
        
        RESPONSE FORMAT:
        SUMMARY: <A clear, non-technical explanation>
        { "GUIDANCE: <A simple fix or next step>" if is_failure else "INSIGHT: <A helpful observation about the successful result>" }
        """
        response = await self.provider.generate_text(prompt)
        return response

    async def analyze_failure(self, failure_context: Dict[str, Any]) -> str:
        """Deprecated: Use analyze_block_execution instead. Maintained for API compatibility."""
        return await self.analyze_block_execution(failure_context)

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

    async def generate_flow_from_intent(self, intent: str, history: List[Dict[str, str]] = None, variables: Dict[str, str] = None, mode: str = "build", current_flow: Dict[str, Any] = None, picked_element: Dict[str, Any] = None, interaction_map: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Convert a natural language intent into a sequence of WebLens blocks (Build)
        or provide conversational analysis/help (Ask).
        """
        if not self.is_enabled():
            return {"error": "AI Service is unavailable."}

        # Deterministic Greeting Handler (Bypass LLM for simple hellos)
        greetings = {"hi", "hello", "hey", "greetings", "hola", "yo"}
        cleaned_intent = intent.lower().strip().replace("!", "").replace(".", "")
        if cleaned_intent in greetings or "hello" in cleaned_intent or "hi " in cleaned_intent:
             return {"message": "Hello! I'm the Flow Architect. I can help you build test automation flows. Try saying 'Go to google.com' or 'Click the login button'."}

        # Context Extraction from Picked Element
        screenshot_b64 = None
        html_context_snippet = ""
        
        if picked_element:
            context = picked_element.get("context", {})
            html_raw = context.get("html", "")
            # Truncate HTML to reasonable size (e.g. 15k chars) to avoid token limits while keeping structure
            if html_raw:
                html_context_snippet = f"\nPAGE HTML CONTEXT:\n{html_raw[:15000]}...\n"
            
            screenshot_b64 = context.get("screenshot")
            
            # Enrich intent with specific element details
            intent += f"\n[System Note: User explicitly picked element '{picked_element.get('name')}' (Role: {picked_element.get('role')}). Focus verification on this element.]"

        # Autonomous Interaction Map Context
        map_context = ""
        if interaction_map and interaction_map.get('elements'):
            map_context = "\nPAGE INTERACTION MAP (Interactive Elements detected on current page):\n"
            for el in interaction_map.get('elements', []):
                # Compact format to save tokens
                name = el.get('name', '')[:50]
                map_context += f"- [{el['id']}] {el['role'].upper()}: \"{name}\" ({el['tagName']})\n"
            map_context += "\nINSTRUCTIONS: If the user refers to an element in the map above, use its exact metadata (name, role, tagName) for block parameters. Use this map to avoid asking the user for a manual pick.\n"
        else:
            map_context = "\n[SYSTEM NOTE: BROWSER IS CURRENTLY CLOSED. YOU CANNOT SEE ANY PAGE ELEMENTS. IF THE USER'S INTENT REQUIRES THE BROWSER, USE THE 'start_inspector' ACTION OR ASK THE USER TO OPEN A URL.]\n"

        history_context = ""
        if history:
            history_context = "\nCONVERSATION HISTORY:\n"
            for msg in history:
                role = "User" if msg["role"] == "user" else "Assistant"
                history_context += f"{role}: {msg['content']}\n"

        variable_context = ""
        if variables:
            variable_context = "\nAVAILABLE VARIABLES:\n"
            for k, v in variables.items():
                variable_context += f"- {k}: {v}\n"

        flow_context = ""
        if current_flow:
            flow_context = "\nCURRENT FLOW CONTEXT:\n"
            flow_context += f"Flow Name: {current_flow.get('name')}\n"
            flow_context += f"Description: {current_flow.get('description')}\n"
            flow_context += "Blocks:\n"
            for b in current_flow.get('blocks', []):
                flow_context += f"- Block #{b.get('id')}: {b.get('type')} ({b.get('label')})\n"
                # Extract params from flattened block structure (frontend spreads params into root)
                exclude_keys = {'id', 'type', 'label', 'next_block', 'position', 'then_blocks', 'else_blocks', 'body_blocks'}
                params = {k: v for k, v in b.items() if k not in exclude_keys}
                if params:
                    flow_context += f"  Params: {params}\n"

        if mode == "ask":
            prompt = f"""
            You are the WebLens Consultant. 
            Your goal is to help the user understand and debug their current testing flow.
            
            {flow_context}
            {map_context}
            {variable_context}
            {history_context}
            {html_context_snippet}
            
            USER QUESTION:
            "{intent}"
            
            RULES:
            1. You are purely conversational. DO NOT return a flow JSON structure.
            2. **Context Usage**: You have access to the `CURRENT FLOW CONTEXT`. ONLY reference it or explain it if the user explicitly asks about the flow or if their question directly relates to the current blocks.
            3. **Greetings**: If the user says "Hello", "Hi", or makes small talk, respond naturally ("Hello! How can I help you with your testing?") WITHOUT summarizing the flow.
            4. Focus on explaining the current blocks, identifying potential issues, or answering the user's specific questions.
            5. Use a helpful, professional, and technical tone.
            6. If the user mentions "block #X", refer to your current flow context to identify it.
            
            RESPONSE FORMAT:
            1. Use proper Markdown formatting for readability:
               - Use **bold** for emphasis or key terms.
               - Use `code blocks` or `inline code` for technical details, block IDs, or parameters.
               - Use bulleted or numbered lists for steps or explanations.
            2. Special Markers:
               - Refer to variables using the `{{variable_name}}` syntax when appropriate.
               - Mention `@verify` when suggesting verification steps.
            3. Tone: Helpful, technical, and concise.
            4. Return ONLY the text response. NO markers or JSON.
            """.strip()
        else:
            prompt = r"""
            You are the WebLens Flow Architect.
            Convert the following user intent into a valid visual testing flow JSON.
            {history_context}
            {variable_context}
            {flow_context}
            {html_context_snippet}
            {map_context}
            
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
            3. Parameters are top-level in the block object.
            
            RESPONSE FORMAT:
            Option 1 (Flow Generation):
            - If the user wants to build/modify a flow, return ONLY the JSON wrapped in ---JSON-START--- and ---JSON-END---.
            
            Option 2 (Conversation):
            - If the user says "Hi", "Hello", or asks a clarifying question unrelated to building, return PLAIN TEXT regarding their query. DO NOT generate a dummy flow.
            - DO NOT return a flow JSON with an empty "blocks" array.

            Option 3 (Client Action Required):
            - If you need the user to select a specific element on the page (manual pick) but you don't have its context and it isn't in the map, return:
              {{ "action": "pick_element", "message": "Why a pick is needed." }}
            
            Option 4 (Autonomous Browser Launch):
            - If no browser is currently active (INTERACTION MAP is missing/empty) AND the user's intent requires seeing a page or interacting with a UI:
              - If you know the URL: {{ "action": "start_inspector", "url": "https://url.com", "message": "I'm launching the browser to see the page..." }}
              - If you don't know the URL: Return a message asking for the URL.
            """.format(
                history_context=history_context,
                variable_context=variable_context,
                flow_context=flow_context,
                intent=intent,
                html_context_snippet=html_context_snippet,
                map_context=map_context
            )

        try:
            if screenshot_b64:
                response_text = await self.provider.generate_multimodal(prompt, [screenshot_b64])
            else:
                response_text = await self.provider.generate_text(prompt)
            
            if mode == "ask":
                return {"message": response_text.strip()}

            # Find the JSON block
            json_str = ""
            if "---JSON-START---" in response_text:
                json_str = response_text.split("---JSON-START---")[1].split("---JSON-END---")[0].strip()
            elif "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "{" in response_text:
                json_str = response_text[response_text.find("{"):response_text.rfind("}")+1]
            
            if not json_str:
                return {"message": response_text.strip()}

            try:
                data = json.loads(json_str)
                if data.get("action"):
                    return data
                if not data.get("blocks"):
                    return {"message": "Hello! I'm ready to build. Please describe the test steps you want to create."}
                return data
            except json.JSONDecodeError:
                return {"message": response_text.strip()}
        except Exception as e:
            logger.error(f"AI Service Error: {e}")
            return {"error": f"Failed to process intent: {str(e)}"}

# Singleton instance
ai_service = AIService()
