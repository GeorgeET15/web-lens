import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface DownloadDropdownProps {
  runId?: string;
  suiteId?: string;
  type: 'execution' | 'suite';
  className?: string;
}

export const DownloadDropdown: React.FC<DownloadDropdownProps> = ({ 
  runId, 
  suiteId, 
  type,
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

  const handleDownload = (format: 'json' | 'html' | 'pdf') => {
    const baseUrl = type === 'execution' 
      ? `/api/executions/${runId}/report/${format}`
      : `/api/scenarios/suite/${suiteId}/report/${format}`;
    
    window.open(baseUrl, '_blank');
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
      >
        <Download className="w-3 h-3" />
        Download
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-white/10 rounded-md shadow-lg z-50 overflow-hidden">
          <button
            onClick={() => handleDownload('json')}
            className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors flex items-center gap-2"
          >
            <span className="text-[8px] text-zinc-600">JSON</span>
            <span className="flex-1">Compact Data</span>
          </button>
          <button
            onClick={() => handleDownload('html')}
            className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-blue-500/10 hover:text-blue-400 transition-colors flex items-center gap-2 border-t border-white/5"
          >
            <span className="text-[8px] text-zinc-600">HTML</span>
            <span className="flex-1">Web View</span>
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-rose-500/10 hover:text-rose-400 transition-colors flex items-center gap-2 border-t border-white/5"
          >
            <span className="text-[8px] text-zinc-600">PDF</span>
            <span className="flex-1">Print Ready</span>
          </button>
        </div>
      )}
    </div>
  );
};
