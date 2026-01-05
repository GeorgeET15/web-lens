import { LucideIcon, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisualBlockProps {
  icon: LucideIcon;
  intent: string;
  type: "intent" | "success" | "failure" | "warning" | "investigation";
  active?: boolean;
  className?: string;
}

const colorMap = {
  intent: "border-primary/50 bg-card",
  success: "border-success/50 bg-card",
  failure: "border-failure/50 bg-card",
  warning: "border-warning/50 bg-card",
  investigation: "border-investigation/50 bg-card",
};

const iconColorMap = {
  intent: "text-primary",
  success: "text-emerald-400",
  failure: "text-rose-400",
  warning: "text-amber-400",
  investigation: "text-purple-400",
};

export function VisualBlock({ 
  icon: Icon, 
  intent, 
  type, 
  active,
  className 
}: VisualBlockProps) {
  return (
    <div className={cn(
      "w-[300px] border border-border bg-card flex flex-col transition-all duration-300",
      active && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(99,102,241,0.2)]",
      className
    )}>
      {/* Header Bar */}
      <div className="h-10 border-b border-border flex items-center px-3 justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3 w-3 text-muted-foreground/40" />
          <div className={cn("tech-label", iconColorMap[type])}>
            {type === 'intent' ? 'SEMANTIC_INTENT' : type.toUpperCase()}
          </div>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
      </div>

      {/* Body */}
      <div className={cn("p-4 flex items-center gap-4", colorMap[type])}>
        <div className={cn(
          "h-10 w-10 shrink-0 border border-border/50 flex items-center justify-center bg-secondary shadow-inner",
          iconColorMap[type]
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium leading-tight text-foreground/90">
          {intent}
        </p>
      </div>
    </div>
  );
}
