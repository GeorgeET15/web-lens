import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Layers, 
  MousePointer2, 
  Shield, 
  Database, 
  FileSearch,
  Lock,
  Search,
  CheckCircle2,
  Terminal,
  Activity,
  Fingerprint,
  Zap
} from "lucide-react";
import { VisualBlock } from "@/components/VisualBlock";
import { MediaFrame } from "@/components/MediaFrame";
import { AuthenticLog } from "@/components/AuthenticLog";
import { cn } from "@/lib/utils";

const featureGroups = [
  {
    category: "ENGINE_CORE",
    features: [
      {
        icon: Fingerprint,
        title: "Semantic Identification",
        description: "Bypass DOM selectors entirely. Locate elements via accessibility names and semantic roles.",
        tech: "A11Y_TREE_WALKER"
      },
      {
        icon: Shield,
        title: "Deterministic Runtime",
        description: "Zero implicit retries. Every action follows a strict, polled verification loop.",
        tech: "DET_ENGINE_V2"
      }
    ]
  },
  {
    category: "FLOW_LOGIC",
    features: [
      {
        icon: Layers,
        title: "Block Orchestration",
        description: "Compose complex flows using immutable logic blocks. No side-effects, no global state.",
        tech: "ATOM_BLOCKS"
      },
      {
        icon: Database,
        title: "Scenario Injection",
        description: "Drive flows with external CSV/JSON matrix. Automatic iteration across data sets.",
        tech: "DATA_LAYER"
      }
    ]
  },
  {
    category: "OBSERVABILITY",
    features: [
      {
        icon: FileSearch,
        title: "TAF Feedback Loop",
        description: "Factual failure attribution. No guessing—just raw evidence and internal reasoning logs.",
        tech: "EVIDENCE_VAULT"
      },
      {
        icon: Activity,
        title: "Live Trace Stream",
        description: "Inspect engine state in real-time during execution. Full transparency into the resolver.",
        tech: "TRACE_LOGS"
      }
    ]
  }
];

export default function Features() {
  return (
    <Layout>
      {/* Background Dot Grid is in Layout now */}

      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="container mx-auto px-6 py-12 lg:py-16 max-w-7xl">
          <div className="tech-label text-primary mb-4">Feature_Specification v1.1.0</div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
            Professional <br />
            <span className="italic">Constraints.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Every feature in WebLens is an intentional constraint. We've optimized 
            for maximum reliability by eliminating non-deterministic patterns.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-7xl">
           <div className="grid gap-12">
              {featureGroups.map(group => (
                <div key={group.category} className="space-y-8">
                   <div className="flex items-center gap-4">
                      <div className="tech-label text-primary">{group.category}</div>
                      <div className="h-px flex-1 bg-border" />
                   </div>
                   <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.features.map(f => (
                        <div key={f.title} className="border border-border p-6 bg-card hover:bg-secondary transition-colors group relative overflow-hidden">
                           <div className="flex items-center gap-4 mb-4">
                              <f.icon className="h-5 w-5 text-primary" />
                              <div className="tech-label text-[9px] opacity-30 tracking-tighter">{f.tech}</div>
                           </div>
                           <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                           <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                              {f.description}
                           </p>
                           <div className="h-0.5 w-6 bg-border group-hover:bg-primary transition-colors" />
                           
                           {/* BG Texture */}
                           <div className="absolute -right-2 -bottom-2 text-[40px] font-mono opacity-[0.03] select-none group-hover:opacity-[0.07] transition-opacity">
                              {f.tech.split('_')[0]}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Constraints: Honest Failure Section */}
      <section className="border-y border-border bg-secondary">
        <div className="container mx-auto px-6 py-16 max-w-7xl">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                 <div className="tech-label text-failure underline text-[9px]">SYSTEM_NON_NEGOTIABLES</div>
                 <h2 className="text-2xl font-bold tracking-tight">Reliability over Convenience.</h2>
                 <p className="text-muted-foreground text-sm leading-relaxed">
                    We've intentionally excluded common patterns that introduce flakiness. 
                    WebLens will never support these features because they undermine determinism.
                 </p>
                 <div className="grid gap-3">
                    {[
                      "Record and playback (Brittle)",
                      "CSS/XPath selectors (Implementation coupled)",
                      "AI auto-healing (Guesswork)",
                      "Implicit retries (Hidden failure)",
                      "Arbitrary sleeps (Non-deterministic)"
                    ].map(item => (
                      <div key={item} className="flex items-center gap-3 text-sm font-mono opacity-60">
                         <span className="text-failure">✗</span>
                         <span>{item.toUpperCase()}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                  <img 
                    src="/assets/inspector-probe.png"
                    alt="Block violation evidence"
                    className="w-full max-w-2xl mx-auto border border-border shadow-2xl"
                  />
                  <AuthenticLog 
                    className="h-[150px]"
                    events={[
                      {
                        id: 'feat-err',
                        type: 'CONSTRAINT_VIOLATION',
                        message: 'ERR_042: Detected explicit "Sleep" block invocation.',
                        severity: 'error',
                        taf: {
                          analysis: ['Non-deterministic wait patterns are rejected by the engine core.'],
                          feedback: ['Replace Sleep with Wait Until Visible or Assert state.']
                        }
                      }
                    ]}
                  />
               </div>
           </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border bg-secondary">
        <div className="container mx-auto px-6 py-16 text-center max-w-5xl space-y-6">
          <div className="tech-label text-[9px]">NEXT_MODULE</div>
          <h2 className="text-3xl font-bold tracking-tight">Ready for deployment?</h2>
          <p className="text-muted-foreground text-sm">
            See how WebLens compares with legacy automation tools and discover why 
            deterministic verification is the new standard.
          </p>
          <div className="flex justify-center gap-4 pt-2">
             <Button size="sm" className="h-10 px-6 bg-primary rounded-none text-[10px] font-bold tracking-widest" asChild>
                <Link to="/why-weblens" className="gap-2">
                  SYSTEM_COMPARISON
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
             </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
