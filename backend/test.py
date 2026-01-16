from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time

def run():
    # Setup Chrome options
    options = Options()
    # options.add_argument("--headless")  # Uncomment for headless mode
    
    # Initialize WebDriver
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 10)
    
    try:

        # Variables
        otp = "000000"
        paw = "123456"
        username = "g@123.com"

        # Open Page
        driver.get("https://zendt-frontend.vercel.app")
        # Delay
        time.sleep(5)
        # Click Element
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button")))
        driver.find_element(By.CSS_SELECTOR, "button").click()
        # Enter Text
        element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#email")))
        element.send_keys("" + username + "")
        # Enter Text
        element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#password")))
        element.send_keys("" + paw + "")
        # Click Element
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button")))
        driver.find_element(By.CSS_SELECTOR, "button").click()
        # Enter Text
        element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder=\"123456\"]")))
        element.send_keys("" + otp + "")
        # Click Element
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button")))
        driver.find_element(By.CSS_SELECTOR, "button").click()
        # Delay
        time.sleep(5)
        # Scroll To Element
        element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "h2.text-2xl")))
        driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
        # Delay
        time.sleep(5)
    finally:
        driver.quit()

if __name__ == "__main__":
    run()