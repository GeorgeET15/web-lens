import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isDestructive?: boolean;
  showCancel?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  showCancel = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] w-[400px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/5 bg-black flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className={`p-1.5 rounded-lg border ${isDestructive ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                <AlertTriangle className="w-4 h-4" />
             </div>
             <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{title}</h3>
          </div>
          <button onClick={onCancel || onConfirm} className="text-zinc-600 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-[13px] text-zinc-400 leading-relaxed italic">
            "{message}"
          </p>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          {showCancel && (
            <button 
                onClick={onCancel}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5"
            >
                {cancelLabel}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
              isDestructive 
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20' 
              : 'bg-white hover:bg-zinc-200 text-black shadow-white/5'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
