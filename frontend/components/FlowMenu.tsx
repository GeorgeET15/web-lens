
import React, { useState, useRef, useEffect } from 'react';
import { Package, ChevronDown, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

interface FlowMenuProps {
  onExport: () => void;
  onImport: () => void;
  className?: string; // Allow positioning overrides
}

export const FlowMenu: React.FC<FlowMenuProps> = ({ 
  onExport, 
  onImport,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 group shadow-lg"
        title="Manage Flow"
      >
        <Package className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-wider">Flow</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-white/10 rounded-md shadow-lg z-50 overflow-hidden">
          <button
            onClick={() => handleAction(onExport)}
            className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="flex-1">Export Flow</span>
          </button>
          
          <button
            onClick={() => handleAction(onImport)}
            className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors flex items-center gap-2 border-t border-white/5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="flex-1">Import Flow</span>
          </button>
        </div>
      )}
    </div>
  );
};
