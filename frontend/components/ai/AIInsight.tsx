import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface AIInsightProps {
  type: 'failure' | 'inspection' | 'draft' | 'stability';
  content: string;
  roleLabel?: string;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  isLoading?: boolean;
  isCollapsible?: boolean;
}

export const AIInsight: React.FC<AIInsightProps> = ({ 
  type, 
  content, 
  roleLabel,
  isOpen: initialIsOpen = true, 
  onClose,
  className,
  isLoading,
  isCollapsible = true
}) => {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  if (!content && !isLoading) return null;

  return (
    <div className={cn(
      "rounded-lg border transition-all duration-300 overflow-hidden",
      type === 'failure' && "bg-purple-50/50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800",
      type === 'inspection' && "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-indigo-500/20",
      type === 'draft' && "bg-indigo-500/5 border-indigo-500/20 dark:bg-indigo-900/10",
      type === 'stability' && "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-900/10",
      className
    )}>
      {/* Header - Only show if collapsible or has onClose */}
      {(isCollapsible || onClose) && (
        <div 
          className={cn(
            "flex items-center gap-2 p-3 transition-colors",
            isCollapsible && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
          )}
          onClick={() => isCollapsible && setIsOpen(!isOpen)}
        >
          <div className={cn(
            "p-1.5 rounded-md",
            type === 'failure' && "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
            type === 'inspection' && "bg-indigo-500/10 text-indigo-400",
            type === 'draft' && "bg-indigo-500/20 text-indigo-300",
            type === 'stability' && "bg-emerald-500/20 text-emerald-400"
          )}>
            <Sparkles size={16} />
          </div>
          
          <div className="flex-1 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {roleLabel || "AI Analysis"}
          </div>

          {onClose && (
            <button className="h-6 w-6 flex items-center justify-center hover:bg-black/10 rounded-lg transition-colors" onClick={(e: React.MouseEvent) => {
               e.stopPropagation();
               onClose();
            }}>
              <X size={14} />
            </button>
          )}
          
          {isCollapsible && (
            isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> 
                   : <ChevronRight size={16} className="text-muted-foreground" />
          )}
        </div>
      )}

      {/* Content Area */}
      {(isOpen || !isCollapsible) && (
        <div className="px-5 pb-6 pt-1 overflow-y-auto custom-scrollbar bg-white/5 dark:bg-black/5">
          {isLoading ? (
            <div className="py-6 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 animate-pulse">
                <Sparkles size={12} className="animate-spin-slow" />
                <span>WebLens is conducting deep audit...</span>
              </div>
              <div className="space-y-3">
                <div className="h-2.5 bg-indigo-500/5 rounded-full w-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full animate-shimmer" />
                </div>
                <div className="h-2.5 bg-indigo-500/5 rounded-full w-[90%] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full animate-shimmer" />
                </div>
                <div className="h-2.5 bg-indigo-500/5 rounded-full w-[95%] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full animate-shimmer" />
                </div>
                <div className="h-2.5 bg-indigo-500/5 rounded-full w-[70%] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full animate-shimmer" />
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-foreground/90 py-2">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => (
                    <div className="mt-4 mb-2 first:mt-2">
                        <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400" {...props} />
                        <div className="h-px w-12 bg-indigo-500/30 mt-1" />
                    </div>
                  ),
                  h2: ({node, ...props}) => <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 mt-4 mb-1.5" {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 text-zinc-400 leading-[1.6] text-[12.5px]" {...props} />,
                  ul: ({node, ...props}) => <ul className="space-y-1.5 mb-5 list-none p-0" {...props} />,
                  li: ({node, ...props}) => (
                    <li className="flex gap-3 items-start group py-1" {...props}>
                        <div className="mt-2 h-1 w-1 rounded-full bg-indigo-500/40 shrink-0" />
                        <span className="text-zinc-400 text-[13px] leading-relaxed">{props.children}</span>
                    </li>
                  ),
                  strong: ({node, ...props}) => <strong className="font-semibold text-zinc-200" {...props} />,
                  code: ({node, ...props}) => (
                    <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-300/80" {...props} />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l border-zinc-700 pl-4 py-1 italic text-zinc-500 text-[12px] mb-4" {...props} />
                  )
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
