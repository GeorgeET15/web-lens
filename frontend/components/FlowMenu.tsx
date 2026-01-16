
import React, { useState, useRef, useEffect } from 'react';
import { Package, ChevronDown, Download, Upload, ChevronRight, Code2, FileCode } from 'lucide-react';
import { cn } from '../lib/utils';

export type ExportFormat = 'weblens' | 'playwright-python' | 'playwright-java' | 'selenium-python' | 'selenium-java';

interface FlowMenuProps {
  onExport: (format: ExportFormat) => void;
  onImport: () => void;
  className?: string;
}

export const FlowMenu: React.FC<FlowMenuProps> = ({ 
  onExport, 
  onImport,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowExportSubmenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportFormat = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
    setShowExportSubmenu(false);
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
        <div className="absolute right-0 mt-1 w-44 bg-zinc-900 border border-white/10 rounded-md shadow-lg z-50">
          {/* Export with submenu */}
          <div 
            className="relative"
            onMouseEnter={() => setShowExportSubmenu(true)}
            onMouseLeave={() => setShowExportSubmenu(false)}
          >
            <button
              className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors flex items-center gap-2 rounded-t-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="flex-1">Export Flow</span>
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* Export Format Submenu - positioned to overlap slightly to prevent gap */}
            {showExportSubmenu && (
              <div className="absolute left-full top-0 -ml-px w-48 bg-zinc-900 border border-white/10 rounded-md shadow-lg z-[60]">
                <button
                  onClick={() => handleExportFormat('weblens')}
                  className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors flex items-center gap-2 rounded-t-md"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>WebLens</span>
                </button>
                
                {/* Playwright Section */}
                <div className="border-t border-white/5 bg-white/[0.02]">
                  <div className="px-4 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-600">
                    Playwright
                  </div>
                  <button
                    onClick={() => handleExportFormat('playwright-python')}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-blue-500/10 hover:text-blue-400 transition-colors flex items-center gap-2"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Python</span>
                  </button>
                  <button
                    onClick={() => handleExportFormat('playwright-java')}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-orange-500/10 hover:text-orange-400 transition-colors flex items-center gap-2"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Java</span>
                  </button>
                </div>

                {/* Selenium Section */}
                <div className="border-t border-white/5 bg-white/[0.02]">
                  <div className="px-4 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                    Selenium
                    <span className="text-[7px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400">WebLens</span>
                  </div>
                  <button
                    onClick={() => handleExportFormat('selenium-python')}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-blue-500/10 hover:text-blue-400 transition-colors flex items-center gap-2"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Python</span>
                  </button>
                  <button
                    onClick={() => handleExportFormat('selenium-java')}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-orange-500/10 hover:text-orange-400 transition-colors flex items-center gap-2 rounded-b-md"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Java</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              onImport();
              setIsOpen(false);
            }}
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
