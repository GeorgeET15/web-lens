"""
Centralized registry for Trace, Analysis, and Feedback (TAF) templates.

Ensures consistent, human-readable explanations across all WebLens executions.
"""

class TAFRegistry:
    @staticmethod
    def element_resolution(name, confidence, strategy, name_source="native", region=None, intent_type="semantic"):
        analysis = [f"WebLens is using a {strategy} strategy because this element has {confidence} confidence."]
        feedback = [f"If WebLens can't find '{name}', re-pick the element or verify it is not hidden behind a menu."]
        
        if intent_type == "structural":
            analysis.append(f"Using structural intent resolution for '{name}' (semantic void)")
            analysis.append("This element has no semantic identity - resolution uses multiple weak signals")
            feedback.append("⚠️ Structural intent requires post-action verification")
            feedback.append("💡 Adding aria-label will eliminate the need for structural resolution")
        elif name_source == "user_declared":
            if region:
                analysis.append(f"Searching for '{name}' in the {region} region.")
            analysis.append("This interaction relies on a manually declared semantic label.")
            feedback.append("💡 Adding an accessible label (aria-label) in your application will improve test stability.")
            
        return {
            "trace": [f"Looking for '{name}'"],
            "analysis": analysis,
            "feedback": feedback
        }

    @staticmethod
    def element_found(name, attempts):
        if attempts > 1:
            return {
                "trace": [f"Found '{name}'"],
                "analysis": [f"The element was found after {attempts} attempts. This indicates delayed rendering."],
                "feedback": []
            }
        return {
            "trace": [f"Found '{name}'"],
            "analysis": ["The element was immediately available."],
            "feedback": []
        }

    @staticmethod
    def element_not_found(name, attempts, strategy):
        return {
            "trace": [f"Failed to find '{name}'"],
            "analysis": [f"WebLens stopped after {attempts} attempts using the {strategy} strategy."],
            "feedback": [f"Ensure '{name}' is visible on the page. If it's a pop-up, make sure the previous step triggered it."]
        }

    @staticmethod
    def open_page(url):
        return {
            "trace": [f"Opening {url}"],
            "analysis": ["WebLens is navigating to the starting point of your test."],
            "feedback": ["If the page doesn't load, verify that the URL is correct and public."]
        }

    @staticmethod
    def click_element(name):
        return {
            "trace": [f"Clicking on '{name}'"],
            "analysis": ["Executing a standard mouse click on the identified element."],
            "feedback": []
        }

    @staticmethod
    def enter_text(name, text):
        return {
            "trace": [f"Typing text into '{name}'"],
            "analysis": [f"Typing '{text}' into the identified input field."],
            "feedback": []
        }

    @staticmethod
    def if_condition(kind, result):
        description = kind.replace('_', ' ')
        outcome = "proceeding to 'then' branch" if result else "proceeding to 'else' branch (or skipping)"
        return {
            "trace": [f"Checked condition: {description}"],
            "analysis": [f"The condition was {'met' if result else 'not met'}, so WebLens is {outcome}."],
            "feedback": ["Verify your condition logic if WebLens is taking the wrong branch."]
        }

    @staticmethod
    def repeat_loop(kind, result, iteration):
        description = kind.replace('_', ' ')
        status = "Loop finished" if result else "Requirement not met, repeating"
        return {
            "trace": [f"Loop iteration {iteration}: {description}"],
            "analysis": [f"{status}. Condition evaluates to {result}."],
            "feedback": ["If the loop runs too many times, check if the condition can ever be met."]
        }

    @staticmethod
    def primary_action(selector_found):
        if selector_found:
            return {
                "trace": ["Identifying the primary action"],
                "analysis": [f"WebLens found the main action using the selector: {selector_found}"],
                "feedback": []
            }
        return {
            "trace": ["Identifying the primary action"],
            "analysis": ["WebLens searched for common primary buttons but couldn't find an obvious one."],
            "feedback": ["If WebLens misses the primary action, use a regular 'Click' block for that specific button."]
        }

    @staticmethod
    def page_content_check(expected, found):
        return {
            "trace": [f"Search page for: '{expected}'"],
            "analysis": [f"{'Success' if found else 'Failure'}: The text was {'' if found else 'not '}found on the current page."],
            "feedback": ["If this fails, check for typos or if the text is inside an iframe WebLens can't see."]
        }

    @staticmethod
    def wait_until_visible(name):
        return {
            "trace": [f"Waiting for '{name}' to appear"],
            "analysis": ["WebLens is pausing until the element is both present and visible on the page."],
            "feedback": ["If this times out, verify the element is not obscured by another layer and has loaded."]
        }

    @staticmethod
    def assert_visible(name, found):
        return {
            "trace": [f"Checking visibility of '{name}'"],
            "analysis": [f"{'Success' if found else 'Failure'}: The element is {'now' if found else 'not'} visible."],
            "feedback": [f"If '{name}' should be here, check if it's currently hidden behind a menu or modal."] if not found else []
        }

    @staticmethod
    def capture_storage(storage_type, count):
        return {
            "trace": [f"Capturing {storage_type}"],
            "analysis": [f"Successfully retrieved {count} entries from {storage_type}."],
            "feedback": ["Large storage payloads are stored in the execution context but may be truncated in basic views."]
        }

    @staticmethod
    def observe_network():
        return {
            "trace": ["Enabling network observation"],
            "analysis": ["WebLens is now passively recording all network requests and responses."],
            "feedback": ["Ensure this block is placed BEFORE the actions you want to observe."]
        }

    @staticmethod
    def network_verification(pattern, found, status_match=True):
        status_msg = "" if status_match else " (but status code mismatched)"
        return {
            "trace": [f"Searching network logs for: '{pattern}'"],
            "analysis": [f"{'Success' if found else 'Failure'}: A matching request was {'' if found else 'not '}found{status_msg}."],
            "feedback": [f"Verify that the URL pattern '{pattern}' is correct and that the request was triggered by previous steps."] if not found else []
        }
