import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  Target, 
  Shield, 
  Eye,
  Blocks,
  Terminal,
  Code,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Search,
  Zap,
  Fingerprint
} from "lucide-react";
import { VisualBlock } from "@/components/VisualBlock";
import { MediaFrame } from "@/components/MediaFrame";
import { AuthenticLog } from "@/components/AuthenticLog";
import { AuthenticBlock, AuthenticBranch } from "@/components/AuthenticBlock";
import { InteractiveBlockDemo } from "@/components/InteractiveBlockDemo";

import { Helmet } from "react-helmet-async";

export default function Index() {
  return (
    <Layout>
      <Helmet>
        <title>WebLens - Zero-Code Visual UI Testing</title>
        <meta name="description" content="Deterministic, evidence-first UI testing for modern teams. No selectors, no scripting, just visual truth." />
      </Helmet>
      {/* Hero: Ground Truth Statement */}
      <section className="relative border-b border-border">
        <div className="container mx-auto px-6 py-20 lg:py-24 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="flex flex-col items-start gap-8">
              <div className="tech-label text-primary">Visual Testing Platform</div>
              
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Test Your Website, <br />
                <span className="text-primary italic">Without Writing Code.</span>
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                WebLens is a free visual testing tool that runs on your computer. 
                Create automated tests by clicking through your website—no coding required. 
                AI helps you build tests faster, and everything runs locally with no account needed.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Button size="sm" className="h-10 px-6 bg-primary hover:bg-primary/90 text-white rounded-none text-[10px] font-bold tracking-widest" asChild>
                  <Link to="/docs" className="gap-2">
                    Download Free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-10 px-6 border-border hover:bg-secondary rounded-none text-[10px] font-bold tracking-widest" asChild>
                  <Link to="/how-it-works">
                    See How it Works
                  </Link>
                </Button>
              </div>

              {/* Minimal Metadata Footer */}
              <div className="w-full pt-6 mt-2 border-t border-border/30 flex gap-8 opacity-30 text-[9px] font-mono">
                <div className="flex gap-2">
                  <span className="text-primary">VERSION</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">STATUS</span>
                  <span className="text-success">STABLE</span>
                </div>
              </div>
            </div>

            {/* Right: Interactive Block Demo */}
            <div className="hidden lg:block">
              <InteractiveBlockDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy: Technical Constraints */}
      <section className="bg-secondary border-b border-border">
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

        <div className="container mx-auto px-6 py-24 lg:px-12 grid lg:grid-cols-2 gap-16 items-start max-w-7xl">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="tech-label text-primary">How It Works</div>
              <h2 className="text-4xl font-bold tracking-tight">Simple, Reliable Testing</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                WebLens uses smart element detection instead of fragile CSS selectors. 
                Your tests keep working even when your website's code changes.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                { icon: Blocks, title: "Drag-and-Drop Builder", desc: "Build tests visually by placing logic blocks. No coding required—just drag, drop, and connect." },
                { icon: Fingerprint, title: "Smart Element Finding", desc: "Finds elements by their purpose and text, not brittle CSS selectors that break easily." },
                { icon: Shield, title: "Reliable Execution", desc: "Waits for elements to be ready before interacting, eliminating random test failures." },
                { icon: Activity, title: "Complete History", desc: "Every test run is saved with screenshots and logs so you can see exactly what happened." }
              ].map((item) => (
                <div key={item.title} className="space-y-3 relative group">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-bold uppercase tracking-tight">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Block Illustration Panel */}
          <div className="space-y-6">
            <div className="relative border border-border p-8 bg-card shadow-2xl space-y-4 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                 <div className="tech-label opacity-50">Test Flow Example</div>
                 <div className="text-[8px] font-mono text-primary/40">0x7F_RENDER_SEQ</div>
              </div>
              
              <AuthenticBlock 
                type="open"
                intent="Open 'https://local-app.internal'"
                status="success"
              />
              
              <AuthenticBlock 
                type="click"
                intent="Click 'Get Started' button"
                status="running"
              />

              {/* Decorative trace line */}
              <div className="absolute left-10 top-24 bottom-24 w-px bg-border -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* TAF System: Explainable Failure */}
      <section className="border-b border-border">
        <div className="container mx-auto px-6 py-24 lg:px-12 grid lg:grid-cols-2 gap-16 max-w-7xl">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="tech-label text-primary">When Tests Fail</div>
              <h2 className="text-4xl font-bold tracking-tight">Clear Explanations, Not Guesswork</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                When something goes wrong, WebLens shows you exactly what happened with screenshots and detailed logs. 
                No mysterious failures or hidden auto-fixes.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { label: "Timeline", icon: Terminal, color: "text-foreground", text: "See exactly what happened during your test, step by step with timestamps." },
                { label: "Analysis", icon: Code, color: "text-primary", text: "Get clear explanations of why a test failed and suggestions on how to fix it." },
                { label: "Screenshots", icon: AlertTriangle, color: "text-warning", text: "Visual proof of what the page looked like when the test failed." }
              ].map((taf) => (
                <div key={taf.label} className="border border-border p-6 bg-card flex gap-4 transition-colors hover:bg-accent group">
                  <taf.icon className={cn("h-6 w-6 mt-0.5 shrink-0", taf.color)} />
                  <div className="space-y-2">
                    <div className={cn("font-black tracking-widest text-xs", taf.color)}>{taf.label}</div>
                    <p className="text-sm text-muted-foreground transition-colors leading-relaxed">{taf.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>


          <div className="border border-border bg-card p-1 flex flex-col h-[600px]">
            <AuthenticLog 
              className="h-full border-none rounded-none shadow-none"
              events={[
                {
                  id: '1',
                  type: 'CLICK_ELEMENT',
                  message: 'Executing interaction on "Checkout" (id: checkout_btn)',
                  severity: 'success',
                  timestamp: '12:04:12',
                  taf: {
                    analysis: ['Semantic mapping confirmed via role:button and label:Checkout'],
                    feedback: []
                  }
                },
                {
                  id: '2',
                  type: 'ASSERT_VISIBLE',
                  message: 'Verifying "Payment Gate" appearance',
                  severity: 'error',
                  timestamp: '12:04:15',
                  taf: {
                    analysis: ['Element "payment_form" failed to reach visibility state within 5000ms'],
                    feedback: [
                      'The target element is currently obscured by [div.modal_overlay]',
                      'Ensure "Close Modal" block precedes this interaction in the flow editor.'
                    ]
                  }
                }
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA: Deterministic Future */}
      <section className="py-16 bg-secondary border-t border-border">
        <div className="container mx-auto px-6 text-center max-w-4xl space-y-6">
          <div className="tech-label text-primary tracking-[0.3em]">Ready to Get Started?</div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            Start Testing <br />Your Website Today
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            WebLens is free and runs on your computer. 
            No account required, no credit card, just download and start testing.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="sm" className="h-10 px-8 bg-primary hover:bg-primary/90 text-white rounded-none font-bold text-[10px] tracking-widest" asChild>
              <Link to="/docs">Download Now</Link>
            </Button>
            <Button size="sm" variant="outline" className="h-10 px-8 border-border rounded-none font-bold hover:bg-secondary text-[10px] tracking-widest" asChild>
              <Link to="/docs">Read Documentation</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
