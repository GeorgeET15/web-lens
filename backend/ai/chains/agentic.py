import json
from pathlib import Path
from ..block_mapper import map_blocks

class AgenticChain:
    def __init__(self, provider):
        self.provider = provider
        prompt_path = Path(__file__).parent.parent / "prompts" / "agentic.prompt"
        self.template = prompt_path.read_text()

    async def run(self, user_intent: str, page_context: str = "None (Initial Navigation Phase)") -> str:
        prompt = self.template.replace("{user_intent}", user_intent).replace("{page_context}", page_context)
        response = await self.provider.generate_text(prompt)
        print(f"DEBUG: AgenticChain received response (len={len(response or '')})", flush=True)
        
        # Try to extract and normalize block types from the JSON
        try:
            # Extract JSON blocks if present - looking for the LAST occurrence to be robust
            json_match = response.rfind("---JSON_START---")
            if json_match != -1:
                json_end = response.find("---JSON_END---", json_match)
                if json_end != -1:
                    json_str = response[json_match + len("---JSON_START---"):json_end].strip()
                    if not json_str:
                        raise ValueError("JSON block is empty between tags")
                    blocks = json.loads(json_str)
                    
                    # Normalize block types AND inflate elements
                    normalized_blocks = map_blocks(blocks, agentic=True)
                    
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
            print(f"Warning: Could not normalize agentic blocks: {e}", flush=True)
            print(f"DEBUG: Response from LLM for failed normalization: {response}", flush=True)
        
        return response
