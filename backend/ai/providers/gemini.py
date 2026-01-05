import os
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from .interface import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self):
        # Support both GOOGLE_API_KEY and GEMINI_API_KEY
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self._llm = None
        if self.api_key:
            model_name = "gemini-2.5-flash"
            print(f"Initializing Gemini with model: {model_name}")
            self._llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=self.api_key,
                temperature=0.3, # Slightly more creative for detailed audits
                max_output_tokens=4096,
                top_p=0.95
            )

    async def generate_text(self, prompt: str) -> Optional[str]:
        if not self._llm:
            print("Gemini LLM not initialized (missing API key?)")
            return None
        try:
            print(f"Gemini generating text for prompt (len={len(prompt)})...")
            response = await self._llm.ainvoke(prompt)
            print(f"Gemini response received (len={len(response.content)})")
            if len(response.content) < 100:
                print(f"DEBUG: Short AI response: {response.content}")
            return response.content
        except Exception as e:
            print(f"Gemini generation error: {e}")
            return None

    def is_available(self) -> bool:
        return self._llm is not None
