import React from 'react';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: LucideIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  children?: React.ReactNode;
  maxWidth?: string;
}

export const BaseDialog: React.FC<BaseDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  isDestructive = false,
  children,
  maxWidth = 'w-[450px]'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={cn(
        "bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200",
        maxWidth
      )}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-black flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className={cn(
               "p-1.5 rounded-lg border",
               isDestructive 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
             )}>
                <Icon className="w-4 h-4" />
             </div>
             <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-[13px] text-zinc-400 leading-relaxed italic">
            "{description}"
          </p>
          {children && <div className="mt-4">{children}</div>}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={onClose}
                className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 active:scale-[0.98]"
            >
                {cancelLabel}
            </button>
            <button 
                onClick={onConfirm}
                className={cn(
                  "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98]",
                  isDestructive 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20' 
                    : 'bg-white hover:bg-zinc-200 text-black shadow-white/5'
                )}
            >
                {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
