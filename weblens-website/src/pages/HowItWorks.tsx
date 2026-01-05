import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Layers, 
  MousePointer, 
  Play, 
  Search, 
  Target, 
  CheckCircle2, 
  Activity,
  Shield,
  Fingerprint,
  Terminal,
  Cpu
} from "lucide-react";
import { VisualBlock } from "@/components/VisualBlock";
import { MediaFrame } from "@/components/MediaFrame";
import { AuthenticLog } from "@/components/AuthenticLog";
import { AuthenticBlock } from "@/components/AuthenticBlock";
import { AuthenticInspector } from "@/components/AuthenticInspector";
import { cn } from "@/lib/utils";

const theorySteps = [
  {
    id: "01",
    label: "BUILD_STATE",
    icon: Layers,
    title: "Atomic Composition",
    description: "Flows are constructed from immutable semantic blocks. Every block represents a discrete, deterministic platform interaction.",
    details: [
      "Zero-code block orchestration",
      "Immutable interaction definitions",
      "Strict logical sequencing",
      "Flow validation on save"
    ],
    visual: (
       <div className="space-y-3 opacity-80">
          <AuthenticBlock type="open" intent="Navigate to '/auth/login'" status="success" />
          <AuthenticBlock type="click" intent="Click 'Get Started' button" status="running" />
       </div>
    )
  },
  {
    id: "02",
    label: "RESOLVER_PHASE",
    icon: Search,
    title: "Semantic Resolution",
    description: "WebLens bypasses the DOM selector layer. Elements are located via accessibility trees and semantic intent signatures.",
    details: [
      "Role-based element targeting",
      "Text-node intent matching",
      "No CSS/XPath dependency",
      "Resolution confidence scoring"
    ],
    visual: (
      <div className="space-y-4">
        <video 
          src="/assets/inspector-probe.webm"
          autoPlay
          loop
          muted
          playsInline
          className="w-full border border-border shadow-2xl"
        />
        <AuthenticInspector 
          selectedElement={{
            name: "Submit Transaction",
            tagName: "button",
            selector: "btn.primary",
            capabilities: {
              visible: true,
              clickable: true
            }
          }}
        />
      </div>
    )
  },
  {
    id: "03",
    label: "EXECUTION_LOOP",
    icon: Play,
    title: "Deterministic Runtime",
    description: "The runner enforces a strict poll-and-verify loop. Actions only proceed when preconditions are met and verified.",
    details: [
      "Polled interaction readiness",
      "Global execution timeouts",
      "No implicit wait logic",
      "Reproducible trace output"
    ],
    visual: (
       <div className="space-y-4">
          <VisualBlock type="intent" icon={Cpu} intent="SYNC: Waiting for 'checkout_btn' visibility..." />
          <div className="flex gap-2 justify-center">
             {[1,2,3,4,5].map(i => <div key={i} className={cn("h-1 w-8 bg-border", i < 4 && "bg-primary")} />)}
          </div>
          <div className="text-center tech-label text-[8px] opacity-40">POLL_INTERVAL: 50ms</div>
       </div>
    )
  },
  {
    id: "04",
    label: "ANALYSIS_FEEDBACK",
    icon: Terminal,
    title: "Trace Attribution",
    description: "Failures are attributed to specific platform states. TAF generates a factual log of why the system deviated from intent.",
    details: [
      "Step-by-step trace history",
      "Visual evidence snapshots",
      "Logical failure analysis",
      "Factual recovery suggestions"
    ],
    visual: (
      <AuthenticLog 
        className="h-full border-none rounded-none shadow-none"
        events={[
          {
            id: '1',
            type: 'CLICK',
            message: 'Interacting with "Checkout"',
            severity: 'success',
            timestamp: '12:04:12',
            taf: {
              analysis: ['Confirmed via role:button'],
              feedback: []
            }
          },
          {
            id: '2',
            type: 'ASSERT',
            message: 'Verifying visibility',
            severity: 'error',
            timestamp: '12:04:15',
            taf: {
              analysis: ['Element obscured by modal_overlay'],
              feedback: ['Check modal state']
            }
          }
        ]}
      />
    )
  }
];

export default function HowItWorks() {
  return (
    <Layout>
      {/* Background Dot Grid */}
      <div className="fixed inset-0 bg-dot-grid pointer-events-none opacity-20" />

      {/* Hero: Theory of Operation */}
      <section className="relative border-b border-border">
        <div className="container mx-auto px-6 py-12 lg:py-16 max-w-7xl">
          <div className="tech-label text-primary mb-4">Theory_of_Operation v1.0</div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8">
            How WebLens <br />
            <span className="italic text-primary">Thinks.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            WebLens is not a script recorder. It is a hierarchical verification system 
            that maps user intentions to browser states via deterministic logic.
          </p>
        </div>
      </section>

      {/* Technical Workflow */}
      <section className="py-16 space-y-16">
        <div className="container mx-auto px-6 max-w-7xl">
           <div className="space-y-16">
              {theorySteps.map((step, index) => (
                <div key={step.id} className="grid lg:grid-cols-2 gap-12 items-start">
                   <div className={cn("space-y-6", index % 2 === 1 && "lg:order-2")}>
                      <div className="space-y-3">
                         <div className="flex items-center gap-3">
                            <div className="h-6 w-6 bg-secondary border border-border flex items-center justify-center font-bold text-[10px]">
                               {step.id}
                            </div>
                            <div className="tech-label text-primary text-[9px]">{step.label}</div>
                         </div>
                         <h2 className="text-2xl font-bold tracking-tight">{step.title}</h2>
                         <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                            {step.description}
                         </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                         {step.details.map(detail => (
                            <div key={detail} className="flex gap-3 items-start">
                               <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                               <span className="text-sm text-muted-foreground">{detail}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className={cn("border border-border p-6 bg-card shadow-2xl relative", index % 2 === 1 && "lg:order-1")}>
                      <div className="tech-label text-[7px] opacity-20 absolute top-2 right-4">VISUAL_ENGINE_PROBE</div>
                      {step.visual}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* System Integrity CTA */}
      <section className="border-t border-border bg-secondary">
        <div className="container mx-auto px-6 py-16 text-center max-w-4xl space-y-6">
          <div className="tech-label text-success text-[9px]">DEPLOYMENT_READY</div>
          <h2 className="text-3xl font-bold tracking-tight">Trust comes from Visibility.</h2>
          <p className="text-muted-foreground text-sm">
            Stop guessing why your tests failed. WebLens provides the raw evidence and logical 
            attribution needed for professional-grade quality assurance.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="sm" className="h-10 px-6 bg-primary rounded-none text-[10px] font-bold tracking-widest" asChild>
              <Link to="/features" className="gap-2">
                EXPLORE_FEATURES
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
