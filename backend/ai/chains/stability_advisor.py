import json
from pathlib import Path

class StabilityAdvisorChain:
    def __init__(self, provider):
        self.provider = provider
        prompt_path = Path(__file__).parent.parent / "prompts" / "stability_advisor.prompt"
        self.template = prompt_path.read_text()

    async def run(self, runs_data: list) -> str:
        prompt = self.template.replace("{runs_data_json}", json.dumps(runs_data, indent=2))
        return await self.provider.generate_text(prompt)
