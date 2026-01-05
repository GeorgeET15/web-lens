import React from 'react';
import { GripVertical, MousePointer2, Type, PlayCircle, Eye, GitFork, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AuthenticBlockProps {
  type: string;
  intent: string;
  className?: string;
  status?: 'idle' | 'success' | 'failed' | 'running';
  active?: boolean;
  children?: React.ReactNode;
}

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  click: <MousePointer2 className="w-3.5 h-3.5 text-white" />,
  type: <Type className="w-3.5 h-3.5 text-white" />,
  open: <PlayCircle className="w-3.5 h-3.5 text-white" />,
  wait: <Eye className="w-3.5 h-3.5 text-white" />,
  logic: <GitFork className="w-3.5 h-3.5 text-white" />
};

export const AuthenticBlock: React.FC<AuthenticBlockProps> = ({ type, intent, className, status = 'idle', active, children }) => {
  const statusStyles = {
    idle: "border-border bg-card hover:bg-secondary",
    success: "border-emerald-500/50 bg-emerald-500/10",
    failed: "border-rose-500/50 bg-rose-500/10",
    running: "border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.05)]"
  };

  return (
    <div className={cn(
      "w-full max-w-[400px] border border-border bg-card flex flex-col transition-all duration-300 rounded-2xl", // Adjusted outer div to be the block itself
      active && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(99,102,241,0.2)]",
      className
    )}>
      <div className={`group relative flex items-center gap-3 p-3 py-2.5 transition-all duration-300 ${statusStyles[status]} w-full rounded-2xl`}> {/* Removed border and max-w from here */}
        {/* Drag Handle Mockup */}
        <div className="p-1 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/50">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="text-[12px] font-medium text-foreground/80 leading-relaxed truncate">
            {intent}
          </div>
          {status !== 'idle' && (
            <div className="ml-auto pointer-events-none">
              <span className={`text-[8px] font-black uppercase tracking-widest ${
                status === 'success' ? 'text-emerald-500' : 
                status === 'failed' ? 'text-rose-500' : 
                'text-indigo-500 animate-pulse'
              }`}>
                {status === 'running' ? 'Active' : status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Children (for branches) */}
      {children && (
        <div className="ml-8 space-y-3 relative">
          {/* Connecting Line */}
          <div className="absolute -left-4 top-0 bottom-4 w-px bg-border" />
          {children}
        </div>
      )}
    </div>
  );
};

export const AuthenticBranch: React.FC<{ type: 'then' | 'else' | 'body', children: React.ReactNode }> = ({ type, children }) => {
  const styles = {
    then: "border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-400",
    else: "border-rose-500/20 bg-rose-500/[0.02] text-rose-400",
    body: "border-indigo-500/20 bg-indigo-500/[0.02] text-indigo-400"
  };

  const icons = {
    then: <CheckCircle className="w-3 h-3" />,
    else: <XCircle className="w-3 h-3" />,
    body: <ArrowRight className="w-3 h-3" />
  };

  return (
    <div className={`flex flex-col rounded-xl border ${styles[type]} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-inherit bg-background">
        {icons[type]}
        <span className="text-[9px] font-black uppercase tracking-widest">{type}</span>
      </div>
      <div className="p-3 space-y-3">
        {children}
      </div>
    </div>
  );
};
