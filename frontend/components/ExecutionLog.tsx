import { Terminal, AlertTriangle, Trash2, ChevronDown, ChevronUp, ChevronRight, Eye, Brain, Info } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { type EnrichedError } from '../lib/error-parser';

// Reusing types roughly for now, ideally strictly shared
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  severity: 'info' | 'success' | 'error' | 'warning';
  screenshot?: string;
  taf?: {
    trace: string[];
    analysis: string[];
    feedback: string[];
  };
}
interface ExecutionLogProps {
  events: TimelineEvent[];
  error?: EnrichedError | null;
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export function ExecutionLog({ events, error, isOpen, onToggle, onClear }: ExecutionLogProps) {
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic needs to be mindful of manual scroll, but for now simple:
  useEffect(() => {
    if (isOpen) {
        eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, isOpen]);

  const formatTimestamp = (iso: string) => {
    try {
        return new Date(iso).toLocaleTimeString([], { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
        });
    } catch { return iso; }
  };

  return (
    <div className={`flex flex-col border-t border-gray-800 bg-gray-900 transition-all duration-300 ${isOpen ? 'h-64' : 'h-10'}`}>
      
      {/* Header */}
      <div 
        className="flex-none flex items-center justify-between px-4 h-10 border-b border-gray-800 bg-gray-900 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
            <button className="text-gray-500 hover:text-white">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-xs text-gray-300 uppercase tracking-wider">Execution Log</h2>
            </div>
            {events.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
                {events.length} EVENTS
              </span>
            )}
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300 transition-colors"
                title="Clear Logs"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm bg-gray-950/30">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 min-h-[100px]">
            <Terminal className="w-8 h-8 text-gray-500 mb-2" strokeWidth={1} />
            <p className="text-xs font-medium text-gray-400">Awaiting execution commands...</p>
          </div>
        ) : (
            <div className="relative pl-4 border-l border-gray-800 space-y-6">
              {events.map((event) => (
                <TimelineItem key={event.id} event={event} formatTimestamp={formatTimestamp} />
              ))}
              <div ref={eventsEndRef} />
            </div>
        )}
      </div>
      )}

      {/* Error Banner */}
      {error && isOpen && (
        <div className="flex-none p-3">
          <div className="p-3 bg-rose-500/5 border-l-4 border-rose-500 rounded-r flex items-center gap-3 backdrop-blur-sm">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <div className="min-w-0 w-full">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wide">{error.title}</h3>
              
              {error.intent ? (
                  /* Canonical View */
                  <div className="mt-2 space-y-2 border-t border-rose-500/20 pt-2 text-[11px] font-mono">
                      {/* Badge Row */}
                      <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                              {error.owner && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                      error.owner === 'USER' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                      error.owner === 'APP' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                      error.owner === 'ENGINE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}>
                                      {error.owner} FAULT
                                  </span>
                              )}
                              {error.determinism && error.determinism !== 'UNKNOWN' && (
                                  <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                                      {error.determinism === 'CERTAIN' ? 'Deterministically Verified' : 'Heuristically Detected'}
                                  </span>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-[60px_1fr] gap-2">
                          <span className="text-rose-500/70 uppercase text-[9px] font-bold tracking-wider pt-0.5">Intent</span>
                          <span className="text-gray-300">{error.intent}</span>
                          
                          <span className="text-rose-500/70 uppercase text-[9px] font-bold tracking-wider pt-0.5">Reason</span>
                          <span className="text-gray-300">{error.reason}</span>
                          
                          <span className="text-rose-500/70 uppercase text-[9px] font-bold tracking-wider pt-0.5">Fix</span>
                          <span className="text-emerald-400/90 italic">{error.suggestion}</span>
                      </div>
                      
                      {/* Technical Details Expander */}
                      {error.evidence && Object.keys(error.evidence || {}).length > 0 && (
                          <details className="group mt-2 text-left">
                              <summary className="cursor-pointer text-gray-500 hover:text-gray-300 text-[10px] font-medium flex items-center gap-1 select-none">
                                  <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                                  Technical Details (Raw Evidence)
                              </summary>
                              <div className="mt-2 pl-2 border-l border-gray-700/50 space-y-2">
                                  {Object.entries(error.evidence || {}).map(([key, value]) => (
                                      <div key={key}>
                                          <span className="text-rose-500/50 uppercase text-[9px] font-bold tracking-wider block mb-1">
                                              {key.replace(/_/g, ' ')}
                                          </span>
                                          {typeof value === 'object' && value !== null && 'html' in value ? (
                                              // Render HTML snippets specially
                                              <div className="bg-black/40 p-2 rounded border border-gray-800">
                                                 <div className="text-[9px] text-gray-500 mb-1 font-mono">
                                                   Tag: <span className="text-blue-400">{(value as any).tag}</span>
                                                 </div>
                                                 <pre className="text-[9px] text-emerald-500/70 overflow-x-auto whitespace-pre-wrap font-mono">
                                                   {(value as any).html}
                                                 </pre>
                                              </div>
                                          ) : (
                                              <pre className="text-[9px] text-gray-400 overflow-x-auto bg-black/20 p-2 rounded whitespace-pre-wrap font-mono">
                                                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                              </pre>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </details>
                      )}
                  </div>
              ) : (
                  /* Legacy / System Error View */
                  <>
                    <p className="text-xs text-rose-300/80 mt-0.5">{error.message}</p>
                    {error.suggestion && (
                        <p className="text-[10px] text-gray-500 mt-1 italic">Suggestion: {error.suggestion}</p>
                    )}
                  </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ event, formatTimestamp }: { event: TimelineEvent, formatTimestamp: (iso: string) => string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = event.taf && (event.taf.analysis.length > 0 || event.taf.feedback.length > 0);

  return (
    <div className="relative group">
      {/* Timeline Dot */}
      <div className={`
        absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 
        ${event.severity === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
          event.severity === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.5)]' : 
          event.severity === 'warning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
          'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]'}
      `} />
      
      <div 
        className={`p-3 rounded border transition-all duration-200 ${
          isExpanded ? 'bg-gray-800 border-gray-600' : 'bg-gray-900/50 border-gray-800 hover:bg-gray-800 hover:border-gray-700'
        }`}
      >
        <div 
          className="flex items-center justify-between mb-1 cursor-pointer"
          onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            {hasDetails && (
              <span className="text-gray-500">
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wider
              ${event.severity === 'success' ? 'text-emerald-400' : 
                event.severity === 'error' ? 'text-rose-400' : 
                event.severity === 'warning' ? 'text-amber-400' :
                'text-indigo-400'}
            `}>
              {event.type.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-[10px] text-gray-600">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>

        <div className="space-y-2">
          {/* Default Trace View - factual step */}
          <div className="flex items-start gap-2">
            <Eye className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <span className="text-gray-200 font-medium leading-tight">{event.message}</span>
          </div>

          {/* Expanded Analysis + Feedback - reasoning and guidance */}
          {isExpanded && event.taf && (
            <div className="mt-3 space-y-3 pt-3 border-t border-gray-700/50">
              {event.taf.analysis.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest opacity-80">
                    <Brain className="w-3 h-3" />
                    WebLens Analysis
                  </div>
                  {event.taf.analysis.map((line, idx) => (
                    <div key={idx} className="text-[12px] text-gray-400 pl-4.5 leading-relaxed italic border-l border-indigo-500/20 ml-1.5">
                      {line}
                    </div>
                  ))}
                </div>
              )}

              {event.taf.feedback.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-500 uppercase tracking-widest opacity-80">
                    <Info className="w-3 h-3" />
                    WebLens Feedback
                  </div>
                  {event.taf.feedback.map((line, idx) => (
                    <div key={idx} className="text-[12px] text-gray-300 pl-4.5 leading-relaxed border-l border-amber-500/20 ml-1.5 bg-amber-500/5 py-1 px-2 rounded-sm ring-1 ring-amber-500/10">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {event.screenshot && (
            <div className="mt-2 rounded overflow-hidden border border-gray-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <img src={event.screenshot} alt="Screenshot" className="w-full h-auto opacity-90 transition-opacity" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
