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

# Singleton instance
ai_service = AIService()
