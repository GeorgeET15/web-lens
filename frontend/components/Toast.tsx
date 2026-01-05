
import React, { useEffect } from 'react';
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    info: <Info className="w-4 h-4 text-blue-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl min-w-[320px] max-w-md animate-in slide-in-from-right-8 duration-300">
      <div className="flex-none w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
         <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">{toast.type}</p>
         <p className="text-[12px] text-zinc-200 font-medium leading-relaxed">{toast.message}</p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="flex-none p-2 hover:bg-white/5 rounded-lg transition-colors group"
      >
        <X className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: Toast[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-10 right-10 z-[1000] flex flex-col gap-3">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};
