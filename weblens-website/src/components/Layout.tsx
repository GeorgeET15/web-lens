import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export function Layout({ children, hideFooter }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans relative">
      {/* Persistent Dot Grid Canvas */}
      <div className="fixed inset-0 bg-dot-grid pointer-events-none" />
      <div className="fixed inset-0 bg-lines pointer-events-none" />
      
      {/* Side Instrumentation Tapes */}
      <div className="fixed top-0 left-0 bottom-0 w-8 border-r border-border/50 hidden 2xl:flex flex-col items-center justify-between py-24 z-[55] pointer-events-none opacity-30">
        <div className="tech-label -rotate-90 origin-center whitespace-nowrap text-[7px]">Y_AXIS_RESOLUTION: 1440px</div>
        <div className="h-px w-4 bg-border" />
        <div className="tech-label -rotate-90 origin-center whitespace-nowrap text-[7px]">SYSTEM_CLOCK: SYNCED</div>
        <div className="h-px w-4 bg-border" />
        <div className="tech-label -rotate-90 origin-center whitespace-nowrap text-[7px]">FRM_SAMPLE_R: 08ms</div>
      </div>
      <div className="fixed top-0 right-0 bottom-0 w-8 border-l border-border/50 hidden 2xl:flex flex-col items-center justify-between py-24 z-[55] pointer-events-none opacity-30">
        <div className="tech-label rotate-90 origin-center whitespace-nowrap text-[7px]">WORKER_POOL: ACTIVE [0-15]</div>
        <div className="h-px w-4 bg-border" />
        <div className="tech-label rotate-90 origin-center whitespace-nowrap text-[7px]">DOM_SNAPSHOT: SECURE</div>
        <div className="h-px w-4 bg-border" />
        <div className="tech-label rotate-90 origin-center whitespace-nowrap text-[7px]">FLOW_ENGINE_V1.0.0</div>
      </div>
      
      {/* Technical Header */}
      <Header />
      
      <div className="relative flex flex-col min-h-screen">
        {/* Metadata Noise Layer */}
        <div className="fixed inset-0 pointer-events-none select-none z-[60] overflow-hidden opacity-10">
           <div className="metadata-faint absolute top-20 left-4">ADDR_0x4A22 // FLOW_INIT</div>
           <div className="metadata-faint absolute top-40 right-4 rotate-90 origin-right">STR_0x8B // SELECTOR_ACTIVE</div>
           <div className="metadata-faint absolute bottom-20 left-4 -rotate-90 origin-left">TRACE_DUMP_002 // STEP_EXEC</div>
           <div className="metadata-faint absolute bottom-40 right-4">LOG_0x00 // AWAITING_INPUT</div>
           
           <div className="metadata-faint absolute top-1/4 left-1/2 -translate-x-1/2 opacity-[0.05]">RUN_MODE: SERIAL_OPTIMIZED</div>
           <div className="metadata-faint absolute bottom-1/4 left-1/2 -translate-x-1/2 opacity-[0.05]">WEBLENS_CORE_v1.0.0</div>
        </div>

        <main className="flex-1 pt-14">
          {children}
        </main>
        {!hideFooter && <Footer />}
      </div>
    </div>
  );
}
