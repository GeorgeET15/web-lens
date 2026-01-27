# AMD Slingshot Hackathon Submission: WebLens

Use the content below to fill out the prototype submission form.

---

## **Challenge**
**Selected Track**: Future of Work & Productivity

---

## **What is your Idea about?**
**(Character Limit: 2000)**

WebLens is a next-generation, zero-code visual automation platform powered by Multimodal AI. It bridges the gap between manual testing and programmable automation by allowing users to build complex workflows simply by interacting with a live browser ("Inspector Mode") or describing intent in natural language ("Magic Wand").

Unlike traditional record-playback tools that generate brittle code, WebLens creates semantic, self-healing flow definitions. It continually analyzes the DOM using Computer Vision and Large Language Models (Gemini 1.5) to understand *intent* rather than just *coordinates*. If a button moves or changes its ID, WebLens "sees" it and adapts automatically.

The core innovation is its "Hybrid Engine": a deterministic Selenium driver for execution combined with a probabilistic AI layer for decision-making and recovery. This enables "Smart Eyes" capabilities—allowing the agent to visually verify content, extract structured data from unstructured pages, and perform logic based on visual cues, all without a single line of code.

Key Features:
1.  **AI-Powered Inspector**: Point-and-click element selection that captures semantic attributes (ARIA labels, text, role) instead of fragile XPaths.
2.  **Self-Healing Executive**: If a step fails, the AI analyzes the page snapshot to find the most likely substitute element and "heals" the script in real-time.
3.  **Natural Language Authoring**: Users can type "Login to Gmail and search for invoices" and the AI generates the complete execution blocks.
4.  **Visual Verification**: Automated visual regression testing using Multimodal AI to detect layout shifts or rendering errors.

---

## **What problem are you trying to solve?**
**(Character Limit: 2000)**

1.  **The "Flakiness" Trap in Automation**:
    Traditional automation scripts (using Selenium, Cypress, or Playwright) are notoriously fragile. A simple CSS class change, a moved button, or a dynamic ID update can break an entire regression suite. Developers spend up to **30-40% of their time** maintaining and fixing broken tests rather than building new features.

2.  **High Barrier to Entry**:
    Building robust web automation requires significant coding expertise. Manual QA testers, Product Managers, and Business Analysts—who possess deep domain knowledge—are often locked out of automating their own repetitive workflows. They rely on engineers to script every action, creating a bottleneck.

3.  **Bot Detection & Dynamic Content**:
    Modern web applications (SPAs, React, dynamic classes) are increasingly hostile to static selectors. Standard scrapers fail when faced with dynamic loading, A/B testing, or complex DOM structures.

4.  **Maintenance Overhead Stifling Innovation**:
    As applications evolve rapidly, the cost of regression testing skyrockets. Small UI tweaks result in "red builds," causing developers to ignore test results or disable tests entirely, leading to bug leaks in production.

WebLens solves this by decoupling the "Intent" (what needs to happen) from the "Implementation" (the specific selector). By using AI to interpret the page like a human would, it makes automation resilient, accessible, and virtually maintenance-free.

---

## **Technology Stack being used**
**(Character Limit: 200)**

React, TypeScript, TailwindCSS, Python, FastAPI, Selenium WebDriver, Google Gemini 1.5 Pro (Multimodal AI), Supabase (PostgreSQL).

---

## **Impact of your solution**
**(Character Limit: 2000)**

1.  **Democratization of Automation**:
    WebLens empowers non-technical users to build enterprise-grade automation pipelines. A manual tester can record a "Login & Purchase" flow in 5 minutes that would take an engineer hours to script. This democratizes access to productivity tools, allowing anyone to automate repetitive browser tasks (data entry, scraping, compliance checks).

2.  **Self-Healing Resilience**:
    By reducing script fragility, WebLens drastically lowers maintenance costs (estimated >80% reduction in fix time). When UI changes occur, the AI heals the flow automatically, keeping pipelines green and developers focused on innovation.

3.  **Future of Work Multiplier**:
    WebLens represents the shift from "Human doing the work" to "Human supervising the Agent." It acts as an intelligent digital coworker that handles the browser drudgery—filling forms, verifying reports, extracting data—allowing humans to focus on high-value strategy and creative problem-solving.

4.  **Accessible QA for All**:
    Startups and students often lack dedicated SDET (Software Development Engineer in Test) teams. WebLens provides them with a robust, AI-driven QA infrastructure out of the box, ensuring higher software quality across the ecosystem without the steep hiring cost.

---

## **Links**

*   **GitHub Repository**: https://github.com/GeorgeET15/web-lens
*   **Demo Video**: *(Insert Link Here - Recommended to record a 2-minute Loom/Screen recording showing the Inspector and Self-Healing)*
