import { useState, useEffect } from 'react';
import { Rocket, FileText, BookTemplate } from 'lucide-react';
import { SAMPLE_FLOWS } from '../config/samples';
import { FlowGraph } from '../types/flow';

interface OnboardingModalProps {
  onDismiss: () => void;
  onLoadFlow: (flow: FlowGraph) => void;
  forceOpen?: boolean;
}

export function OnboardingModal({ onDismiss, onLoadFlow, forceOpen }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('antigravity_onboarding_seen');
    if (!seen || forceOpen) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    localStorage.setItem('antigravity_onboarding_seen', 'true');
    setIsOpen(false);
    onDismiss();
  };

  const handleSelect = (flow: FlowGraph) => {
    localStorage.setItem('antigravity_onboarding_seen', 'true');
    setIsOpen(false);
    onLoadFlow(flow);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-black border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.08)] max-w-3xl w-full mx-4 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Welcome */}
        <div className="p-8 md:w-5/12 bg-zinc-950 border-r border-white/10 flex flex-col justify-between relative overflow-hidden">
            {/* Gradient accent border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/60 via-purple-500/40 to-pink-500/60" />
            
            <div className="space-y-6 relative z-10">
                {/* Icon with gradient background */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shadow-lg border border-indigo-500/30">
                    <Rocket className="text-indigo-300 w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-3 uppercase">
                        Welcome to<br/>Zero-Code Testing
                    </h2>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                        Build robust web automation flows without writing a single line of code.
                    </p>
                </div>
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-indigo-400/60" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pick elements visually</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-purple-400/60" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-2">
                            Semantic AI resolution
                            <span className="px-1 py-0.5 rounded bg-zinc-900 border border-white/5 text-[7px] font-bold text-zinc-400">
                                EXPERIMENTAL
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-pink-400/60" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Auto-save & persistence</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleDismiss} 
                className="mt-8 text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-indigo-300 transition-colors text-left flex items-center gap-2 group"
            >
                Start from scratch
                <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
        </div>

        {/* Right: Samples */}
        <div className="p-8 md:w-7/12 bg-black flex flex-col">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                <BookTemplate className="w-3.5 h-3.5 text-indigo-400/60" />
                Start with a template
            </h3>
            <div className="space-y-2.5 flex-1 overflow-y-auto">
                {SAMPLE_FLOWS.map((flow, idx) => (
                    <button 
                        key={idx}
                        onClick={() => handleSelect(flow)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-indigo-500/30 transition-all group text-left"
                    >
                        <div className="p-2 rounded bg-black text-zinc-500 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-500 group-hover:text-white transition-all border border-white/5 group-hover:border-indigo-400/50 shadow-inner">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-zinc-300 group-hover:text-white text-[11px] uppercase tracking-wider">{flow.name}</div>
                            <div className="text-[9px] text-zinc-600 group-hover:text-indigo-400/70 mt-1 font-bold uppercase tracking-wider transition-colors">{flow.blocks.length} steps · Ready to run</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}
