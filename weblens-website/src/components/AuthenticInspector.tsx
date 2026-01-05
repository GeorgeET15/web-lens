import React from 'react';
import { Target, AlertCircle, Search, Cpu, Globe } from 'lucide-react';

interface AuthenticInspectorProps {
  className?: string;
  selectedElement?: {
    name: string;
    tagName: string;
    selector: string;
    capabilities: Record<string, boolean>;
  };
}

export const AuthenticInspector: React.FC<AuthenticInspectorProps> = ({ selectedElement, className }) => {
  return (
    <div className={`flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Element Inspector</h2>
            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Live Mapping Active</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-primary/20">
          <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Syncing</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 bg-background">
        {selectedElement ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Identity Card */}
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-indigo-500/10 pb-3">
                <div className="w-10 h-10 rounded bg-muted border border-border flex items-center justify-center font-mono text-xs text-indigo-300">
                  &lt;/&gt;
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-foreground uppercase tracking-wider truncate">
                    {selectedElement.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {selectedElement.tagName} • {selectedElement.selector}
                  </p>
                </div>
              </div>

              {/* Capabilities Grid */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(selectedElement.capabilities).map(([cap, enabled]) => (
                  <div key={cap} className="flex items-center justify-between p-2 bg-muted border border-border rounded-lg">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{cap.replace(/_/g, ' ')}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-rose-500/50'}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Mockup (If needed) */}
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Semantic Drift Detected</p>
                <p className="text-[10px] text-zinc-400 leading-relaxed italic">Element accessibility tree differs from visual representation. Heuristic verification recommended.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">Awaiting Element Capture</p>
              <p className="text-[10px] text-muted-foreground/60 max-w-[200px] leading-relaxed italic">Select any DOM node in the live browser instance to view its semantic identity.</p>
            </div>
          </div>
        )}

        {/* Trace Stream Probe */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Engine Telemetry</span>
            </div>
            <span className="text-[8px] font-mono">0.00ms latency</span>
          </div>
        </div>
      </div>
    </div>
  );
};
