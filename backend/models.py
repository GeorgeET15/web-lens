"""
Data models for visual web testing blocks.

This module defines the JSON schema for visual testing flows.
All blocks serialize to/from these Pydantic models.
"""

from enum import Enum
from typing import Optional, Literal, Union, List, Dict, Any, Annotated
from pydantic import BaseModel, Field, field_validator, Discriminator
import time
import uuid


class BlockType(str, Enum):
    """Supported block types in the visual testing platform."""
    OPEN_PAGE = "open_page"
    CLICK_ELEMENT = "click_element"
    ENTER_TEXT = "enter_text"
    WAIT_UNTIL_VISIBLE = "wait_until_visible"
    ASSERT_VISIBLE = "assert_visible"
    IF_CONDITION = "if_condition"
    REPEAT_UNTIL = "repeat_until"
    DELAY = "delay"
    REFRESH_PAGE = "refresh_page"
    WAIT_FOR_PAGE_LOAD = "wait_for_page_load"
    SELECT_OPTION = "select_option"
    UPLOAD_FILE = "upload_file"
    VERIFY_TEXT = "verify_text"
    SCROLL_TO_ELEMENT = "scroll_to_element"
    SAVE_TEXT = "save_text"
    SAVE_PAGE_CONTENT = "save_page_content"
    VERIFY_PAGE_TITLE = "verify_page_title"
    VERIFY_URL = "verify_url"
    VERIFY_ELEMENT_ENABLED = "verify_element_enabled"
    USE_SAVED_VALUE = "use_saved_value"
    VERIFY_NETWORK_REQUEST = "verify_network_request"
    VERIFY_PERFORMANCE = "verify_performance"
    SUBMIT_FORM = "submit_form"
    CONFIRM_DIALOG = "confirm_dialog"
    DISMISS_DIALOG = "dismiss_dialog"
    ACTIVATE_PRIMARY_ACTION = "activate_primary_action"
    SUBMIT_CURRENT_INPUT = "submit_current_input"
    VERIFY_PAGE_CONTENT = "verify_page_content"
    GET_COOKIES = "get_cookies"
    GET_LOCAL_STORAGE = "get_local_storage"
    GET_SESSION_STORAGE = "get_session_storage"
    OBSERVE_NETWORK = "observe_network"
    SWITCH_TAB = "switch_tab"
    VISUAL_VERIFY = "visual_verify"

class FileSourceType(str, Enum):
    """Origin of the file asset."""
    LOCAL = "local"
    CLOUD = "cloud"

class TextMatchMode(str, Enum):
    """Text matching strategies for verification."""
    EQUALS = "equals"
    CONTAINS = "contains"

class ScrollAlignment(str, Enum):
    """Scroll alignment options."""
    TOP = "top"
    CENTER = "center"
    BOTTOM = "bottom"

class EnvironmentConfig(BaseModel):
    """Configuration for the execution environment."""
    id: str = Field(..., description="Unique environment identifier")
    name: str = Field(..., description="Human-readable name")
    browser: Literal["chrome", "firefox", "edge"] = Field("chrome", description="Browser to use")
    headless: bool = Field(True, description="Run in headless mode")
    window_width: int = Field(1920, description="Window width")
    window_height: int = Field(1080, description="Window height")
    base_url: Optional[str] = Field(None, description="Base URL for relative paths")
    variables: Dict[str, str] = Field(default_factory=dict, description="Environment-specific variable overrides")

class ConditionKind(str, Enum):
    """Semantic condition types for control flow blocks."""
    ELEMENT_VISIBLE = "element_visible"
    ELEMENT_NOT_VISIBLE = "element_not_visible"
    PAGE_TITLE_EQUALS = "page_title_equals"
    URL_CONTAINS = "url_contains"
    SAVED_VALUE_EXISTS = "saved_value_exists"
    SAVED_VALUE_EQUALS = "saved_value_equals"
    TEXT_MATCH = "text_match"

class HttpMethod(str, Enum):
    """HTTP methods for network verification."""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    ANY = "ANY"


class PerformanceMetric(str, Enum):
    """Performance metrics for verification."""
    LCP = "LCP"
    CLS = "CLS"
    FID = "FID"
    TTFB = "TTFB"
    PAGE_LOAD_TIME = "page_load_time"  # loadEventEnd - navigationStart
    DOM_INTERACTIVE = "dom_interactive" # domInteractive - navigationStart
    FIRST_BYTE = "first_byte" # responseStart - requestStart
    NETWORK_REQUESTS = "network_requests" # number of requests

class AuthRequest(BaseModel):
    email: str
    password: str


class FlowState(str, Enum):
    """Flow execution states."""
    DRAFT = "draft"  # Incomplete blocks allowed, execution NOT allowed
    RUNNABLE = "runnable"  # Fully configured, safe to execute


# Controlled vocabulary for structural intents (semantically void elements)
STRUCTURAL_INTENTS = [
    "cart", "basket", "checkout",
    "menu", "navigation", "hamburger",
    "search", "search_trigger",
    "profile", "user_menu", "account",
    "close", "dismiss", "cancel",
    "confirm", "proceed", "submit",
    "more", "overflow", "options"
]

class ElementRef(BaseModel):
    """
    Semantic Reference to a UI element (Zero-Code Contract).
    
    CONTRACT:
    - REQUIRED: role (e.g. 'button'), name (e.g. 'Submit')
    - OPTIONAL: metadata, previewImage
    - FORBIDDEN: selectors (CSS/XPath) are strictly excluded logic.
    """
    id: Optional[str] = Field(None, description="Unique reference ID")
    role: str = Field(..., min_length=1, description="Semantic Role (button, link, input)")
    name: str = Field(..., min_length=1, description="Accessible Name (visible text or aria-label)")
    name_source: Literal["native", "user_declared"] = Field("native", description="Source of the semantic name")
    confidence: Literal["high", "low", "declared"] = Field("high", description="Resolution confidence: high (native), low (user-declared), declared (structural)")
    context: Optional[Dict[str, str]] = Field(None, description="Semantic context for user-declared elements (e.g., region)")
    
    # Structural Intent Fields (for semantically void elements)
    intent_type: Literal["semantic", "structural"] = Field("semantic", description="Type of intent: semantic (preferred) or structural (void elements)")
    system_role: Optional[str] = Field(None, description="Structural system role (cart, menu, search, etc.) for void elements")
    verification_required: bool = Field(False, description="Whether post-action verification is required")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional semantic hints")
    # selector field is REMOVED to enforce Zero-Code.
    previewImage: Optional[str] = None

    @classmethod
    def validate_semantic_fields(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Zero-Code Violation: Element must have a valid Role and Name. Please re-pick the element.")
        return v


class FileRef(BaseModel):
    """
    Reference to a test file (Zero-Code Contract).
    NO raw paths allowed.
    """
    id: str = Field(..., description="Unique file reference ID")
    name: str = Field(..., description="Display name (e.g., 'resume.pdf')")
    mime_type: Optional[str] = Field(None, description="MIME type")
    source: FileSourceType = Field(FileSourceType.LOCAL, description="Source of the file")


class SavedValueRef(BaseModel):
    """Reference to a saved value from execution context."""
    key: str = Field(..., description="Saved value key")
    label: Optional[str] = Field(None, description="Human-readable label")


class Condition(BaseModel):
    """
    Semantic condition for control flow blocks (Zero-Code).
    
    Exactly one condition kind with appropriate parameters.
    No boolean expressions, no AND/OR chaining.
    """
    kind: ConditionKind = Field(..., description="Type of condition")
    
    # Element-based conditions
    element: Optional[ElementRef] = Field(None, description="Element reference for element_visible/not_visible")
    
    # Page-based conditions
    expected_title: Optional[str] = Field(None, description="Expected page title for page_title_equals")
    expected_fragment: Optional[str] = Field(None, description="Expected URL fragment for url_contains")
    
    # Saved value conditions
    value_ref: Optional[SavedValueRef] = Field(None, description="Saved value reference")
    expected_text: Optional[str] = Field(None, description="Expected text for saved_value_equals")
    
    # Text match conditions
    match_mode: Optional[Literal["equals", "contains"]] = Field(None, description="Match mode for text_match")
    value: Optional[str] = Field(None, description="Value for text_match")
    
    @field_validator('element')
    @classmethod
    def validate_element_conditions(cls, v, info):
        """Validate element is provided for element-based conditions."""
        kind = info.data.get('kind')
        if kind in [ConditionKind.ELEMENT_VISIBLE, ConditionKind.ELEMENT_NOT_VISIBLE]:
            if not v:
                raise ValueError(f"Condition '{kind}' requires an element reference")
        return v
    
    @field_validator('expected_title')
    @classmethod
    def validate_title_condition(cls, v, info):
        """Validate expected_title is provided for page_title_equals."""
        kind = info.data.get('kind')
        if kind == ConditionKind.PAGE_TITLE_EQUALS and not v:
            raise ValueError("Condition 'page_title_equals' requires expected_title")
        return v
    
    @field_validator('expected_fragment')
    @classmethod
    def validate_url_condition(cls, v, info):
        """Validate expected_fragment is provided for url_contains."""
        kind = info.data.get('kind')
        if kind == ConditionKind.URL_CONTAINS and not v:
            raise ValueError("Condition 'url_contains' requires expected_fragment")
        return v
    
    @field_validator('value_ref')
    @classmethod
    def validate_saved_value_conditions(cls, v, info):
        """Validate value_ref is provided for saved value conditions."""
        kind = info.data.get('kind')
        if kind in [ConditionKind.SAVED_VALUE_EXISTS, ConditionKind.SAVED_VALUE_EQUALS]:
            if not v:
                raise ValueError(f"Condition '{kind}' requires a value reference")
        return v

    @field_validator('match_mode')
    @classmethod
    def validate_text_match_conditions(cls, v, info):
        """Validate match_mode and value are provided for text_match."""
        kind = info.data.get('kind')
        if kind == ConditionKind.TEXT_MATCH:
            if not v:
                raise ValueError("Condition 'text_match' requires match_mode")
            if not info.data.get('value'):
                raise ValueError("Condition 'text_match' requires value")
            if not info.data.get('element'):
                raise ValueError("Condition 'text_match' requires an element reference")
        return v


class BaseBlock(BaseModel):
    """Base class for all block types."""
    id: str = Field(..., description="Unique block identifier")
    type: BlockType = Field(..., description="Block type")
    next_block: Optional[str] = Field(None, description="ID of next block to execute")
    task_id: Optional[str] = Field(None, description="ID of the task this block belongs to")
    
    class Config:
        use_enum_values = True


class OpenPageBlock(BaseBlock):
    """Navigate to a URL."""
    type: Literal[BlockType.OPEN_PAGE] = BlockType.OPEN_PAGE
    url: str = Field(..., description="URL to navigate to")
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
             # Auto-fix: Default to https if protocol missing
             return f"https://{v}"
        return v


class ClickElementBlock(BaseBlock):
    """Click on an element."""
    type: Literal[BlockType.CLICK_ELEMENT] = BlockType.CLICK_ELEMENT
    description: Optional[str] = Field(None, description="Human-readable description of element")
    element: Optional[ElementRef] = Field(None, description="Zero-code element reference")


class EnterTextBlock(BaseBlock):
    """Enter text into an input field."""
    type: Literal[BlockType.ENTER_TEXT] = BlockType.ENTER_TEXT
    text: str = Field("", description="Text to enter")
    clear_first: bool = Field(True, description="Clear existing text before typing")
    description: Optional[str] = Field(None, description="Human-readable description of input")
    element: Optional[ElementRef] = Field(None, description="Zero-code element reference")


class WaitUntilVisibleBlock(BaseBlock):
    """Wait for an element to become visible."""
    type: Literal[BlockType.WAIT_UNTIL_VISIBLE] = BlockType.WAIT_UNTIL_VISIBLE
    timeout_seconds: int = Field(10, description="Maximum wait time in seconds", ge=1, le=60)
    description: Optional[str] = Field(None, description="Human-readable description of element")
    element: Optional[ElementRef] = Field(None, description="Zero-code element reference")


class AssertVisibleBlock(BaseBlock):
    """Assertion: Ensure the target element is visible on the page."""
    type: Literal[BlockType.ASSERT_VISIBLE] = BlockType.ASSERT_VISIBLE
    element: ElementRef = Field(..., description="Semantic reference to the element")


class VisualVerifyBlock(BaseBlock):
    """
    [EXPERIMENTAL] Semantic Visual Regression Testing
    
    Performs visual comparison of the current page against a baseline.
    Uses pixel diff analysis with an AI saliency fallback to distinguish 
    meaningful changes from cosmetic noise.
    """
    type: Literal[BlockType.VISUAL_VERIFY] = BlockType.VISUAL_VERIFY
    threshold: float = 0.01  # Pixel diff threshold (0.0-1.0) before AI fallback
    baseline_id: str  # Run ID or URL of baseline screenshot
    element: Optional[ElementRef] = Field(None, description="Zero-code element reference")


class IfConditionBlock(BaseBlock):
    """Conditional branching based on semantic condition (Zero-Code)."""
    type: Literal[BlockType.IF_CONDITION] = BlockType.IF_CONDITION
    condition: Condition = Field(..., description="Semantic condition to evaluate")
    then_blocks: List[str] = Field(default_factory=list, description="Block IDs to execute if condition is true")
    else_blocks: List[str] = Field(default_factory=list, description="Block IDs to execute if condition is false")


class RepeatUntilBlock(BaseBlock):
    """Repeat blocks until semantic condition is met (Zero-Code)."""
    type: Literal[BlockType.REPEAT_UNTIL] = BlockType.REPEAT_UNTIL
    condition: Condition = Field(..., description="Semantic condition to check after each iteration")
    body_blocks: List[str] = Field(default_factory=list, description="Block IDs to repeat")
    max_iterations: int = Field(10, description="Maximum loop iterations (safety limit)", ge=1, le=50)



class DelayBlock(BaseBlock):
    """Wait for a specified duration."""
    type: Literal[BlockType.DELAY] = BlockType.DELAY
    seconds: float = Field(1.0, description="Seconds to wait", ge=0)


class RefreshPageBlock(BaseBlock):
    """Refresh the current page."""
    type: Literal[BlockType.REFRESH_PAGE] = BlockType.REFRESH_PAGE


class WaitForPageLoadBlock(BaseBlock):
    """Wait for the page to finish loading."""
    type: Literal[BlockType.WAIT_FOR_PAGE_LOAD] = BlockType.WAIT_FOR_PAGE_LOAD
    timeout_seconds: int = Field(15, description="Maximum wait time", ge=1)


class SelectOptionBlock(BaseBlock):
    """Select an option from a dropdown by visible text."""
    type: Literal[BlockType.SELECT_OPTION] = BlockType.SELECT_OPTION
    element: Optional[ElementRef] = Field(None, description="The dropdown element")
    option_text: str = Field("", description="Visible text of option to select")


class UploadFileBlock(BaseBlock):
    """Upload a file to a file input."""
    type: Literal[BlockType.UPLOAD_FILE] = BlockType.UPLOAD_FILE
    element: Optional[ElementRef] = Field(None, description="The file input element")
    file: Optional[FileRef] = Field(None, description="Zero-code file reference")
    # NO file_path allowed to ensure portability and security.


class TextMatch(BaseModel):
    """Text matching configuration for verification."""
    mode: TextMatchMode = Field(..., description="Match mode: equals or contains")
    value: str = Field(..., description="Expected text value")


class VerifyTextBlock(BaseBlock):
    """Verify text content of an element."""
    type: Literal[BlockType.VERIFY_TEXT] = BlockType.VERIFY_TEXT
    element: Optional[ElementRef] = Field(None, description="Element to verify text from")
    match: TextMatch = Field(default_factory=lambda: TextMatch(mode=TextMatchMode.EQUALS, value=""), description="Text matching configuration")


class ScrollToElementBlock(BaseBlock):
    """Scroll to bring an element into view."""
    type: Literal[BlockType.SCROLL_TO_ELEMENT] = BlockType.SCROLL_TO_ELEMENT
    element: Optional[ElementRef] = Field(None, description="Element to scroll to")
    alignment: ScrollAlignment = Field(ScrollAlignment.CENTER, description="Scroll alignment")


class SaveAs(BaseModel):
    """Configuration for saving extracted data."""
    key: str = Field(..., description="Storage key for the saved value")
    label: str = Field(..., description="Human-readable label")


class SaveTextBlock(BaseBlock):
    """Save text content from an element."""
    type: Literal[BlockType.SAVE_TEXT] = BlockType.SAVE_TEXT
    element: Optional[ElementRef] = Field(None, description="Element to extract text from")
    save_as: SaveAs = Field(..., description="Save configuration")


class SavePageContentBlock(BaseBlock):
    """
    Save entire page text content as a variable.
    
    This block captures all visible text on the page without requiring element selection.
    Useful for dynamic content testing where elements lack stable semantic identity.
    """
    type: Literal[BlockType.SAVE_PAGE_CONTENT] = BlockType.SAVE_PAGE_CONTENT
    save_as: SaveAs = Field(..., description="Save configuration")


class VerifyPageTitleBlock(BaseBlock):
    """Verify the page title."""
    type: Literal[BlockType.VERIFY_PAGE_TITLE] = BlockType.VERIFY_PAGE_TITLE
    title: str = Field(..., description="Expected title text")


class VerifyUrlBlock(BaseBlock):
    """Verify the current URL."""
    type: Literal[BlockType.VERIFY_URL] = BlockType.VERIFY_URL
    url_part: str = Field("", description="Expected URL part (contains match)")


class VerifyElementEnabledBlock(BaseBlock):
    """Verify if an element is enabled or disabled."""
    type: Literal[BlockType.VERIFY_ELEMENT_ENABLED] = BlockType.VERIFY_ELEMENT_ENABLED
    element: Optional[ElementRef] = Field(None, description="Element to verify")
    should_be_enabled: bool = Field(True, description="True for enabled, False for disabled")


class UseSavedValueAction(str, Enum):
    """Actions specific to using saved values."""
    ENTER_TEXT = "enter_text"
    VERIFY_CONTAINS = "verify_contains"
    VERIFY_EQUALS = "verify_equals"


class SavedValueRef(BaseModel):
    """Reference to a saved value from context."""
    key: str = Field(..., description="Storage key for the saved value")
    label: str = Field(..., description="Human-readable label")


class UseSavedValueTarget(BaseModel):
    """Target action configuration."""
    action: UseSavedValueAction = Field(..., description="Action to perform with the value")


class UseSavedValueBlock(BaseBlock):
    """Use a previously saved value for an action."""
    type: Literal[BlockType.USE_SAVED_VALUE] = BlockType.USE_SAVED_VALUE
    target: UseSavedValueTarget = Field(default_factory=lambda: UseSavedValueTarget(action=UseSavedValueAction.ENTER_TEXT), description="Action configuration")
    element: Optional[ElementRef] = Field(None, description="Target element")
    value_ref: Optional[SavedValueRef] = Field(None, description="Reference to saved value")


class VerifyNetworkRequestBlock(BaseBlock):
    """Verify that a network request occurred."""
    type: Literal[BlockType.VERIFY_NETWORK_REQUEST] = BlockType.VERIFY_NETWORK_REQUEST
    url_pattern: str = Field(..., description="URL substring or pattern to match")
    method: HttpMethod = Field(HttpMethod.ANY, description="HTTP method to match")
    status_code: Optional[int] = Field(None, description="Expected HTTP status code")


class VerifyPerformanceBlock(BaseBlock):
    """Verify page performance metrics."""
    type: Literal[BlockType.VERIFY_PERFORMANCE] = BlockType.VERIFY_PERFORMANCE
    metric: PerformanceMetric = Field(PerformanceMetric.PAGE_LOAD_TIME, description="Metric to verify")
    threshold_ms: int = Field(2000, description="Maximum allowed duration in milliseconds")



class SubmitFormBlock(BaseBlock):
    """Submit a form semantic action."""
    type: Literal[BlockType.SUBMIT_FORM] = BlockType.SUBMIT_FORM
    element: Optional[ElementRef] = Field(None, description="Form element to submit (optional, can auto-resolve)")

class ConfirmDialogBlock(BaseBlock):
    """Confirm a system dialog semantic action."""
    type: Literal[BlockType.CONFIRM_DIALOG] = BlockType.CONFIRM_DIALOG

class DismissDialogBlock(BaseBlock):
    """Dismiss a system dialog semantic action."""
    type: Literal[BlockType.DISMISS_DIALOG] = BlockType.DISMISS_DIALOG

class ActivatePrimaryActionBlock(BaseBlock):
    """Activate the primary action on the page."""
    type: Literal[BlockType.ACTIVATE_PRIMARY_ACTION] = BlockType.ACTIVATE_PRIMARY_ACTION

class SubmitCurrentInputBlock(BaseBlock):
    """Submit the currently focused input."""
    type: Literal[BlockType.SUBMIT_CURRENT_INPUT] = BlockType.SUBMIT_CURRENT_INPUT
    element: Optional[ElementRef] = Field(None, description="Element reference (restricted to Enter Text element)")

class VerifyPageContentBlock(BaseBlock):
    """Verify that specific text exists anywhere on the page."""
    type: Literal[BlockType.VERIFY_PAGE_CONTENT] = BlockType.VERIFY_PAGE_CONTENT
    match: TextMatch = Field(default_factory=lambda: TextMatch(mode=TextMatchMode.CONTAINS, value=""), description="Text and match mode to verify")


class GetCookiesBlock(BaseBlock):
    """Capture all browser cookies as factual evidence."""
    type: Literal[BlockType.GET_COOKIES] = BlockType.GET_COOKIES

class GetLocalStorageBlock(BaseBlock):
    """Capture all local storage entries as factual evidence."""
    type: Literal[BlockType.GET_LOCAL_STORAGE] = BlockType.GET_LOCAL_STORAGE

class GetSessionStorageBlock(BaseBlock):
    """Capture all session storage entries as factual evidence."""
    type: Literal[BlockType.GET_SESSION_STORAGE] = BlockType.GET_SESSION_STORAGE

class ObserveNetworkBlock(BaseBlock):
    """Start capturing network requests for verification."""
    type: Literal[BlockType.OBSERVE_NETWORK] = BlockType.OBSERVE_NETWORK

class SwitchTabBlock(BaseBlock):
    """Switch browser focus to a new tab or window."""
    type: Literal[BlockType.SWITCH_TAB] = BlockType.SWITCH_TAB
    to_newest: bool = Field(True, description="Switch to the most recently opened tab")
    tab_index: Optional[int] = Field(0, description="Index of tab to switch to (if not newest)")





# Union type for all block types with discriminator for clear error reporting
Block = Annotated[
    Union[
        OpenPageBlock,
        ClickElementBlock,
        EnterTextBlock,
        WaitUntilVisibleBlock,
        AssertVisibleBlock,
        IfConditionBlock,
        RepeatUntilBlock,
        DelayBlock,
        RefreshPageBlock,
        WaitForPageLoadBlock,
        SelectOptionBlock,
        UploadFileBlock,
        VerifyTextBlock,
        ScrollToElementBlock,
        SaveTextBlock,
        SavePageContentBlock,
        VerifyPageTitleBlock,
        VerifyUrlBlock,
        VerifyElementEnabledBlock,
        UseSavedValueBlock,
        VerifyNetworkRequestBlock,
        VerifyPerformanceBlock,
        SubmitFormBlock,
        ConfirmDialogBlock,
        DismissDialogBlock,
        ActivatePrimaryActionBlock,
        SubmitCurrentInputBlock,
        VerifyPageContentBlock,
        GetCookiesBlock,
        GetLocalStorageBlock,
        GetSessionStorageBlock,
        ObserveNetworkBlock,
        SwitchTabBlock,
        VisualVerifyBlock,
    ],
    Discriminator("type")
]

class Scenario(BaseModel):
    """
    Single scenario instance containing data values for one flow execution.
    """
    scenario_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8], description="Internal unique ID")
    scenario_name: str = Field(..., description="Unique identifier for this scenario")
    values: Dict[str, str] = Field(..., description="Map of variable name to value")
    
    @field_validator('scenario_name')
    @classmethod
    def validate_scenario_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("scenario_name cannot be empty")
        return v.strip()


class ScenarioSet(BaseModel):
    """
    Named collection of scenarios persisted in a flow.
    """
    id: str = Field(..., description="Unique set identifier")
    name: str = Field(..., description="Human-readable name (e.g., 'Smoke Tests')")
    scenarios: List[Scenario] = Field(..., description="List of scenarios in this set")
    created_at: float = Field(..., description="Unix timestamp of creation")


class FlowGraph(BaseModel):
    """Complete flow graph representing a visual test."""
    id: Optional[str] = Field(None, description="Unique flow identifier (optional for newly created)")
    name: str = Field(..., description="Flow name")
    schema_version: int = Field(1, description="Schema version for migrations")
    description: Optional[str] = Field(None, description="Flow description")
    entry_block: str = Field(..., description="ID of first block to execute")
    blocks: List[Block] = Field(..., description="All blocks in the flow")
    variables: Dict[str, str] = Field(default_factory=dict, description="Initial variable values")
    scenario_sets: List[ScenarioSet] = Field(default_factory=list, description="Saved scenario sets")
    
    @field_validator('blocks')
    @classmethod
    def validate_blocks(cls, blocks: List[Block]) -> List[Block]:
        """Ensure all block IDs are unique."""
        block_ids = [block.id for block in blocks]
        if len(block_ids) != len(set(block_ids)):
            raise ValueError("All block IDs must be unique")
        return blocks
    
    def get_block_by_id(self, block_id: str) -> Optional[Block]:
        """Get a block by its ID."""
        for block in self.blocks:
            if block.id == block_id:
                return block
        return None
    
    def validate_references(self) -> List[str]:
        """
        Validate that all block references point to existing blocks.
        Returns list of validation errors (empty if valid).
        """
        errors = []
        block_ids = {block.id for block in self.blocks}
        
        # Check entry block exists
        if self.entry_block not in block_ids:
            errors.append(f"Entry block '{self.entry_block}' does not exist")
        
        # Check all block references
        for block in self.blocks:
            # Check next_block
            if block.next_block and block.next_block not in block_ids:
                errors.append(f"Block '{block.id}' references non-existent next_block '{block.next_block}'")
            
            # Check conditional branches
            if isinstance(block, IfConditionBlock):
                for tid in block.then_blocks:
                    if tid not in block_ids:
                        errors.append(f"Block '{block.id}' references non-existent block '{tid}' in then_blocks")
                for eid in block.else_blocks:
                    if eid not in block_ids:
                        errors.append(f"Block '{block.id}' references non-existent block '{eid}' in else_blocks")
            
            # Check loop body
            if isinstance(block, RepeatUntilBlock):
                for bid in block.body_blocks:
                    if bid not in block_ids:
                        errors.append(f"Block '{block.id}' references non-existent block '{bid}' in body_blocks")
        
        return errors
    
    def validate_completeness(self) -> List[str]:
        """
        Validate that all blocks are fully configured for execution.
        Returns list of validation errors (empty if runnable).
        
        This is the EXECUTION GATE - flows with any errors cannot run.
        """
        errors = []
        
        for block in self.blocks:
            # User-friendly label: "Open Page Block" instead of "Block 'uuid'"
            # We rely on the frontend to highlight the specific block visually
            block_label = f"{block.type.replace('_', ' ').title()} Block"
            
            # Import block types for isinstance checks
            from models import (
                OpenPageBlock, ClickElementBlock, EnterTextBlock,
                WaitUntilVisibleBlock, AssertVisibleBlock,
                SelectOptionBlock, UploadFileBlock, VerifyTextBlock,
                ScrollToElementBlock, SaveTextBlock,
                VerifyPageTitleBlock, VerifyUrlBlock,
                VerifyElementEnabledBlock, UseSavedValueBlock,
                SubmitFormBlock, SubmitCurrentInputBlock,
                VerifyPageContentBlock, IfConditionBlock, RepeatUntilBlock
            )
            
            # Check each block type for required fields
            if isinstance(block, OpenPageBlock):
                if not block.url or not block.url.strip():
                    errors.append(f"{block_label}: Requires a URL")
            
            elif isinstance(block, ClickElementBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
            
            elif isinstance(block, EnterTextBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
                if not block.text and block.text != "":  # Allow empty string intentionally
                    errors.append(f"{block_label}: Requires text value")
            
            elif isinstance(block, WaitUntilVisibleBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
            
            elif isinstance(block, AssertVisibleBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
            
            elif isinstance(block, SelectOptionBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a dropdown element")
                if not block.option_text:
                    errors.append(f"{block_label}: Requires option text")
            
            elif isinstance(block, UploadFileBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a file input element")
                if not block.file:
                    errors.append(f"{block_label}: Requires a file selection")
            
            elif isinstance(block, VerifyTextBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
                if not block.match or not block.match.value:
                    errors.append(f"{block_label}: Requires expected text value")
            
            elif isinstance(block, ScrollToElementBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
            
            elif isinstance(block, SaveTextBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
                if not block.save_as or not block.save_as.key:
                    errors.append(f"{block_label}: Requires a variable name")
            
            elif isinstance(block, VerifyPageTitleBlock):
                if not block.title:
                    errors.append(f"{block_label}: Requires expected title")
            
            elif isinstance(block, VerifyUrlBlock):
                if not block.url_part:
                    errors.append(f"{block_label}: Requires expected URL fragment")
            
            elif isinstance(block, VerifyElementEnabledBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
            
            elif isinstance(block, UseSavedValueBlock):
                if not block.value_ref or not block.value_ref.key:
                    errors.append(f"{block_label}: Requires a source value")
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
            
            elif isinstance(block, SubmitFormBlock):
                if not block.element:
                    errors.append(f"{block_label}: Requires a target element")
            
            elif isinstance(block, SubmitCurrentInputBlock):
                pass
            
            elif isinstance(block, VerifyPageContentBlock):
                if not block.match or not block.match.value:
                    errors.append(f"{block_label}: Requires text to search for")
            
            elif isinstance(block, IfConditionBlock):
                if not block.condition:
                    errors.append(f"{block_label}: Requires a condition")
                elif block.condition.kind in ['element_visible', 'element_not_visible', 'text_match']:
                    if not block.condition.element:
                        errors.append(f"{block_label}: Requires an element for '{block.condition.kind.replace('_', ' ')}'")
            
            elif isinstance(block, RepeatUntilBlock):
                if not block.condition:
                    errors.append(f"{block_label}: Requires a condition")
                elif block.condition.kind in ['element_visible', 'element_not_visible', 'text_match']:
                    if not block.condition.element:
                        errors.append(f"{block_label}: Repeat Until requires an element for '{block.condition.kind}'")
            
        
        # Evidence-Compatible Saved Values Validation
        # Prohibit {{variables}} in control flow, element selection, and navigation
        import re
        variable_pattern = re.compile(r'\{\{[^}]+\}\}')
        
        def contains_variable(text: Optional[str]) -> bool:
            """Check if text contains {{variable}} pattern."""
            return bool(text and variable_pattern.search(text))
        
        for block in self.blocks:
            block_label = f"Block '{block.id}'"
            
            # PROHIBITED: URLs (navigation targets) - RELAXED for environment variables
            if isinstance(block, OpenPageBlock):
                pass # Allow placeholders in URLs for environment variables 🧘‍♂️
                # if contains_variable(block.url):
                #     errors.append(f"{block_label}: Saved values cannot be used in URLs (navigation targets)")
            
            # PROHIBITED: Control flow conditions
            if isinstance(block, (IfConditionBlock, RepeatUntilBlock)):
                cond = block.condition
                if cond:
                    # Check condition value fields
                    if hasattr(cond, 'value') and contains_variable(cond.value):
                        errors.append(f"{block_label}: Saved values cannot be used in control flow conditions")
                    if hasattr(cond, 'expected_title') and contains_variable(cond.expected_title):
                        errors.append(f"{block_label}: Saved values cannot be used in control flow conditions")
                    if hasattr(cond, 'expected_fragment') and contains_variable(cond.expected_fragment):
                        errors.append(f"{block_label}: Saved values cannot be used in control flow conditions")
                    if hasattr(cond, 'expected_text') and contains_variable(cond.expected_text):
                        errors.append(f"{block_label}: Saved values cannot be used in control flow conditions")
            
            # PROHIBITED: Element names (element selection)
            element_blocks = (
                ClickElementBlock, EnterTextBlock, WaitUntilVisibleBlock, 
                AssertVisibleBlock, SelectOptionBlock, UploadFileBlock,
                VerifyTextBlock, ScrollToElementBlock, SaveTextBlock,
                VerifyElementEnabledBlock, SubmitFormBlock, SubmitCurrentInputBlock
            )
            if isinstance(block, element_blocks):
                if block.element and contains_variable(block.element.name):
                    errors.append(f"{block_label}: Saved values cannot be used for element selection")
        
        return errors

    
    def get_state(self) -> FlowState:
        """Determine if flow is DRAFT or RUNNABLE."""
        return FlowState.RUNNABLE if not self.validate_completeness() else FlowState.DRAFT


class ErrorCategory(str, Enum):
    """Categories for user-facing errors."""
    CONFIGURATION = "Configuration Error"
    ELEMENT_RESOLUTION = "Element Not Found"
    TIMING_STATE = "Timing Issue"
    LOGIC = "Logic Error"
    UNSUPPORTED_ACTION = "Unsupported Action"
    SYSTEM = "System Error"

class UserFacingError(BaseModel):
    """Structured error for user consumption (Canonical Failure Model)."""
    title: str = Field(..., description="Tier 1: Short outcome summary")
    intent: str = Field(default="Unknown intent", description="What the block was trying to do")
    reason: str = Field(..., description="Why the action failed")
    suggestion: str = Field(..., description="Actionable guidance")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Tier 2: Visual/Data evidence")
    owner: Optional[str] = Field(None, description="Failure Owner (USER, APP, ENGINE, SYSTEM)")
    determinism: Optional[str] = Field(None, description="Failure Determinism (CERTAIN, HEURISTIC, UNKNOWN)")
    
    # Legacy/Compatibility
    message: str = Field(..., description="Full explanation (Legacy)")
    category: ErrorCategory = Field(..., description="Error classification")
    related_block_id: Optional[str] = None

class ExecutionResult(BaseModel):
    """Result of flow execution."""
    success: bool = Field(..., description="Whether execution completed successfully")
    message: str = Field(..., description="Human-readable result message")
    logs: List[str] = Field(default_factory=list, description="Step-by-step execution logs")
    error: Optional[UserFacingError] = Field(None, description="Structured user-facing error")
    error_block_id: Optional[str] = Field(None, description="ID of block where error occurred")
    executed_blocks: List[str] = Field(default_factory=list, description="IDs of blocks that were executed")
    flow: Optional[Dict[str, Any]] = Field(None, description="The flow configuration used for this execution")
    screenshot: Optional[str] = None
    
class BlockExecution(BaseModel):
    """Record of a single block's execution."""
    run_id: str
    block_id: str
    block_type: BlockType
    status: Literal["success", "failed"]
    duration_ms: float
    taf: Dict[str, List[str]]
    screenshot: Optional[str] = None
    message: Optional[str] = None
    confidence_score: Optional[float] = None
    actual_attributes: Optional[Dict[str, Any]] = None
    semantic_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    tier_2_evidence: Optional[Any] = None

class TaskStatus(str, Enum):
    """Status of a task."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class Task(BaseModel):
    """High-level task identifier for complex operations."""
    id: str
    description: str
    status: TaskStatus = TaskStatus.PENDING

class ExecutionReport(BaseModel):
    """Full report of a flow execution run."""
    run_id: str
    flow_id: Optional[str] = None
    flow_name: Optional[str] = None
    scenario_name: Optional[str] = None
    started_at: float
    finished_at: Optional[float] = None
    duration_ms: float = 0
    success: Optional[bool] = None
    blocks: List[BlockExecution] = Field(default_factory=list)
    tasks: List[Task] = Field(default_factory=list)
    error: Optional[UserFacingError] = None
    result: Optional[ExecutionResult] = None
    scenario_values: Dict[str, Any] = Field(default_factory=dict)
    report_files: Dict[str, str] = Field(default_factory=dict)


# ============================================================================
# SCENARIO EXPANSION MODELS (Post-V1 Feature)
# ============================================================================





class ScenarioTemplate(BaseModel):
    """
    Generated CSV template metadata for scenario-based testing.
    """
    flow_id: str = Field(..., description="ID of the flow this template was generated from")
    columns: List[str] = Field(..., description="Ordered list of column names (includes scenario_name)")
    block_mappings: Dict[str, str] = Field(..., description="Map of variable name to variable name")
    generated_at: float = Field(..., description="Unix timestamp of template generation")


class ScenarioExecutionRequest(BaseModel):
    """Request to execute a flow with multiple scenarios."""
    flow: 'FlowGraph'
    scenarios: List[Scenario] = Field(..., description="List of scenarios to execute")
    environment_id: Optional[str] = Field(None, description="Optional environment configuration")


class ScenarioExecutionResult(BaseModel):
    """Result of executing a single scenario."""
    scenario_name: str = Field(..., description="Name of the executed scenario")
    run_id: str = Field(..., description="Unique execution run ID")
    success: bool = Field(..., description="Whether the scenario execution succeeded")
    report: 'ExecutionReport' = Field(..., description="Full execution report for this scenario")


class ScenarioSuiteReport(BaseModel):
    """
    Grouped report for a multi-scenario execution run.
    """
    suite_id: str = Field(..., description="Unique ID for this suite execution")
    flow_name: str = Field(..., description="Name of the flow executed")
    started_at: float = Field(..., description="Unix timestamp of suite start")
    finished_at: Optional[float] = None
    results: List[ScenarioExecutionResult] = Field(default_factory=list)
    
    @property
    def total_scenarios(self) -> int:
        return len(self.results)
    
    @property
    def passed_scenarios(self) -> int:
        return sum(1 for r in self.results if r.success)
    
    @property
    def failed_scenarios(self) -> int:
        return self.total_scenarios - self.passed_scenarios
