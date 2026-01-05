import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

# 1. Initialize the Chrome driver
driver = webdriver.Chrome()

try:
    # 2. Open YouTube
    driver.get("https://www.youtube.com")

    # 3. Find the search bar
    # YouTube's search input has the name attribute "search_query"
    search_box = driver.find_element(By.NAME, "search_query")

    # 4. Type "superman" and hit Enter
    search_box.send_keys("superman")
    search_box.send_keys(Keys.RETURN)

    # 5. Wait for 10 seconds
    print("Search completed. Waiting for 10 seconds...")
    time.sleep(10)

finally:
    # 6. Close the browser
    driver.quit()
    print("Browser closed.")



    