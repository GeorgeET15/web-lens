import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Check, 
  X, 
  Minus, 
  AlertTriangle,
  Zap,
  Shield,
  Activity,
  Terminal,
  Cpu
} from "lucide-react";
import { MediaFrame } from "@/components/MediaFrame";
import { cn } from "@/lib/utils";

const comparisonData = [
  {
    feature: "Engine_Determinism",
    weblens: "NATIVE",
    legacy: "NON_DETERMINISTIC",
    note: "WebLens enforces poll-verified state before interaction."
  },
  {
    feature: "Element_Resolution",
    weblens: "SEMANTIC",
    legacy: "DOM_COUPLED",
    note: "No CSS/XPath selectors. Built-in resilience to UI refactors."
  },
  {
    feature: "Failure_Analysis",
    weblens: "TAF_EVIDENCE",
    legacy: "STACK_TRACE",
    note: "Factual explanation of platform deviation vs intent."
  },
  {
    feature: "Interaction_Loop",
    weblens: "POLL_SYNC",
    legacy: "IMPLICIT_WAIT",
    note: "Explicit verification of readiness for every action."
  },
  {
    feature: "Recovery_Strategy",
    weblens: "LOGICAL_FEEDBACK",
    legacy: "AUTO_HEALING",
    note: "No guessing. Clear guidance for platform recovery."
  }
];

export default function WhyWebLens() {
  return (
    <Layout>
      {/* Background Dot Grid is in Layout */}

      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="container mx-auto px-6 py-12 lg:py-16 max-w-7xl">
          <div className="tech-label text-warning mb-4">System_Trade-offs v1.0.0</div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
            Determinism <br />
            <span className="italic">at Scale.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            WebLens is not right for every team. We have intentionally optimized 
            for reliability over flexibility. Understanding our constraints is 
            the key to building stable verification systems.
          </p>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="space-y-8">
            <div className="tech-label text-primary text-[9px]">COMPARISON_MATRIX</div>
            <div className="overflow-hidden border border-border bg-secondary">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary">
                    <th className="p-4 tech-label text-[9px]">CORE_LOGIC</th>
                    <th className="p-4 tech-label text-[9px] text-primary">WEBLENS_ENGINE</th>
                    <th className="p-4 tech-label text-[9px]">LEGACY_FRAMEWORKS</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {comparisonData.map((row) => (
                    <tr key={row.feature} className="border-b border-border/50 bg-card hover:bg-secondary transition-colors">
                      <td className="p-4 font-bold">{row.feature}</td>
                      <td className="p-4">
                         <div className="flex items-center gap-2 text-emerald-400 font-mono">
                            <Check className="h-3 w-3" />
                            {row.weblens}
                         </div>
                      </td>
                      <td className="p-4">
                         <div className="flex items-center gap-2 text-rose-400 font-mono">
                            <X className="h-3 w-3" />
                            {row.legacy}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border border-border bg-card text-xs text-muted-foreground italic flex gap-3">
               <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
               Note: WebLens trades the ability to execute arbitrary Javascript for absolute environment stability.
            </div>
          </div>
        </div>
      </section>

      {/* When to use vs when to switch */}
      <section className="py-16">
        {/* Full-width video showcase */}
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <video 
            src="/assets/app-hero.webm"
            autoPlay
            loop
            muted
            playsInline
            className="w-full border border-border shadow-2xl rounded-sm"
          />
        </div>

        <div className="container mx-auto px-6 max-w-7xl grid lg:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div className="tech-label text-success text-[9px]">OPTIMAL_USE_CASE</div>
              <h2 className="text-2xl font-bold tracking-tight">Deploy WebLens If:</h2>
              <div className="space-y-3">
                 {[
                   "UI stability is your primary metric.",
                   "You want to eliminate the selector maintenance tax.",
                   "Factual evidence is required for every failure.",
                   "You prioritize deterministic behavior over scripting freedom."
                 ].map(item => (
                   <div key={item} className="p-4 border border-border bg-secondary flex gap-3">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="space-y-6 opacity-60">
              <div className="tech-label text-failure text-[9px]">OUT_OF_SCOPE</div>
              <h2 className="text-2xl font-bold tracking-tight">Continue Scaling Selenium If:</h2>
              <div className="space-y-3">
                 {[
                   "You require arbitrary DOM manipulation.",
                   "Complex data-heavy API interaction is required.",
                   "Script-driven browser edge-case testing is critical.",
                   "Your team values raw flexibility over strict constraints."
                 ].map(item => (
                   <div key={item} className="p-4 border border-border bg-secondary flex gap-3">
                      <Minus className="h-4 w-4 text-warning shrink-0" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-secondary">
        <div className="container mx-auto px-6 py-16 text-center max-w-5xl space-y-6">
          <div className="tech-label text-[9px]">SYSTEM_INITIALIZATION</div>
          <h2 className="text-3xl font-bold tracking-tight">Ready to commit?</h2>
          <p className="text-muted-foreground text-sm">
             Explore the Roadmap to see the future of deterministic verification 
             at WebLens, or dive into the Documentation to start your first flow.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Button size="sm" className="h-10 px-6 bg-primary rounded-none text-[10px] font-bold tracking-widest" asChild>
              <Link to="/roadmap" className="gap-2">
                VIEW_ROADMAP
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
