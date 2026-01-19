import os
import logging
from typing import Optional, List
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
from .interface import LLMProvider

logger = logging.getLogger(__name__)

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model_name = model or "claude-3-5-sonnet-20240620"
        self._llm = None
        
        if self.api_key:
            self._init_llm()

    def _init_llm(self):
        try:
            logger.info(f"Initializing Anthropic with model: {self.model_name}")
            self._llm = ChatAnthropic(
                model=self.model_name,
                api_key=self.api_key,
                temperature=0.3,
                max_tokens=4096
            )
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic: {e}")
            self._llm = None

    async def generate_text(self, prompt: str) -> Optional[str]:
        if not self._llm:
            return "Error: Anthropic Provider not initialized."
            
        try:
            response = await self._llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Anthropic text generation error: {e}")
            raise e

    async def generate_multimodal(self, prompt: str, images_base64: List[str]) -> Optional[str]:
        if not self._llm:
            return "Error: Anthropic Provider not initialized."

        try:
            content = [{"type": "text", "text": prompt}]
            for b64 in images_base64:
                if "," in b64:
                    b64 = b64.split(",")[1]
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                })
            
            message = HumanMessage(content=content)
            logger.info(f"Anthropic generating multimodal response (images={len(images_base64)})...")
            response = await self._llm.ainvoke([message])
            return response.content
        except Exception as e:
            logger.error(f"Anthropic multimodal generation error: {e}")
            raise e

    def is_available(self) -> bool:
        return self._llm is not None
