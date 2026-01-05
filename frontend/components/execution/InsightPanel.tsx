import React, { useState, useEffect } from 'react';
import { BlockExecution } from '../../types/execution';
import { ChevronDown, ChevronRight, Camera, Info, ShieldCheck, Activity, Brain, Loader2, Target, Database, Copy, Check } from 'lucide-react';
import { AIInsight } from '../ai/AIInsight';

interface Props {
  block?: BlockExecution;
  error?: {
    type: string;
    message: string;
    related_block_id?: string;
  };
}

const InsightPanelDetail: React.FC<Props> = ({ block, error }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch AI Summary on Failure
  useEffect(() => {
    if (block?.status === 'failed' && error) {
      setIsAiLoading(true);
      setAiSummary("");
      
      const payload = {
        run_id: "unknown", // Potentially available in props if needed
        block_id: block.block_id,
        block_type: block.block_type,
        intent: {
          summary: (error as any).intent || "Unknown Intent",
          element: (error as any).element
        },
        outcome: {
            status: "failure",
            duration_ms: (block as any).duration_ms || 0,
            retries: (block as any).retries || 0
        },
        reasoning: {
            primary_reason: (error as any).reason || error.message,
            secondary_factors: (error as any).secondary_factors
        },
        guidance: [(error as any).suggestion || (error as any).guidance || "No guidance"],
        evidence: {
            screenshots: block.screenshot ? [{ path: block.screenshot, label: "Failure screenshot" }] : [],
            dom_state: (error as any).dom_state
        },
        context: {
            previous_runs: []
        }
      };

      fetch('/api/ai/analyze-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        setAiSummary(data.summary);
      })
      .catch(err => {
        console.error("AI Analysis failed:", err);
      })
      .finally(() => setIsAiLoading(false));
    } else {
        setAiSummary("");
    }
  }, [block?.block_id, block?.status, error]);

  if (!block) {
    return (
      <div className="p-8 text-zinc-600 italic text-center text-xs flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 opacity-40">
            <Activity className="w-6 h-6" />
        </div>
        Select a step to view insights
      </div>
    );
  }

  const isFailed = block.status === 'failed';
  const showFailureDetail = isFailed && error;

  return (
    <div className="flex flex-col h-full bg-black select-none">
      {/* TIER 1 — OUTCOME SUMMARY (ALWAYS VISIBLE) */}
      <div className="flex-none p-5 border-b border-zinc-900 bg-zinc-950/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isFailed ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
            }`} />
            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isFailed ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isFailed ? 'Anomaly detected' : 'Step Verified'}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-600 tabular-nums">
            {((block as any).duration_ms || 0) / 1000}s
          </span>
        </div>
        <div className="text-[13px] text-zinc-200 font-medium leading-relaxed italic flex items-center gap-2">
            {block.message || block.taf.analysis[0] || block.taf.trace[0] || (
              (block.status === 'success' || block.status === 'failed') ? (
                <span>{block.status === 'success' ? 'Step verified successfully' : 'Anomaly detected during execution'}</span>
              ) : (
                <>
                   <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                   <span className="text-zinc-500">Reviewing outcome...</span>
                </>
              )
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {/* TIER 2 — VISUAL EVIDENCE (PRIMARY CONTEXT) */}
        <div className="p-5 space-y-3 border-b border-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 opacity-40">
              <Camera className="w-3.5 h-3.5 text-zinc-400" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Visual Evidence</h4>
            </div>
            <span className="text-[9px] font-mono text-zinc-700">T+{Math.round((block as any).duration_ms || 0)}ms</span>
          </div>
          
          <div className="relative group/evidence overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
            {block.screenshot ? (
              <img 
                src={block.screenshot} 
                className="w-full h-auto object-cover opacity-90 group-hover/evidence:opacity-100 transition-opacity"
                alt="Evidence"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center text-zinc-700 italic text-[11px]">
                No snapshot available
              </div>
            )}
            
            {/* Minimal retry hint if exists */}
            {block.taf.analysis.some(a => a.toLowerCase().includes('retry')) && (
               <div className="absolute top-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded flex items-center gap-1.5 ring-1 ring-white/5">
                  <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                  <button 
                    onClick={() => setShowReasoning(true)}
                    className="text-[8px] font-black text-white/50 hover:text-white uppercase tracking-tighter transition-colors"
                  >
                    View attempts
                  </button>
               </div>
            )}
          </div>
        </div>

        {/* TIER 2.5 — DATA EVIDENCE (STORAGE / NETWORK) */}
        {block.tier_2_evidence && (
            <div className="p-5 border-b border-zinc-900 bg-zinc-950/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 opacity-40">
                        <Database className="w-3.5 h-3.5 text-zinc-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Data Evidence</h4>
                    </div>
                    <button 
                        onClick={() => {
                            const text = JSON.stringify(block.tier_2_evidence, null, 2);
                            navigator.clipboard.writeText(text);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-1.5 rounded-md hover:bg-white/5 transition-colors group relative"
                        title="Copy to Clipboard"
                    >
                        {copied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                            <Copy className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
                        )}
                    </button>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <pre className="text-[10px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(block.tier_2_evidence, null, 2)}
                    </pre>
                </div>
            </div>
        )}

        {/* AI INSIGHT SECTION */}
        {(isAiLoading || aiSummary) && (
            <div className="p-5 border-b border-zinc-900">
                <AIInsight 
                    type="failure" 
                    content={aiSummary} 
                    isLoading={isAiLoading}
                />
            </div>
        )}

        {/* TIER 3 — REASONING & STABILITY (COLLAPSIBLE) */}
        <div className="border-b border-zinc-900">
           <button 
             onClick={() => setShowReasoning(!showReasoning)}
             className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors group"
           >
             <div className="flex items-center gap-3">
               <div className={`p-1.5 rounded-lg border bg-zinc-950 ${isFailed ? 'border-rose-500/20 text-rose-500' : 'border-indigo-500/20 text-indigo-500'}`}>
                 <Brain className="w-3.5 h-3.5" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 group-hover:text-zinc-200">
                 Why this {isFailed ? 'failed' : 'worked'}
               </span>
             </div>
             {showReasoning ? <ChevronDown className="w-4 h-4 text-zinc-600" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
           </button>
           
           {showReasoning && (
             <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                {showFailureDetail && (
                   <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-4">
                      {(error as any).intent ? (
                          <>
                              <div>
                                  <div className="flex items-center gap-2 text-rose-400 mb-1">
                                      <Target className="w-3.5 h-3.5" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Intent</span>
                                  </div>
                                  <p className="text-[12px] text-zinc-300 leading-relaxed">{(error as any).intent}</p>
                              </div>

                               <div>
                                  <div className="flex items-center gap-2 text-rose-400 mb-1">
                                      <Info className="w-3.5 h-3.5" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Reason</span>
                                  </div>
                                  <p className="text-[12px] text-zinc-300 leading-relaxed font-medium">{(error as any).reason}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-rose-500/10">
                                  <div>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 block">Owner</span>
                                      <span className="text-[10px] font-mono text-zinc-400">{(error as any).owner || 'UNKNOWN'}</span>
                                  </div>
                                  <div>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 block">Determinism</span>
                                      <span className="text-[10px] font-mono text-zinc-400">{(error as any).determinism || 'UNKNOWN'}</span>
                                  </div>
                              </div>

                              <div>
                                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Guidance</span>
                                  </div>
                                  <p className="text-[12px] text-zinc-400 leading-relaxed italic">{(error as any).suggestion || (error as any).guidance}</p>
                              </div>
                              
                              {(error as any).evidence && Object.keys((error as any).evidence).length > 0 && (
                                  <div className="pt-2 border-t border-rose-500/10">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Data Evidence</span>
                                      <pre className="text-[10px] text-zinc-500 bg-black/20 p-2 rounded overflow-x-auto">
                                          {JSON.stringify((error as any).evidence, null, 2)}
                                      </pre>
                                  </div>
                              )}
                          </>
                      ) : (
                          <>
                              <div className="flex items-center gap-2 text-rose-400">
                                 <Info className="w-3.5 h-3.5" />
                                 <span className="text-[9px] font-black uppercase tracking-widest">Decision Anomaly</span>
                              </div>
                              <p className="text-[12px] text-zinc-300 leading-relaxed italic">
                                {error.message}
                              </p>
                          </>
                      )}
                   </div>
                )}
                
                <div className="space-y-3">
                   {block.taf.analysis.map((msg, i) => (
                      <div key={i} className={`p-4 rounded-xl border leading-relaxed text-[12px] italic ${
                         isFailed ? 'bg-zinc-950 border-white/5 text-zinc-400' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400/90'
                      }`}>
                         "{msg}"
                      </div>
                   ))}
                   {block.taf.analysis.length === 0 && (
                      <p className="text-[11px] text-zinc-600 italic pl-1">Engine reached confidence through standard heuristic.</p>
                   )}
                </div>

                <div className="pt-2">
                   <div className="flex items-center gap-2 mb-3 opacity-30">
                     <ShieldCheck className="w-3 h-3 text-zinc-400" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Stability Assessment</span>
                   </div>
                   <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-zinc-500 font-medium tracking-tight">Outcome Confidence</span>
                      <span className={`text-[10px] font-black uppercase ${isFailed && (error as any)?.determinism === 'HEURISTIC' ? 'text-amber-500' : 'text-zinc-300'}`}>
                         {isFailed ? ((error as any)?.determinism === 'CERTAIN' ? 'High' : (error as any)?.determinism || 'Low') : 'High'}
                      </span>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* TIER 4 — DETAILED TRACE (COLLAPSIBLE, LAST) */}
        <div>
           <button 
             onClick={() => setShowTrace(!showTrace)}
             className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors group"
           >
             <div className="flex items-center gap-3">
               <div className="p-1.5 rounded-lg border border-white/5 bg-zinc-950 text-zinc-600">
                 <Activity className="w-3.5 h-3.5" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 group-hover:text-zinc-400">
                 Detailed Trace
               </span>
             </div>
             {showTrace ? <ChevronDown className="w-4 h-4 text-zinc-800" /> : <ChevronRight className="w-4 h-4 text-zinc-800" />}
           </button>

           {showTrace && (
             <div className="px-5 pb-10 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <ul className="space-y-4 pl-1 border-l border-white/5 ml-2 pt-2">
                   {block.taf.trace.map((msg, i) => (
                      <li key={i} className="flex gap-4 text-[12px] text-zinc-500 group relative pl-5">
                         <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-zinc-900 border border-white/10 group-hover:scale-125 transition-transform" />
                         <span className="leading-relaxed opacity-70 group-hover:opacity-100">{msg}</span>
                      </li>
                   ))}
                </ul>
                <div className="pt-4 border-t border-white/5">
                   <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest block mb-2">Internal Feedback</span>
                   <div className="space-y-2">
                      {block.taf.feedback.map((msg, i) => (
                         <p key={i} className="text-[11px] text-zinc-600 leading-relaxed italic bg-white/2 rounded p-2 border border-white/5">
                           {msg}
                         </p>
                      ))}
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export const InsightPanel = InsightPanelDetail;
