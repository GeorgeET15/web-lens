import json
from pathlib import Path
from ..block_mapper import map_blocks

class TranslatorChain:
    def __init__(self, provider):
        self.provider = provider
        prompt_path = Path(__file__).parent.parent / "prompts" / "translator.prompt"
        self.template = prompt_path.read_text()

    async def run(self, user_intent: str) -> str:
        prompt = self.template.format(user_intent=user_intent)
        response = await self.provider.generate_text(prompt)
        
        # Try to extract and normalize block types from the JSON
        try:
            # Extract JSON blocks if present
            json_match = response.find("---JSON_START---")
            if json_match != -1:
                json_end = response.find("---JSON_END---", json_match)
                if json_end != -1:
                    json_str = response[json_match + len("---JSON_START---"):json_end].strip()
                    blocks = json.loads(json_str)
                    
                    # Normalize block types
                    normalized_blocks = map_blocks(blocks)
                    
                    # Replace the JSON in the response with normalized version
                    normalized_json = json.dumps(normalized_blocks, indent=2)
                    response = (
                        response[:json_match] +
                        "---JSON_START---\n" +
                        normalized_json +
                        "\n---JSON_END---" +
                        response[json_end + len("---JSON_END---"):]
                    )
        except Exception as e:
            print(f"Warning: Could not normalize block types: {e}")
        
        return response
