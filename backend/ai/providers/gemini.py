import os
import asyncio
import logging
from typing import Optional, List
from langchain_google_genai import ChatGoogleGenerativeAI
from .interface import LLMProvider

logger = logging.getLogger(__name__)

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        # Prefer injected key (even if empty string to disable), fallback to env vars only if None
        if api_key is not None:
             self.api_key = api_key
        else:
             self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        self.model_name = model_name or "gemini-2.5-flash"
        self._llm = None
        
        if self.api_key:
            logger.info(f"Initializing Gemini with model: {self.model_name}")
            self._init_llm()

    async def generate_text(self, prompt: str) -> Optional[str]:
        return await self.generate_multimodal(prompt, [])

    async def generate_multimodal(self, prompt: str, images_base64: List[str]) -> Optional[str]:
        current_loop = asyncio.get_running_loop()
        
        # If the loop has changed or LLM is not initialized, (re)initialize
        if not self._llm or getattr(self, "_bound_loop", None) != current_loop:
            self._init_llm()
            self._bound_loop = current_loop

        try:
            from langchain_core.messages import HumanMessage
            
            content = [{"type": "text", "text": prompt}]
            for b64 in images_base64:
                # Ensure base64 doesn't have the data:image/png;base64, prefix
                if "," in b64:
                    b64 = b64.split(",")[1]
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{b64}"}
                })
            
            message = HumanMessage(content=content)
            logger.info(f"Gemini generating multimodal response (images={len(images_base64)})...")
            response = await self._llm.ainvoke([message])
            return response.content
        except Exception as e:
            logger.error(f"Gemini multimodal generation error: {e}")
            raise e

    def _init_llm(self):
        """Internal helper to initialize the LangChain client."""
        if not self.api_key:
            return
        model_name = "gemini-2.5-flash"
        logger.info(f"Initializing/Re-binding Gemini client for loop: {id(asyncio.get_event_loop())}")
        self._llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key,
            temperature=0.3, 
            max_output_tokens=4096,
            top_p=0.95
        )

    def is_available(self) -> bool:
        return self._llm is not None
