# AMD Slingshot Submission Deck Content

Copy and paste the sections below into the corresponding slides of your PowerPoint/PDF template.

---

## **Slide 1: Team Details**
*   **Team Name**: (Enter your Team Name)
*   **Team Leader Name**: (Enter Name)
*   **Problem Statement**:
    Manual web automation is slow, fragile, and requires coding expertise. Standard tools (Selenium/Cypress) break whenever UI selectors change, costing developers 30-40% of their time in maintenance. Non-technical experts are locked out of automating their own workflows.

---

## **Slide 2: Brief about the Idea**
**WebLens: The Self-Healing AI Agent for Web Automation**

WebLens is a zero-code platform that lets anyone create robust browser automation workflows by simply describing their intent or interacting with a "Live Inspector." It uses Multimodal AI (Computer Vision + LLMs) to "see" the website like a human, ensuring scripts don't break even if the underlying code changes.

It is a "Dual-Core" system: A deterministic driver for speed, paired with a probabilistic AI for decision-making and self-healing.

---

## **Slide 3: Opportunities**
**How different is it?**
*   **vs. Selenium/Playwright**: No code required. Self-healing prevents breakage from UI updates.
*   **vs. RPA Tools (UiPath)**: Purely browser-native, lightweight, and powered by Generative AI for semantic understanding (not just image matching).

**How will it solve the problem?**
*   **Democratization**: Enables manual QA and Business Analysts to build automation.
*   **Stability**: "Smart Eyes" technology recovers from selector drift automatically.

**USP (Unique Selling Proposition)**:
1.  **Hybrid Engine**: Combines the reliability of code with the flexibility of AI.
2.  **Visual Verification**: Intelligently detects layout bugs using Vision models.
3.  **Zero-Vendor Lock**: Exports to standard Python/Playwright code.

---

## **Slide 4: List of Features**
1.  **AI Magic Wand**: Type "Login and download the invoice" to generate full workflows.
2.  **Inspector Mode**: Point-and-click element selection that captures semantic attributes (Role, Aria-Label) for robust targeting.
3.  **Self-Healing Executive**: Automatically repairs broken steps during execution without human intervention.
4.  **Visual Assertions**: Verifies UI correctness using Generative AI comparison.
5.  **Live Streaming**: Watch execution in real-time via low-latency WebSocket stream.

---

## **Slide 4.5: Novelty & Innovation**
**What makes WebLens unique?**

1.  **Dual-Core Architecture (Hybrid Engine)**:
    *   *Innovation*: Decouples **Execution** (Deterministic Selenium) from **Decision Making** (Probabilistic AI).
    *   *Benefit*: You get the speed of standard automation with the resilience of an AI agent. Most tools are one or the other; WebLens is both.

2.  **Semantic Vision ("Smart Eyes")**:
    *   *Innovation*: Uses Multimodal AI to understand the *purpose* of an element (e.g., "Add to Cart button") rather than just its code attributes.
    *   *Benefit*: Flows don't break when developers refactor code or change CSS classes.

3.  **Real-Time "Human-in-the-Loop" Protocol**:
    *   *Innovation*: A novel WebSocket+REST hybrid protocol that allows users to interact with a remote browser in real-time while the AI observes and learns from their clicks.

---

## **Slide 5: Process Flow / Use-Case**
*(You can draw a simple diagram with these steps)*

**User Intent** ("Book a flight")
   ⬇
**AI Planner** (Converts to Block Graph: Open Page -> Click Search -> Select Date)
   ⬇
**Hybrid Execution Engine**
   ⬇
**Step 1: "Click Search"** ➡ *Selector Failed?* ➡ **Self-Healing (Gemini Vision)** ➡ *Found New Button* ➡ **Action Success**
   ⬇
**Report Generation** (PDF/HTML with Screenshots)

---

## **Slide 6: Wireframes / Mockups**
*(Take a screenshot of the WebLens Editor Dashboard and the Insight Panel)*
*   **Editor**: Showing the flow graph on the left and the browser preview on the right.
*   **Insight Panel**: Showing the AI explanation of a step.

---

## **Slide 7: Architecture Diagram**
**Frontend (Control Plane)**:
*   React + Vite + TypeScript (Flow Editor, Event Streaming).
*   TanStack Query for State Management.

**Backend (Execution Plane)**:
*   **FastAPI (Python)**: REST API & WebSocket Server.
*   **Inspector Service**: Singleton service managing Chrome instances.
*   **Selenium WebDriver**: For browser orchestration.
*   **AI Engine**: Interfacing with Gemini 1.5 Pro for Vision/Healing.
*   **Supabase**: For persistent storage of Flows and Execution History.

---

## **Slide 8: Technologies Used**
*   **Frontend**: React, TypeScript, TailwindCSS, Lucide Icons.
*   **Backend**: Python, FastAPI, Selenium, Pydantic.
*   **AI/ML**: Google Gemini 1.5 Pro (Multimodal), OpenAI GPT-4 (Optional).
*   **Database**: Supabase (PostgreSQL).
*   **Infrastructure**: Docker, Vercel (Frontend), Railway (Backend).

---

## **Slide 9: Usage of AMD Products**
*   **AMD Ryzen™ AI PCs**:
    WebLens is optimized to run local inference on AMD Ryzen AI hardware (NPU) for the "Smart Eyes" computer vision layer. By offloading visual element detection to the local NPU, we reduce latency and cloud costs, making the "Self-Healing" features faster and more private.

---

## **Slide 10: Implementation Cost**
*   **Development**: Open Source (Time & Effort).
*   **Infrastructure**: <$50/month (Supabase Free Tier + GPU Inference for Vision).
*   **Scaling**: Linear cost scaling with concurrent browser sessions.

---

## **Slide 11: Prototype Assets**
*   **GitHub**: https://github.com/GeorgeET15/web-lens
*   **Demo Video**: (Insert your YouTube/Loom link here)
