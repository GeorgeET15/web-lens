import React, { useState } from 'react';
import { Sparkles, Send, Loader2, X, Plus, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { API_ENDPOINTS } from '../../config/api';
import { AIInsight } from './AIInsight';

interface AICopilotPanelProps {
  onApplyBlocks: (blocks: any[]) => void;
  onClose: () => void;
  className?: string;
  onRunComplete?: (runId: string) => void;
}

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ 
  onApplyBlocks, 
  onClose,
  className,
  onRunComplete
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [draftBlocks, setDraftBlocks] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setLastResponse(null);
    setDraftBlocks(null);

    try {
      const response = await fetch(API_ENDPOINTS.AI_DRAFT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: prompt })
      });

      if (!response.ok) throw new Error('Failed to generate draft. Ensure LLM is configured.');
      
      const data = await response.json();
      const review = data.review;
      setLastResponse(review);

      // Extract JSON from the review string
      const startTag = "---JSON_START---";
      const endTag = "---JSON_END---";
      const startIndex = review.indexOf(startTag);
      const endIndex = review.indexOf(endTag);

      if (startIndex !== -1 && endIndex !== -1) {
        const jsonStr = review.substring(startIndex + startTag.length, endIndex).trim();
        try {
          const blocks = JSON.parse(jsonStr);
          if (Array.isArray(blocks)) {
            setDraftBlocks(blocks);
          }
        } catch (e) {
          console.error('Failed to parse draft JSON', e);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-950 text-white font-sans selection:bg-indigo-500/30", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
            <Sparkles size={16} />
          </div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
            Inspector Copilot
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-bold text-indigo-400">
              EXPERIMENTAL
            </span>
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {!lastResponse && !isLoading && !error && (
          <div className="space-y-4 py-8 text-center" id="ai-empty-state">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-indigo-500/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-300 font-medium">
                Draft your flow with AI
              </p>
              <p className="text-[11px] text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
                Describe the user journey you want to test. I'll propose a deterministic set of blocks for you to review and record.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in transition-all">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">Connection Error</p>
              <p className="text-[12px] text-zinc-400 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {(isLoading || lastResponse) && (
          <AIInsight 
             type="draft"
             roleLabel="Draft Proposal"
             content={lastResponse || ""}
             isLoading={isLoading}
             isCollapsible={false}
             className="border-none bg-transparent p-0"
          />
        )}

        {draftBlocks && !isLoading && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="h-px bg-white/5 w-full" />
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        {draftBlocks.length} Blocks Proposed
                     </span>
                  </div>
               </div>
               
               <div className="space-y-2">
                 {draftBlocks.map((block, idx) => (
                   <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 rounded bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] text-indigo-400 shrink-0">
                           {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-zinc-300 truncate">{block.label || block.type}</p>
                          <p className="text-[9px] text-zinc-600 truncate">{block.type}</p>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>

               <div className="flex gap-2 mt-4">
                 <button
                   onClick={() => {
                     onApplyBlocks(draftBlocks);
                     onClose();
                   }}
                   className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-zinc-200 active:scale-[0.98]"
                   id="ai-apply-blocks"
                 >
                   <Plus size={14} />
                   Insert
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Input */}
      <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="relative group">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Go to dashboard, wait 5 seconds, click logout..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none min-h-[120px] group-hover:border-white/20"
            id="ai-prompt-input"
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="absolute bottom-4 right-4 p-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-all disabled:opacity-30 disabled:grayscale"
            id="ai-generate-button"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[9px] text-zinc-600 text-center mt-4 uppercase tracking-widest font-bold opacity-60">
          Hold SHIFT + ENTER for new line
        </p>
      </div>
    </div>
  );
};
