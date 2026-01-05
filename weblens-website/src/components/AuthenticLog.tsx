import React from 'react';
import { Terminal, Eye, Brain, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export interface AuthenticLogEvent {
  id: string;
  type: string;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
  timestamp?: string;
  taf?: {
    analysis: string[];
    feedback: string[];
  };
}

interface AuthenticLogProps {
  events: AuthenticLogEvent[];
  className?: string;
}

export const AuthenticLog: React.FC<AuthenticLogProps> = ({ events, className }) => {
  return (
    <div className={`flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Execution Trace</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-tighter transition-all">Live Stream Active</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono bg-background">
        {events.map((event) => (
          <div key={event.id} className="relative group">
            {/* Timeline Dot */}
            <div className={`
              absolute -left-[17px] top-1.5 w-2 h-2 rounded-full border border-background z-10
              ${event.severity === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                event.severity === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.5)]' : 
                'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]'}
            `} />
            
            <div className="p-3 rounded-lg border border-border bg-secondary hover:bg-secondary transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-black uppercase tracking-widest
                  ${event.severity === 'success' ? 'text-emerald-400' : 
                    event.severity === 'error' ? 'text-rose-400' : 
                    'text-indigo-400'}
                `}>
                  {event.type.replace(/_/g, ' ')}
                </span>
                <span className="text-[8px] text-muted-foreground/60 font-bold">{event.timestamp || '00:00:00'}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Eye className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-foreground/80 font-medium leading-relaxed">{event.message}</span>
                </div>

                {event.taf && (
                  <div className="space-y-3 pl-3 border-l border-white/5 mt-2">
                    {event.taf.analysis.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-indigo-400/80 uppercase tracking-widest">
                          <Brain className="w-2.5 h-2.5" />
                          WebLens Analysis
                        </div>
                        {event.taf.analysis.map((line, idx) => (
                          <div key={idx} className="text-[10px] text-muted-foreground leading-relaxed italic">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}

                    {event.taf.feedback.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-amber-500/80 uppercase tracking-widest">
                          <Info className="w-2.5 h-2.5" />
                          WebLens Feedback
                        </div>
                        {event.taf.feedback.map((line, idx) => (
                          <div key={idx} className="text-[10px] text-foreground leading-relaxed bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
