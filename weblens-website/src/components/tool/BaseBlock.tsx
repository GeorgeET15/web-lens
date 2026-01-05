import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { 
  GripVertical, 
  MousePointer2, 
  Type, 
  Eye, 
  AlertCircle, 
  Clock, 
  PlayCircle,
  Repeat,
  GitFork,
  ArrowRight,
  RefreshCw,
  Loader2,
  List,
  Upload,
  CheckCircle,
  ArrowDown,
  Save,
  FileText,
  Heading,
  Link,
  ToggleRight,
  Database,
  FileSearch,
  Zap
} from 'lucide-react';

export interface BlockData {
  id: string;
  type: string;
  label?: string;
  params?: any;
  status?: 'idle' | 'running' | 'success' | 'failed';
}

interface BaseBlockProps {
  id: string;
  block: BlockData;
  isActive?: boolean;
  onDelete?: (id: string) => void;
  isOverlay?: boolean;
  isDragging?: boolean;
}

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  open_page: <PlayCircle className="w-4 h-4 text-white" />,
  click_element: <MousePointer2 className="w-4 h-4 text-white" />,
  enter_text: <Type className="w-4 h-4 text-white" />,
  wait_until_visible: <Eye className="w-4 h-4 text-white" />,
  assert_visible: <AlertCircle className="w-4 h-4 text-white" />,
  delay: <Clock className="w-4 h-4 text-white" />,
  refresh_page: <RefreshCw className="w-4 h-4 text-white" />,
  wait_for_page_load: <Loader2 className="w-4 h-4 text-white" />,
  select_option: <List className="w-4 h-4 text-white" />,
  upload_file: <Upload className="w-4 h-4 text-white" />,
  verify_text: <CheckCircle className="w-4 h-4 text-white" />,
  scroll_to_element: <ArrowDown className="w-4 h-4 text-white" />,
  save_text: <Save className="w-4 h-4 text-white" />,
  save_page_content: <FileText className="w-4 h-4 text-white" />,
  verify_page_title: <Heading className="w-4 h-4 text-white" />,
  verify_url: <Link className="w-4 h-4 text-white" />,
  verify_element_enabled: <ToggleRight className="w-4 h-4 text-white" />,
  use_saved_value: <Database className="w-4 h-4 text-white" />,
  if_condition: <GitFork className="w-4 h-4 text-white" />,
  repeat_until: <Repeat className="w-4 h-4 text-white" />,
  verify_network_request: <Link className="w-4 h-4 text-white" />,
  verify_page_content: <FileSearch className="w-4 h-4 text-white" />,
  verify_performance: <Clock className="w-4 h-4 text-white" />,
  submit_form: <Save className="w-4 h-4 text-white" />,
  confirm_dialog: <CheckCircle className="w-4 h-4 text-white" />,
  dismiss_dialog: <AlertCircle className="w-4 h-4 text-white" />,
  activate_primary_action: <Zap className="w-4 h-4 text-white" />,
  submit_current_input: <Type className="w-4 h-4 text-white" />
};

// Interactive Input Component
const ValueInput = memo(({ value, placeholder, width = "w-[120px]" }: { value: string | undefined, placeholder: string, width?: string }) => (
    <input 
      type="text" 
      defaultValue={value} 
      placeholder={placeholder}
      className={cn(
        "px-2 py-0.5 bg-muted text-foreground rounded border border-border mx-1 inline-block font-mono text-[11px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30",
        width
      )}
      onClick={(e) => e.preventDefault()} 
      onKeyDown={(e) => e.stopPropagation()}
    />
));

// Simplified Intent Sentence Component
const IntentSentence = memo(({ block }: { block: BlockData }) => {
  const elName = block.params?.element ? (
    <span className="text-foreground font-bold px-2 py-0.5 bg-muted rounded border border-border mx-1 inline-block max-w-[150px] truncate align-bottom text-[10px] shadow-sm">
      {block.params.element}
    </span>
  ) : (
    <span className="text-muted-foreground italic px-1.5 py-0.5 bg-secondary border border-dashed border-border mx-1 inline-block">
      (pick element)
    </span>
  );

  switch (block.type) {
      case 'open_page': 
          return (
              <div className="flex items-center flex-wrap gap-y-1">
                  <span className="text-muted-foreground font-medium ml-1">Open</span>
                  <ValueInput value={block.params?.url} placeholder="https://..." width="w-[200px]" />
              </div>
          );
      case 'click_element': return <div className="flex items-center flex-wrap ml-1">Click {elName}</div>;
      case 'enter_text': return (
          <div className="flex items-center flex-wrap gap-y-1 ml-1">
              Type <ValueInput value={block.params?.text} placeholder="text..." width="w-[140px]" /> into {elName}
          </div>
      );
      case 'wait_until_visible': return <div className="flex items-center flex-wrap ml-1">Wait for {elName} to appear</div>;
      case 'wait_for_page_load': return <div className="flex items-center flex-wrap text-muted-foreground ml-1">Wait for page to load <span className="text-muted-foreground/60 mx-1">({block.params?.timeout_seconds || 30}s)</span></div>;
      case 'assert_visible': return <div className="flex items-center flex-wrap ml-1">Assert {elName} is visible</div>;
      case 'delay': return <div className="flex items-center flex-wrap text-muted-foreground ml-1">Wait for <ValueInput value={block.params?.seconds?.toString()} placeholder="0" width="w-[40px]" /> seconds</div>;
      case 'verify_text': return (
            <div className="flex items-center flex-wrap gap-y-1 ml-1">
                Verify {elName} contains <ValueInput value={block.params?.match?.value} placeholder="text..." width="w-[120px]" />
            </div>
      );
      default: return <span className="text-foreground/80 ml-1">{block.label || block.type}</span>;
  }
});

export const BaseBlock = memo(function BaseBlock({
  id,
  block,
  isActive,
  onDelete,
  isOverlay,
  isDragging: propIsDragging
}: BaseBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: hookIsDragging
  } = useSortable({ id });

  const isDragging = propIsDragging ?? hookIsDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const status = block.status || 'idle';

  const statusColors = {
      idle: "border-border bg-card shadow-sm",
      running: "border-primary/40 bg-card shadow-[0_0_30px_rgba(99,102,241,0.05)]",
      success: "border-success/30 bg-card",
      failed: "border-failure/30 bg-card shadow-[0_10px_40px_rgba(244,63,94,0.05)]"
  };

  const StatusIndicator = ({ status }: { status: string }) => {
      if (status === 'idle') return null;
      
      const labels: Record<string, string> = {
          running: 'Analyzing',
          success: 'Verified',
          failed: 'Anomaly'
      };

      return (
          <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 group-hover:translate-y-0.5 transition-all duration-300">
                  <span className={"w-1.5 h-1.5 rounded-full animate-pulse " + 
                      (status === 'running' ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 
                      status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                      'bg-rose-500 shadow-[0_0_8px_#f43f5e]')
                  } />
                  <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">{labels[status] || status}</span>
              </div>
          </div>
      );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/container relative mb-3",
        isOverlay ? "z-[1000] cursor-grabbing" : "z-10",
        isDragging && "z-[500]"
      )}
    >
      <div className={cn(
        "group relative flex flex-col p-4 py-2.5 bg-card border rounded-2xl shadow-2xl transition-all duration-200",
        block.type === 'if_condition' ? "min-w-90 w-fit" : "w-90",
        statusColors[status],
        (isActive || isOverlay) ? "ring-2 ring-primary/20 border-primary scale-[1.01] z-[50]" : "hover:border-border hover:bg-secondary z-10",
      )}>
        <div className="absolute top-2.5 right-4 z-20">
            <StatusIndicator status={status} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div 
            {...attributes} 
            {...listeners}
            className="p-1.5 rounded-md hover:bg-secondary cursor-grab active:cursor-grabbing text-muted-foreground/30 transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Icon */}
          {/* We remove the box around the icon to match the newer tool style or keep it depending on preference, but let's keep it simple */}
          {BLOCK_ICONS[block.type] || <MousePointer2 className="w-4 h-4 text-white" />}

          {/* Content */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-[13px] tracking-tight leading-relaxed select-none">
              <IntentSentence block={block} />
            </div>
          </div>

          {/* Actions */}
          {onDelete && (
             <button 
                onClick={() => onDelete(id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-secondary text-zinc-400 hover:text-foreground transition-all"
            >
                <div className="w-3.5 h-3.5 flex items-center justify-center font-mono text-[10px]">✕</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
