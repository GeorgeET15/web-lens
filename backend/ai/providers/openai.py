import os
import logging
from typing import Optional, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from .interface import LLMProvider

logger = logging.getLogger(__name__)

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = None, base_url: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model_name = model or "gpt-4o"
        self.base_url = base_url
        self._llm = None
        
        if self.api_key:
            self._init_llm()

    def _init_llm(self):
        try:
            logger.info(f"Initializing OpenAI with model: {self.model_name}")
            self._llm = ChatOpenAI(
                model=self.model_name,
                api_key=self.api_key,
                base_url=self.base_url,
                temperature=0.3,
                max_tokens=4096
            )
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI: {e}")
            self._llm = None

    async def generate_text(self, prompt: str) -> Optional[str]:
        if not self._llm:
            return "Error: OpenAI Provider not initialized."
            
        try:
            response = await self._llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"OpenAI text generation error: {e}")
            raise e

    async def generate_multimodal(self, prompt: str, images_base64: List[str]) -> Optional[str]:
        if not self._llm:
            return "Error: OpenAI Provider not initialized."

        try:
            content = [{"type": "text", "text": prompt}]
            for b64 in images_base64:
                # Ensure base64 doesn't have the data:image/png;base64, prefix
                if "," in b64:
                    b64 = b64.split(",")[1]
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                })
            
            message = HumanMessage(content=content)
            logger.info(f"OpenAI generating multimodal response (images={len(images_base64)})...")
            response = await self._llm.ainvoke([message])
            return response.content
        except Exception as e:
            logger.error(f"OpenAI multimodal generation error: {e}")
            raise e

    def is_available(self) -> bool:
        return self._llm is not None
