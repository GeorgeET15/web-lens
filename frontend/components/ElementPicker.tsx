import React, { useState, useMemo } from 'react';
import { MousePointer2, XCircle, Target, Sparkles } from 'lucide-react';
import { ElementRef } from '../types/element';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { SaveTextGuidance } from './SaveTextGuidance';
import { AIInsight } from './ai/AIInsight';

/**
 * ElementPicker Component - Zero-Code Element Selection
 * 
 * CRITICAL: This component enforces the Zero-Code contract by ONLY allowing
 * visual element picking. Manual CSS selector entry has been intentionally
 * removed to prevent users from bypassing semantic resolution.
 * 
 * Users must select elements visually using the inspector, which generates
 * semantic ElementRefs that work across different environments and are
 * resilient to minor UI changes.
 */


interface ElementPickerProps {
  /**
   * The currently selected element (if any)
   */
  value?: ElementRef;

  /**
   * Callback when an element is selected
   */
  onChange: (element: ElementRef | undefined) => void;

  /**
   * Placeholder text when no element is selected
   */
  placeholder?: string;

  /**
   * Whether selection is currently active (waiting for user input)
   */
  isPicking?: boolean;

  /**
   * Triggered when user clicks "Pick Element"
   */
  onStartPicking?: () => void;

  /**
   * Triggered when user cancels picking
   */
  onStopPicking?: () => void;
  /**
   * Controlled editing state (optional)
   */
  isEditing?: boolean;
  onEditChange?: (isEditing: boolean) => void;

  /**
   * Block type context for validation
   */
  blockType?: string;

  /**
   * Callbacks for alternative actions (for Save Text guidance)
   */
  onUseSavePageContent?: () => void;
  onUseVerifyPageContent?: () => void;
}

export const ElementPicker: React.FC<ElementPickerProps> = ({
  value,
  onChange,
  placeholder = "Select an element",
  isPicking = false,
  onStartPicking,
  onStopPicking,
  blockType,
  onUseSavePageContent,
  onUseVerifyPageContent,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const handleAskAi = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showAi && aiAnswer) return; // Already showing
    
    setShowAi(true);
    setIsAiLoading(true);
    
    try {
        const data = await api.post('/api/ai/inspect', {
            insight: {
                run_id: "draft",
                block_id: "draft",
                block_type: blockType || "unknown",
                intent: {
                    summary: "Inspecting element for stability",
                    element: {
                        role: value?.role || "unknown",
                        name: value?.name || "unknown",
                        confidence: value?.confidence || "medium"
                    }
                },
                outcome: {
                    status: "success",
                    duration_ms: 0,
                    retries: 0
                },
                reasoning: {
                    primary_reason: "User initiated inspection"
                },
                guidance: [],
                evidence: {
                    screenshots: [],
                    dom_state: "unstable" // Conservative default for inspection
                },
                context: {
                    variables: {}
                }
            },
            query: "What is this element and is it stable?"
        });
        setAiAnswer(data.answer);
    } catch (error) {
        console.error("AI Inspect failed", error);
        setAiAnswer("Unable to analyze element.");
    } finally {
        setIsAiLoading(false);
    }
  };

  // Check eligibility for Save Text
  const eligibility = useMemo(() => {
    if (blockType !== 'save_text' || !value) return { isEligible: true };

    // Rule 1: Has semantic role (not generic/presentation)
    if (value.role && !['generic', 'presentation', 'none'].includes(value.role)) {
      return { isEligible: true };
    }

    // Rule 2: Has accessible name from stable source
    if (['aria-label', 'label', 'title', 'placeholder'].includes(value.name_source || '')) {
      return { isEligible: true };
    }

    // Rule 3: User-declared with confidence >= Medium
    if (['high', 'medium'].includes(value.confidence || '')) {
      return { isEligible: true };
    }

    // Rule 4: Has stable semantic container
    if (value.context?.region) {
      return { isEligible: true };
    }

    return { 
      isEligible: false, 
      reason: "Element has no stable semantic identity" 
    };
  }, [value, blockType]);

  const handlePickToggle = () => {
    if (isPicking) {
      onStopPicking?.();
    } else {
      onStartPicking?.();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  // Selected State
  if (value) {
    // Block unstable elements for Save Text
    if (!eligibility.isEligible) {
      return (
        <div className="space-y-2">
          <div 
            className="group relative flex items-center gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 cursor-pointer"
            onClick={onStartPicking}
          >
             <div className="relative flex-none w-10 h-10 rounded-lg bg-amber-900/40 border border-amber-500/20 flex items-center justify-center text-amber-500">
               <XCircle size={20} />
             </div>
             <div className="relative flex-1 min-w-0">
               <div className="text-[11px] font-black uppercase tracking-wider text-amber-200 truncate">
                 {value.name || "Unnamed Element"}
               </div>
               <div className="text-[10px] text-amber-400/70 truncate">
                 Selection invalid for Save Text
               </div>
             </div>
             <button 
               onClick={handleClear}
               className="p-2 hover:bg-amber-900/40 rounded-lg text-amber-500 transition-colors"
             >
               <XCircle size={16} />
             </button>
          </div>

          <SaveTextGuidance 
            onUseSavePageContent={onUseSavePageContent || (() => {})}
            onUseVerifyPageContent={onUseVerifyPageContent || (() => {})}
          />
        </div>
      );
    }

    return (
      <div 
        className={cn(
          "group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden",
          "bg-zinc-950 border border-white/10 hover:border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onStartPicking}
      >
        {/* Glow Background */}
        <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/[0.02] transition-colors" />

        {/* Semantic Icon from Role */}
        <div className="relative flex-none w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
          {getIconForRole(value.role)}
        </div>

        <div className="relative flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-100 truncate">
              {value.name || "Unnamed Element"}
            </span>
            {value.confidence === 'low' && (
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider rounded-full">
                Low Confidence
              </span>
            )}
          </div>
          
          <div className="text-[10px] font-mono text-zinc-500 truncate group-hover:text-zinc-400 transition-colors">
            {getHintText(value)}
          </div>
        </div>

        {/* Clear Action */}
        <div className={cn(
            "relative transition-all duration-200",
            isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
        )}>
            <button
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 hover:text-rose-500 hover:border-rose-500/20 transition-all"
                title="Clear"
            >
                <XCircle size={14} />
            </button>
        </div>

        {/* Detailed Tooltip on Hover */}
        {isHovered && (
             <div className="absolute bottom-[calc(100%+8px)] left-0 w-full p-4 bg-zinc-950 border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[60] space-y-3 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Semantic Payload</span>
                    <span className="font-mono text-indigo-400 text-[10px] bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/10">
                        {`<${value.metadata?.tagName || 'tag'}>`}
                    </span>
                </div>
                
                <div className="space-y-2">
                    {value.metadata?.id && (
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Unique ID</span>
                            <span className="font-mono text-[10px] text-zinc-300 truncate select-all bg-black/40 px-2 py-1 rounded border border-white/5">
                                #{value.metadata.id}
                            </span>
                        </div>
                    )}
                    
                    {value.metadata?.className && (
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">CSS Classes</span>
                            <span className="font-mono text-[10px] text-zinc-400 truncate select-all bg-black/40 px-2 py-1 rounded border border-white/5" title={value.metadata.className}>
                                .{value.metadata.className.replace(/ /g, '.')}
                            </span>
                        </div>
                    )}
                </div>
                
                {value.name_source === 'user_declared' && (
                  <div className="pt-2 border-t border-amber-500/10 bg-amber-500/5 -mx-4 px-4 pb-1 mt-2 rounded-b-xl">
                    <p className="text-[9px] text-amber-400 leading-relaxed">
                      This element relies on a manually declared label. Adding an <code className="px-1 py-0.5 bg-black/40 rounded text-amber-300">aria-label</code> to your application will improve test stability.
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                    {!showAi ? (
                        <button 
                            onClick={handleAskAi}
                            className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors self-start"
                        >
                            <Sparkles size={10} />
                            Ask WebLens Assistant
                            <span className="px-1 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[7px] font-bold text-indigo-400">
                              EXPERIMENTAL
                            </span>
                        </button>
                    ) : (
                        <AIInsight 
                            type="inspection" 
                            content={aiAnswer} 
                            isLoading={isAiLoading}
                            className="bg-black/40 border-indigo-500/20"
                        />
                    )}
                </div>
             </div>
        )}
      </div>
    );
  }

  // Empty / Picking State
  return (
    <div
      onClick={handlePickToggle}
      className={cn(
        "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group gap-3 overflow-hidden",
        isPicking 
          ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]" 
          : "border-white/5 hover:border-white/10 hover:bg-white/5"
      )}
    >
      <div className={cn(
        "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
        isPicking ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "bg-zinc-900 border border-white/5 text-zinc-500 group-hover:text-zinc-300"
      )}>
        {isPicking ? <Target size={20} /> : <MousePointer2 size={20} />}
      </div>

      <div className="text-center space-y-1">
        <div className={cn(
          "text-[10px] font-black uppercase tracking-[0.25em] transition-colors",
          isPicking ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
        )}>
          {isPicking ? "Picking active..." : "Pick Element"}
        </div>
        {!isPicking && (
            <div className="text-[10px] text-zinc-600 font-medium italic">
              {placeholder}
            </div>
        )}
      </div>
      
      {isPicking && (
        <div className="flex items-center gap-2 animate-in fade-in duration-500">
           <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
           <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500/80">
              Interactive session live
           </span>
        </div>
      )}
    </div>
  );
};

// --- Helpers ---

function getIconForRole(role: string) {
  switch (role) {
    case 'button': return <MousePointer2 size={18} />;
    case 'input': return <MousePointer2 size={18} />;
    case 'link': return <Target size={18} />;
    default: return <Target size={18} />;
  }
}

function getHintText(el: ElementRef): string {
  if (!el.metadata) return '<unknown>';

  // Prefer human hints over internal IDs
  if (el.metadata.placeholder) return `"${el.metadata.placeholder}"`;
  if (el.metadata.title) return el.metadata.title;
  if (el.metadata.alt) return `Alt: ${el.metadata.alt}`;
  if (el.metadata.testId) return `ID: ${el.metadata.testId}`;
  return `<${el.metadata.tag}>`;
}
