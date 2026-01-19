"""
Abstract browser engine interface and Selenium implementation.

This module hides all browser automation complexity from the rest of the system.
All Selenium/Playwright details are encapsulated here.
"""

from abc import ABC, abstractmethod
from typing import Optional, Tuple, Any, List, Dict
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    StaleElementReferenceException,
    ElementNotInteractableException,
    ElementClickInterceptedException,
    WebDriverException
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from models import UserFacingError
from errors import ErrorFactory
import os
import tempfile
import time
import logging
from selenium.webdriver.common.alert import Alert
from selenium.webdriver.remote.webelement import WebElement



logger = logging.getLogger(__name__)

class BrowserEngineError(Exception):
    """User-friendly browser engine error."""
    def __init__(self, message: str, technical_details: Optional[str] = None, user_error: Optional[UserFacingError] = None, evidence: Optional[Dict[str, Any]] = None):
        self.message = message
        self.technical_details = technical_details
        self.user_error = user_error
        self.evidence = evidence or {}
        super().__init__(message)


class BrowserEngine(ABC):
    """Abstract interface for browser automation engines."""
    
    @abstractmethod
    def open_page(self, url: str) -> None:
        """Navigate to a URL."""
        pass
    
    
    @abstractmethod
    def wait_for_stability(self, timeout_seconds: float = 5.0) -> None:
        """Wait for page ready state, fonts, and visual stability (animations)."""
        pass

    @abstractmethod
    def is_element_visible_handle(self, handle: Any) -> bool:
        """Check if a resolved element handle is visible."""
        pass
    
    
    @abstractmethod
    def execute_script(self, script: str, *args) -> Any:
        """Execute JavaScript in the browser."""
        pass

    @abstractmethod
    def click_handle(self, handle: Any) -> None:
        """Click on a resolved element handle."""
        pass

    @abstractmethod
    def enter_text_handle(self, handle: Any, text: str, clear_first: bool = True) -> None:
        """Enter text into a resolved element handle."""
        pass

    @abstractmethod
    def refresh_page(self) -> None:
        """Refresh the current page."""
        pass

    @abstractmethod
    def wait_for_page_load(self, timeout_seconds: int = 15) -> None:
        """Wait for page to finish loading."""
        pass

    @abstractmethod
    def submit_form(self, handle: Any) -> None:
        """Submit a form or the form containing the element."""
        pass

    @abstractmethod
    def submit_current_input(self, handle: Optional[Any] = None) -> None:
        """Hit Enter on the current focused element, or the specified handle."""
        pass

    @abstractmethod
    def handle_dialog(self, accept: bool) -> None:
        """Accept or dismiss a system dialog."""
        pass

    @abstractmethod
    def activate_primary_action(self) -> None:
        """Find and activate the primary action on the page."""
        pass

    @abstractmethod
    def select_option(self, element: Any, option_text: str) -> None:
        """Select an option from a dropdown."""
        pass

    @abstractmethod
    def upload_file(self, element: Any, file_path: str) -> None:
        """Upload a local file to an input."""
        pass

    @abstractmethod
    def get_element_text(self, element: Any) -> str:
        """Get text content from an element."""
        pass

    @abstractmethod
    def verify_text(self, element: Any, expected: str, mode: str) -> None:
        """Verify text content matches expectation."""
        pass

    @abstractmethod
    def verify_page_content(self, expected: str, mode: str) -> None:
        """Verify that text exists anywhere on the page."""
        pass

    @abstractmethod
    def scroll_to_element(self, element: Any, alignment: str = "center") -> None:
        """Scroll to bring element into view."""
        pass

    @abstractmethod
    def get_title(self) -> str:
        """Get the current page title."""
        pass

    def get_page_title(self) -> str:
        """Alias for get_title."""
        return self.get_title()

    @abstractmethod
    def get_current_url(self) -> str:
        """Get the current page URL."""
        pass

    @abstractmethod
    def is_element_enabled(self, element: Any) -> bool:
        """Check if an element is enabled."""
        pass

    @abstractmethod
    def close(self) -> None:
        """Close the browser."""
        pass
    
    @abstractmethod
    def get_network_traffic(self) -> List[Dict[str, Any]]:
        """
        Get network traffic logs.
        Returns list of {url, method, status} dicts.
        """
        pass

    @abstractmethod
    def get_cookies(self) -> List[Dict[str, Any]]:
        """Capture all browser cookies."""
        pass

    @abstractmethod
    def get_local_storage(self) -> Dict[str, str]:
        """Capture all local storage entries."""
        pass

    @abstractmethod
    def get_session_storage(self) -> Dict[str, str]:
        """Capture all session storage entries."""
        pass

    @abstractmethod
    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Get window.performance.timing metrics.
        Returns dict of timing values.
        """
        pass

    @abstractmethod
    def take_screenshot(self) -> str:
        """Capture current page screenshot as base64 string."""
        pass

    @abstractmethod
    def get_element_capabilities(self, handle: Any) -> Dict[str, bool]:
        """
        Get deterministic capabilities of an element.
        Returns dict: {editable, clickable, select_like, file_input, readable}
        """
        pass

    @abstractmethod
    def switch_to_tab(self, newest: bool = True, index: int = 0) -> None:
        """
        Switch browser focus to another tab/window.
        Args:
            newest: If True, switch to the most recently opened tab
            index: If newest is False, switch to index
        """
        pass
    @abstractmethod
    def get_element_rect(self, handle: Any) -> Dict[str, float]:
        """Get precise sub-pixel coordinates and dimensions of an element."""
        pass

    @abstractmethod
    def show_hud_intent(self, data: Dict[str, Any]) -> None:
        """Call the HUD overlay to visualize agent intent."""
        pass

    @abstractmethod
    def hide_hud_intent(self) -> None:
        """Hide the HUD intent reticle."""
        pass

    @abstractmethod
    def log_hud(self, message: str) -> None:
        """Log a message to the HUD ticker tape."""
        pass
    
    @abstractmethod
    def update_hud_inventory(self, data: Dict[str, Any]) -> None:
        """Update the HUD variable inspector."""
        pass


class SeleniumEngine(BrowserEngine):
    """Selenium-based browser automation engine with intelligent auto-wait and retry."""
    
    def __init__(self, headless: bool = True, implicit_wait: int = 5):
        """
        Initialize Selenium engine.
        
        Args:
            headless: Run browser in headless mode
            implicit_wait: Default implicit wait time in seconds
        """
        self.driver: Optional[webdriver.Chrome] = None
        self.headless = headless
        self.implicit_wait = implicit_wait
        
        # Create a temporary user data directory for profile isolation
        self._temp_dir = tempfile.TemporaryDirectory(prefix="replay_browser_")
        self.user_data_dir = self._temp_dir.name
        
        # Persistent network log state for cross-poll correlation
        self._network_id_map: Dict[str, Dict[str, Any]] = {}
        
        # HUD & AI Inspector Script Cache
        self._hud_script = ""
        self._ai_inspector_script = ""
        
        backend_dir = os.path.dirname(__file__)
        hud_script_path = os.path.join(backend_dir, "hud_overlay.js")
        if os.path.exists(hud_script_path):
             with open(hud_script_path, "r") as f:
                 self._hud_script = f.read()

        ai_inspector_path = os.path.join(backend_dir, "ai_inspector.js")
        if os.path.exists(ai_inspector_path):
            with open(ai_inspector_path, "r") as f:
                self._ai_inspector_script = f.read()
        
        self._initialize_driver()
    
    def _initialize_driver(self) -> None:
        """Initialize Chrome WebDriver with options."""
        try:
            options = Options()
            if self.headless:
                options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1920,1080')
            
            # Enable Performance Logging for Network Verification
            options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})
            
            # EXPLICIT DIALOG HANDLING: Disable driver's default auto-dismiss/auto-accept behavior
            # This ensures our semantic blocks have absolute control over dialogs.
            options.set_capability('unhandledPromptBehavior', 'ignore')

            # SECURITY & PROMPT SUPPRESSION (PLATFORM SAFEGUARD)
            # 1. Disable Password Breach / Leak Detection / Generation / Reauth
            options.add_argument('--disable-features=PasswordLeakDetection,PasswordGeneration,AutofillShowTypePredictions')
            options.add_argument('--disable-password-manager-reauthentication')
            # 2. Disable "Save Password" bubbles, Autofill, and Infobars
            options.add_argument('--disable-save-password-bubble')
            options.add_argument('--disable-autofill')
            options.add_argument('--disable-notifications')
            options.add_argument('--disable-infobars')
            # 3. Enforce absolute profile isolation and Zero-State
            options.add_argument(f'--user-data-dir={self.user_data_dir}')
            options.add_argument('--no-first-run')
            options.add_argument('--no-default-browser-check')
            # 4. Enforce basic password storage ONLY (no system keychain)
            options.add_argument('--password-store=basic')
            
            # Disable Password Manager and Autofill via Prefs
            prefs = {
                "credentials_enable_service": False,
                "credentials_enable_autosignin": False,
                "profile.password_manager_enabled": False,
                "profile.password_manager_leak_detection": False,
                "safebrowsing.enabled": False,
                "autofill.profile_enabled": False,
                "autofill.credit_card_enabled": False
            }
            options.add_experimental_option("prefs", prefs)
            
            self.driver = webdriver.Chrome(options=options)
            self.driver.implicitly_wait(self.implicit_wait)
            
            # AI Inspector Persistence: CDP injection to ensure autonomous vision on every page
            if self._ai_inspector_script:
                try:
                    self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                        'source': self._ai_inspector_script
                    })
                    logger.info("SeleniumEngine: Autonomous AI Inspector CDP injection armed.")
                except Exception as e:
                    logger.warning(f"SeleniumEngine: CDP AI Inspector injection failed: {e}")
        except WebDriverException as e:
            raise BrowserEngineError(
                "Could not start the browser. Please ensure Chrome is installed.",
                technical_details=str(e)
            )
    
    def open_page(self, url: str) -> None:
        """Navigate to a URL."""
        try:
            self.driver.get(url)
            # Wait for page to be in ready state
            WebDriverWait(self.driver, 10).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except TimeoutException:
            raise BrowserEngineError(
                f"The page '{url}' took too long to load. Please check the URL and try again.",
                technical_details="Page load timeout"
            )
        except WebDriverException as e:
            raise BrowserEngineError(
                f"Could not open page '{url}'. Please check if the URL is correct.",
                technical_details=str(e)
            )
    
    
    def execute_script(self, script: str, *args) -> Any:
        """Execute JavaScript."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
        try:
            return self.driver.execute_script(script, *args)
        except Exception as e:
            raise BrowserEngineError(f"Script execution failed: {e}")

    def _auto_dismiss_alerts(self) -> None:
        """Silent Guard: Auto-dismiss native alerts if they appear unexpectedly."""
        if not self.driver:
            return
        try:
            alert = self.driver.switch_to.alert
            logger.info(f"Silent Guard: Auto-dismissing unexpected native alert: {alert.text}")
            alert.dismiss()
        except Exception as e:
            # No alert present, which is the normal case
            pass

    def click_handle(self, handle: WebElement) -> None:
        """Click resolved element with robustness against overlays and scrolling."""
        self._auto_dismiss_alerts()
        try:
            # Basic validation
            if not isinstance(handle, WebElement):
                raise ValueError(f"Invalid handle type: {type(handle)}")
            
            # 1. Ensure visible/enabled
            WebDriverWait(self.driver, 5).until(lambda d: handle.is_displayed() and handle.is_enabled())
            
            try:
                # 2. Try normal click first
                handle.click()
            except (ElementClickInterceptedException, WebDriverException) as e:
                error_str = str(e).lower()
                evidence = {}

                # Parsing Obscuring Element from Selenium Error Message
                if "click intercepted" in error_str or "other element would receive" in error_str:
                     import re
                     # Typically: "Element <...> is not clickable... Other element would receive the click: <div class=...>"
                     match = re.search(r"other element would receive the click:? (?:<([^>]+)>)", error_str, re.IGNORECASE)
                     if match:
                         evidence["obscuring_element_html"] = match.group(0) # Capture full tag
                         evidence["obscuring_element_tag"] = match.group(1).split()[0] # Just the tag name

                # Check for various "intercepted" or "could not be scrolled into view" messages
                if any(msg in error_str for msg in ["click intercepted", "not clickable", "other element would receive"]):
                    logger.warning(f"Click intercepted by overlay. Attempting robust click strategy... Error: {error_str[:100]}...")
                    
                    # 3. Strategy A: Scroll to center to try and move away from fixed headers/footers/ads
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", handle)
                    time.sleep(0.5) # Wait for move/overlay shift
                    
                    try:
                        handle.click()
                        return
                    except Exception:
                        # 4. Strategy B: JS Click (Final Fallback - ignores physical obstructions)
                        # NOTE: For TAF Truth, we might WANT to fail if physically impossible, 
                        # but "Semantics" says 'Click' means 'Trigger Action'. 
                        # We will use JS click but LOG it as a "Force Click" in analysis if we had TAF access here.
                        logger.warning("Still intercepted. Falling back to JavaScript click.")
                        self.driver.execute_script("arguments[0].click();", handle)
                else:
                    # Not an interception error, re-raise with evidence
                    raise BrowserEngineError(
                        f"Failed to click element: {str(e)}", 
                        technical_details=str(e),
                        evidence=evidence
                    )
        except Exception as e:
            # Re-wrap if it's not already a BrowserEngineError
            if isinstance(e, BrowserEngineError):
                raise e
            raise BrowserEngineError(f"Failed to click resolved element: {str(e)}", technical_details=str(e))

    def _resolve_input_element(self, handle: WebElement) -> WebElement:
        """Find the actual input element if a container was targeted (Zero-Code Robustness)."""
        tag = handle.tag_name.lower()
        if tag in ['input', 'textarea', 'select']:
            return handle
            
        logger.info(f"Targeted element is <{tag}>, searching for nested input/textarea/select...")
        
        # Search for nested inputs
        inputs = handle.find_elements(By.CSS_SELECTOR, "input, textarea, select")
        if inputs:
            # Filter for visible and enabled
            interactable = [i for i in inputs if i.is_displayed() and i.is_enabled()]
            if interactable:
                target = interactable[0]
                logger.info(f"Resolved to nested <{target.tag_name}> (id={target.get_attribute('id')})")
                return target
                
        return handle

    def enter_text_handle(self, handle: WebElement, text: str, clear_first: bool = True) -> None:
        """Enter text into resolved element with smart resolution and retries."""
        self._auto_dismiss_alerts()
        if not isinstance(handle, WebElement):
            raise ValueError(f"Invalid handle type: {type(handle)}")
        
        # Smart Resolution: If user picked a container, find the input
        handle = self._resolve_input_element(handle)
        
        max_retries = 5
        for attempt in range(max_retries):
            try:
                # Wait for element to be interactable (visible and enabled)
                WebDriverWait(self.driver, 5).until(lambda d: handle.is_displayed() and handle.is_enabled())
                
                # Double-check readonly status
                is_readonly = self.driver.execute_script(
                    "return arguments[0].hasAttribute('readonly') || arguments[0].readOnly;",
                    handle
                )
                if is_readonly:
                    raise BrowserEngineError("Element is readonly and cannot accept input")
                
                # Small delay for JS/SPA stability
                time.sleep(0.5)
                
                # Attempt to focus the element
                try:
                    self.driver.execute_script("arguments[0].focus();", handle)
                    time.sleep(0.1)
                except Exception as focus_err:
                    logger.debug(f"Non-critical: Failed to focus element for input: {focus_err}")
                
                if clear_first:
                    handle.clear()
                    time.sleep(0.1)
                
                handle.send_keys(text)
                return  # Success
                
            except Exception as e:
                error_msg = str(e)
                
                # Retry on "invalid element state" errors (common when input is locked by JS)
                if "invalid element state" in error_msg.lower() and attempt < max_retries - 1:
                    wait_time = 0.5 * (attempt + 1)
                    logger.warning(f"Invalid element state (attempt {attempt + 1}). Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                # All other errors or final retry - raise
                raise BrowserEngineError(
                    f"Failed to enter text into element after {attempt + 1} attempts: {error_msg}",
                    technical_details=str(e)
                )

    def refresh_page(self) -> None:
        """Refresh the current page."""
        if self.driver:
            try:
                self.driver.refresh()
            except Exception as e:
                # Catch closed window race conditions
                raise BrowserEngineError(f"Failed to refresh page: {str(e)}", technical_details=str(e))

    def submit_form(self, handle: WebElement) -> None:
        """Submit a form or the form containing the element."""
        self._auto_dismiss_alerts()
        try:
             if not isinstance(handle, WebElement):
                raise ValueError("Invalid element handle for submission")
            
             # If it's a form element, submit it
             if handle.tag_name == 'form':
                 handle.submit()
                 return
            
             # Try to find parent form or press Enter as fallback
             try:
                 form = handle.find_element(By.XPATH, "./ancestor::form")
                 form.submit()
             except NoSuchElementException:
                 from selenium.webdriver.common.keys import Keys
                 handle.send_keys(Keys.ENTER)
        except Exception as e:
             raise BrowserEngineError(f"Failed to submit form: {str(e)}")

    def submit_current_input(self, handle: Optional[WebElement] = None) -> None:
        """Hit Enter on the current focused element, or the specified handle."""
        self._auto_dismiss_alerts()
        try:
            target = handle if handle else self.driver.switch_to.active_element
            if target:
                target.send_keys(Keys.ENTER)
            else:
                # Fallback to JS if active_element is not found
                self.driver.execute_script("document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));")
        except Exception as e:
            raise BrowserEngineError(f"Failed to submit current input: {str(e)}")

    def handle_dialog(self, accept: bool) -> None:
        """Accept or dismiss a system dialog."""
        try:
            alert = self.driver.switch_to.alert
            if accept:
                alert.accept()
            else:
                alert.dismiss()
        except Exception as e:
            raise BrowserEngineError(f"No dialog found to {'confirm' if accept else 'dismiss'}")

    def activate_primary_action(self) -> None:
        """Heuristic search for primary action."""
        # 1. Structural Selectors (High Confidence)
        primary_selectors = [
            "button[type='submit']",
            "input[type='submit']",
            ".btn-primary",
            ".button-primary",
            "[role='button'].primary",
            "button.primary",
            "[aria-label='Search']",
            "[aria-label='Submit']",
            "[aria-label='Login']",
            "button[id*='search']",
            "button[id*='submit']"
        ]
        
        for selector in primary_selectors:
            try:
                elms = self.driver.find_elements(By.CSS_SELECTOR, selector)
                for btn in elms:
                    if btn.is_displayed() and btn.is_enabled():
                        logger.info(f"Activated primary action via selector: {selector}")
                        btn.click()
                        return
            except Exception as e:
                logger.debug(f"Primary action selector '{selector}' failed or not found: {e}")
                continue

        # 2. Text Content Heuristic (Medium Confidence)
        # Look for buttons containing specific action words
        action_keywords = ["search", "submit", "login", "sign in", "continue", "next", "confirm", "go"]
        
        try:
            # Find all buttons and links that look like buttons
            candidates = self.driver.find_elements(By.CSS_SELECTOR, "button, a.btn, [role='button'], input[type='button']")
            
            for btn in candidates:
                if not btn.is_displayed() or not btn.is_enabled():
                    continue
                    
                text = (btn.text or btn.get_attribute('aria-label') or "").lower()
                if any(keyword in text for keyword in action_keywords):
                     logger.info(f"Activated primary action via keyword match: '{text}'")
                     btn.click()
                     return
        except Exception as e:
            logger.warning(f"Text heuristic failed: {e}")

        raise BrowserEngineError("Could not confidently resolve the primary action on this page.")

    def wait_for_page_load(self, timeout_seconds: int = 15) -> None:
        """Wait for page to finish loading."""
        if not self.driver:
            return
        try:
            WebDriverWait(self.driver, timeout_seconds).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except TimeoutException:
            raise BrowserEngineError(f"Page load timed out after {timeout_seconds} seconds")
        except Exception as e:
            # Handle "NoSuchWindowException" if user closes browser during load
            raise BrowserEngineError(f"Browser error during page load: {str(e)}", technical_details=str(e))

    def wait_for_stability(self, timeout_seconds: float = 5.0) -> None:
        """
        Deterministic stability guard.
        Waits for:
        1. document.readyState === 'complete'
        2. document.fonts.ready
        3. Visual stability (no significant element movement)
        """
        if not self.driver:
            return

        start_time = time.time()
        
        # 1. ReadyState Guard
        try:
            WebDriverWait(self.driver, timeout_seconds).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except Exception as e:
            logger.warning(f"SmartWait: ReadyState timed out or failed: {e}")

        # 2. Font Guard
        try:
            # Short timeout for fonts as they might take forever on slow connections
            self.driver.execute_script("return document.fonts.ready", timeout=0.5)
        except Exception as e:
            logger.debug(f"SmartWait: Font guard failed: {e}")

        # 3. Visual Stability Guard (Animation Guard)
        # We track positions of a few sample interactive elements to see if the page is moving
        stability_script = """
        const timeout = arguments[0];
        const resolve = arguments[arguments.length - 1];
        
        const getPositions = () => {
            const elms = document.querySelectorAll('button, a, input, [role="button"]');
            return Array.from(elms).slice(0, 10).map(el => {
                const rect = el.getBoundingClientRect();
                return { 
                    x: rect.x + window.scrollX, 
                    y: rect.y + window.scrollY,
                    w: rect.width,
                    h: rect.height
                };
            });
        };

        let lastPositions = getPositions();
        let stableCount = 0;
        const requiredSamples = 2; // Reduced from 3
        const interval = 50; // Reduced from 100
        const startTime = Date.now();

        const check = () => {
            const currentPositions = getPositions();
            let isStable = true;

            if (currentPositions.length !== lastPositions.length) {
                isStable = false;
            } else {
                for (let i = 0; i < currentPositions.length; i++) {
                    const dx = Math.abs(currentPositions[i].x - lastPositions[i].x);
                    const dy = Math.abs(currentPositions[i].y - lastPositions[i].y);
                    const dw = Math.abs(currentPositions[i].w - lastPositions[i].w);
                    const dh = Math.abs(currentPositions[i].h - lastPositions[i].h);
                    if (dx > 0.5 || dy > 0.5 || dw > 0.5 || dh > 0.5) {
                        isStable = false;
                        break;
                    }
                }
            }

            if (isStable) {
                stableCount++;
            } else {
                stableCount = 0;
            }

            lastPositions = currentPositions;

            if (stableCount >= requiredSamples) {
                resolve(true);
            } else if (Date.now() - startTime > timeout * 1000) {
                resolve(false); // Timeout
            } else {
                setTimeout(check, interval);
            }
        };

        setTimeout(check, interval);
        """

        try:
            remaining = max(0.5, timeout_seconds - (time.time() - start_time))
            # Note: execute_async_script takes arguments, the last one is the callback
            is_stable = self.driver.execute_async_script(stability_script, remaining)
            if not is_stable:
                logger.warning(f"SmartWait: Page did not reach visual stability within {timeout_seconds}s")
        except Exception as e:
            logger.debug(f"SmartWait: Visual stability check failed or not supported: {e}")

    def select_option(self, element: Any, option_text: str) -> None:
        """Select option by visible text."""
        self._auto_dismiss_alerts()
        from selenium.webdriver.support.ui import Select
        if not isinstance(element, WebElement):
             raise BrowserEngineError("Invalid element for selection")
        try:
             # Wait for interactability
             WebDriverWait(self.driver, 5).until(lambda d: element.is_displayed() and element.is_enabled())
             select = Select(element)
             select.select_by_visible_text(option_text)
        except Exception as e:
             raise BrowserEngineError(f"Failed to select option '{option_text}': {str(e)}")

    def upload_file(self, element: Any, file_path: str) -> None:
        """Upload file via send_keys."""
        import os
        if not isinstance(element, WebElement):
             raise BrowserEngineError("Invalid element for upload")
        
        abs_path = os.path.abspath(file_path)
        if not os.path.exists(abs_path):
             raise BrowserEngineError(f"File not found: {abs_path}")
             
        try:
             element.send_keys(abs_path)
        except Exception as e:
             raise BrowserEngineError(f"Failed to upload file: {str(e)}")

    def get_element_text(self, element: Any) -> str:
        """Get text content from element. Optimized to match AI vision (including values, placeholders)."""
        if not isinstance(element, WebElement):
            raise BrowserEngineError("Invalid element for text extraction")
        
        try:
            # 1. Standard innerText
            text = element.text
            
            # 2. If empty, check textContent via JS (sometimes more reliable for hidden/styled text)
            if not text:
                text = self.driver.execute_script("return arguments[0].textContent;", element)
            
            # 3. If still empty, check visible attributes (Value, Placeholder, Aria-Label, Title)
            if not (text and text.strip()):
                attrs = ['value', 'placeholder', 'aria-label', 'title']
                for attr in attrs:
                    val = element.get_attribute(attr)
                    if val and val.strip():
                        text = val
                        break
                        
            return (text or "").strip()
        except Exception as e:
            raise BrowserEngineError(f"Failed to get element text: {str(e)}")

    def verify_text(self, element: Any, expected: str, mode: str) -> None:
        """Verify text content matches expectation."""
        if not isinstance(element, WebElement):
            raise BrowserEngineError("Invalid element for text verification")
        
        try:
            actual = self.get_element_text(element)
            
            if mode == "equals":
                if actual != expected:
                    raise BrowserEngineError(
                        f"Text verification failed (equals): Expected '{expected}', but found '{actual}'"
                    )
            elif mode == "contains":
                if expected not in actual:
                    raise BrowserEngineError(
                        f"Text verification failed (contains): Expected to find '{expected}' in '{actual}'"
                    )
            else:
                raise BrowserEngineError(f"Unknown match mode: {mode}")
                
        except BrowserEngineError:
            raise
        except Exception as e:
            raise BrowserEngineError(f"Failed to verify text: {str(e)}")
    def verify_page_content(self, expected: str, mode: str) -> None:
        """Verify that specific text exists anywhere on the page."""
        try:
            body = self.driver.find_element(By.TAG_NAME, 'body')
            actual = body.text
            
            if mode == "equals":
                if actual != expected:
                    raise BrowserEngineError(
                        f"Page content verification failed (equals): Expected exact match with '{expected}', but found different content."
                    )
            elif mode == "contains":
                if expected not in actual:
                    raise BrowserEngineError(
                        f"Page content verification failed (contains): Could not find '{expected}' anywhere on the page."
                    )
            else:
                raise BrowserEngineError(f"Unknown match mode: {mode}")
        except Exception as e:
            if isinstance(e, BrowserEngineError): raise
            raise BrowserEngineError(f"Failed to check page content: {str(e)}")


    def scroll_to_element(self, element: Any, alignment: str = "center") -> None:
        """Scroll to bring element into view."""
        if not isinstance(element, WebElement):
            raise BrowserEngineError("Invalid element for scrolling")
        
        try:
            alignment_map = {"top": "start", "center": "center", "bottom": "end"}
            block_position = alignment_map.get(alignment, "center")
            
            self.driver.execute_script(
                f"arguments[0].scrollIntoView({{behavior: 'smooth', block: '{block_position}', inline: 'nearest'}});",
                element
            )
            
            import time
            time.sleep(0.5)
            
        except Exception as e:
            raise BrowserEngineError(f"Failed to scroll to element: {str(e)}")

    def get_title(self) -> str:
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
        return self.driver.title

    def get_current_url(self) -> str:
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
        return self.driver.current_url

    def is_element_enabled(self, element: Any) -> bool:
        """Check if an element is enabled."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
        
        # Element should be a WebElement if coming from handle
        if hasattr(element, 'is_enabled'):
            return element.is_enabled()
            
        raise BrowserEngineError("Invalid element handle for enabled check")

    def is_element_visible_handle(self, handle: Any) -> bool:
        """Check if a resolved element handle is visible."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
            
        if not isinstance(handle, WebElement):
             # It might be a dict if from get_snapshot? No, handle is WebElement in SeleniumEngine
             raise BrowserEngineError("Invalid element handle")

        try:
            if not handle.is_displayed():
                return False
            
            # Strict Zero-Size Check: ensure element has physical dimensions
            # click() throws error for 0x0 elements even if is_displayed() is true
            rect = handle.rect
            if rect['width'] <= 0 or rect['height'] <= 0:
                logger.debug(f"Element is displayed but has zero size ({rect['width']}x{rect['height']}). Treating as invisible.")
                return False
                
            return True
        except Exception as e:
            logger.debug(f"Guard Check Failed for element: {e}")
            return False

    def get_snapshot(self) -> dict:
        """
        Capture current state: Screenshot + Interactable Elements.
        Returns:
            {
                "screenshot": "base64_string",
                "elements": [
                    {"xpath": "...", "rect": {x,y,w,h}, "tag": "button", "text": "Submit"}
                ],
                "url": "current_url"
            }
        """
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")

        # 1. Capture Screenshot
        try:
            screenshot_b64 = self.driver.get_screenshot_as_base64()
        except Exception as e:
            raise BrowserEngineError(f"Failed to capture screenshot: {e}")

        # 2. Extract Elements via JS
        # We find meaningful elements and calculate their positions relative to viewport
        js_script = r"""
        function getRole(el) {
            var role = el.getAttribute('role');
            if (role) return role;
            var tag = el.tagName.toLowerCase();
            if (tag === 'a' && el.hasAttribute('href')) return 'link';
            if (tag === 'button') return 'button';
            if (tag === 'input') {
                var type = el.getAttribute('type') || 'text';
                if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
                return 'input';
            }
            if (tag === 'select') return 'combobox';
            if (tag === 'img') return 'img';
            return tag;
        }

        function getName(el) {
            // 1. aria-label
            var label = el.getAttribute('aria-label');
            if (label) return label;
            // 2. Alt (images)
            if (el.getAttribute('alt')) return el.getAttribute('alt');
            // 3. Placeholder (inputs)
            if (el.getAttribute('placeholder')) return el.getAttribute('placeholder');
            // 4. Visible Text
            var text = el.innerText || el.textContent || el.value || '';
            return text.replace(/\s+/g, ' ').trim().substring(0, 50);
        }

        var results = [];
        
        function collectElements(root) {
            var items = root.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"]');
            for(var i=0; i<items.length; i++) {
                var el = items[i];
                var rect = el.getBoundingClientRect();
                if(rect.width > 0 && rect.height > 0) {
                    var computedRole = getRole(el);
                    var computedName = getName(el);
                    
                    if (computedName || computedRole !== el.tagName.toLowerCase()) {
                        results.push({
                            role: computedRole,
                            name: computedName,
                            tag: el.tagName.toLowerCase(),
                            attributes: {
                                placeholder: el.getAttribute('placeholder'),
                                title: el.getAttribute('title'),
                                testId: el.getAttribute('data-testid') || el.id
                            },
                            rect: {
                                x: rect.x + window.scrollX,
                                y: rect.y + window.scrollY,
                                width: rect.width,
                                height: rect.height
                            }
                        });
                    }
                }
            }

            // Recurse into Shadow DOM
            var allElements = root.querySelectorAll('*');
            for (var j = 0; j < allElements.length; j++) {
                if (allElements[j].shadowRoot) {
                    collectElements(allElements[j].shadowRoot);
                }
            }
        }

        collectElements(document);
        return results;
        """
        
        try:
            elements_data = self.driver.execute_script(js_script)
        except Exception as e:
            # Fallback if JS fails, return empty list but keep screenshot
            elements_data = []

        return {
            "screenshot": screenshot_b64,
            "elements": elements_data,
            "url": self.driver.current_url,
            "title": self.driver.title,
            "timestamp": time.time(),
            "scrollX": self.driver.execute_script("return window.scrollX;"),
            "scrollY": self.driver.execute_script("return window.scrollY;")
        }

    def switch_to_tab(self, newest: bool = True, index: int = 0) -> None:
        """Switch browser focus to another tab/window."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
            
        try:
            handles = self.driver.window_handles
            if not handles:
                return
                
            if newest:
                target = handles[-1]
            else:
                if index < 0 or index >= len(handles):
                    # Out of bounds, stay or go to first
                    target = handles[0]
                else:
                    target = handles[index]
                    
            self.driver.switch_to.window(target)
            logger.info(f"Switched to tab: {target} (Total: {len(handles)})")
        except Exception as e:
            raise BrowserEngineError(f"Failed to switch tab: {e}")

    def close(self) -> None:
        """Close the browser."""
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                logger.debug(f"Error during driver quit: {e}")
            finally:
                self.driver = None
        
        # Cleanup temporary profile directory
        if hasattr(self, '_temp_dir'):
            try:
                self._temp_dir.cleanup()
            except Exception as e:
                logger.warning(f"Failed to cleanup temp browser profile: {e}")
    
    
    def get_network_traffic(self) -> List[Dict[str, Any]]:
        """
        Get network traffic logs from performance timeline.
        Correlates RequestWillBeSent and ResponseReceived via requestId.
        Uses persistent self._network_id_map to handle cross-poll matching.
        """
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
            
        try:
            # Retrieve performance logs
            perf_logs = self.driver.get_log('performance')
            import json
            
            for entry in perf_logs:
                try:
                    message_obj = json.loads(entry.get('message', '{}'))
                    message = message_obj.get('message', {})
                    method = message.get('method')
                    params = message.get('params', {})
                    request_id = params.get('requestId')
                    
                    if not request_id:
                        continue

                    if method == 'Network.requestWillBeSent':
                        request = params.get('request', {})
                        url = request.get('url', '')
                        req_method = request.get('method', 'GET')
                        
                        if request_id not in self._network_id_map:
                            self._network_id_map[request_id] = {
                                'url': url,
                                'method': req_method,
                                'status': None,
                                'timestamp': entry.get('timestamp')
                            }
                        else:
                            # Update existing (e.g. if response came first or redirects)
                            self._network_id_map[request_id]['url'] = url
                            self._network_id_map[request_id]['method'] = req_method
                        
                    elif method == 'Network.responseReceived':
                        response = params.get('response', {})
                        request_url = response.get('url', '')
                        status = response.get('status', 0)
                        
                        if request_id not in self._network_id_map:
                            self._network_id_map[request_id] = {
                                'url': request_url,
                                'method': 'UNKNOWN',
                                'status': status,
                                'timestamp': entry.get('timestamp')
                            }
                        else:
                            self._network_id_map[request_id]['status'] = status
                            if request_url:
                                self._network_id_map[request_id]['url'] = request_url

                except Exception as e:
                    logger.debug(f"Failed to parse network log entry: {e}")
                    continue
            
            # Memory Cleanup: Keep latest 1000 requests to prevent leaks
            if len(self._network_id_map) > 1000:
                # Sort by timestamp and keep newest
                sorted_ids = sorted(self._network_id_map.keys(), 
                                  key=lambda k: self._network_id_map[k].get('timestamp', 0))
                to_remove = sorted_ids[:-1000]
                for rid in to_remove:
                    del self._network_id_map[rid]
                    
            # Flatten map to list for the interpreter
            return list(self._network_id_map.values())
                    
        except Exception as e:
            logger.warning(f"Failed to get network logs: {e}")
            return list(self._network_id_map.values())

    def get_cookies(self) -> List[Dict[str, Any]]:
        """Capture all browser cookies."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
        try:
            return self.driver.get_cookies()
        except Exception as e:
            raise BrowserEngineError(f"Failed to capture cookies: {str(e)}")

    def get_local_storage(self) -> Dict[str, str]:
        """Capture all local storage entries."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
        try:
            return self.driver.execute_script("return {...localStorage};")
        except Exception as e:
            raise BrowserEngineError(f"Failed to capture local storage: {str(e)}")

    def get_session_storage(self) -> Dict[str, str]:
        """Capture all session storage entries."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
        try:
            return self.driver.execute_script("return {...sessionStorage};")
        except Exception as e:
            raise BrowserEngineError(f"Failed to capture session storage: {str(e)}")

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get window.performance.timing metrics."""
        if not self.driver:
            raise BrowserEngineError("Browser not initialized")
            
        try:
            # Modern Navigation Timing API Level 2 preferred, allows getting lcp etc later
            # For now standard timing
            timing = self.driver.execute_script("return window.performance.timing.toJSON()")
            return timing
        except Exception as e:
             raise BrowserEngineError(f"Failed to get performance metrics: {e}")
    def take_screenshot(self) -> str:
        """Capture current page screenshot as base64 string."""
        if not self.driver:
            return ""
        try:
            return f"data:image/png;base64,{self.driver.get_screenshot_as_base64()}"
        except Exception as e:
            logger.warning(f"Screenshot capture failed: {e}")
            return ""


    def get_element_capabilities(self, handle: WebElement) -> Dict[str, bool]:
        """
        Get deterministic capabilities of an element.
        """
        if not self.driver or not handle:
            return {}
            
        js_script = """
        var el = arguments[0];
        if (!el) return {};
        
        var tag = el.tagName;
        var type = el.type ? el.type.toLowerCase() : '';
        var role = el.getAttribute('role');
        var isContentEditable = el.isContentEditable;
        var isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
        var isReadOnly = el.readOnly || el.getAttribute('aria-readonly') === 'true';

        var isEditable = !isDisabled && !isReadOnly && (
            isContentEditable || 
            tag === 'TEXTAREA' || 
            (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'hidden', 'range', 'color'].includes(type))
        );

        var isClickable = !isDisabled && (
            isEditable ||
            ['BUTTON', 'A', 'SUMMARY', 'DETAILS'].includes(tag) || 
            ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch', 'option'].includes(role) || 
            (tag === 'INPUT' && ['button', 'submit', 'reset', 'image', 'checkbox', 'radio', 'file'].includes(type)) ||
            el.onclick != null ||
            window.getComputedStyle(el).cursor === 'pointer'
        );

        var isSelect = !isDisabled && (
            tag === 'SELECT' || 
            ['listbox', 'combobox', 'menu', 'radiogroup'].includes(role)
        );

        var isFile = !isDisabled && (
            tag === 'INPUT' && type === 'file'
        );

        var hasText = (el.innerText || '').trim().length > 0;
        
        var isSubmittable = !isDisabled && (
            tag === 'FORM' ||
            (tag === 'INPUT' && type === 'submit') ||
            (tag === 'BUTTON' && type === 'submit')
        );

        return {
            "editable": isEditable,
            "clickable": isClickable,
            "select_like": isSelect,
            "file_input": isFile,
            "readable": hasText,
            "submittable": isSubmittable
        };
        """
        try:
            return self.driver.execute_script(js_script, handle)
        except Exception as e:
            logger.warning(f"Failed to check capabilities: {e}")
            return {}


    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensure browser is closed."""
        self.close()

    def _ensure_hud_injected(self) -> None:
        """Ensure the HUD overlay script is injected into the current page."""
        if not self.driver:
            logger.warning("HUD Mode: No driver available")
            return
            
        if not self._hud_script:
            logger.warning("HUD Mode: Script not loaded from file")
            return
        
        # Check if already injected
        try:
            exists = self.driver.execute_script("return !!window.__WEBLENS_HUD__;")
            if not exists:
                logger.info("HUD Mode: Injecting script...")
                self.driver.execute_script(self._hud_script)
                logger.info("HUD Mode: Script injected successfully")
            else:
                logger.debug("HUD Mode: Script already injected")
        except Exception as e:
            logger.error(f"HUD Mode: Injection failed: {e}")

    def get_element_rect(self, handle: WebElement) -> Dict[str, float]:
        """Get precise sub-pixel coordinates and dimensions of an element."""
        if not isinstance(handle, WebElement):
             return {"x": 0, "y": 0, "width": 0, "height": 0}
        
        try:
            return self.driver.execute_script("""
                const rect = arguments[0].getBoundingClientRect();
                return {
                    x: rect.left + window.scrollX,
                    y: rect.top + window.scrollY,
                    width: rect.width,
                    height: rect.height
                };
            """, handle)
        except Exception as e:
            logger.error(f"HUD Mode: Failed to get element rect: {e}")
            return {"x": 0, "y": 0, "width": 0, "height": 0}

    def show_hud_intent(self, data: Dict[str, Any]) -> None:
        """Call the HUD overlay to visualize agent intent."""
        self._ensure_hud_injected()
        try:
            self.driver.execute_script("if (window.__WEBLENS_HUD__) window.__WEBLENS_HUD__.showIntent(arguments[0]);", data)
        except Exception as e:
            logger.error(f"HUD Mode: Failed to show intent: {e}")

    def hide_hud_intent(self) -> None:
        """Hide the HUD intent reticle."""
        self._ensure_hud_injected()
        try:
            self.driver.execute_script("if (window.__WEBLENS_HUD__) window.__WEBLENS_HUD__.hideIntent();")
        except Exception as e:
            logger.debug(f"HUD: Failed to hide intent: {e}")

    def log_hud(self, message: str) -> None:
        """Log a message to the HUD ticker tape."""
        self._ensure_hud_injected()
        try:
            self.driver.execute_script("if (window.__WEBLENS_HUD__) window.__WEBLENS_HUD__.log(arguments[0]);", message)
        except Exception as e:
            logger.debug(f"HUD: Failed to log message: {e}")

    def update_hud_inventory(self, data: Dict[str, Any]) -> None:
        """Update the HUD variable inspector."""
        self._ensure_hud_injected()
        try:
            self.driver.execute_script("if (window.__WEBLENS_HUD__) window.__WEBLENS_HUD__.updateInventory(arguments[0]);", data)
        except Exception as e:
            logger.debug(f"HUD: Failed to update inventory: {e}")
