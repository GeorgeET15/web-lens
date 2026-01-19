import json
import logging
import os
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
from .providers.gemini import GeminiProvider
from .providers.openai import OpenAIProvider
from .providers.anthropic import AnthropicProvider
from .providers.interface import LLMProvider

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # Default provider (fallback) or lazy init
        load_dotenv()

    def is_enabled(self) -> bool:
        """Check if any AI provider is configured via environment variables."""
        return any([
            os.getenv("GEMINI_API_KEY"),
            os.getenv("OPENAI_API_KEY"),
            os.getenv("ANTHROPIC_API_KEY")
        ])

    def get_provider(self, config: Optional[Dict[str, Any]] = None) -> LLMProvider:
        """Factory to get the correct provider based on config."""
        if not config:
            # Fallback to env vars (Legacy Gemini support)
            return GeminiProvider()
            
        provider_type = config.get("provider", "gemini").lower()
        api_key = config.get("apiKey")
        model = config.get("model")
        base_url = config.get("baseUrl")

        if provider_type == "openai":
            return OpenAIProvider(api_key=api_key, model=model, base_url=base_url)
        elif provider_type == "anthropic":
            return AnthropicProvider(api_key=api_key, model=model)
        elif provider_type == "gemini":
            return GeminiProvider(api_key=api_key, model_name=model) 
        
        return GeminiProvider(api_key=api_key, model_name=model)
        
    async def analyze_visual_diff(self, baseline_b64: str, current_b64: str, page_context: str, ai_config: Dict[str, Any] = None) -> str:
        """
        Analyze visual differences using multimodal AI (Smart Eyes).
        Intelligently ignores dynamic noise (dates, ads) while flagging structural regressions.
        """
        provider = self.get_provider(ai_config)
        if not provider.is_available():
            return "DECISION: FAIL\nEXPLANATION: Smart Eyes (AI) is currently disabled. Please provide an API key in **Settings** to enable automated visual regression analysis."
        
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
        return await provider.generate_multimodal(prompt, [baseline_b64, current_b64])

    async def generate_smart_assertion(self, logic: str, html_context: str = "", ai_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Convert natural language validation logic into a deterministic block structure.
        Example: "Check if the cart icon has '3' items" -> verify_text or assert_visible.
        """
        provider = self.get_provider(ai_config)
        if not provider.is_available():
            return {"message": "AI Smart Assertions are currently disabled. Please go to the **Settings** page to provide an API key and enable AI capabilities."}

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
            response_text = await provider.generate_text(prompt)
            json_str = response_text
            if "---JSON-START---" in response_text:
                json_str = response_text.split("---JSON-START---")[1].split("---JSON-END---")[0].strip()
            elif "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            
            return json.loads(json_str)
        except Exception as e:
            return {"error": str(e)}

    async def analyze_block_execution(self, context: Dict[str, Any], ai_config: Dict[str, Any] = None) -> str:
        """Analyze a test block execution (success or failure) and provide clean insights."""
        provider = self.get_provider(ai_config)
        if not provider.is_available():
            return "AI Insight generation is currently disabled. Enable AI in **Settings** to get automated test analysis."
            
        is_failure = context.get("status") == "failed" or "error" in context
        
        label = "GUIDANCE: <A simple fix or next step>" if is_failure else "INSIGHT: <A helpful observation about the successful result>"
        
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
        {label}
        """
        response = await provider.generate_text(prompt)
        return response

    async def analyze_failure(self, failure_context: Dict[str, Any], ai_config: Dict[str, Any] = None) -> str:
        """Deprecated: Use analyze_block_execution instead. Maintained for API compatibility."""
        return await self.analyze_block_execution(failure_context, ai_config)

    async def propose_healing_candidate(self, target_ref: Dict[str, Any], candidates: List[Dict[str, Any]], ai_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Propose the most logical element to 'Heal' a low-confidence resolution.
        Analyze HTML snippets and scores to find the intended target.
        """
        provider = self.get_provider(ai_config)
        if not provider.is_available():
            return {"decision": "FAIL", "reasoning": "AI Healing is disabled. Please configure an API key in **Settings** to enable Active Healing."}

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
            response_text = await provider.generate_text(prompt)
            # Find the JSON block in case the LLM adds markdown or fluff
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "{" in response_text:
                response_text = response_text[response_text.find("{"):response_text.rfind("}")+1]
            
            return json.loads(response_text)
        except Exception as e:
            return {"error": f"Failed to generate healing proposal: {str(e)}"}

    async def generate_flow_from_intent(self, intent: str, history: List[Dict[str, str]] = None, variables: Dict[str, str] = None, mode: str = "build", current_flow: Dict[str, Any] = None, picked_element: Dict[str, Any] = None, interaction_map: Dict[str, Any] = None, ai_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Convert a natural language intent into a sequence of WebLens blocks (Build)
        or provide conversational analysis/help (Ask).
        """
        provider = self.get_provider(ai_config)
        logger.info(f"[AI Service] generating flow. Intent length: {len(intent) if intent else 0}, mode: {mode}, hasPickedElement: {picked_element is not None}, historyMessages: {len(history) if history else 0}")
        if not provider.is_available():
            return {"message": "WebLens AI is currently disabled. Please go to the **Settings** page to provide an API key and enable AI assistance."}

        # Deterministic Greeting Handler (Bypass LLM for simple hellos)
        greetings = {"hi", "hello", "hey", "greetings", "hola", "yo"}
        cleaned_intent = intent.lower().strip().replace("!", "").replace(".", "")
        if cleaned_intent in greetings or "hello" in cleaned_intent or "hi " in cleaned_intent:
             return {"message": "Hello! I'm WebLens AI. I can help you build test automation flows. Try saying 'Go to google.com' or 'Click the login button'."}

        # Context Extraction from Picked Element
        screenshot_b64 = None
        html_context_snippet = ""
        
        picked_element_context = ""
        if picked_element:
            context = picked_element.get("context", {})
            html_raw = context.get("html", "")
            if html_raw:
                html_context_snippet = f"\nPAGE HTML CONTEXT:\n{html_raw[:15000]}...\n"
            
            screenshot_b64 = context.get("screenshot")
            
            # Create a structured reference for the AI
            element_metadata = {
                "name": picked_element.get("name"),
                "role": picked_element.get("role"),
                "tagName": picked_element.get("tagName"),
                "selector": picked_element.get("selector"),
                "text": picked_element.get("text")
            }
            picked_element_context = f"\n[USER PICKED ELEMENT]:\n{json.dumps(element_metadata, indent=2)}\n"
            
            # Append to intent to make it the primary focus
            intent += f"\n[System Note: User explicitly picked element '{picked_element.get('name')}'. FOR THE RELEVANT STEP, YOU MUST USE THE EXACT METADATA ABOVE AS THE 'element' PARAMETER VALUE.]"

        # Autonomous Interaction Map Context
        map_context = ""
        if interaction_map and interaction_map.get('elements'):
            map_context = "\nPAGE INTERACTION MAP (Interactive Elements detected on current page):\n"
            for el in interaction_map.get('elements', []):
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
                exclude_keys = {'id', 'type', 'label', 'next_block', 'position', 'then_blocks', 'else_blocks', 'body_blocks'}
                params = {k: v for k, v in b.items() if k not in exclude_keys}
                if params:
                    flow_context += f"  Params: {params}\n"

        if mode == "ask":
            prompt = f"""
You are **WebLens AI**, a specialized assistant for web testing and automation.
Your ONLY purpose is to help the user understand, debug, and optimize their WebLens testing flows.

{flow_context}
{map_context}
{variable_context}
{history_context}
{html_context_snippet}
{picked_element_context}

USER QUESTION:
"{intent}"

**STRICT OPERATIONAL RULES**:
1. **Identity**: You are WebLens AI. If asked "Who created you?", "What is your name?", or similar, respond as WebLens AI, a testing consultant.
2. **Scope**: You ONLY answer questions related to web testing, Selenium, the WebLens tool, or the provided flow context.
3. **Rejection Policy**: If the user asks general knowledge questions, personal questions, requests jokes, or any off-topic query, you **MUST politely decline**.
4. **No Flow Generation**: In this mode, you are conversational. DO NOT return flow JSON.
5. **Block Accuracy**: You MUST ONLY refer to blocks by their official WebLens names. NEVER hallucinate names.
   - Use `enter_text` (NOT type_text or input_text)
   - Use `click_element` (NOT click_block or tap)
   - Use `assert_visible` (NOT assert_element_exists)
   - Use `verify_text` (to check specific content)
   - Use `open_page` (for navigation)
6. **Greetings**: Professional and focused. "Hello! I am WebLens AI. How can I assist with your testing today?"
7. **Technicality**: Use a technical, helpful, and concise tone. Reference block IDs (e.g., `block #X`) and variables (`{{variable}}`) as defined in the context.

RESPONSE FORMAT:
- Use Markdown: **bold** for keys, `code` for block IDs or parameters.
- Be concise. Stick to WebLens protocols.
""".strip()
        else:
            prompt = f"""
You are **WebLens AI**, the Flow Architect. 
Your ONLY purpose is to convert user intents into valid WebLens testing flow JSON structures.

{history_context}
{variable_context}
{flow_context}
{html_context_snippet}
{map_context}
{picked_element_context}

NEW INTENT:
"{intent}"

VALID BLOCK TYPES & SCHEMAS:
(Refer to the following types to build the flow: open_page, click_element, enter_text, select_option, upload_file, verify_text, verify_page_title, verify_url, verify_page_content, verify_element_enabled, scroll_to_element, save_text, save_page_content, use_saved_value, refresh_page, wait_for_page_load, wait_until_visible, assert_visible, submit_form, submit_current_input, activate_primary_action, confirm_dialog, dismiss_dialog, switch_tab, get_cookies, get_local_storage, get_session_storage, observe_network, verify_network_request, verify_performance, visual_verify, if_condition, loop_until, delay)

**STRICT OPERATIONAL RULES**:
1. **Persona**: You represent WebLens AI. You do not deviate from testing protocols.
2. **Rejection Policy**: If the user's intent is NOT related to building or modifying a web test (e.g., asking for facts, jokes, or general chat), you **MUST** respond in plain text declining the request and explaining your purpose as a testing tool.
3. **Flow Structure**:
   - Root: "name", "entry_block" (string ID), "blocks" (array).
   - Every block: "id", "type", "next_block" (string ID or null).
   - **FLAT JSON REQUIREMENT**: DO NOT use a `params` key. All block settings (url, text, element, text, timeout_seconds, mapping, etc.) MUST be at the top level of the block object.
4. **Manual Pick**: If a specific element is needed but not in the map, return: `{{ "action": "pick_element", "message": "Reason..." }}`
5. **Browser Launch**: If the browser is closed but needed, return: `{{ "action": "start_inspector", "url": "URL", "message": "Launching..." }}`
6. **Element Binding**: If you have `[USER PICKED ELEMENT]` metadata, you **MUST** use that exact object as the value for the `element` key at the TOP LEVEL of the relevant block. DO NOT use generic selectors if a specific pick is provided.

RESPONSE FORMAT:
- If building a flow: Return ONLY the JSON wrapped in ---JSON-START--- and ---JSON-END---.
- If declining or conversing: Return PLAIN TEXT. NO JSON.
- DO NOT summarize the flow or add conversational filler when returning JSON.
""".strip()

        try:
            if screenshot_b64:
                response_text = await provider.generate_multimodal(prompt, [screenshot_b64])
            else:
                response_text = await provider.generate_text(prompt)
            
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
            import traceback
            logger.error(f"AI Service Error: {e}")
            logger.error(traceback.format_exc())
            return {"error": f"Failed to process intent: {str(e)}"}

    async def investigate_run(self, result: Dict[str, Any], flow: Dict[str, Any], ai_config: Dict[str, Any] = None) -> str:
        """Deep analysis of a single scenario execution."""
        provider = self.get_provider(ai_config)
        if not provider.is_available():
            return "AI Investigation is disabled. Please enable it in **Settings**."

        prompt = f"""
        You are the WebLens Test Forensic Expert.
        Analyze this scenario execution and provide a concise 'Review Commentary'.
        
        FLOW: {flow.get('name', 'Unnamed')}
        SCENARIO: {result.get('scenarioName', 'Unnamed')}
        SUCCESS: {result.get('success')}
        
        DETAILED LOGS:
        {json.dumps(result.get('report', {}), indent=2)}
        
        REQUIREMENTS:
        1. Keep it under 100 words.
        2. Identify the bottleneck or point of failure if it failed.
        3. If it passed, highlight the most critical verification step.
        4. Focus on reliability.
        """
        response = await provider.generate_text(prompt)
        return response

    async def stability_audit(self, reports: List[Dict[str, Any]], ai_config: Dict[str, Any] = None) -> str:
        """Generate a high-level stability summary for a suite of results."""
        provider = self.get_provider(ai_config)
        if not provider.is_available():
            return "AI Stability Audit is disabled. Please enable it in **Settings**."

        # Simplify reports to keep prompt size manageable
        summary_data = []
        for r in reports:
            summary_data.append({
                "status": "PASS" if r.get("success", False) else "FAIL",
                "error": r.get("error", "None")
            })

        prompt = f"""
        You are the WebLens Optimization Strategist.
        Review these scenario results and provide a high-level stability summary.
        
        DATA:
        {json.dumps(summary_data, indent=2)}
        
        TASK:
        Summarize the overall health of this test run. 
        If there are patterns in failures (e.g., all timed out), call them out.
        Keep it brief and encouraging.
        """
        response = await provider.generate_text(prompt)
        return response

# Singleton instance
ai_service = AIService()
