import { Layout } from "@/components/Layout";
import { 
  Search, 
  Fingerprint, 
  Eye, 
  Activity, 
  Shield, 
  Zap,
  Target,
  Maximize2,
  Crosshair
} from "lucide-react";
import { MediaFrame } from "@/components/MediaFrame";
import { AuthenticInspector } from "@/components/AuthenticInspector";
import { AuthenticLog } from "@/components/AuthenticLog";
import { cn } from "@/lib/utils";

const inspectorFeatures = [
  {
    icon: Fingerprint,
    title: "Semantic Capture",
    description: "Identify elements by their objective purpose, not their implementation details. Role, name, and value are the only facts that matter.",
    tech: "A11Y_PROBE_V2"
  },
  {
    icon: Target,
    title: "Intent Resolution",
    description: "WebLens maps your high-level intent directly to the accessibility tree, bypassing the brittle CSS/XPath selector layer entirely.",
    tech: "RESOLVER_CORE"
  },
  {
    icon: Activity,
    title: "Live State Stream",
    description: "Inspect the engine's internal state in real-time. Witness the deterministic polling and verification loops as they happen.",
    tech: "TRACE_LOG_SYNC"
  }
];

import { Helmet } from "react-helmet-async";

export default function Inspector() {
  return (
    <Layout>
      <Helmet>
        <title>WebLens Inspector - Semantic DOM Analysis</title>
        <meta name="description" content="Debug with truth. The WebLens Inspector reveals the semantic accessibility tree, bypassing brittle CSS selectors." />
      </Helmet>
      {/* Hero */}
      <section className="relative border-b border-border bg-secondary">
        <div className="container mx-auto px-6 py-16 lg:py-24 max-w-7xl">
          <div className="tech-label text-primary mb-6">Probe_Module v1.2.0</div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Visible <br />
            <span className="italic text-primary">Semantic</span> Truth.
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
            The WebLens Inspector is not a DOM explorer. It's a semantic probe 
            designed to extract the ground truth of your application's interface.
          </p>
        </div>

        {/* Decorative Grid Overlay */}
        <div className="absolute top-0 right-0 w-1/3 h-full overflow-hidden opacity-20 pointer-events-none hidden lg:block">
           <div className="absolute inset-0 border-l border-primary/20" />
           <div className="w-full h-full grid grid-cols-8 grid-rows-12 gap-px bg-border">
              {Array.from({ length: 96 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-primary/10" />
              ))}
           </div>
        </div>
      </section>

      <section className="bg-secondary border-b border-border">
         <div className="container mx-auto px-6 py-12 max-w-6xl">
           <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full border border-border shadow-2xl rounded-sm"
              poster="/assets/inspector-probe.png"
           >
              <source src="/assets/inspector-probe.webm" type="video/webm" />
              <img src="/assets/inspector-probe.png" alt="Semantic probe" className="w-full h-auto" />
           </video>
         </div>
      </section>

      {/* Main Inspection Logic */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="tech-label text-primary">CORE_CAPABILITIES</div>
                <h2 className="text-3xl font-bold tracking-tight">Direct Access to the Accessibility Tree.</h2>
                <p className="text-muted-foreground leading-relaxed italic">
                  "If an automated system cannot describe an element's purpose, 
                  it has no business interacting with it."
                </p>
              </div>

              <div className="space-y-8">
                {inspectorFeatures.map((f, i) => (
                  <div key={f.title} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 flex items-center justify-center border border-border bg-card group-hover:border-primary transition-colors">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      {i !== inspectorFeatures.length - 1 && <div className="w-px flex-1 bg-border my-2" />}
                    </div>
                    <div className="space-y-2">
                       <h3 className="font-bold text-lg">{f.title}</h3>
                       <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                         {f.description}
                       </p>
                       <div className="tech-label text-[8px] opacity-40">{f.tech}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Inspector UI */}
            <div className="space-y-6 lg:pt-8">
               <div className="tech-label text-primary mb-2 opacity-50">LIVE_STATE_FEED</div>
               <AuthenticInspector 
                 selectedElement={{
                   name: "Checkout Button",
                   tagName: "button",
                   selector: "div.cart-summary > button#checkout",
                   capabilities: {
                     clickable: true,
                     visible: true,
                     focusable: true,
                     scrollable: false
                   }
                 }}
               />

               <AuthenticLog 
                 className="h-[300px]"
                 events={[
                   {
                     id: 'insp-1',
                     type: 'PROBE_START',
                     message: 'Initializing semantic capture on mouse pos [412, 882]',
                     severity: 'info'
                   },
                   {
                     id: 'insp-2',
                     type: 'DATA_STREAM',
                     message: 'Received accessibility node: { role: "button", name: "Checkout" }',
                     severity: 'success'
                   },
                   {
                     id: 'insp-3',
                     type: 'STATE_LOCK',
                     message: 'Element properties frozen for verification scan',
                     severity: 'info'
                   },
                   {
                     id: 'insp-4',
                     type: 'SNAPSHOT',
                     message: 'Computed style / layout geometry captured',
                     severity: 'success'
                   }
                 ]}
               />
            </div>
          </div>
        </div>
      </section>

      {/* Technical Noise / Footer CTA */}
      <section className="py-20 bg-black overflow-hidden relative">
         <div className="container mx-auto px-6 text-center space-y-8 relative z-10 max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight">Instrument your interface.</h2>
            <p className="text-muted-foreground text-sm mx-auto">
              WebLens Inspector provides the observability required for high-stakes 
              visual automation. Built for engineers who demand total transparency.
            </p>
            <div className="font-mono text-[9px] text-primary/30 tracking-[0.5em] pt-4">
              SYS_PROBE_END_STREAM // EOF_0xDE
            </div>
         </div>

         {/* Animating Background Noise */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <div 
                key={i} 
                className="whitespace-nowrap font-mono text-xs mb-1 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                {Array.from({ length: 20 }).map(() => "01001011 01011000 01110100 ").join("")}
              </div>
            ))}
         </div>
      </section>
    </Layout>
  );
}
