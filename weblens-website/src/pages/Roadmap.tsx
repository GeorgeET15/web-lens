import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Zap,
  Shield,
  Activity,
  Terminal,
  Cpu,
  Layers,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

const milestones = [
  {
    status: "STABLE",
    version: "v1.0.0",
    date: "AVAILABLE",
    label: "GA_RELEASE",
    color: "text-success",
    items: [
      "Deterministic Execution Loop",
      "Semantic A11Y Resolver",
      "TAF Evidence Engine",
      "Binary Deployment Model"
    ]
  },
  {
    status: "DEVELOPMENT",
    version: "v1.2.0",
    date: "Q1_2025",
    label: "CROSS_BROWSER_SYNC",
    color: "text-primary",
    items: [
      "Flow Translator (AI Drafts)",
      "Headless Parallel Execution",
      "Stability Advisor (AI Analysis)",
      "Team State Synchronization"
    ]
  },
  {
    status: "SPECIFICATION",
    version: "v2.0.0",
    date: "Q2_2025",
    label: "CLOUD_SCALER",
    color: "text-warning",
    items: [
      "Distributed Cloud Runtime",
      "Visual Regression Delta Engine",
      "Encrypted Evidence Vault",
      "REST Control Interface"
    ]
  },
  {
    status: "RESEARCH",
    version: "v3.0.0",
    date: "BACKLOG",
    label: "AGENTIC_INSPECTOR",
    color: "text-investigation",
    items: [
      "Multi-Modal Vision Verification",
      "Natural Language Logic Probes",
      "Predictive Flake Analysis",
      "Autonomous Agent Swarms"
    ]
  }
];

export default function Roadmap() {
  return (
    <Layout>
      {/* Background Dot Grid is in Layout */}

      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="container mx-auto px-6 py-12 lg:py-16 max-w-7xl">
          <div className="tech-label text-primary mb-4">Development_Manifesto v1.0.0</div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
            System <br />
            <span className="italic">Evolution.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            The WebLens development path is strictly prioritized by determinism-first 
            architectures. We don't release features until they meet our strict 
            reliability thresholds.
          </p>
        </div>
      </section>

      {/* Chronological Milestones */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-7xl">
           <div className="space-y-12">
              {milestones.map((m) => (
                <div key={m.version} className="grid lg:grid-cols-4 gap-6">
                   <div className="space-y-2">
                      <div className={cn("tech-label text-[9px]", m.color)}>{m.status}</div>
                      <div className="text-3xl font-black tracking-tighter">{m.version}</div>
                      <div className="text-[10px] font-mono opacity-40">{m.date}</div>
                   </div>

                   <div className="lg:col-span-3 border border-border bg-card p-6 space-y-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between">
                         <div className="tech-label text-[9px] uppercase tracking-widest">{m.label}</div>
                         <div className="h-px flex-1 bg-border mx-4" />
                         <CheckCircle2 className={cn("h-4 w-4", m.color)} />
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-3">
                         {m.items.map(item => (
                            <div key={item} className="flex gap-2 items-center text-[11px] text-muted-foreground group-hover:text-foreground/80 transition-colors">
                               <div className="h-1 w-1 rounded-full bg-border" />
                               {item}
                            </div>
                         ))}
                      </div>

                      <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                         <Zap className="h-16 w-16 -mr-4 -mt-4 text-primary" />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Integration CTA */}
      <section className="border-t border-border bg-secondary">
        <div className="container mx-auto px-6 py-16 text-center max-w-4xl space-y-6">
          <div className="tech-label text-[9px]">SYSTEM_INITIALIZATION</div>
          <h2 className="text-3xl font-bold tracking-tight">Begin Verification.</h2>
          <p className="text-muted-foreground text-sm">
             Stop scaling flakiness. Implement the WebLens deterministic engine 
             in your project today and experience ground-truth verification.
          </p>
          <div className="flex justify-center gap-4 pt-2">
             <Button size="sm" className="h-10 px-6 bg-primary rounded-none text-[10px] font-bold tracking-widest" asChild>
                <Link to="/docs" className="gap-2">
                  LAUNCH_DOCS
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
             </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
