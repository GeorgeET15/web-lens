import React, { useState, useEffect } from 'react';
import { BlockExecution } from '../../types/execution';
import { ChevronDown, ChevronRight, Camera, Info, ShieldCheck, Activity, Brain, Loader2, Target, Database, Copy, Check, Sparkles, HeartPulse } from 'lucide-react';
import { AIInsight } from '../ai/AIInsight';
import { AIDisclaimer } from '../ai/AIDisclaimer';
import { cn } from '../../lib/utils';
import { API_ENDPOINTS } from '../../config/api';
import { HealingPreviewModal } from './HealingPreviewModal';

interface Props {
  block?: BlockExecution;
  flowId?: string;
  error?: {
    type: string;
    message: string;
    related_block_id?: string;
  };
}

const InsightPanelDetail: React.FC<Props> = ({ block, flowId, error }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [healingSuccess, setHealingSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
        
        {/* SEMANTIC HEALTH INDICATOR */}
        {block.confidence_score !== undefined && block.confidence_score !== null && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className={cn("w-3 h-3", 
                  block.confidence_score >= 0.8 ? "text-emerald-500" : 
                  block.confidence_score >= 0.6 ? "text-amber-500" : "text-rose-500"
                )} />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Semantic Health</span>
              </div>
              <div className="group relative flex items-center gap-1.5">
                <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors",
                  block.confidence_score >= 0.8 ? "text-emerald-500/80" : 
                  block.confidence_score >= 0.6 ? "text-amber-500/80" : "text-rose-500/80"
                )}>
                  {block.confidence_score >= 0.8 ? "Healthy" : 
                   block.confidence_score >= 0.6 ? "Drifting" : "At Risk"}
                </span>
                <span className="text-[8px] font-mono text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(block.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
               <div 
                 className={cn("h-full transition-all duration-500",
                   block.confidence_score >= 0.8 ? "bg-emerald-500" : 
                   block.confidence_score >= 0.6 ? "bg-amber-500" : "bg-rose-500"
                 )}
                 style={{ width: `${block.confidence_score * 100}%` }}
               />
            </div>
            {block.confidence_score < 0.7 && block.status === 'success' && (
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-[10px] text-amber-500/80 italic leading-relaxed">
                  Confidence dip detected. This step is still working, but the UI has drifted from the original reference.
                </p>
                <button 
                  onClick={() => setIsPreviewOpen(true)}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-1.5 border rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                    healingSuccess 
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                      : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400"
                  )}
                >
                  {isHealing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : healingSuccess ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isHealing ? 'Healing...' : healingSuccess ? 'Healed' : 'Heal this Step'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {/* TIER 1 — DETAILED TRACE (TRACE - WHAT HAPPENED) */}
        <div className="border-b border-zinc-900 bg-zinc-950/20">
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
             <div className="px-5 pb-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
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

        {/* TIER 2 — REASONING & ANALYSIS (ANALYSIS - WHY IT HAPPENED) */}
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
                 Deterministic Analysis
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
                                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Contextual Evidence</span>
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
                
                {/* SEMANTIC CANDIDATES (DEBUGGER) */}
                <div className="flex-none pt-4 border-t border-zinc-900 border-dashed">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5 text-zinc-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Semantic Resolution Candidates</h4>
                      </div>
                      {block.taf.trace.some(t => t.includes("Metrics")) && (
                        <span className="text-[8px] font-mono text-zinc-700">
                          {block.taf.trace.find(t => t.includes("Metrics"))?.split(":")[1].trim()}
                        </span>
                      )}
                   </div>

                   {isFailed && block.semantic_candidates && block.semantic_candidates.length > 0 && (
                      <div className="mb-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-3">
                          <div className="flex items-center gap-2 text-rose-400">
                             <Target className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Did you mean?</span>
                          </div>
                          <p className="text-[11px] text-rose-300/70 italic leading-relaxed pl-5">
                              Found a <span className="font-bold text-rose-400">{block.semantic_candidates[0].actuals.role}</span> with the name 
                              <span className="font-bold text-rose-400 italic"> "{block.semantic_candidates[0].actuals.name}"</span>. 
                              Consider updating your block to match this.
                          </p>
                          <button 
                            onClick={() => setIsPreviewOpen(true)}
                            className="ml-5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
                          >
                            Quick-Heal to This Element
                          </button>
                      </div>
                   )}

                   <div className="space-y-3">
                       {block.semantic_candidates && block.semantic_candidates.length > 0 ? (
                         block.semantic_candidates.map((cand, idx) => {
                           const isWinner = idx === 0 && block.status === 'success';
                           return (
                             <div key={idx} className={cn(
                               "group p-3 rounded-xl border transition-all",
                               isWinner 
                                 ? "bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-950/20 transition-all duration-300 transform" 
                                 : "bg-zinc-950 border-white/5 opacity-60 hover:opacity-100"
                             )}>
                                <div className="flex items-center justify-between mb-3">
                                   <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                        isWinner ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                                      )}>
                                         {cand.actuals.tagName}
                                      </span>
                                      {isWinner && <Check className="w-3 h-3 text-emerald-500" />}
                                   </div>
                                   <div className="flex items-center gap-2 leading-none">
                                       <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden hidden group-hover:block transition-all">
                                          <div 
                                            className={cn("h-full transition-all duration-700", isWinner ? "bg-emerald-500" : "bg-zinc-700")}
                                            style={{ width: `${Math.min(100, (cand.score / 25) * 100)}%` }}
                                          />
                                       </div>
                                       <span className={cn(
                                         "text-[10px] font-mono font-bold tracking-tight",
                                         isWinner ? "text-emerald-400" : "text-zinc-600"
                                       )}>
                                          {cand.score.toFixed(1)}
                                       </span>
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 gap-1.5 mb-3">
                                   <div className="flex items-baseline gap-2 overflow-hidden">
                                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex-shrink-0">Name</span>
                                      <span className="text-[11px] text-zinc-400 font-medium truncate italic">"{cand.actuals.name}"</span>
                                   </div>
                                   <div className="flex items-baseline gap-2">
                                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex-shrink-0">Role</span>
                                      <span className="text-[11px] text-zinc-400 font-medium">{cand.actuals.role}</span>
                                   </div>
                                </div>

                                {cand.breakdown && (
                                  <div className="pt-3 border-t border-white/5 grid grid-cols-4 gap-2">
                                      {Object.entries(cand.breakdown).map(([key, val]) => {
                                          if (!(val as number)) return null;
                                          return (
                                              <div key={key} className="flex flex-col gap-0.5">
                                                  <span className="text-[6.5px] font-black uppercase tracking-tighter text-zinc-600 truncate">{key}</span>
                                                  <span className={cn("text-[8px] font-mono font-bold", isWinner ? "text-emerald-500/50" : "text-zinc-700")}>+{val as number}</span>
                                              </div>
                                          );
                                      })}
                                  </div>
                                )}
                             </div>
                           );
                         })
                       ) : (
                         <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center">
                            <span className="text-[10px] text-zinc-700 italic font-medium">No candidates meet resolution threshold</span>
                         </div>
                       )}
                   </div>
                </div>

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
                     <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Run Summary (Computed)</span>
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

        {/* TIER 3 — VISUAL EVIDENCE (EVIDENCE) */}
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

        {/* TIER 3.5 — DATA EVIDENCE (EVIDENCE) */}
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

        {/* TIER 4 — AI COMMENTARY (OPTIONAL COMMENTARY - LAST) */}
        {(isAiLoading || aiSummary) && (
            <div className="p-5 space-y-4">
                <AIInsight 
                    type="failure" 
                    content={aiSummary} 
                    isLoading={isAiLoading}
                    roleLabel="AI Commentary (Non-Authoritative)"
                />
                <AIDisclaimer />
            </div>
        )}
      </div>

      <HealingPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        currentAttributes={block.expected_attributes || {}}
        actualAttributes={block.actual_attributes || (block.semantic_candidates?.[0]?.actuals) || {}}
        blockId={block.block_id}
        onConfirm={async (attrs) => {
            setIsPreviewOpen(false);
            setIsHealing(true);
            try {
                if (!flowId) return;
                
                const response = await fetch(`${API_ENDPOINTS.FLOWS}/${flowId}/heal-step`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        run_id: block.run_id,
                        block_id: block.block_id,
                        attributes: attrs
                    })
                });

                if (response.ok) {
                    setHealingSuccess(true);
                    if ((window as any).addToast) (window as any).addToast('success', 'Step Healed! Flow definition updated.');
                    setTimeout(() => setHealingSuccess(false), 3000);
                }
            } catch (e) {
                console.error("Healing failed", e);
            } finally {
                setIsHealing(false);
            }
        }}
      />
    </div>
  );
};

export const InsightPanel = InsightPanelDetail;
