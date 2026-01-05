"""
Element eligibility checker for Save Text blocks.

This module determines if an element has stable semantic identity
and can be reliably re-identified after page changes (e.g., refresh).
"""

from typing import Tuple
from models import ElementRef


class ElementEligibility:
    """Determine if an element is eligible for Save Text."""
    
    @staticmethod
    def is_eligible_for_save_text(element_ref: ElementRef) -> Tuple[bool, str]:
        """
        Check if element has stable semantic identity.
        
        An element is ELIGIBLE for Save Text ONLY if it has at least ONE:
        - Semantic role (ARIA role or native semantic element)
        - Accessible name (aria-label, label association, or stable text)
        - User-declared semantic intent (manual declaration with confidence ≥ Medium)
        - Stable semantic container anchor (e.g. within a named region/section)
        
        Args:
            element_ref: The ElementRef to check
            
        Returns:
            Tuple of (is_eligible, reason_if_not)
            - is_eligible: True if element can be safely used with Save Text
            - reason_if_not: Human-readable explanation if not eligible
        """
        # Rule 1: Has semantic role (not generic/presentation)
        if element_ref.role and element_ref.role not in ['generic', 'presentation', 'none']:
            return True, ""
        
        # Rule 2: Has accessible name from stable source
        # (aria-label, label association, title - NOT dynamic text content)
        if element_ref.name_source in ['aria-label', 'label', 'title', 'placeholder']:
            return True, ""
        
        # Rule 3: User-declared with confidence >= Medium
        # This means user manually declared the semantic intent
        if element_ref.confidence in ['high', 'medium']:
            return True, ""
        
        # Rule 4: Has stable semantic container (region/section with name)
        if element_ref.region and element_ref.region.name:
            return True, ""
        
        # Element lacks stable semantic identity
        return False, (
            "This element's content changes and cannot be reliably re-identified. "
            "Saving its text would be unstable."
        )
    
    @staticmethod
    def get_guidance_message() -> str:
        """Get user-facing guidance when Save Text is blocked."""
        return (
            "If you're testing that content changes after refresh, "
            "use 'Verify Page Content' or 'Save Page Content' instead."
        )
