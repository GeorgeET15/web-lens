import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Layers, 
  MousePointer2, 
  Shield, 
  Zap, 
  Target, 
  Search, 
  Activity, 
  Terminal,
  Cpu,
  RefreshCw,
  Clock,
  CheckCircle2,
  GitBranch,
  Settings,
  Database
} from "lucide-react";
import { VisualBlock } from "@/components/VisualBlock";
import { MediaFrame } from "@/components/MediaFrame";
import { AuthenticLog } from "@/components/AuthenticLog";
import { AuthenticBlock, AuthenticBranch } from "@/components/AuthenticBlock";
import { cn } from "@/lib/utils";

const blockCategories = [
  {
    category: "NAVIGATION",
    blocks: [
      { name: "Open Page", icon: Search, desc: "Direct browser to intent URL." },
      { name: "Refresh", icon: RefreshCw, desc: "Reset platform state synchronously." },
      { name: "Wait for Load", icon: Clock, desc: "Block until readyState is complete." }
    ]
  },
  {
    category: "INTERACTION",
    blocks: [
      { name: "Click", icon: MousePointer2, desc: "Semantic trigger on target intent." },
      { name: "Type", icon: Terminal, desc: "Inject character sequence into field." },
      { name: "Select", icon: Layers, desc: "Orchestrate drop-down state change." }
    ]
  },
  {
    category: "LOGIC",
    blocks: [
      { name: "If Condition", icon: GitBranch, desc: "Branch flow based on semantic fact." },
      { name: "Repeat Until", icon: RefreshCw, desc: "Deterministic loop with exit guard." },
      { name: "Delay", icon: Clock, desc: "Explicit standby for async stabilization." }
    ]
  },
  {
    category: "VALIDATION",
    blocks: [
      { name: "Assert Visible", icon: Target, desc: "Verify intent presence in viewport." },
      { name: "Verify Text", icon: CheckCircle2, desc: "Factual validation of node content." },
      { name: "Network Check", icon: Activity, desc: "Analyze traffic logs for signal." }
    ]
  }
];

export default function Flows() {
  return (
    <Layout>
      {/* Hero: Orchestration */}
      <section className="relative border-b border-border bg-secondary overflow-hidden">
        <div className="container mx-auto px-6 py-20 lg:py-24 max-w-7xl relative z-10">
          <div className="tech-label text-primary mb-6">Orchestration_Module v1.1.0</div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Orchestration, <br />
            <span className="italic text-primary">not</span> Scripting.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Stop writing code for visual tests. WebLens uses a hierarchical system of 
            immutable logic blocks to build deterministic automation that never flakes.
          </p>
          <div className="flex gap-4 pt-6">
            <Button size="sm" className="h-10 px-8 bg-primary rounded-none text-[10px] font-bold tracking-widest" asChild>
               <Link to="/docs">EXPLORE_BLOCKS</Link>
            </Button>
          </div>
        </div>
        
        {/* Background Visual: Animated Block Stream */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.05] pointer-events-none hidden lg:block">
           <div className="absolute inset-0 bg-dot-grid" />
        </div>
      </section>

      {/* Block Taxonomy */}
      <section className="py-28">
        <div className="container mx-auto px-6 max-w-6xl">
           <div className="space-y-6 mb-20 text-center">
              <div className="tech-label text-primary">BLOCK_TAXONOMY</div>
              <h2 className="text-5xl font-bold tracking-tight">The Periodic Table of Interaction.</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                 Every block is a deterministic invariant. We've distilled web automation 
                 into its fundamental atomic units.
              </p>
           </div>

           <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              {[
                {
                  category: "NAVIGATION",
                  blocks: [
                    { name: "Open Page", icon: Search, desc: "Direct browser to intent URL with verified load state." },
                    { name: "Wait for Load", icon: Clock, desc: "Block until readyState is complete and stable." }
                  ]
                },
                {
                  category: "INTERACTION",
                  blocks: [
                    { name: "Click", icon: MousePointer2, desc: "Semantic trigger on target intent with visibility verification." },
                    { name: "Type", icon: Terminal, desc: "Inject character sequence into field with focus confirmation." }
                  ]
                }
              ].map(cat => (
                <div key={cat.category} className="space-y-8">
                   <div className="flex items-center gap-3">
                      <div className="tech-label text-sm text-primary">{cat.category}</div>
                      <div className="h-px flex-1 bg-border" />
                   </div>
                   <div className="space-y-6">
                      {cat.blocks.map(block => (
                        <div key={block.name} className="p-6 border border-border bg-card hover:bg-secondary transition-colors group">
                           <div className="flex items-center gap-4 mb-3">
                              <block.icon className="h-5 w-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                              <h3 className="font-bold text-base tracking-tight">{block.name}</h3>
                           </div>
                           <p className="text-sm text-muted-foreground leading-relaxed">
                              {block.desc}
                           </p>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Deterministic Execution Section */}
      <section className="bg-secondary border-y border-border">
         {/* Full-width video showcase */}
         <div className="container mx-auto px-6 py-12 max-w-6xl">
           <video 
             src="/assets/app-hero.webm"
             autoPlay
             loop
             muted
             playsInline
             className="w-full border border-border shadow-2xl rounded-sm"
           />
         </div>

         <div className="container mx-auto px-6 py-28 max-w-5xl text-center">
            <div className="space-y-8 max-w-3xl mx-auto">
               <div className="tech-label text-success underline">SYSTEM_INVARIANT: DETERMINISM</div>
               <h2 className="text-5xl font-bold tracking-tight">Logic that never guesses.</h2>
               <p className="text-muted-foreground text-lg leading-relaxed">
                  In legacy tools, implicit retries and brittle selectors create non-determinism. 
                  WebLens blocks execute in a strict poll-verify-action cycle. 
                  If the platform state doesn't match the block's intent, it fails with factual evidence.
               </p>
            </div>
         </div>
      </section>

      {/* Final Action */}
      <section className="py-20">
         <div className="container mx-auto px-6 text-center max-w-3xl space-y-8">
            <h2 className="text-4xl font-bold tracking-tight italic">Build your first Flow today.</h2>
            <p className="text-muted-foreground leading-relaxed">
               Experience the reliability of deterministic orchestration. Stop scripting 
               and start engineering your visual verification.
            </p>
            <div className="flex justify-center gap-4">
               <Button size="sm" className="h-10 px-8 bg-primary rounded-none text-[10px] font-bold tracking-widest" asChild>
                  <Link to="/docs" className="gap-2">
                    INIT_WORKSPACE
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
               </Button>
            </div>
            <div className="pt-8 border-t border-border/50 font-mono text-[9px] text-muted-foreground/40 uppercase tracking-[0.5em]">
               Deterministic // Immutable // Verifiable
            </div>
         </div>
      </section>
    </Layout>
  );
}
