import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { 
  ChevronRight, 
  Menu, 
  X, 
  Terminal, 
  Book, 
  Cpu, 
  Shield, 
  Activity, 
  Layers,
  Search,
  Code,
  FileText,
  Target,
  CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";
import { VisualBlock } from "@/components/VisualBlock";

const docsSections = [
  {
    title: "System_Core",
    items: [
      { name: "MANIFESTO", slug: "" },
      { name: "SPECIFICATION", slug: "spec" },
      { name: "DEPLOYMENT", slug: "deployment" }
    ]
  },
  {
    title: "The_Engine",
    items: [
      { name: "DETERMINISM", slug: "concepts" },
      { name: "SEMANTIC_RESOLUTION", slug: "semantic" },
      { name: "FLOW_GRAPH", slug: "flows" }
    ]
  },
  {
    title: "Logic_Blocks",
    items: [
      { name: "STRUCTURE", slug: "blocks" },
      { name: "INTERACTION", slug: "interaction" },
      { name: "VALIDATION", slug: "validation" }
    ]
  },
  {
    title: "Analysis",
    items: [
      { name: "TAF_SYSTEM", slug: "taf" },
      { name: "TRACE_LOGS", slug: "trace" },
      { name: "EVIDENCE_VAULT", slug: "evidence" }
    ]
  }
];

const docContent: Record<string, { title: string; subtitle: string; body: React.ReactNode; anchors?: Record<string, string> }> = {
  "": {
    title: "System_Manifesto",
    subtitle: "Ground truths and intentional constraints of the WebLens engine.",
    anchors: { "axioms": "Core Axioms", "non-goals": "Non Goals" },
    body: (
      <div className="space-y-8">
        <p className="text-xl text-muted-foreground leading-relaxed">
          WebLens is not an automation tool. It is a <span className="text-foreground font-bold">deterministic verification system</span> built to replace brittle selector-based scripts with verifiable semantic intent.
        </p>

        <div id="axioms" className="grid gap-6 border border-border p-6 bg-secondary scroll-mt-20">
          <div className="tech-label text-primary">Core_Axioms</div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="font-bold text-sm">Deterministic Bounds</div>
                <div className="text-sm text-muted-foreground">Execution is strictly controlled by global timeouts and poll intervals. Zero flakiness tolerated.</div>
              </div>
            </div>
            <div className="flex gap-4">
              <Search className="h-5 w-5 text-investigation shrink-0" />
              <div>
                <div className="font-bold text-sm">Semantic Intent</div>
                <div className="text-sm text-muted-foreground">Elements are identified by their accessible purpose. Implementation details (CSS/XPath) are irrelevant.</div>
              </div>
            </div>
            <div className="flex gap-4">
              <Activity className="h-5 w-5 text-success shrink-0" />
              <div>
                <div className="font-bold text-sm">Evidence Fidelity</div>
                <div className="text-sm text-muted-foreground">Every platform decision is backed by TAF (Trace/Analysis/Feedback) data.</div>
              </div>
            </div>
          </div>
        </div>

        <div id="non-goals" className="space-y-4 scroll-mt-20">
          <div className="tech-label text-failure underline">Non_Goals</div>
          <ul className="space-y-2 font-mono text-xs opacity-80">
            <li>- Indeterministic wait conditions (Implicit Waits)</li>
            <li>- "Smart" auto-healing of <span className="text-failure">running</span> flows</li>
            <li>- AI-driven decision making during execution</li>
            <li>- Arbitrary Javascript injection</li>
          </ul>
          <div className="pt-4 border-t border-border/50">
             <div className="tech-label text-primary mb-2">Principle_of_Boundaries</div>
             <p className="text-sm text-muted-foreground italic">
                "AI may reason, draft, and analyze — but it must never execute, decide, or mutate live state."
             </p>
          </div>
        </div>
      </div>
    )
  },
  "blocks": {
    title: "Logic_Blocks_v1",
    subtitle: "Anatomy and behavioral constraints of semantic blocks.",
    anchors: { "demo": "Block Demonstration", "rules": "Engine Rules" },
    body: (
      <div className="space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Blocks are the visual representation of a deterministic step in a flow. 
          Each block contains a semantic header, a functional drift grip, and an intent sentence.
        </p>

        <div id="demo" className="space-y-4 scroll-mt-20">
          <div className="tech-label">Block_Demonstration</div>
          <div className="flex flex-col gap-4">
            <VisualBlock 
              type="intent" 
              icon={Target} 
              intent="Locate user profile dropdown by aria-label" 
            />
            <VisualBlock 
              type="success" 
              icon={CheckCircle2} 
              intent="Verification: Dropdown state is 'collapsed'" 
            />
          </div>
        </div>

        <div id="rules" className="border-l-4 border-primary bg-secondary p-6 space-y-3 scroll-mt-20">
          <div className="tech-label text-primary">Engine_Rule_04</div>
          <p className="text-sm">Blocks are purely functional. They do not store local state; they act as translators between user intent and the element resolver.</p>
        </div>
      </div>
    )
  },
  "taf": {
    title: "TAF_System",
    subtitle: "Trace Analysis Framework: The evidence-first debugging model.",
    anchors: { "components": "Components", "logs": "Trace Logs" },
    body: (
      <div className="space-y-8">
        <div id="components" className="grid gap-4 lg:grid-cols-3 scroll-mt-20">
          {[
            { label: "TRACE", icon: Terminal, val: "Chronological Event Loop" },
            { label: "ANALYSIS", icon: Cpu, val: "Deterministic Logic Logs" },
            { label: "FEEDBACK", icon: FileText, val: "Platform Recovery Data" }
          ].map(item => (
            <div key={item.label} className="border border-border p-4 bg-card space-y-2">
              <item.icon className="h-5 w-5 text-primary" />
              <div className="tech-label opacity-40">{item.label}</div>
              <div className="text-xs font-bold">{item.val}</div>
            </div>
          ))}
        </div>

        <div id="logs" className="border border-border bg-card overflow-hidden font-mono text-[11px] scroll-mt-20">
          <div className="bg-secondary p-2 border-b border-border flex justify-between items-center">
             <span className="tech-label text-[8px]">TAF_SERIALIZER_LOG</span>
             <span className="opacity-30">HEX_0x4299</span>
          </div>
          <div className="p-4 space-y-1">
             <div className="text-muted-foreground">09:42:01 | SYS_EVENT | Navigate(/dashboard)</div>
             <div className="text-success">09:42:02 | STR_ENG   | Resolving semantic alias: "nav_menu"</div>
             <div className="text-primary">09:42:02 | TRC_ANL   | Candidate match found at [442, 12, 100, 40]</div>
             <div className="text-rose-400">09:42:03 | INT_FLR   | Click interaction failed: Unclickable coordinates</div>
             <div className="pt-2 text-warning opacity-80">09:42:03 | FDB_GEN   | Analysis: Overlay detected. Resolution: Clear modal background.</div>
          </div>
        </div>
      </div>
    )
  },
  "spec": {
    title: "System_Specification",
    subtitle: "Formal definition of the WebLens engine capabilities.",
    anchors: { "specs": "Engine Specs", "constraints": "Constraints" },
    body: (
      <div className="space-y-8">
        <div id="specs" className="grid grid-cols-2 gap-4 scroll-mt-20">
             <div className="p-4 border border-border bg-card">
                <div className="tech-label text-primary mb-2">ENGINE_VERSION</div>
                <div className="text-2xl font-black">v1.0.0</div>
             </div>
             <div className="p-4 border border-border bg-card">
                <div className="tech-label text-warning mb-2">COMPATIBILITY</div>
                <div className="text-xl font-mono">ECMAScript 2022+</div>
             </div>
        </div>
        <div id="constraints" className="space-y-4 scroll-mt-20">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Execution Constraints
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground font-mono">
                <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Global Timeout: Block-scoped (No hard limit)
                </li>
                <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Poll Frequency: 10hz (Stability Aligned)
                </li>
                <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Recursion: Unbounded (System Memory Dependent)
                </li>
                <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Memory Cap: Host System Dependent
                </li>
            </ul>
        </div>
      </div>
    )
  },
  "deployment": {
    title: "Deployment_Guide",
    subtitle: "Shipping WebLens binaries and establishing CI pipelines.",
    anchors: { "install": "Installation", "ci": "CI/Headless" },
    body: (
      <div className="space-y-8">
        <div id="install" className="p-4 border border-border bg-secondary font-mono text-xs scroll-mt-20">
            <div className="text-muted-foreground mb-2"># Pull latest binary from GitHub Releases</div>
            <div className="text-success">$ wget https://github.com/georgeet15/web-lens/releases/latest/download/weblens</div>
            <div className="text-muted-foreground my-2"># Grant execution permissions</div>
            <div className="text-success">$ chmod +x weblens</div>
            <div className="text-muted-foreground my-2"># Launch Local Application</div>
            <div className="text-success">$ ./weblens</div>
        </div>
        <div id="ci" className="space-y-4 scroll-mt-20">
            <div className="tech-label">CI_PIPELINE_CONFIG</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
                WebLens runs as a standalone binary in any Linux environment. No display server (X11/Wayland) is required when running in <span className="text-foreground font-bold">headless mode</span>.
            </p>
        </div>
      </div>
    )
  },
  "concepts": {
    title: "Determinism_Theory",
    subtitle: "Understanding the core mathematical guarantees of the engine.",
    anchors: { "theory": "Theory", "loop": "Stability Loop" },
    body: (
      <div className="space-y-6">
         <p id="theory" className="text-muted-foreground leading-relaxed scroll-mt-20">
            By relinquishing "smart" wait times for strict, polling-based verification, WebLens eliminates 99% of race conditions found in event-driven frameworks.
         </p>
         <div id="loop" className="border border-border p-6 bg-secondary scroll-mt-20">
            <div className="tech-label text-primary mb-4">THE_10HZ_STABILITY_LOOP</div>
            <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-border/50 pb-1">
                    <span>T+0ms</span>
                    <span className="text-muted-foreground">Check `document.readyState`</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1">
                    <span>T+50ms</span>
                    <span className="text-muted-foreground">Verify Visual Pixel Stability</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1">
                    <span>T+100ms</span>
                    <span className="text-muted-foreground">Confirm Interactability</span>
                </div>
                <div className="flex justify-between text-success">
                    <span>T+150ms</span>
                    <span>ACTION DISPATCH</span>
                </div>
            </div>
         </div>
      </div>
    )
  },
  "semantic": {
    title: "Semantic_Resolution_v2",
    subtitle: "The algorithm behind selector-free element locating.",
    anchors: { "maws": "MAWS Algorithm", "weights": "Scoring Weights" },
    body: (
      <div className="space-y-8">
         <p id="maws" className="text-muted-foreground scroll-mt-20">
            WebLens uses <b>MAWS (Multi-Attribute Weighted Scoring)</b> to identify elements based on their human-perceivable traits rather than brittle DOM paths.
         </p>
         <div id="weights" className="grid grid-cols-2 gap-px bg-border max-w-md scroll-mt-20">
            <div className="bg-background p-3 text-xs font-bold">Attribute</div>
            <div className="bg-background p-3 text-xs font-bold text-right">Weight</div>
            
            <div className="bg-background p-3 text-xs">TestID (data-testid)</div>
            <div className="bg-background p-3 text-xs text-right font-mono text-success">15.0</div>

            <div className="bg-background p-3 text-xs">Exact Text Match</div>
            <div className="bg-background p-3 text-xs text-right font-mono text-emerald-400">10.0</div>

            <div className="bg-background p-3 text-xs">Aria-Label</div>
            <div className="bg-background p-3 text-xs text-right font-mono text-emerald-400">8.0</div>

            <div className="bg-background p-3 text-xs">Role + Partial Text</div>
            <div className="bg-background p-3 text-xs text-right font-mono text-yellow-500">5.0</div>
            
            <div className="bg-background p-3 text-xs">Tag Name (Input)</div>
            <div className="bg-background p-3 text-xs text-right font-mono text-rose-400">1.0</div>
         </div>
         <p className="text-xs text-muted-foreground italic">
            * Elements scoring below 5.0 are considered ambiguous and will trigger a resolution failure.
         </p>
      </div>
    )
  },
  "flows": {
    title: "Flow_Graph_Topology",
    subtitle: "How blocks connect to form verifiable logic branches.",
    body: <p className="text-muted-foreground">Documentation for branching logic, loops, and state encapsulation.</p>
  },
  "interaction": {
    title: "Block_Interaction",
    subtitle: "Input, Click, Hover, and Drag events.",
    body: <p className="text-muted-foreground">Behavioral constraints of interaction blocks.</p>
  },
  "validation": {
    title: "Assertion_Logic",
    subtitle: "Truth-y verification of DOM state.",
    body: <p className="text-muted-foreground">Available assertion types and their polling intervals.</p>
  },
  "trace": { 
     title: "Trace_Logs", 
     subtitle: "Reading the raw event stream.", 
     anchors: { "stream": "Event Stream", "json": "Log Schema" },
     body: (
        <div className="space-y-6">
            <p id="stream" className="text-muted-foreground scroll-mt-20">
                The Trace Analysis Framework (TAF) outputs a chronological stream of events. Each event is strictly typed and immutable.
            </p>
            <div id="json" className="p-4 bg-zinc-950 border border-border rounded-lg font-mono text-[10px] leading-relaxed overflow-x-auto text-zinc-400 scroll-mt-20">
                <span className="text-purple-400">{"{"}</span><br/>
                &nbsp;&nbsp;<span className="text-sky-400">"run_id"</span>: <span className="text-emerald-400">"uuid-v4..."</span>,<br/>
                &nbsp;&nbsp;<span className="text-sky-400">"block_id"</span>: <span className="text-amber-400">"click_submit_btn"</span>,<br/>
                &nbsp;&nbsp;<span className="text-sky-400">"status"</span>: <span className="text-rose-400">"failed"</span>,<br/>
                &nbsp;&nbsp;<span className="text-sky-400">"taf"</span>: <span className="text-purple-400">{"{"}</span><br/>
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-400">"trace"</span>: [<span className="text-orange-400">"Clicking 'Submit'..."</span>],<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-400">"analysis"</span>: [<span className="text-orange-400">"Blocked by overlay..."</span>],<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-sky-400">"feedback"</span>: []<br/>
                &nbsp;&nbsp;<span className="text-purple-400">{"}"}</span>,<br/>
                &nbsp;&nbsp;<span className="text-sky-400">"screenshot"</span>: <span className="text-emerald-400">"base64..."</span><br/>
                <span className="text-purple-400">{"}"}</span>
            </div>
            <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                    <span>Timestamp (UTC)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-400"></div>
                    <span>Failure State</span>
                </div>
            </div>
        </div>
     )
  },
  "evidence": {
    title: "Evidence_Vault",
    subtitle: "Types of artifacts generated during execution.",
    anchors: { "types": "Artifact Types" },
    body: (
        <div className="space-y-8">
            <div id="types" className="grid md:grid-cols-3 gap-6 scroll-mt-20">
                <div className="space-y-2">
                    <div className="h-32 bg-card border border-border flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <div className="tech-label">DOM_SNAPSHOT</div>
                    <p className="text-xs text-muted-foreground">Full HTML tree serialized at the exact moment of failure, including Shadow DOM.</p>
                </div>
                <div className="space-y-2">
                    <div className="h-32 bg-card border border-border flex items-center justify-center">
                        <Activity className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <div className="tech-label">NETWORK_HAR</div>
                    <p className="text-xs text-muted-foreground">Complete HTTP archive showing all pending XHR/Fetch requests.</p>
                </div>
                <div className="space-y-2">
                    <div className="h-32 bg-card border border-border flex items-center justify-center">
                        <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <div className="tech-label">SIGNATURE_HASH</div>
                    <p className="text-xs text-muted-foreground">SHA-256 hash of the evidence package to ensure tamper-proof auditing.</p>
                </div>
            </div>
        </div>
    )
  }
};


export default function Docs() {
  const { slug } = useParams();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const currentPath = slug || "";
  const content = docContent[currentPath] || docContent[""];

  // Flatten logic for pagination
  const allPages = docsSections.flatMap(section => section.items);
  const currentIndex = allPages.findIndex(item => item.slug === currentPath);
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

  /* DEBUG LOGGING */
  useEffect(() => {
    console.log("[Docs Debug] Slug:", slug);
    console.log("[Docs Debug] CurrentPath:", currentPath);
    console.log("[Docs Debug] Content Found:", !!docContent[currentPath]);
    console.log("[Docs Debug] Available Keys:", Object.keys(docContent));
  }, [slug, currentPath]);

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col font-sans">
      {/* Background Dot Grid */}
      <div className="fixed inset-0 bg-dot-grid pointer-events-none opacity-20" />
      
      <Header />
      
      <div className="flex-1 pt-14 flex relative">
        {/* Mobile toggle */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-50 h-10 w-10 bg-primary flex items-center justify-center text-white shadow-lg"
        >
          {sidebarOpen ? <X /> : <Menu />}
        </button>

        {/* Sidebar */}
        <aside className={cn(
          "w-64 border-r border-border bg-background h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto z-40 transition-transform lg:translate-x-0 shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full fixed lg:relative"
        )}>
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-2 mb-4 p-2 bg-secondary border border-border/50">
               <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
               <div className="tech-label text-[7px] text-muted-foreground">NODE_TX_ACTIVE</div>
            </div>
            {docsSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <div className="tech-label text-primary/60 text-[9px]">{section.title}</div>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const isActive = currentPath === item.slug;
                    return (
                      <Link
                        key={item.slug}
                        to={`/docs${item.slug ? `/${item.slug}` : ""}`}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "px-2 py-1.5 text-[11px] font-bold tracking-tight transition-all border-l-2",
                          isActive 
                            ? "text-foreground bg-primary/10 border-primary" 
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 border-r border-border/50">
          <div className="max-w-7xl px-8 py-10 lg:px-12 space-y-10">
            <header className="space-y-4">
              <div className="flex items-center gap-2 tech-label text-muted-foreground">
                 <Book className="h-3 w-3" />
                 <span>DOCUMENTATION_REF / {content.title}</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tighter uppercase">{content.title}</h1>
              <p className="text-base text-muted-foreground max-w-4xl">{content.subtitle}</p>
            </header>
            
            <div className="h-px bg-border" />
            
            <div className="prose prose-invert max-w-none">
              {content.body}
            </div>

            {/* Dynamic Pagination */}
            <div className="pt-16 grid grid-cols-2 gap-4 border-t border-border">
               {prevPage ? (
                 <Link to={`/docs${prevPage.slug ? `/${prevPage.slug}` : ""}`} className="block">
                   <div className="p-6 border border-border bg-card group cursor-pointer hover:bg-secondary transition-colors h-full">
                      <div className="tech-label opacity-40 mb-1">PREVIOUS</div>
                      <div className="font-bold flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 rotate-180" />
                        {prevPage.name}
                      </div>
                   </div>
                 </Link>
               ) : <div />}

               {nextPage ? (
                 <Link to={`/docs${nextPage.slug ? `/${nextPage.slug}` : ""}`} className="block">
                   <div className="p-6 border border-border bg-card group cursor-pointer hover:bg-secondary transition-colors text-right h-full">
                      <div className="tech-label opacity-40 mb-1">NEXT_SPEC</div>
                      <div className="font-bold flex items-center gap-2 justify-end">
                        {nextPage.name}
                        <ChevronRight className="h-4 w-4" />
                      </div>
                   </div>
                 </Link>
               ) : <div />}
            </div>
          </div>
        </main>

            {/* Right Info Panel (Desktop) */}
            <aside className="hidden xl:block w-72 h-[calc(100vh-3.5rem)] sticky top-14 p-8 space-y-8 overflow-y-auto">
               <div className="space-y-4">
                  <div className="tech-label">In_This_Section</div>
                  <div className="space-y-2">
                    {Object.keys(docContent[currentPath]?.anchors || {}).map(anchor => (
                      <a 
                        key={anchor}
                        href={`#${anchor}`}
                        className="text-[10px] font-bold text-muted-foreground hover:text-primary cursor-pointer transition-colors flex items-center gap-2"
                      >
                        <div className="h-0.5 w-2 bg-border" />
                        {anchor.toUpperCase().replace("-", "_")}
                      </a>
                    ))}
                  </div>
               </div>
            </aside>
      </div>
    </div>
  );
}
