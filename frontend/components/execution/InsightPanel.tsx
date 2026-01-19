import React, { useState, useEffect } from 'react';
import { BlockExecution, ExecutionReport } from '../../types/execution';
import { ChevronDown, ChevronRight, Camera, Info, ShieldCheck, Activity, Brain, Loader2, Target, Database, Copy, Check, Sparkles, HeartPulse, Settings2 } from 'lucide-react';
import { AIInsight } from '../ai/AIInsight';
import { AIDisclaimer } from '../ai/AIDisclaimer';
import { cn } from '../../lib/utils';
import { API_ENDPOINTS } from '../../config/api';
import { api } from '../../lib/api';
import { HealingPreviewModal } from './HealingPreviewModal';
import { useToast } from '../ToastContext';

interface Props {
  block?: BlockExecution;
  flowId?: string;
  error?: ExecutionReport['error'];
}

const InsightPanelDetail: React.FC<Props> = ({ block, flowId, error }) => {
  const { addToast } = useToast();
  const [showTechnical, setShowTechnical] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [healingSuccess, setHealingSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch AI Summary
  useEffect(() => {
    // Only auto-fetch for failed blocks that are the primary failure
    const isPrimaryFailedBlock = block?.status === 'failed' && error && error.related_block_id === block.block_id;
    
    if (isPrimaryFailedBlock) {
      handleFetchAiSummary();
    } else {
      setAiSummary("");
    }
  }, [block?.block_id, block?.status, error?.related_block_id]);

  const handleFetchAiSummary = async () => {
    if (!block) return;
    setIsAiLoading(true);
    setAiSummary("");

    try {
      const isRelatedError = error && error.related_block_id === block.block_id;

      const payload = {
        block_id: block.block_id,
        block_type: block.block_type,
        status: block.status,
        message: block.message || (block.taf.analysis[0]),
        trace: block.taf.trace,
        analysis: block.taf.analysis,
        // Only include global error context if this specific block is the one that failed
        error: isRelatedError && error ? {
          type: error.type,
          message: error.message,
          intent: error.intent,
          reason: error.reason,
          suggestion: error.suggestion || error.guidance
        } : null,
        confidence: block.confidence_score,
        duration_ms: block.duration_ms
      };

      const data = await api.post('/api/ai/analyze-failure', payload);
      setAiSummary(data.summary);
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

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
            {(block.duration_ms || 0) / 1000}s
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
        
        {/* SEMANTIC HEALTH INDICATOR (Simplified) */}
        {block.confidence_score !== undefined && block.confidence_score !== null && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className={cn("w-3 h-3", 
                  block.confidence_score >= 0.8 ? "text-emerald-500" : 
                  block.confidence_score >= 0.6 ? "text-amber-500" : "text-rose-500"
                )} />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Recognition Health</span>
              </div>
              <div className="group relative flex items-center gap-1.5">
                <span className={cn("text-[8px] font-black uppercase tracking-widest transition-colors",
                  block.confidence_score >= 0.8 ? "text-emerald-500/80" : 
                  block.confidence_score >= 0.6 ? "text-amber-500/80" : "text-rose-500/80"
                )}>
                  {block.confidence_score >= 0.8 ? "Healthy" : 
                   block.confidence_score >= 0.6 ? "Drifting" : "At Risk"}
                </span>
              </div>
            </div>
            {block.confidence_score < 0.7 && block.status === 'success' && (
              <div className="flex flex-col gap-2 pt-1 border border-amber-500/10 bg-amber-500/5 p-3 rounded-xl">
                <p className="text-[10px] text-amber-500/80 italic leading-relaxed">
                  UI Drift Detected: The element's attributes have changed, but WebLens tracked it successfully using active healing.
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
                  {isHealing ? 'Updating Reference...' : healingSuccess ? 'Updated' : 'Update Reference & Heal'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {/* TIER 1.5 — AI COMMENTARY (PROMOTED TO TOP) */}
        <div className="p-5 border-b border-zinc-900 bg-indigo-500/2">
            {!aiSummary && !isAiLoading && block.status === 'success' && (
                <button 
                    onClick={handleFetchAiSummary}
                    className="w-full py-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center gap-2 group hover:bg-indigo-500/10 transition-all active:scale-98"
                >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Ask WebLens AI for Summary</span>
                </button>
            )}
            
            {(isAiLoading || aiSummary) && (
                <div className="space-y-4">
                    <AIInsight 
                        type={isFailed ? "failure" : "inspection"} 
                        content={aiSummary} 
                        isLoading={isAiLoading}
                        roleLabel="AI Commentary"
                    />
                    <AIDisclaimer />
                </div>
            )}
        </div>

        {/* TIER 2 — TECHNICAL DIAGNOSTICS (COLLAPSIBLE GROUP) */}
        <div className="border-b border-zinc-900">
            <button 
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg border border-white/5 bg-zinc-950 text-zinc-600 group-hover:text-indigo-400 transition-colors">
                  <Settings2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 group-hover:text-zinc-400">
                  Technical Diagnostics
                </span>
              </div>
              {showTechnical ? <ChevronDown className="w-4 h-4 text-zinc-600" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
            </button>

            {showTechnical && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    {/* Execution Trace */}
                    <div className="px-5 pb-8 space-y-4">
                        <div className="flex items-center gap-2 mb-2 opacity-50">
                            <Activity className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Execution Trace</span>
                        </div>
                        <ul className="space-y-4 pl-1 border-l border-white/5 ml-2 pt-2">
                           {block.taf.trace.map((msg, i) => (
                              <li key={i} className="flex gap-4 text-[12px] text-zinc-500 group relative pl-5">
                                 <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-zinc-900 border border-white/10 group-hover:scale-125 transition-transform" />
                                 <span className="leading-relaxed opacity-70 group-hover:opacity-100">{msg}</span>
                              </li>
                           ))}
                        </ul>
                    </div>

                    {/* Analysis Detail */}
                    <div className="px-5 pb-8 space-y-4 border-t border-white/5 pt-5">
                        <div className="flex items-center gap-2 mb-2 opacity-50">
                            <Brain className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Analysis Detail</span>
                        </div>
                        
                        {showFailureDetail && error && (
                           <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-4">
                              {error.intent ? (
                                  <>
                                      <div>
                                          <div className="flex items-center gap-2 text-rose-400 mb-1">
                                              <Target className="w-3.5 h-3.5" />
                                              <span className="text-[9px] font-black uppercase tracking-widest">Intent</span>
                                          </div>
                                          <p className="text-[12px] text-zinc-300 leading-relaxed">{error.intent}</p>
                                      </div>

                                       <div>
                                          <div className="flex items-center gap-2 text-rose-400 mb-1">
                                              <Info className="w-3.5 h-3.5" />
                                              <span className="text-[9px] font-black uppercase tracking-widest">Reason</span>
                                          </div>
                                          <p className="text-[12px] text-zinc-300 leading-relaxed font-medium">{error.reason}</p>
                                      </div>
                                  </>
                              ) : (
                                  <p className="text-[12px] text-zinc-300 leading-relaxed italic">{error.message}</p>
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
                        </div>
                    </div>

                    {/* Recognition Candidates */}
                    <div className="px-5 pb-8 space-y-4 border-t border-white/5 pt-5">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 opacity-50">
                              <Target className="w-3 h-3" />
                              <h4 className="text-[9px] font-black uppercase tracking-widest">Recognition Candidates</h4>
                          </div>
                       </div>

                       {isFailed && block.semantic_candidates && block.semantic_candidates.length > 0 && (
                          <div className="mb-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-3">
                              <p className="text-[11px] text-rose-300/70 italic leading-relaxed pl-1">
                                  Nearby Match: <span className="font-bold text-rose-400">{block.semantic_candidates[0].actuals.role}</span> named 
                                  <span className="font-bold text-rose-400 italic"> "{block.semantic_candidates[0].actuals.name}"</span>.
                              </p>
                              <button 
                                onClick={() => setIsPreviewOpen(true)}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
                              >
                                Use this element
                              </button>
                          </div>
                       )}

                       <div className="space-y-3">
                           {block.semantic_candidates && block.semantic_candidates.length > 0 && 
                             block.semantic_candidates.map((cand, idx) => {
                               const isWinner = idx === 0 && block.status === 'success';
                               return (
                                 <div key={idx} className={cn(
                                   "group p-3 rounded-xl border transition-all",
                                   isWinner 
                                     ? "bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-950/20" 
                                     : "bg-zinc-950 border-white/5 opacity-60 hover:opacity-100"
                                 )}>
                                    <div className="flex items-center justify-between mb-3">
                                       <span className={cn(
                                         "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                         isWinner ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                                       )}>
                                          {cand.actuals.tagName}
                                       </span>
                                       <span className={cn(
                                         "text-[10px] font-mono font-bold tracking-tight",
                                         isWinner ? "text-emerald-400" : "text-zinc-600"
                                       )}>
                                          {cand.score.toFixed(1)}
                                       </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5">
                                       <div className="flex items-baseline gap-2 overflow-hidden">
                                          <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex-shrink-0">Name</span>
                                          <span className="text-[11px] text-zinc-400 font-medium truncate italic">"{cand.actuals.name}"</span>
                                       </div>
                                       <div className="flex items-baseline gap-2">
                                          <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex-shrink-0">Role</span>
                                          <span className="text-[11px] text-zinc-400 font-medium">{cand.actuals.role}</span>
                                       </div>
                                    </div>
                                 </div>
                               );
                             })
                           }
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
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                {block.block_type === 'visual_verify' ? 'Visual Comparison' : 'Visual Evidence'}
              </h4>
            </div>
            <span className="text-[9px] font-mono text-zinc-700">T+{Math.round(block.duration_ms || 0)}ms</span>
          </div>
          
          {block.block_type === 'visual_verify' && block.tier_2_evidence?.baseline && block.tier_2_evidence?.current ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider pl-1">Baseline</span>
                <div className="relative rounded-xl border border-white/5 bg-zinc-950 overflow-hidden group/baseline">
                    <img 
                      src={block.tier_2_evidence.baseline.startsWith('data:') ? block.tier_2_evidence.baseline : `data:image/png;base64,${block.tier_2_evidence.baseline}`}
                      className="w-full h-auto object-cover opacity-80 group-hover/baseline:opacity-100 transition-opacity"
                      alt="Baseline"
                    />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider pl-1">Actual</span>
                <div className="relative rounded-xl border border-white/5 bg-zinc-950 overflow-hidden group/actual">
                    <img 
                      src={block.tier_2_evidence.current.startsWith('data:') ? block.tier_2_evidence.current : `data:image/png;base64,${block.tier_2_evidence.current}`}
                      className="w-full h-auto object-cover opacity-80 group-hover/actual:opacity-100 transition-opacity"
                      alt="Actual"
                    />
                </div>
              </div>
            </div>
          ) : (
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
                        onClick={() => setShowTechnical(true)}
                        className="text-[8px] font-black text-white/50 hover:text-white uppercase tracking-tighter transition-colors"
                    >
                        View attempts
                    </button>
                </div>
                )}
            </div>
          )}
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

        {/* TIER 4 — ADDITIONAL DATA (CONDITIONALLY VISIBLE) */}
        <div className="p-5 border-b border-zinc-900 bg-zinc-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2 opacity-40">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Telemetry Authenticity</h4>
            </div>
            <span className="text-[9px] font-mono text-zinc-700 tabular-nums">Verified via WebLens Native Proxy</span>
        </div>
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
                
                await api.post(`${API_ENDPOINTS.FLOWS}/${flowId}/heal-step`, {
                        run_id: block.run_id,
                        block_id: block.block_id,
                        attributes: attrs
                });
                
                setHealingSuccess(true);
                addToast('success', 'Step Healed! Flow definition updated.');
                setTimeout(() => setHealingSuccess(false), 3000);
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
