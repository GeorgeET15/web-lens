import { Layout } from "@/components/Layout";
import { Brain, Cpu, Sparkles, Network, Zap, GitBranch } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function AiFeatures() {
  return (
    <Layout>
      <Helmet>
        <title>WebLens AI Assistant - Smart Test Creation</title>
        <meta name="description" content="WebLens AI helps you create tests faster by generating flows from plain English descriptions and analyzing test failures." />
      </Helmet>
      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="container mx-auto px-6 py-20 lg:py-24 max-w-7xl">
          <div className="tech-label text-primary mb-6">AI Assistant</div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Build Tests Faster <br />
            <span className="italic text-primary">With AI Help</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
            Describe what you want to test in plain English, and WebLens AI creates the test flow for you. 
            When tests fail, AI explains what went wrong and suggests fixes.
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
                 <h3 className="text-lg font-bold">AI Test Generator</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                    Describe what you want to test in plain English, and AI creates a complete test flow for you. Review and run it with one click.
                 </p>
              </div>

              <div className="space-y-4 p-6 border border-border bg-card">
                 <div className="w-10 h-10 bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Network className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="text-lg font-bold">Reliability Insights</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                    AI analyzes your test history to spot flaky tests and suggest improvements. It recommends fixes but never changes your tests automatically.
                 </p>
              </div>

              <div className="space-y-4 p-6 border border-border bg-card">
                 <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Brain className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="text-lg font-bold">Failure Explanations</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                    When a test fails, AI examines the page state and explains exactly what went wrong and why. Get clear, actionable insights instead of cryptic error messages.
                 </p>
              </div>
           </div>
        </div>
      </section>
    </Layout>
  );
}
