import json
from pathlib import Path
from ..utils import strip_heavy_data
from ..schemas import ExecutionInsightInput

class CompanionChain:
    def __init__(self, provider):
        self.provider = provider
        prompt_path = Path(__file__).parent.parent / "prompts" / "companion.prompt"
        self.template = prompt_path.read_text()

    async def run(self, insight: ExecutionInsightInput, query: str) -> str:
        # Strip heavy data to keep context small
        insight_dict = insight.model_dump()
        clean_insight = strip_heavy_data(insight_dict)
        
        prompt = self.template.format(
            context_json=json.dumps(clean_insight, indent=2), 
            query=query
        )
        return await self.provider.generate_text(prompt)
