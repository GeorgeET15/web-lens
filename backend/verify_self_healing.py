import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from browser_engine import SeleniumEngine
from resolution import ElementResolver
from models import ElementRef

def verify_self_healing():
    print("--- Verifying Self-Healing Infrastructure ---")
    
    # 1. Setup a simple HTML page for testing
    html_content = """
    <html>
        <body>
            <button id="exact" aria-label="Target Button">Click Me</button>
            <button id="partial">Just a Button</button>
            <div data-testid="unique-id">Found by TestID</div>
        </body>
    </html>
    """
    with open("test_healing.html", "w") as f:
        f.write(html_content)
    
    html_path = "file://" + os.path.abspath("test_healing.html")
    
    # 2. Setup Selenium Engine
    engine = SeleniumEngine(headless=True)
    resolver = ElementResolver()
    
    try:
        engine.open_page(html_path)
        
        # Test 1: High Confidence Match (Exact ARIA label)
        ref_high = ElementRef(id="ref1", name="Target Button", role="button")
        handle_high, score_high, actuals_high = resolver.resolve(engine, ref_high)
        print(f"Test 1 (High): Found '{ref_high.name}', Score: {score_high:.2f}")
        print(f"   Actuals: {actuals_high}")
        assert score_high > 0.5, f"Score too low for exact match: {score_high}"
        assert actuals_high['name'].lower() == "target button", f"Wrong actual name: {actuals_high['name']}"
        
        # Test 2: Medium/Low Confidence Match (Fuzzy Name)
        ref_med = ElementRef(id="ref2", name="Button", role="button")
        handle_med, score_med, actuals_med = resolver.resolve(engine, ref_med)
        print(f"Test 2 (Medium): Found '{ref_med.name}', Score: {score_med:.2f}")
        print(f"   Actuals: {actuals_med}")
        assert actuals_med['name'].lower() == "just a button", f"Wrong actual name for fuzzy: {actuals_med['name']}"


        # Test 3: TestID Match
        ref_testid = ElementRef(id="ref3", name="any", role="any", metadata={"testId": "unique-id"})
        handle_testid, score_testid = resolver.resolve(engine, ref_testid)
        print(f"Test 3 (TestID): Found by TestID, Score: {score_testid:.2f}")
        assert score_testid >= 0.5, f"Score too low for TestID match: {score_testid}"

        print("\n--- ALL TESTS PASSED ---")
        
    finally:
        engine.close()
        if os.path.exists("test_healing.html"):
            os.remove("test_healing.html")

if __name__ == "__main__":
    verify_self_healing()
