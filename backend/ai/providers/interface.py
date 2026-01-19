from abc import ABC, abstractmethod
from typing import Optional

class LLMProvider(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str) -> Optional[str]:
        """Generate text from a prompt."""
        pass

    @abstractmethod
    async def generate_multimodal(self, prompt: str, images_base64: list[str]) -> Optional[str]:
        """Generate text from a prompt and a list of base64 images."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is configured and available."""
        pass
