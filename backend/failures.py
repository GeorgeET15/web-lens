from typing import Optional, Dict, Any
from enum import Enum

class FailureOwner(str, Enum):
    USER = "USER"
    APP = "APP"
    ENGINE = "ENGINE"
    SYSTEM = "SYSTEM"

class FailureDeterminism(str, Enum):
    CERTAIN = "CERTAIN"
    HEURISTIC = "HEURISTIC"
    UNKNOWN = "UNKNOWN"

class WebLensFailure(Exception):
    """
    Base class for all WebLens canonical failures.
    Now enforces strict ownership and determinism.
    
    Every failure must provide:
    - intent: What the system was trying to do.
    - reason: The non-technical root cause.
    - guidance: Actionable advice for the user.
    - owner: Who is responsible (User, App, Engine, System).
    - determinism: How sure are we (Certain, Heuristic, Unknown).
    """
    def __init__(
        self, 
        intent: str, 
        reason: str, 
        guidance: str,
        owner: FailureOwner = FailureOwner.SYSTEM,
        determinism: FailureDeterminism = FailureDeterminism.UNKNOWN,
        tier_1_summary: Optional[str] = None,
        tier_2_evidence: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None
    ):
        # Defensive conversion for Owner
        if isinstance(owner, str) and not isinstance(owner, Enum):
            try:
                self.owner = FailureOwner(owner)
            except ValueError:
                self.owner = FailureOwner.SYSTEM
        else:
            self.owner = owner

        # Defensive conversion for Determinism
        if isinstance(determinism, str) and not isinstance(determinism, Enum):
            try:
                self.determinism = FailureDeterminism(determinism)
            except ValueError:
                self.determinism = FailureDeterminism.UNKNOWN
        else:
            self.determinism = determinism

        self.intent = intent
        self.reason = reason
        self.guidance = guidance
        self.tier_1_summary = tier_1_summary or f"Action Failed: {reason}"
        self.tier_2_evidence = tier_2_evidence or {}
        self.original_error = original_error
        
        # Format the full message for logging
        self.message = f"""
Intent: {self.intent}
Outcome: Failed.
Reason: {self.reason}
Guidance: {self.guidance}
Owner: {self.owner.value if hasattr(self.owner, 'value') else self.owner}
Determinism: {self.determinism.value if hasattr(self.determinism, 'value') else self.determinism}
"""
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the failure for API/Frontend consumption."""
        return {
            "type": self.__class__.__name__,
            "intent": self.intent,
            "reason": self.reason,
            "guidance": self.guidance,
            "owner": self.owner.value if hasattr(self.owner, 'value') else str(self.owner),
            "determinism": self.determinism.value if hasattr(self.determinism, 'value') else str(self.determinism),
            "tier_1_summary": self.tier_1_summary,
            "tier_2_evidence": self.tier_2_evidence,
            "original_error": str(self.original_error) if self.original_error else None
        }

# -------------------------------------------------------------------------
# Category A: User Logic Failures (Owner: USER)
# -------------------------------------------------------------------------

class VariableMissingError(WebLensFailure):
    """A required variable does not exist in the context."""
    def __init__(self, key: str, available_keys: list[str], intent: str = "Resolving variable", **kwargs):
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        super().__init__(
            intent=intent,
            reason=f"The variable '{{{{{key}}}}}' is not defined in the current context.",
            guidance=f"Check your spelling or previous steps. Available variables: {', '.join(available_keys[:5])}{'...' if len(available_keys) > 5 else ''}",
            tier_1_summary=f"Variable '{key}' missing",
            tier_2_evidence={"missing_key": key, "available_keys": available_keys},
            owner=FailureOwner.USER,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

class InvalidFlowStateError(WebLensFailure):
    """The flow structure is corrupted or invalid."""
    def __init__(self, details: str, intent: str = "Validating flow structure", **kwargs):
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        super().__init__(
            intent=intent,
            reason=f"Flow state is invalid: {details}",
            guidance="The flow configuration appears corrupted. Please re-save or recreate the block.",
            tier_1_summary="Invalid Flow State",
            owner=FailureOwner.USER,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

class VerificationMismatchError(WebLensFailure):
    """User-defined assertion failed (Expected != Actual)."""
    def __init__(self, intent: str, expected: str, actual: str, **kwargs):
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        super().__init__(
            intent=intent,
            reason=f"The value '{actual}' did not match the expected '{expected}'.",
            guidance="Review the screenshot to see the actual state of the page at the time of verification.",
            tier_1_summary="Verification failed",
            tier_2_evidence={"expected": expected, "actual": actual},
            owner=FailureOwner.USER,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

# Mapping legacy LogicError to the closest equivalent or keeping as generic User failure
class LogicError(WebLensFailure):
    """Generic logic failure (Legacy)."""
    def __init__(self, intent: str, reason: str, guidance: str = "Check your flow logic.", **kwargs):
        super().__init__(
            intent=intent,
            reason=reason,
            guidance=guidance,
            owner=FailureOwner.USER,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )


class IntentCapabilityMismatchError(WebLensFailure):
    """
    Tier 1 Failure: User intent requires capabilities the element does not possess.
    
    Example: Trying to "Enter Text" on a <div> or "Select Option" on a <button>.
    
    - Owner: USER (The request is invalid for this target)
    - Determinism: CERTAIN (The capabilities are explicitly missing)
    """
    def __init__(self, name: str, intent: str, required_capability: str, observed_capabilities: Dict[str, bool], original_error: Optional[Exception] = None):
        super().__init__(
            tier_1_summary=f"Checking capabilities for '{name}'",
            intent=f"Attempting to {intent}",
            reason=f"The element '{name}' does not support this action. It is missing the '{required_capability}' capability.",
            guidance=f"Ensure you are targeting the correct element type. '{name}' supports: {[k for k, v in observed_capabilities.items() if v]}.",
            owner=FailureOwner.USER,
            determinism=FailureDeterminism.CERTAIN,
            tier_2_evidence={
                "required_capability": required_capability,
                "observed_capabilities": observed_capabilities,
                "element_name": name,
                "intent": intent
            },
            original_error=original_error
        )


# -------------------------------------------------------------------------
# Category B: App Under Test Failures (Owner: APP)
# -------------------------------------------------------------------------

class ElementNotFoundInDOMError(WebLensFailure):
    """Element definitely not in the DOM after all retries."""
    def __init__(self, name: str, strategy_log: Optional[list] = None, intent: str = "Attempting to locate element", **kwargs):
        # Remove conflicting keys from kwargs to avoid "multiple values" error
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        super().__init__(
            intent=intent,
            reason=f"No element matching '{name}' was found on the current page.",
            guidance="Check if you are on the correct page, or if the element is inside a deeper iframe.",
            tier_1_summary=f"Element '{name}' not found",
            tier_2_evidence={"strategy_log": strategy_log or []},
            owner=FailureOwner.APP,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

class ElementNotVisibleError(WebLensFailure):
    """Element in DOM but not visible (display:none, etc)."""
    def __init__(self, name: str, computed_style: Optional[Dict] = None, intent: str = "Attempting to interact with element", **kwargs):
        # Remove conflicting keys from kwargs
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        style_info = f" (Display: {computed_style.get('display')}, Visibility: {computed_style.get('visibility')})" if computed_style else ""
        super().__init__(
            intent=intent,
            reason=f"The element '{name}' exists but is currently hidden or invisible.{style_info}",
            guidance="The element might be inside a closed dropdown or menu. Ensure it is visible before interacting.",
            tier_1_summary=f"Element '{name}' is hidden",
            tier_2_evidence={"computed_style": computed_style or {}},
            owner=FailureOwner.APP,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

class InteractionBlockedError(WebLensFailure):
    """Action intercepted by another element."""
    def __init__(self, name: str, obscuring_element: Optional[Dict] = None, intent: str = "Attempting to interact", **kwargs):
        # Remove conflicting keys from kwargs
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        blocker_info = ""
        if obscuring_element:
            tag = obscuring_element.get('tag', 'element')
            id_str = f"#{obscuring_element.get('id')}" if obscuring_element.get('id') else ""
            class_str = f".{'.'.join(obscuring_element.get('class', '').split())}" if obscuring_element.get('class') else ""
            blocker_info = f" The click was intercepted by <{tag}{id_str}{class_str}>."

        super().__init__(
            intent=intent,
            reason=f"Interaction with '{name}' was blocked.{blocker_info}",
            guidance="Check if a modal or popup is covering the element, or if the element is disabled.",
            tier_1_summary=f"Interaction blocked on '{name}'",
            tier_2_evidence={"obscuring_element": obscuring_element or {}},
            owner=FailureOwner.APP,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

# Legacy Aliases for Backward Compatibility
ElementMissingError = ElementNotFoundInDOMError
ElementHiddenError = ElementNotVisibleError
InteractionRejectedError = InteractionBlockedError


# -------------------------------------------------------------------------
# Category C: Engine Limitations (Owner: ENGINE)
# -------------------------------------------------------------------------

class ResolutionAmbiguityError(WebLensFailure):
    """Found N elements, none dominant."""
    def __init__(self, name: str, candidates: list[Dict], region: Optional[str] = None, intent: str = "Attempting to resolve unique element", **kwargs):
        # Remove conflicting keys from kwargs
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        count = len(candidates)
        location = f"in the '{region}' region" if region else "on the page"
        super().__init__(
            intent=intent,
            reason=f"Found {count} elements matching '{name}' {location}. WebLens requires a unique match to be certain.",
            guidance="Add a unique aria-label to the target element, or valid semantic attributes to distinguish it.",
            tier_1_summary=f"Ambiguous match for '{name}'",
            tier_2_evidence={"candidates": candidates},
            owner=FailureOwner.ENGINE,
            determinism=FailureDeterminism.HEURISTIC,
            **kwargs
        )

class ProtocolTimeoutError(WebLensFailure):
    """Browser driver stopped responding."""
    def __init__(self, operation: str, duration: float, intent: str = "Communicating with browser", **kwargs):
        # Remove conflicting keys from kwargs
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        super().__init__(
            intent=intent,
            reason=f"The browser driver did not respond to '{operation}' within {duration}s.",
            guidance="This might be a browser freeze or a network issue. Try reducing the load or restarting the test.",
            tier_1_summary="Browser Protocol Timeout",
            owner=FailureOwner.ENGINE,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

# Legacy Alias
# ElementAmbiguousError needs to handle the difference in signature (count vs candidates)
class ElementAmbiguousError(ResolutionAmbiguityError):
    def __init__(self, name: str, count: int, region: Optional[str] = None, intent: str = "Attempting to resolve unique element", **kwargs):
        # Manufacture a fake candidate list to satisfy the new signature
        fake_candidates = [{"description": "Legacy Count Only"}] * count
        super().__init__(name, fake_candidates, region, intent, **kwargs)


# -------------------------------------------------------------------------
# Category D: Internal System Failures (Owner: SYSTEM)
# -------------------------------------------------------------------------

class InternalCrashError(WebLensFailure):
    """Python Exception caught at top level."""
    def __init__(self, original_error: Exception, component: str = "Interpreter", intent: str = "Executing internal logic", **kwargs):
        # Remove conflicting keys from kwargs
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        super().__init__(
            intent=intent,
            reason=f"Internal Logic Error: {str(original_error)}",
            guidance="This is a WebLens bug, not a test failure. Please report this to the development team.",
            tier_1_summary="Internal System Crash",
            tier_2_evidence={"component": component, "exception_type": type(original_error).__name__},
            original_error=original_error,
            owner=FailureOwner.SYSTEM,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

class DriverCrashError(WebLensFailure):
    """Webdriver process died."""
    def __init__(self, msg: str, intent: str = "Managing browser session", **kwargs):
        # Remove conflicting keys from kwargs
        kwargs.pop('reason', None)
        kwargs.pop('intent', None)
        kwargs.pop('guidance', None)
        kwargs.pop('owner', None)
        kwargs.pop('determinism', None)
        super().__init__(
            intent=intent,
            reason=f"Browser Driver Crash: {msg}",
            guidance="The browser closed unexpectedly. Check for memory issues or driver incompatibility.",
            tier_1_summary="Browser Driver Crash",
            owner=FailureOwner.SYSTEM,
            determinism=FailureDeterminism.CERTAIN,
            **kwargs
        )

# Legacy Alias
class SystemError(InternalCrashError):
    def __init__(self, reason: str, **kwargs):
        # Wrap reason in a fake exception for compat
        super().__init__(Exception(reason), **kwargs)
