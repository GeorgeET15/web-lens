# WebLens Live Site Manual Test Plan (All 33 Blocks)

This plan provides detailed instructions for verifying all 33 core blocks in WebLens using reliable public testing websites.

---

## I. CORE NAVIGATION BLOCKS
### 1. `open_page`
- **URL**: `https://the-internet.herokuapp.com/`
- **Action**: Run flow.
- **Verification**: Browser opens the page. Insight Panel shows a screenshot of the homepage.

### 2. `refresh_page`
- **URL**: `https://the-internet.herokuapp.com/forgot_password`
- **Setup**: `enter_text` into the email field. Add `refresh_page`.
- **Verification**: Input field is empty after execution.

### 3. `wait_for_page_load`
- **URL**: `https://www.google.com`
- **Setup**: Place after `open_page`.
- **Verification**: Execution waits for the Google homepage to fully load.

### 4. `delay`
- **Setup**: Set `duration_ms` to `3000`.
- **Verification**: Execution pauses for exactly 3 seconds.

---

## II. INTERACTION BLOCKS
### 5. `click_element`
- **URL**: `https://the-internet.herokuapp.com/add_remove_elements/`
- **Target**: "Add Element" button.
- **Verification**: A new "Delete" button appears.

### 6. `enter_text`
- **URL**: `https://the-internet.herokuapp.com/forgot_password`
- **Target**: `#email` field. Text: `tester@weblens.ai`.
- **Verification**: Text is visible in the field in the screenshot.

### 7. `select_option`
- **URL**: `https://the-internet.herokuapp.com/dropdown`
- **Target**: `#dropdown`. Value: `Option 2` (or `2`).
- **Verification**: Dropdown displays selected choice.

### 8. `upload_file`
- **URL**: `https://the-internet.herokuapp.com/upload`
- **Target**: `#file-upload`. Choose a local file.
- **Verification**: File name appears next to the button after clicking "Upload".

### 10. `submit_current_input` (Semantic Enter)
- **URL**: `https://the-internet.herokuapp.com/forgot_password`
- **Setup**: `enter_text` in `#email`, then `submit_current_input`.
- **Verification**: Page submits, redirects to internal server error or success page.

### 11. `activate_primary_action`
- **URL**: `https://the-internet.herokuapp.com/login`
- **Verification**: Re-triggers the login button (often marked as primary).

### 12. `scroll_to_element`
- **URL**: `https://the-internet.herokuapp.com/`
- **Target**: `Infinite Scroll` link (at bottom of section).
- **Verification**: Viewport shifts to show the target.

---

## III. VERIFICATION BLOCKS
### 13. `assert_visible`
- **URL**: `https://the-internet.herokuapp.com/add_remove_elements/`
- **Target**: "Add Element" button.
- **Verification**: Pass if button is visible.

### 14. `wait_until_visible`
- **URL**: `https://the-internet.herokuapp.com/dynamic_loading/2`
- **Setup**: `click_element` on "Start". Add `wait_until_visible` for `#finish` (Hello World!).
- **Verification**: Waits ~5s for the text to appear.

### 15. `verify_text`
- **URL**: `https://the-internet.herokuapp.com/`
- **Target**: `h1` header. Expected: "Welcome to the-internet".
- **Verification**: Pass. AI Reasoning explains the match.

### 16. `verify_page_title`
- **URL**: `https://the-internet.herokuapp.com/`
- **Expected**: "The Internet".
- **Verification**: Pass. Evidence confirms window title.

### 17. `verify_url`
- **URL**: `https://the-internet.herokuapp.com/abtest`
- **Substring**: `abtest`.
- **Verification**: Pass.

### 18. `verify_element_enabled`
- **URL**: `https://the-internet.herokuapp.com/dynamic_controls`
- **Target**: Input field. Click "Enable". Add block with `should_be_enabled=true`.
- **Verification**: Waits for the field to enable, then passes.

### 19. `verify_page_content`
- **URL**: `https://the-internet.herokuapp.com/`
- **Query**: "A/B Testing".
- **Verification**: Pass. Content search finds text.

---

## IV. DATA & STORAGE BLOCKS
### 20. `save_text`
- **URL**: `https://the-internet.herokuapp.com/status_codes`
- **Target**: Any link (e.g., `200`). Save as `STATUS`.
- **Verification**: Variable `STATUS` contains `200`.

### 21. `save_page_content`
- **URL**: `https://the-internet.herokuapp.com/`
- **Save as**: `HOME_TEXT`.
- **Verification**: Variable contains main landing text.

### 22. `use_saved_value`
- **URL**: `https://the-internet.herokuapp.com/forgot_password`
- **Setup**: `save_text` from a static label (`"Forgot Password"`). `use_saved_value` to `enter_text` in `#email`.
- **Verification**: Input shows "Forgot Password".

### 23. `get_cookies`
- **URL**: `https://the-internet.herokuapp.com/cookies`
- **Verification**: Report shows detected browse cookies.

### 24. `get_local_storage`
- **URL**: `https://demo.playwright.dev/todomvc/`
- **Setup**: Add a todo item.
- **Verification**: Report shows `react-todos` entry in persistence.

### 25. `get_session_storage`
- **URL**: Any site using session storage.
- **Verification**: Report shows session entries.

---

## V. CONTROL FLOW BLOCKS
### 26. `if_condition`
- **Condition**: `url_contains` (login).
- **Verification**: YES branch executes if on login page.

### 27. `repeat_until`
- **URL**: `https://the-internet.herokuapp.com/dynamic_loading/2`
- **Setup**: Click "Start". Add `repeat_until` for `#finish` visibility.
- **Verification**: Polls until "Hello World!" appears.

---

## VI. ADVANCED & BROWSER BLOCKS
### 28. `observe_network`
- **URL**: `https://the-internet.herokuapp.com/`
- **Verification**: Trace reveals static asset requests.

### 29. `verify_network_request`
- **URL**: `https://reqres.in/`
- **Action**: Click "List Users" button.
- **Match**: `/api/users?page=2`.
- **Verification**: Pass if request is found.

### 30. `verify_performance`
- **Metric**: `page_load_time`. Threshold: `5000`.
- **Verification**: Pass if herokuapp loads in <5s.

### 31. `confirm_dialog`
- **URL**: `https://the-internet.herokuapp.com/javascript_alerts`
- **Action**: Click "Click for JS Confirm". Add block.
- **Verification**: Dialog accepted, page result shows "You clicked: Ok".

### 32. `dismiss_dialog`
- **URL**: `https://the-internet.herokuapp.com/javascript_alerts`
- **Action**: Click "Click for JS Confirm". Add block.
- **Verification**: Dialog cancelled, page result shows "You clicked: Cancel".

### 33. `switch_tab`
- **URL**: `https://the-internet.herokuapp.com/windows`
- **Action**: Click "Click Here". Add `switch_tab` (Newest).
- **Verification**: Next block `verify_text` (New Window) passes on the new tab.
