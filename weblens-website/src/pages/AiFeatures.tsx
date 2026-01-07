import { Layout } from "@/components/Layout";
import { Brain, Cpu, Sparkles, Network, Zap, GitBranch } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function AiFeatures() {
  return (
    <Layout>
      <Helmet>
        <title>WebLens Intelligence - Zero-Shot AI Testing</title>
        <meta name="description" content="Explore WebLens Neural Core: Generative flow drafts, self-healing stability advisors, and semantic failure investigation." />
      </Helmet>
      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="container mx-auto px-6 py-20 lg:py-24 max-w-7xl">
          <div className="tech-label text-primary mb-6">Neural_Core v2.1</div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Zero-Shot <br />
            <span className="italic text-primary">Intelligence.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
            WebLens doesn't just match selectors. It understands interface semantics.
            Digital intelligence provides deep commentary and draft structures, while leaving execution to deterministic logic.
          </p>
        </div>
      </section>

      {/* Video Showcase */}
      <section className="bg-secondary border-b border-border">
         <div className="container mx-auto px-6 py-12 max-w-6xl">
           <video
              src="/assets/ai-flow.webm"
              autoPlay
              loop
              muted
              playsInline
              className="w-full border border-border shadow-2xl rounded-sm"
           />
           <div className="flex justify-between items-center mt-4 text-[10px] font-mono opacity-50">
              <div>SEQ: FAILURE_INVESTIGATION_01</div>
              <div>STATUS: ANALYZED</div>
           </div>
         </div>
      </section>

      {/* AI Features Grid */}
      <section className="py-20 border-b border-border bg-background">
        <div className="container mx-auto px-6 max-w-7xl">
           <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4 p-6 border border-border bg-card">
                 <div className="w-10 h-10 bg-primary flex items-center justify-center border border-primary/20">
                    <Sparkles className="w-5 h-5 text-primary" />
                 </div>
                 <h3 className="text-lg font-bold">Generative Flow Drafts</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                    Powered by the <strong>Translator Chain</strong>. Describe your intent, and WebLens provides a <em>verifiable draft</em> of logic blocks. You review, compile, and execute.
                 </p>
              </div>

              <div className="space-y-4 p-6 border border-border bg-card">
                 <div className="w-10 h-10 bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Network className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="text-lg font-bold">Stability Analysis</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                    The <strong>Stability Advisor Chain</strong> performs statistical analysis on historical runs to flag flaky patterns. It suggests architectural hardenings—it never implicitly changes runtime logic.
                 </p>
              </div>

              <div className="space-y-4 p-6 border border-border bg-card">
                 <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Brain className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="text-lg font-bold">Post-Run Investigation</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                    When a test fails, the <strong>Investigator Chain</strong> audits the frozen dom state to generate a semantic failure report. It identifies root causes without hallucinatory guessing.
                 </p>
              </div>
           </div>
        </div>
      </section>
    </Layout>
  );
}
