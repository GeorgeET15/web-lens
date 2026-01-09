from typing import Optional, List, Dict, Any
from .providers.gemini import GeminiProvider
from .chains.translator import TranslatorChain
from .chains.stability_advisor import StabilityAdvisorChain
from .chains.investigator import InvestigatorChain
from .chains.companion import CompanionChain
from .chains.agentic import AgenticChain
from .schemas import ExecutionInsightInput

class AIService:
    def __init__(self):
        self.provider = GeminiProvider()
        
        # Initialize chains with the Gemini provider
        self.translator = TranslatorChain(self.provider)
        self.stability_advisor = StabilityAdvisorChain(self.provider)
        self.investigator = InvestigatorChain(self.provider)
        self.companion = CompanionChain(self.provider)
        self._agentic = AgenticChain(self.provider)

    def is_enabled(self) -> bool:
        """Check if the Gemini provider is available."""
        return self.provider.is_available()

    async def draft_flow(self, user_intent: str) -> str:
        if not self.is_enabled(): 
            return "AI Translator is currently unavailable. Please check your Gemini API key configuration."
        return await self.translator.run(user_intent)

    async def analyze_stability(self, runs_data: List[dict]) -> str:
        if not self.is_enabled(): 
            return "AI Stability Advisor is currently unavailable."
        return await self.stability_advisor.run(runs_data)

    async def investigate_run(self, flow_data: dict) -> str:
        if not self.is_enabled(): 
            return "AI Investigator is currently unavailable."
        return await self.investigator.run(flow_data)

    async def ask_companion(self, insight: ExecutionInsightInput, query: str) -> str:
        if not self.is_enabled(): 
            return "AI Companion is currently unavailable."
        return await self.companion.run(insight, query)

    async def plan_agentic(self, user_intent: str, page_context: str = "None") -> str:
        """Internal: Generate an agentic plan with inflated elements."""
        if not self.is_enabled():
            return "AI Agentic Planner is unavailable."
        return await self._agentic.run(user_intent, page_context)

# Singleton instance
ai_service = AIService()
