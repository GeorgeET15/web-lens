import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HealingPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAttributes: string[]) => void;
  currentAttributes: Record<string, any>;
  actualAttributes: Record<string, any>;
  blockId: string;
}

export const HealingPreviewModal: React.FC<HealingPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentAttributes,
  actualAttributes,
  blockId
}) => {
  const [selectedAttrs, setSelectedAttrs] = useState<string[]>(
    Object.keys(actualAttributes).filter(key => actualAttributes[key] !== currentAttributes[key])
  );

  if (!isOpen) return null;

  const diffableKeys = ['name', 'role', 'testId', 'ariaLabel', 'placeholder', 'title', 'tagName'];
  const hasChanges = (key: string) => {
    const current = currentAttributes[key] || '';
    const actual = actualAttributes[key] || '';
    return current !== actual;
  };

  const toggleAttr = (key: string) => {
    if (selectedAttrs.includes(key)) {
      setSelectedAttrs(selectedAttrs.filter(a => a !== key));
    } else {
      setSelectedAttrs([...selectedAttrs, key]);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] w-[600px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Self-Healing Preview</h3>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5 opacity-60">BLOCK_ID: {blockId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          <p className="text-[11px] text-zinc-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4">
            The engine detected a UI drift. Select which semantic attributes to update in your test definition.
          </p>

          <div className="space-y-2">
            {diffableKeys.map(key => {
              const changed = hasChanges(key);
              const actualValue = actualAttributes[key];
              const currentValue = currentAttributes[key];

              if (!actualValue && !currentValue) return null;

              return (
                <div 
                  key={key}
                  onClick={() => changed && toggleAttr(key)}
                  className={cn(
                    "group relative p-3 rounded-xl border transition-all cursor-pointer",
                    changed 
                      ? selectedAttrs.includes(key)
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-zinc-900/50 border-white/5 opacity-50 grayscale"
                      : "bg-zinc-950 border-white/5 opacity-40 pointer-events-none"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      changed ? "text-emerald-400" : "text-zinc-500"
                    )}>
                      {key} {changed && !selectedAttrs.includes(key) && "(Skipped)"}
                    </span>
                    {changed && selectedAttrs.includes(key) && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 overflow-hidden">
                      <div className="text-[10px] text-zinc-600 font-mono truncate mb-1">CURRENT</div>
                      <div className="text-[12px] text-zinc-400 font-medium truncate">
                        {currentValue || <span className="text-zinc-700 italic">None</span>}
                      </div>
                    </div>
                    
                    <ArrowRight className={cn("w-4 h-4 flex-shrink-0 transition-colors", changed ? "text-emerald-500/50" : "text-zinc-800")} />

                    <div className="flex-1 overflow-hidden">
                      <div className="text-[10px] text-emerald-500/50 font-mono truncate mb-1">PROPOSED</div>
                      <div className="text-[12px] text-emerald-400 font-bold truncate">
                        {actualValue || <span className="text-emerald-900/50 italic">None</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <AlertCircle className="w-3 h-3" />
            <span>Healing makes your tests more resilient to CSS/DOM changes.</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(selectedAttrs)}
              disabled={selectedAttrs.length === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all border border-emerald-400/20"
            >
              Apply {selectedAttrs.length} Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
