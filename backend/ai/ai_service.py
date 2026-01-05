from typing import Optional, List
from .providers.gemini import GeminiProvider
from .chains.translator import TranslatorChain
from .chains.stability_advisor import StabilityAdvisorChain
from .chains.investigator import InvestigatorChain
from .chains.companion import CompanionChain
from .schemas import ExecutionInsightInput

class AIService:
    def __init__(self):
        self.provider = GeminiProvider()
        self.translator = TranslatorChain(self.provider)
        self.stability_advisor = StabilityAdvisorChain(self.provider)
        self.investigator = InvestigatorChain(self.provider)
        self.companion = CompanionChain(self.provider)

    def is_enabled(self) -> bool:
        return self.provider.is_available()

    async def draft_flow(self, user_intent: str) -> str:
        if not self.is_enabled(): return "AI Translator is currently unavailable."
        return await self.translator.run(user_intent)

    async def analyze_stability(self, runs_data: List[dict]) -> str:
        if not self.is_enabled(): return "AI Stability Advisor is currently unavailable."
        return await self.stability_advisor.run(runs_data)

    async def investigate_run(self, flow_data: dict) -> str:
        if not self.is_enabled(): return "AI Investigator is currently unavailable."
        return await self.investigator.run(flow_data)

    async def ask_companion(self, insight: ExecutionInsightInput, query: str) -> str:
        if not self.is_enabled(): return "AI Companion is currently unavailable."
        return await self.companion.run(insight, query)

# Singleton instance
ai_service = AIService()
