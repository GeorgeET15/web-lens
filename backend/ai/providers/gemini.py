import os
import asyncio
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
            print(f"Initializing Gemini with model: {model_name}", flush=True)
            self._llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=self.api_key,
                temperature=0.3, # Slightly more creative for detailed audits
                max_output_tokens=4096,
                top_p=0.95
            )

    async def generate_text(self, prompt: str) -> Optional[str]:
        current_loop = asyncio.get_running_loop()
        
        # If the loop has changed or LLM is not initialized, (re)initialize
        if not self._llm or getattr(self, "_bound_loop", None) != current_loop:
            self._init_llm()
            self._bound_loop = current_loop

        try:
            print(f"Gemini generating text for prompt (len={len(prompt)})...", flush=True)
            response = await self._llm.ainvoke(prompt)
            print(f"Gemini response received (len={len(response.content)})", flush=True)
            if len(response.content) < 100:
                print(f"DEBUG: Short AI response: {response.content}", flush=True)
            return response.content
        except Exception as e:
            print(f"Gemini generation error: {e}")
            return None

    def _init_llm(self):
        """Internal helper to initialize the LangChain client."""
        if not self.api_key:
            return
        model_name = "gemini-2.5-flash"
        print(f"Initializing/Re-binding Gemini client for loop: {id(asyncio.get_event_loop())}", flush=True)
        self._llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key,
            temperature=0.3, 
            max_output_tokens=4096,
            top_p=0.95
        )

    def is_available(self) -> bool:
        return self._llm is not None
