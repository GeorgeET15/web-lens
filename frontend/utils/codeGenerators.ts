
import { FlowGraph } from '../types/flow';

export type ExportFormat = 'weblens' | 'playwright-python' | 'playwright-java' | 'selenium-python' | 'selenium-java';

export class CodeGenerator {
    static generate(flow: FlowGraph, format: ExportFormat): string {
        switch (format) {
            case 'playwright-python':
                return this.generatePlaywrightPython(flow);
            case 'playwright-java':
                return this.generatePlaywrightJava(flow);
            case 'selenium-python':
                return this.generateSeleniumPython(flow);
            case 'selenium-java':
                return this.generateSeleniumJava(flow);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    // ========== PLAYWRIGHT PYTHON ==========
    private static generatePlaywrightPython(flow: FlowGraph): string {
        const lines: string[] = [
            'import asyncio',
            'from playwright.async_api import async_playwright',
            '',
            'async def run():',
            '    async with async_playwright() as p:',
            '        browser = await p.chromium.launch(headless=False)',
            '        context = await browser.new_context()',
            '        page = await context.new_page()',
            ''
        ];

        const indent = '        ';

        if (flow.variables && Object.keys(flow.variables).length > 0) {
            lines.push(`${indent}# Variables`);
            Object.entries(flow.variables).forEach(([key, value]) => {
                lines.push(`${indent}${key} = ${JSON.stringify(value)}`);
            });
            lines.push('');
        }

        if (flow.entry_block) {
            this.appendPlaywrightPythonBlocks(flow, flow.entry_block, lines, indent);
        }

        lines.push('');
        lines.push(`${indent}await browser.close()`);
        lines.push('');
        lines.push('if __name__ == "__main__":');
        lines.push('    asyncio.run(run())');

        return lines.join('\n');
    }

    private static appendPlaywrightPythonBlocks(flow: FlowGraph, blockId: string, lines: string[], indent: string) {
        const block = flow.blocks.find(b => b.id === blockId);
        if (!block) return;

        const params = block.params || block;
        lines.push(`${indent}# ${block.label || block.type}`);

        switch (block.type) {
            case 'open_page':
                if (params.url) {
                    lines.push(`${indent}await page.goto("${params.url}")`);
                }
                break;
            case 'click_element':
                if (params.element) {
                    lines.push(`${indent}await page.click("${this.escapeSelector(params.element)}")`);
                }
                break;
            case 'enter_text':
                if (params.element) {
                    if (params.clear_first) {
                        lines.push(`${indent}await page.fill("${this.escapeSelector(params.element)}", "")`);
                    }
                    lines.push(`${indent}await page.type("${this.escapeSelector(params.element)}", "${params.text}")`);
                }
                break;
            case 'delay':
                lines.push(`${indent}await asyncio.sleep(${params.seconds || 1})`);
                break;
            case 'verify_text':
                if (params.element) {
                    lines.push(`${indent}content = await page.text_content("${this.escapeSelector(params.element)}")`);
                    if (params.match?.mode === 'contains') {
                        lines.push(`${indent}assert "${params.match.value}" in content`);
                    } else {
                        lines.push(`${indent}assert content == "${params.match?.value}"`);
                    }
                }
                break;
            case 'if_condition':
                const pwCondition = params.condition;
                if (pwCondition?.kind === 'element_visible' && pwCondition.element) {
                    lines.push(`${indent}if await page.is_visible("${this.escapeSelector(pwCondition.element)}"):`);
                    if (block.then_blocks && block.then_blocks.length > 0) {
                        this.appendPlaywrightPythonBlocks(flow, block.then_blocks[0], lines, indent + '    ');
                    } else {
                        lines.push(`${indent}    pass`);
                    }
                    if (block.else_blocks && block.else_blocks.length > 0) {
                        lines.push(`${indent}else:`);
                        this.appendPlaywrightPythonBlocks(flow, block.else_blocks[0], lines, indent + '    ');
                    }
                }
                break;
            default:
                lines.push(`${indent}# block type "${block.type}" not yet implemented in generator`);
                break;
        }

        if (block.next_block) {
            this.appendPlaywrightPythonBlocks(flow, block.next_block, lines, indent);
        }
    }

    // ========== SELENIUM PYTHON ==========
    private static generateSeleniumPython(flow: FlowGraph): string {
        const lines: string[] = [
            'from selenium import webdriver',
            'from selenium.webdriver.common.by import By',
            'from selenium.webdriver.support.ui import WebDriverWait',
            'from selenium.webdriver.support import expected_conditions as EC',
            'from selenium.webdriver.chrome.options import Options',
            'import time',
            '',
            'def run():',
            '    # Setup Chrome options',
            '    options = Options()',
            '    # options.add_argument("--headless")  # Uncomment for headless mode',
            '    ',
            '    # Initialize WebDriver',
            '    driver = webdriver.Chrome(options=options)',
            '    wait = WebDriverWait(driver, 10)',
            '    ',
            '    try:',
            ''
        ];

        const indent = '        ';

        if (flow.variables && Object.keys(flow.variables).length > 0) {
            lines.push(`${indent}# Variables`);
            Object.entries(flow.variables).forEach(([key, value]) => {
                lines.push(`${indent}${key} = ${JSON.stringify(value)}`);
            });
            lines.push('');
        }

        if (flow.entry_block) {
            this.appendSeleniumPythonBlocks(flow, flow.entry_block, lines, indent);
        }

        lines.push('    finally:');
        lines.push('        driver.quit()');
        lines.push('');
        lines.push('if __name__ == "__main__":');
        lines.push('    run()');

        return lines.join('\n');
    }

    private static appendSeleniumPythonBlocks(flow: FlowGraph, blockId: string, lines: string[], indent: string) {
        const block = flow.blocks.find(b => b.id === blockId);
        if (!block) return;

        // Handle both formats: properties can be at block level or in block.params
        const params = block.params || block;

        lines.push(`${indent}# ${block.label || block.type}`);

        switch (block.type) {
            case 'open_page':
                if (params.url) {
                    lines.push(`${indent}driver.get("${params.url}")`);
                }
                break;
            case 'click_element':
                if (params.element) {
                    const selector = this.convertToSeleniumSelector(params.element);
                    lines.push(`${indent}wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "${selector}")))`);
                    lines.push(`${indent}driver.find_element(By.CSS_SELECTOR, "${selector}").click()`);
                }
                break;
            case 'enter_text':
                if (params.element) {
                    const selector = this.convertToSeleniumSelector(params.element);
                    lines.push(`${indent}element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${selector}")))`);
                    if (params.clear_first) {
                        lines.push(`${indent}element.clear()`);
                    }
                    // Replace variable placeholders with actual variable references
                    const text = params.text?.replace(/\{\{(\w+)\}\}/g, '" + $1 + "') || '';
                    lines.push(`${indent}element.send_keys("${text}")`);
                }
                break;
            case 'delay':
                lines.push(`${indent}time.sleep(${params.seconds || 1})`);
                break;
            case 'verify_text':
                if (params.element) {
                    const selector = this.convertToSeleniumSelector(params.element);
                    lines.push(`${indent}element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${selector}")))`);
                    lines.push(`${indent}content = element.text`);
                    if (params.match?.mode === 'contains') {
                        lines.push(`${indent}assert "${params.match.value}" in content`);
                    } else {
                        lines.push(`${indent}assert content == "${params.match?.value}"`);
                    }
                }
                break;
            case 'if_condition':
                const selCondition = params.condition;
                if (selCondition?.kind === 'element_visible' && selCondition.element) {
                    const selector = this.convertToSeleniumSelector(selCondition.element);
                    lines.push(`${indent}try:`);
                    lines.push(`${indent}    driver.find_element(By.CSS_SELECTOR, "${selector}")`);
                    lines.push(`${indent}    element_visible = True`);
                    lines.push(`${indent}except:`);
                    lines.push(`${indent}    element_visible = False`);
                    lines.push(`${indent}if element_visible:`);
                    if (block.then_blocks && block.then_blocks.length > 0) {
                        this.appendSeleniumPythonBlocks(flow, block.then_blocks[0], lines, indent + '    ');
                    } else {
                        lines.push(`${indent}    pass`);
                    }
                    if (block.else_blocks && block.else_blocks.length > 0) {
                        lines.push(`${indent}else:`);
                        this.appendSeleniumPythonBlocks(flow, block.else_blocks[0], lines, indent + '    ');
                    }
                }
                break;
            case 'scroll_to_element':
                if (params.element) {
                    const selector = this.convertToSeleniumSelector(params.element);
                    lines.push(`${indent}element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${selector}")))`);
                    lines.push(`${indent}driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)`);
                }
                break;
            default:
                lines.push(`${indent}# block type "${block.type}" not yet implemented in generator`);
                break;
        }

        if (block.next_block) {
            this.appendSeleniumPythonBlocks(flow, block.next_block, lines, indent);
        }
    }

    // ========== PLAYWRIGHT JAVA ==========
    private static generatePlaywrightJava(flow: FlowGraph): string {
        const lines: string[] = [
            'import com.microsoft.playwright.*;',
            '',
            'public class WebLensFlow {',
            '    public static void main(String[] args) {',
            '        try (Playwright playwright = Playwright.create()) {',
            '            Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(false));',
            '            BrowserContext context = browser.newContext();',
            '            Page page = context.newPage();',
            ''
        ];

        const indent = '            ';

        if (flow.variables && Object.keys(flow.variables).length > 0) {
            lines.push(`${indent}// Variables`);
            Object.entries(flow.variables).forEach(([key, value]) => {
                lines.push(`${indent}String ${key} = ${JSON.stringify(value)};`);
            });
            lines.push('');
        }

        if (flow.entry_block) {
            this.appendPlaywrightJavaBlocks(flow, flow.entry_block, lines, indent);
        }

        lines.push('');
        lines.push(`${indent}browser.close();`);
        lines.push('        }');
        lines.push('    }');
        lines.push('}');

        return lines.join('\n');
    }

    private static appendPlaywrightJavaBlocks(flow: FlowGraph, blockId: string, lines: string[], indent: string) {
        const block = flow.blocks.find(b => b.id === blockId);
        if (!block) return;

        const params = block.params || block;
        lines.push(`${indent}// ${block.label || block.type}`);

        switch (block.type) {
            case 'open_page':
                if (params.url) {
                    lines.push(`${indent}page.navigate("${params.url}");`);
                }
                break;
            case 'click_element':
                if (params.element) {
                    lines.push(`${indent}page.click("${this.escapeSelector(params.element)}");`);
                }
                break;
            case 'enter_text':
                if (params.element) {
                    lines.push(`${indent}page.fill("${this.escapeSelector(params.element)}", "${params.text}");`);
                }
                break;
            case 'delay':
                lines.push(`${indent}try { Thread.sleep(${(params.seconds || 1) * 1000}); } catch (Exception e) {}`);
                break;
            case 'verify_text':
                if (params.element) {
                   lines.push(`${indent}String content = page.textContent("${this.escapeSelector(params.element)}");`);
                   if (params.match?.mode === 'contains') {
                       lines.push(`${indent}if (!content.contains("${params.match.value}")) throw new RuntimeException("Assertion failed");`);
                   } else {
                       lines.push(`${indent}if (!content.equals("${params.match?.value}")) throw new RuntimeException("Assertion failed");`);
                   }
                }
                break;
            default:
                lines.push(`${indent}// block type "${block.type}" not yet implemented in generator`);
                break;
        }

        if (block.next_block) {
            this.appendPlaywrightJavaBlocks(flow, block.next_block, lines, indent);
        }
    }

    // ========== SELENIUM JAVA ==========
    private static generateSeleniumJava(flow: FlowGraph): string {
        const lines: string[] = [
            'import org.openqa.selenium.By;',
            'import org.openqa.selenium.WebDriver;',
            'import org.openqa.selenium.WebElement;',
            'import org.openqa.selenium.chrome.ChromeDriver;',
            'import org.openqa.selenium.chrome.ChromeOptions;',
            'import org.openqa.selenium.support.ui.WebDriverWait;',
            'import org.openqa.selenium.support.ui.ExpectedConditions;',
            'import java.time.Duration;',
            '',
            'public class WebLensFlow {',
            '    public static void main(String[] args) {',
            '        // Setup Chrome options',
            '        ChromeOptions options = new ChromeOptions();',
            '        // options.addArguments("--headless");  // Uncomment for headless mode',
            '        ',
            '        // Initialize WebDriver',
            '        WebDriver driver = new ChromeDriver(options);',
            '        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));',
            '        ',
            '        try {',
            ''
        ];

        const indent = '            ';

        if (flow.variables && Object.keys(flow.variables).length > 0) {
            lines.push(`${indent}// Variables`);
            Object.entries(flow.variables).forEach(([key, value]) => {
                lines.push(`${indent}String ${key} = ${JSON.stringify(value)};`);
            });
            lines.push('');
        }

        if (flow.entry_block) {
            this.appendSeleniumJavaBlocks(flow, flow.entry_block, lines, indent);
        }

        lines.push('        } finally {');
        lines.push('            driver.quit();');
        lines.push('        }');
        lines.push('    }');
        lines.push('}');

        return lines.join('\n');
    }

    private static appendSeleniumJavaBlocks(flow: FlowGraph, blockId: string, lines: string[], indent: string) {
        const block = flow.blocks.find(b => b.id === blockId);
        if (!block) return;

        const params = block.params || block;
        lines.push(`${indent}// ${block.label || block.type}`);

        switch (block.type) {
            case 'open_page':
                if (params.url) {
                    lines.push(`${indent}driver.get("${params.url}");`);
                }
                break;
            case 'click_element':
                if (params.element) {
                    const selector = this.convertToSeleniumSelector(params.element);
                    lines.push(`${indent}wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("${selector}")));`);
                    lines.push(`${indent}driver.findElement(By.cssSelector("${selector}")).click();`);
                }
                break;
            case 'enter_text':
                if (params.element) {
                    const selector = this.convertToSeleniumSelector(params.element);
                    lines.push(`${indent}WebElement element = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("${selector}")));`);
                    if (params.clear_first) {
                        lines.push(`${indent}element.clear();`);
                    }
                    lines.push(`${indent}element.sendKeys("${params.text}");`);
                }
                break;
            case 'delay':
                lines.push(`${indent}try { Thread.sleep(${(params.seconds || 1) * 1000}); } catch (InterruptedException e) {}`);
                break;
            case 'verify_text':
                if (params.element) {
                    const selector = this.convertToSeleniumSelector(params.element);
                    lines.push(`${indent}WebElement element = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("${selector}")));`);
                    lines.push(`${indent}String content = element.getText();`);
                    if (params.match?.mode === 'contains') {
                        lines.push(`${indent}if (!content.contains("${params.match.value}")) throw new RuntimeException("Assertion failed");`);
                    } else {
                        lines.push(`${indent}if (!content.equals("${params.match?.value}")) throw new RuntimeException("Assertion failed");`);
                    }
                }
                break;
            default:
                lines.push(`${indent}// block type "${block.type}" not yet implemented in generator`);
                break;
        }

        if (block.next_block) {
            this.appendSeleniumJavaBlocks(flow, block.next_block, lines, indent);
        }
    }

    // ========== UTILITY METHODS ==========
    private static escapeSelector(selector: any): string {
        if (typeof selector === 'string') return selector.replace(/"/g, '\\"');
        return JSON.stringify(selector);
    }

    private static convertToSeleniumSelector(selector: any): string {
        if (typeof selector === 'string') {
            return selector.replace(/"/g, '\\"');
        }
        
        // Handle WebLens element objects - extract a usable CSS selector
        if (typeof selector === 'object' && selector !== null) {
            // Priority 1: Use element ID if available
            if (selector.metadata?.id && selector.metadata.id.trim()) {
                return `#${selector.metadata.id}`.replace(/"/g, '\\"');
            }
            
            // Priority 2: Use test ID
            if (selector.testId) {
                return `[data-testid="${selector.testId}"]`.replace(/"/g, '\\"');
            }
            
            // Priority 3: Use placeholder for input elements
            if (selector.placeholder && selector.tagName === 'input') {
                return `input[placeholder="${selector.placeholder}"]`.replace(/"/g, '\\"');
            }
            
            // Priority 4: Use button text for buttons
            if (selector.tagName === 'button' && selector.name) {
                // Use a more generic selector for buttons
                return `button`.replace(/"/g, '\\"');
            }
            
            // Priority 5: Use tag name with class if available
            if (selector.tagName && selector.metadata?.className) {
                const firstClass = selector.metadata.className.split(' ')[0];
                return `${selector.tagName}.${firstClass}`.replace(/"/g, '\\"');
            }
            
            // Fallback: Just use tag name
            if (selector.tagName) {
                return selector.tagName.replace(/"/g, '\\"');
            }
        }
        
        // Last resort: return stringified version
        return JSON.stringify(selector).replace(/"/g, '\\"');
    }
}
