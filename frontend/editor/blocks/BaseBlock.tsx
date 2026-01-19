import React, { useState, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  PlayCircle, 
  MousePointer2, 
  Type, 
  Eye, 
  Camera,
  AlertCircle, 
  ArrowRight, 
  Clock, 
  RefreshCw, 
  Loader2, 
  List, 
  Upload, 
  CheckCircle, 
  XCircle,
  ArrowDown, 
  ArrowUpToLine,
  Save, 
  Heading, 
  Link, 
  ToggleRight, 
  Database, 
  Zap,
  FileSearch,
  FileText,
  GitFork,
  Repeat,
  Plus,
  Search,
  ExternalLink,
  HardDrive,
  Cpu,
  Activity,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';
import { EditorBlock, SavedValue, BlockType } from '../entities';
import { ElementRef } from '../../types/element';
import { ElementPicker } from '../../components/ElementPicker';
import { ConditionSelector } from './ConditionSelector';
import { VariableInput } from '../../components/VariableInput';
import { DEFAULT_BLOCKS } from '../constants';

export interface BaseBlockProps {
  id: string;
  block: EditorBlock;
  isActive?: boolean;
  status?: 'idle' | 'running' | 'success' | 'failed';
  message?: string;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<EditorBlock>) => void;
  onRequestPick?: (blockType: string, callback: (element: ElementRef) => void) => void;
  onAddBlock?: (type: BlockType, parentId?: string, branchKey?: 'then' | 'else' | 'body') => void;
  savedValues?: SavedValue[];
  // Data-Driven rendering props
  blocks?: EditorBlock[];
  renderBlockList?: (args: { parentId: string, branchKey?: string }) => React.ReactNode;
  
  // Legacy children prop removal (optional, but good for type safety)
  children?: never; 

  branchKey?: string;
  onMoveToBranch?: (id: string, parentId?: string, branchKey?: 'then' | 'else' | 'body') => void;
  availableBranches?: { id: string, label: string, type: string }[];
  onClick?: () => void;
  isSnapped?: boolean;
  snapType?: 'bottom' | 'then' | 'else' | 'body';
  isHighlighted?: boolean;
  selectionExists?: boolean;
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
  submit_current_input: <Type className="w-4 h-4 text-white" />,
  get_cookies: <Database className="w-4 h-4 text-white" />,
  get_local_storage: <HardDrive className="w-4 h-4 text-white" />,
  get_session_storage: <Cpu className="w-4 h-4 text-white" />,
  observe_network: <Activity className="w-4 h-4 text-white" />,
  switch_tab: <ExternalLink className="w-4 h-4 text-white" />,
  visual_verify: <Camera className="w-4 h-4 text-white" />,
  ai_prompt: <Sparkles className="w-4 h-4 text-indigo-400" />
};

export { BLOCK_ICONS };

// Helper component to render children blocks for a specific branch
// Helper component to render children blocks for a specific branch
const BranchChildrenRenderer: React.FC<{
  blocks?: EditorBlock[];
  parentId: string;
  renderBlockList?: (args: { parentId: string, branchKey?: string }) => React.ReactNode;
  branchKey: 'then' | 'else' | 'body';
  emptyMessageColor: 'zinc' | 'blue' | 'emerald' | 'rose';
}> = ({ blocks = [], parentId, renderBlockList, branchKey, emptyMessageColor }) => {
    
  const hasChildren = blocks.some(b => b.parentId === parentId && b.branchKey === branchKey);

  // Static Tailwind class mapping to avoid dynamic class generation
  const colorMap: Record<string, string> = {
    zinc: 'text-zinc-500',
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500'
  };

  return (
    <>
      {renderBlockList?.({ parentId, branchKey })}
      {!hasChildren && (
        <div className="h-full flex items-center justify-center py-2 opacity-30 select-none">
          <ArrowRight className={cn("w-3 h-3", colorMap[emptyMessageColor])} />
        </div>
      )}
    </>
  );
};
// Searchable Block Picker Dropdown
const BlockPickerDropdown: React.FC<{
    onSelect: (type: BlockType) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    
    const filteredBlocks = Object.keys(DEFAULT_BLOCKS).filter(type => 
        DEFAULT_BLOCKS[type as BlockType].label.toLowerCase().includes(search.toLowerCase())
    ) as BlockType[];

    return (
        <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-2 z-[9999] w-64 bg-zinc-950 border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
        >
            {/* Search Bar */}
            <div className="p-3 border-b border-white/5 bg-white/5">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input 
                        autoFocus
                        type="text"
                        placeholder="Search blocks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                    />
                </div>
            </div>
            {/* List */}
            <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
                {filteredBlocks.length > 0 ? filteredBlocks.map((type) => (
                    <button
                        key={type}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(type);
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-zinc-400 hover:bg-white hover:text-black transition-all rounded-lg font-black uppercase tracking-wider group"
                    >
                        <div className="p-1.5 rounded bg-zinc-900 group-hover:bg-black/10 transition-colors">
                            {React.cloneElement(BLOCK_ICONS[type] as React.ReactElement, { className: 'w-3.5 h-3.5 text-zinc-500 group-hover:text-black' })}
                        </div>
                        {DEFAULT_BLOCKS[type].label}
                    </button>
                )) : (
                    <div className="p-8 text-center">
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">No blocks found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Memoized outside of component to prevent recreation
const ValueText = memo(({ value, placeholder }: { value: string | undefined, placeholder: string }) => (
    <span className={cn(
        "px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20 mx-1 inline-block font-mono max-w-[200px] truncate align-bottom",
        !value && "text-zinc-500 italic bg-white/5 border-white/5"
    )}>
        {value ? `"${value}"` : placeholder}
    </span>
));

// Memoized Intent Sentence Component
const IntentSentence = memo(({ block }: { block: EditorBlock }) => {
    const elName = block.params.element?.name ? (
        <span className="text-zinc-100 font-bold px-1.5 py-0.5 bg-white/5 rounded border border-white/5 mx-1 inline-block max-w-[150px] truncate align-bottom">
            "{block.params.element.name}"
        </span>
    ) : (
        <span className="text-zinc-500 italic px-1.5 py-0.5 bg-white/5 rounded border border-dashed border-white/10 mx-1 inline-block">
            (pick element)
        </span>
    );

    switch (block.type) {
        case 'open_page': 
            return (
                <div className="flex items-center flex-wrap gap-y-1">
                    <span className="text-zinc-400">Open</span>
                    <ValueText value={block.params.url} placeholder="https://..." />
                </div>
            );
        case 'click_element': return <div className="flex items-center flex-wrap">Click {elName}</div>;
        case 'enter_text': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Type <ValueText value={block.params.text} placeholder="text..." /> into {elName}
            </div>
        );
        case 'wait_until_visible': return <div className="flex items-center flex-wrap">Wait for {elName} to appear</div>;
        case 'wait_for_page_load': return <div className="flex items-center flex-wrap text-zinc-400">Wait for page to load <span className="text-zinc-500 mx-1">({block.params.timeout_seconds || 30}s)</span></div>;
        case 'assert_visible': return <div className="flex items-center flex-wrap">Assert {elName} is visible</div>;
        case 'select_option': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Select <ValueText value={block.params.option_text} placeholder="option..." /> from {elName}
            </div>
        );
        case 'verify_text':
            const vMode = block.params.match?.mode || 'equals';
            return (
                <div className="flex items-center flex-wrap gap-y-1">
                    Verify {elName} {vMode} <ValueText value={block.params.match?.value} placeholder="value..." />
                </div>
            );
        case 'verify_page_title': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Verify page title is <ValueText value={block.params.title} placeholder="title..." />
            </div>
        );
        case 'verify_url': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Verify URL contains <ValueText value={block.params.url_part} placeholder="url part..." />
            </div>
        );
        case 'verify_element_enabled': {
            const shouldBe = block.params.should_be_enabled !== false;
            return (
                <div className="flex items-center flex-wrap gap-y-1">
                    Verify {elName} is <span className={shouldBe ? 'text-emerald-400' : 'text-rose-400'}>{shouldBe ? 'Enabled' : 'Disabled'}</span>
                </div>
            )
        }
        case 'save_text': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Save text from {elName} as <ValueText value={block.params.save_as?.label} placeholder="variable..." />
            </div>
        );
        case 'if_condition': 
            return (
                <div className="flex items-center flex-wrap gap-y-1">
                    <span className="text-indigo-400 font-black tracking-tighter mr-2 italic">IF</span>
                    <span className="text-zinc-400">{block.params.condition?.kind?.replace(/_/g, ' ') || 'condition'}</span>
                </div>
            );
        case 'repeat_until':
            return (
                <div className="flex items-center flex-wrap gap-y-1">
                    <span className="text-indigo-400 font-black tracking-tighter mr-2 italic">REPEAT UNTIL</span>
                    <span className="text-zinc-400">{block.params.condition?.kind?.replace(/_/g, ' ') || 'condition'}</span>
                </div>
            );
        case 'delay': return <div className="flex items-center flex-wrap text-zinc-400">Wait for <ValueText value={block.params.seconds?.toString()} placeholder="0" /> seconds</div>;
        case 'submit_current_input': return <div className="flex items-center flex-wrap">Submit {elName}</div>;
        case 'refresh_page': return <div className="flex items-center flex-wrap text-zinc-400">Refresh the current page</div>;
        case 'upload_file': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Upload <ValueText value={block.params.file?.name} placeholder="file..." /> to {elName}
            </div>
        );
        case 'scroll_to_element': return <div className="flex items-center flex-wrap">Scroll to {elName}</div>;
        case 'save_page_content': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Save entire page content as <ValueText value={block.params.save_as?.label} placeholder="variable..." />
            </div>
        );
        case 'verify_network_request': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Verify {block.params.method || 'ANY'} request to <ValueText value={block.params.url_pattern} placeholder="/pattern" />
            </div>
        );
        case 'submit_form': return <div className="flex items-center flex-wrap">Submit form {elName}</div>;
        case 'confirm_dialog': return <div className="flex items-center flex-wrap text-zinc-400 italic">Accept next system dialog</div>;
        case 'dismiss_dialog': return <div className="flex items-center flex-wrap text-zinc-500 italic">Dismiss next system dialog</div>;
        case 'activate_primary_action': return <div className="flex items-center flex-wrap text-indigo-400 font-bold">Trigger primary page action</div>;
        case 'verify_page_content': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Verify page contains <ValueText value={block.params.match?.value} placeholder="text..." />
            </div>
        );
        case 'get_cookies': return <div className="flex items-center flex-wrap text-zinc-400">Capture all cookies</div>;
        case 'get_local_storage': return <div className="flex items-center flex-wrap text-zinc-400">Capture Local Storage</div>;
        case 'get_session_storage': return <div className="flex items-center flex-wrap text-zinc-400">Capture Session Storage</div>;
        case 'observe_network': return <div className="flex items-center flex-wrap text-zinc-400 italic">Enable Network Observation</div>;
        case 'verify_performance': {
            const isCount = block.params.metric === 'network_requests';
            return (
                <div className="flex items-center flex-wrap gap-y-1">
                    Verify <span className="text-zinc-400 mx-1">{block.params.metric?.replace(/_/g, ' ') || 'performance'}</span> &lt; <ValueText value={block.params.threshold_ms?.toString()} placeholder="2000" /> {isCount ? 'requests' : 'ms'}
                </div>
            );
        }
        case 'switch_tab': return (
            <div className="flex items-center flex-wrap text-zinc-400">
                Switch to {block.params.to_newest ? 'Newest Tab' : `Tab #${block.params.tab_index}`}
            </div>
        );
        case 'visual_verify': return (
            <div className="flex items-center flex-wrap gap-y-1">
                Visual check against <ValueText value={block.params.baseline_id} placeholder="baseline..." /> 
                <span className="text-zinc-600 mx-1">(threshold: {(block.params.threshold * 100).toFixed(0)}%)</span>
            </div>
        );
        case 'ai_prompt': return (
            <div className="flex items-center flex-wrap gap-y-1">
                <span className="text-indigo-400 font-bold mr-2">AI:</span>
                <ValueText value={block.params.prompt} placeholder="Describe action..." />
            </div>
        );
        default: return <span className="text-zinc-200">{block.label}</span>;
    }
});

// Internal Content Component - HEAVY UI
const BaseBlockContent = memo(function BaseBlockContent({
    id,
    block,
    isActive,
    status = 'idle',
    onDelete,
    onDuplicate,
    onUpdate,
    onAddBlock,
    onRequestPick,
    savedValues,
    branchKey,
    onMoveToBranch,
    availableBranches,
    blocks,
    renderBlockList,
    // Dnd Props passed from Shell
    dragListeners,
    isOverlay,
    onClick,
    isSnapped,
    snapType,
    isHighlighted,
    isDragging
}: BaseBlockProps & {
    dragListeners?: Record<string, any>;
    isOverlay?: boolean;
    isDragging?: boolean;
}) {
    const statusColors = {
        idle: "border-zinc-800/50 bg-zinc-950",
        running: "border-indigo-500/50 bg-zinc-950 shadow-[0_0_30px_rgba(99,102,241,0.1)]",
        success: "border-emerald-500/50 bg-zinc-950",
        failed: "border-rose-500/50 bg-zinc-950 shadow-[0_10px_40px_rgba(244,63,94,0.1)]"
    };


    const [isPicking, setIsPicking] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingToBranch, setIsAddingToBranch] = useState<'then' | 'else' | 'body' | null>(null);

    const handlePick = () => {
        if (onRequestPick) {
            onRequestPick(block.type, (element: ElementRef) => {
                onUpdate?.(id, { params: { ...block.params, element } });
                setIsPicking(false);
            });
        } else {
            // Fallback if onRequestPick not provided
            setIsPicking(true);
            setIsEditing(false);
        }
    };

    return (
        <div
            // ref, style, attributes are handled by Shell
            data-block-id={id}
            className={cn(
                "group/container flex flex-col",
                isOverlay ? "z-[1000]" : (isDragging ? "z-[500]" : (isActive ? "z-30" : "z-10")),
                !block.position && "relative"
            )}
            onClick={(e) => {
                // Only stop propagation if not clicking interactive elements
                const target = e.target as HTMLElement;
                if (!target.closest('button, input, select, textarea, a')) {
                    e.stopPropagation();
                    onClick?.();
                }
            }}
        >
            {/* Main Block Container */}
            <div className={cn(
                "group relative flex flex-col p-4 py-2.5 bg-zinc-950 border rounded-2xl shadow-2xl transition-colors duration-200",
                (block.type === 'if_condition' || block.type === 'repeat_until') ? "min-w-[480px] w-fit" : "w-90",
                statusColors[status],
                (isActive || isOverlay || isDragging) ? "ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.01] z-[50]" : "hover:border-white/10 hover:bg-zinc-900 z-10",
                isSnapped && "ring-4 ring-indigo-500/30 border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.2)]",
                isHighlighted && "border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/10"
            )}>

                {/* Header */}
                <div className="flex items-center gap-3">
                    {/* Drag Handle - Attached listeners here */}
                    <div 
                        {...dragListeners}
                        className="p-1.5 rounded-md hover:bg-white/5 cursor-grab active:cursor-grabbing text-gray-600 transition-colors"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Icon & Title */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="text-[13px] tracking-tight leading-relaxed">
                            <IntentSentence block={block} />
                        </div>
                        {branchKey && (
                            <span className={`flex-none text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.2em] border ml-2 ${
                                branchKey === 'then' ? 'bg-white text-black border-white' : 
                                branchKey === 'else' ? 'bg-zinc-800 text-white border-white/20' :
                                'bg-black text-white border-white'
                            }`}>
                                {branchKey}
                            </span>
                        )}
                    </div>


                    {/* Actions */}
                    <div className={`flex items-center gap-1 transition-all duration-300 ${isOverlay ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'}`}>
                        {/* Branching / Move Out Button */}
                        {block.parentId ? (
                            <button 
                                onClick={() => onMoveToBranch?.(id, undefined, undefined)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                title="Move to root"
                            >
                                <ArrowUpToLine className="w-4 h-4" />
                            </button>
                        ) : (
                            availableBranches && availableBranches.length > 0 && (
                                <div className="relative group/branch">
                                    <button 
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <GitFork className="w-4 h-4" />
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-zinc-950 border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/branch:opacity-100 group-hover/branch:visible transition-all scale-95 group-hover/branch:scale-100 origin-top-right">
                                        <div className="p-2 space-y-1">
                                            <div className="px-3 py-1 text-[9px] text-zinc-600 uppercase font-black tracking-widest border-b border-white/5 mb-1">Target Branch</div>
                                            {availableBranches.map(branch => (
                                                <div key={branch.id} className="p-1">
                                                    <div className="px-2 py-0.5 text-[8px] text-zinc-500 font-bold italic">{branch.label}</div>
                                                    {branch.type === 'if_condition' ? (
                                                        <div className="flex gap-1 mt-1">
                                                            <button 
                                                                onClick={() => onMoveToBranch?.(id, branch.id, 'then')}
                                                                className="flex-1 px-2 py-1.5 text-[10px] bg-emerald-500/5 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-md border border-emerald-500/10 transition-all text-center font-bold"
                                                            >
                                                                THEN
                                                            </button>
                                                            <button 
                                                                onClick={() => onMoveToBranch?.(id, branch.id, 'else')}
                                                                className="flex-1 px-2 py-1.5 text-[10px] bg-rose-500/5 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/20 rounded-md border border-rose-500/10 transition-all text-center font-bold"
                                                            >
                                                                ELSE
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => onMoveToBranch?.(id, branch.id, 'body')}
                                                            className="w-full mt-1 px-2 py-1.5 text-[10px] bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md border border-white/5 transition-all text-center font-bold"
                                                        >
                                                            BODY
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        <button 
                            onClick={() => onDuplicate?.(id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            title="Duplicate"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => onDelete?.(id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-all"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content / Inputs */}
                <div className="pl-8 pr-1 space-y-2 group-focus-within:block transition-all duration-300">
            {block.type === 'open_page' && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono w-12">URL</span>
                    <VariableInput 
                        value={block.params.url || ''}
                        onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, url: val } })}
                        savedValues={savedValues}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-zinc-500 focus:border-white/20 transition-all"
                        placeholder="https://example.com"
                    />
                </div>
            )}

            {(block.type === 'click_element' || block.type === 'wait_until_visible' || block.type === 'assert_visible') && (
                <>
                <ElementPicker 
                    value={block.params.element} 
                    placeholder={
                        block.type === 'click_element' ? "Pick element to click" : 
                        block.type === 'wait_until_visible' ? "Pick element to wait for" :
                        "Pick element to assert visible"
                    }
                    isPicking={isPicking}
                    isEditing={isEditing}
                    onEditChange={setIsEditing}
                    onStartPicking={handlePick}
                    onStopPicking={() => setIsPicking(false)}
                    onChange={(el) => onUpdate?.(id, { 
                        params: { 
                            ...block.params, 
                            element: el 
                        } 
                    })}
                />
                {block.type === 'wait_until_visible' && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono w-12">Timeout</span>
                        <div className="flex-1 flex items-center gap-2">
                            <input 
                                type="number"
                                min="1"
                                max="60"
                                value={block.params.timeout_seconds || 10}
                                onChange={(e) => onUpdate?.(id, { params: { ...block.params, timeout_seconds: parseInt(e.target.value) } })}
                                className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Seconds</span>
                        </div>
                    </div>
                )}
                </>
            )}
            
            {block.type === 'visual_verify' && (
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono w-16">Baseline</span>
                        <VariableInput 
                            value={block.params.baseline_id || ''}
                            onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, baseline_id: val } })}
                            savedValues={savedValues}
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-indigo-300 focus:border-indigo-500/50 transition-all"
                            placeholder="Snapshot ID (e.g. login_page)"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tolerance Threshold</span>
                            <span className="text-[10px] text-indigo-400 font-mono">{(block.params.threshold * 100).toFixed(0)}% Diff</span>
                        </div>
                        <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={block.params.threshold || 0.1}
                            onChange={(e) => onUpdate?.(id, { params: { ...block.params, threshold: parseFloat(e.target.value) } })}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                         <div className="flex justify-between px-1 text-[8px] text-zinc-600 font-bold">
                            <span>STRICT</span>
                            <span>LOOSE</span>
                        </div>
                    </div>
                </div>
            )}

            {block.type === 'ai_prompt' && (
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-indigo-400 font-mono font-bold tracking-widest uppercase">Instruction</span>
                    <div className="flex-1">
                         <VariableInput 
                            value={block.params.prompt || ''}
                            onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, prompt: val } })}
                            savedValues={savedValues}
                            className="w-full bg-black/40 border border-indigo-500/20 rounded px-3 py-2 text-sm text-white focus:border-indigo-500/50 transition-all font-medium leading-relaxed min-h-[80px]"
                            placeholder="e.g. Find the cheapest coffee maker and click 'Add to Cart'..."
                        />
                    </div>
                </div>
            )}

            {block.type === 'enter_text' && (
                <>
                <ElementPicker 
                    value={block.params.element}
                    placeholder="Pick input field"
                    isPicking={isPicking}
                    isEditing={isEditing}
                    onEditChange={setIsEditing}
                    onStartPicking={handlePick}
                    onStopPicking={() => setIsPicking(false)}
                    onChange={(el) => onUpdate?.(id, { 
                        params: { 
                            ...block.params, 
                            element: el 
                        } 
                    })}
                />
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono w-12">Value</span>
                    <div className="flex-1 space-y-1">
                        <VariableInput 
                            value={block.params.text || ''}
                            onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, text: val } })}
                            savedValues={savedValues}
                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                            placeholder="Text to enter"
                        />
                         <div className="text-[9px] text-zinc-600 px-1 flex items-center justify-between">
                             <div className="flex items-center gap-1">
                                 <Database className="w-2.5 h-2.5" />
                                 <span>Type <code className="text-white">{"{{"}</code> for suggestions</span>
                             </div>
                             <button
                                 onClick={() => onUpdate?.(id, { params: { ...block.params, clear_first: !block.params.clear_first } })}
                                 className={cn(
                                     "flex items-center gap-1 px-1.5 py-0.5 rounded transition-all border",
                                     block.params.clear_first 
                                         ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                                         : "bg-white/5 border-white/5 text-zinc-600 hover:text-zinc-500"
                                 )}
                             >
                                 <div className={cn(
                                     "w-1 h-1 rounded-full",
                                     block.params.clear_first ? "bg-indigo-400 animate-pulse" : "bg-zinc-600"
                                 )} />
                                 <span className="uppercase font-bold tracking-tighter">Clear First</span>
                             </button>
                         </div>
                    </div>
                </div>
                </>
            )}

            {/* If Condition UI - Redesigned */}
            {block.type === 'if_condition' && (
                <div className="space-y-5 pt-2">
                    <ConditionSelector
                        condition={block.params.condition}
                        onChange={(condition) => onUpdate?.(id, { params: { ...block.params, condition } })}
                        onRequestPick={onRequestPick}
                        savedValues={savedValues}
                    />
                    <div className="flex flex-col gap-3 relative">
                        {/* THEN Branch */}
                        <div className={cn(
                            "flex flex-col h-full rounded-lg border transition-all duration-300",
                            snapType === 'then' 
                                ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-[1.02]" 
                                : "border-emerald-500/20 bg-emerald-950/10"
                        )}>
                            {/* Header */}
                             <div className={cn(
                                 "flex items-center justify-between p-2 pl-3 border-b transition-colors",
                                 snapType === 'then' ? "bg-emerald-500/30 border-emerald-400" : "bg-emerald-950/30 border-emerald-500/20"
                             )}>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className={cn("w-3.5 h-3.5", snapType === 'then' ? "text-white" : "text-emerald-500")} />
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", snapType === 'then' ? "text-white" : "text-emerald-400")}>Then</span>
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAddingToBranch(isAddingToBranch === 'then' ? null : 'then');
                                        }}
                                        className={cn(
                                            "p-1 px-1.5 rounded transition-all",
                                            isAddingToBranch === 'then' ? "bg-emerald-500 text-white" : "hover:bg-emerald-500/20 text-emerald-500/50 hover:text-emerald-400"
                                        )}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                     {isAddingToBranch === 'then' && (
                                         <BlockPickerDropdown 
                                            onSelect={(type) => onAddBlock?.(type, id, 'then')} 
                                            onClose={() => setIsAddingToBranch(null)} 
                                         />
                                     )}
                                </div>
                             </div>
                             {/* Content */}
                             <div className="p-4 bg-black/10 min-h-[80px] transition-all">
                                <BranchChildrenRenderer 
                                    blocks={blocks}
                                    parentId={id}
                                    branchKey="then"
                                    renderBlockList={renderBlockList}
                                    emptyMessageColor="emerald"
                                />
                             </div>
                        </div>

                        {/* ELSE Branch */}
                        <div className={cn(
                            "flex flex-col h-full rounded-lg border transition-all duration-300",
                            snapType === 'else' 
                                ? "border-rose-400 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)] scale-[1.02]" 
                                : "border-rose-500/20 bg-rose-950/10"
                        )}>
                             {/* Header */}
                             <div className={cn(
                                 "flex items-center justify-between p-2 pl-3 border-b transition-colors",
                                 snapType === 'else' ? "bg-rose-500/30 border-rose-400" : "bg-rose-950/30 border-rose-500/20"
                             )}>
                                <div className="flex items-center gap-2">
                                    <XCircle className={cn("w-3.5 h-3.5", snapType === 'else' ? "text-white" : "text-rose-500")} />
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", snapType === 'else' ? "text-white" : "text-rose-400")}>Else</span>
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAddingToBranch(isAddingToBranch === 'else' ? null : 'else');
                                        }}
                                        className={cn(
                                            "p-1 px-1.5 rounded transition-all",
                                            isAddingToBranch === 'else' ? "bg-rose-500 text-white" : "hover:bg-rose-500/20 text-rose-500/50 hover:text-rose-400"
                                        )}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                     {isAddingToBranch === 'else' && (
                                         <BlockPickerDropdown 
                                            onSelect={(type) => onAddBlock?.(type, id, 'else')} 
                                            onClose={() => setIsAddingToBranch(null)} 
                                         />
                                     )}
                                </div>
                             </div>
                             {/* Content */}
                             <div className="p-4 bg-black/10 min-h-[80px] transition-all">
                                <BranchChildrenRenderer 
                                    blocks={blocks}
                                    parentId={id}
                                    branchKey="else"
                                    renderBlockList={renderBlockList}
                                    emptyMessageColor="rose"
                                />
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Repeat Until UI */}
            {block.type === 'repeat_until' && (
                <div className="space-y-4">
                    <ConditionSelector
                        condition={block.params.condition}
                        onChange={(condition) => onUpdate?.(id, { params: { ...block.params, condition } })}
                        onRequestPick={onRequestPick}
                        savedValues={savedValues}
                    />
                    
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-400">Max Attempts</label>
                        <select
                            value={block.params.max_iterations || 10}
                            onChange={(e) => onUpdate?.(id, { params: { ...block.params, max_iterations: parseInt(e.target.value) } })}
                            className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 focus:outline-none transition-all"
                        >
                            <option value={5}>Short (5 attempts)</option>
                            <option value={10}>Normal (10 attempts)</option>
                            <option value={20}>Patient (20 attempts)</option>
                            <option value={50}>Persistent (50 attempts)</option>
                        </select>
                    </div>

                    <div className="space-y-2 pt-2">
                         <div className={cn(
                             "p-1 px-2 rounded border flex items-center justify-between group/branch-header transition-all duration-300",
                             snapType === 'body' 
                                ? "bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-[1.01]" 
                                : "bg-blue-950/30 border-blue-500/20"
                         )}>
                            <span className={cn("text-[10px] font-bold uppercase tracking-tight", snapType === 'body' ? "text-white" : "text-blue-400")}>LOOP BODY</span>
                            <div className="relative">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAddingToBranch(isAddingToBranch === 'body' ? null : 'body');
                                    }}
                                    className={cn(
                                        "p-0.5 rounded transition-all",
                                        isAddingToBranch === 'body' ? "bg-blue-500 text-white" : "hover:bg-blue-500/20 text-blue-500"
                                    )}
                                    title="Add block to LOOP BODY"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                                {isAddingToBranch === 'body' && (
                                     <BlockPickerDropdown 
                                        onSelect={(type) => onAddBlock?.(type, id, 'body')} 
                                        onClose={() => setIsAddingToBranch(null)} 
                                     />
                                 )}
                            </div>
                        </div>
                        <div className="p-4 bg-black/10 min-h-[80px] transition-all">
                            <BranchChildrenRenderer 
                                blocks={blocks}
                                parentId={id}
                                branchKey="body"
                                renderBlockList={renderBlockList}
                                emptyMessageColor="blue"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Delay Input */}
            {block.type === 'delay' && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seconds to Wait</label>
                    <input 
                        type="number"
                        min="0"
                        step="0.1" 
                        value={block.params.seconds || 0}
                        onChange={(e) => onUpdate?.(id, { params: { ...block.params, seconds: parseFloat(e.target.value) } })}
                        className="w-full bg-gray-950 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-500 transition-colors"
                    />
                </div>
            )}

            {/* Wait For Page Load Input */}
            {block.type === 'wait_for_page_load' && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeout (Seconds)</label>
                    <input 
                        type="number"
                        min="1"
                        value={block.params.timeout_seconds || 15}
                        onChange={(e) => onUpdate?.(id, { params: { ...block.params, timeout_seconds: parseInt(e.target.value) } })}
                        className="w-full bg-gray-950 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-white transition-all"
                    />
                </div>
            )}

            {/* Select Option Block */}
            {block.type === 'select_option' && (
            <>
                <ElementPicker 
                value={block.params.element}
                placeholder="Pick dropdown element"
                isPicking={isPicking}
                isEditing={isEditing}
                onEditChange={setIsEditing}
                onStartPicking={handlePick}
                onStopPicking={() => setIsPicking(false)}
                onChange={(el) => onUpdate?.(id, { 
                    params: { 
                    ...block.params, 
                    element: el 
                    } 
                })}
                />
                <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">Option</span>
                <VariableInput 
                    value={block.params.option_text || ''}
                    onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, option_text: val } })}
                    savedValues={savedValues}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    placeholder="Exact option text"
                />
                </div>
            </>
            )}

            {/* Upload File Block */}
            {block.type === 'upload_file' && (
            <>
                <ElementPicker 
                    value={block.params.element}
                    placeholder="Pick file input"
                    isPicking={isPicking}
                    isEditing={isEditing}
                    onEditChange={setIsEditing}
                    onStartPicking={handlePick}
                    onStopPicking={() => setIsPicking(false)}
                    onChange={(el) => onUpdate?.(id, { 
                        params: { 
                        ...block.params, 
                        element: el 
                        } 
                    })}
                />
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono w-12">File</span>
                    <div className="flex-1 flex items-center gap-2">
                         <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded transition-colors group/upload hover:border-white/20">
                            <Upload className="w-3.5 h-3.5 text-zinc-400 group-hover/upload:text-white" />
                            <span className="text-xs font-medium text-zinc-400 group-hover/upload:text-white transition-colors">
                                {block.params.file?.name ? 'Change File' : 'Select File'}
                            </span>
                            <input 
                                type="file" 
                                className="hidden" 
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const formData = new FormData();
                                    formData.append('file', file);

                                    try {
                                        const res = await api.fetch('/api/assets/upload', {
                                            method: 'POST',
                                            body: formData
                                        });
                                        
                                        if (!res.ok) throw new Error('Upload failed');
                                        
                                        const data = await res.json();
                                        
                                        onUpdate?.(id, {
                                            params: {
                                                ...block.params,
                                                file: {
                                                    id: data.id,
                                                    name: data.name,
                                                    source: 'local'
                                                }
                                            }
                                        });
                                    } catch (err) {
                                        console.error("Upload failed", err);
                                        // Ideally show toast, but console for now
                                    }
                                }}
                            />
                        </label>

                        {block.params.file?.name && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-pink-500/10 border border-pink-500/20 rounded max-w-[180px]">
                                <span className="text-xs text-pink-300 font-mono truncate" title={block.params.file.name}>
                                    {block.params.file.name}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </>
            )}

            {/* Verify Text Block */}
            {block.type === 'verify_text' && (
            <>
                <ElementPicker 
                value={block.params.element}
                placeholder="Pick element to verify"
                isPicking={isPicking}
                isEditing={isEditing}
                onEditChange={setIsEditing}
                onStartPicking={handlePick}
                onStopPicking={() => setIsPicking(false)}
                onChange={(el) => onUpdate?.(id, { 
                    params: { 
                    ...block.params, 
                    element: el 
                    } 
                })}
                />
                <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">Mode</span>
                <select 
                    value={block.params.match?.mode || 'equals'}
                    onChange={(e) => onUpdate?.(id, { 
                    params: { 
                        ...block.params, 
                        match: { ...block.params.match, mode: e.target.value } 
                    } 
                    })}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                </select>
                </div>
                <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">Value</span>
                <VariableInput 
                    value={block.params.match?.value || ''}
                    onChange={(val: string) => onUpdate?.(id, { 
                        params: { 
                            ...block.params, 
                            match: { ...block.params.match, value: val } 
                        } 
                    })}
                    savedValues={savedValues}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                    placeholder="Expected text"
                />
                </div>
            </>
            )}

            {/* Scroll To Element Block */}
            {block.type === 'scroll_to_element' && (
            <>
                <ElementPicker 
                value={block.params.element}
                placeholder="Pick element to scroll to"
                isPicking={isPicking}
                isEditing={isEditing}
                onEditChange={setIsEditing}
                onStartPicking={handlePick}
                onStopPicking={() => setIsPicking(false)}
                onChange={(el) => onUpdate?.(id, { 
                    params: { 
                    ...block.params, 
                    element: el 
                    } 
                })}
                />
                <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">Align</span>
                <select 
                    value={block.params.alignment || 'center'}
                    onChange={(e) => onUpdate?.(id, { params: { ...block.params, alignment: e.target.value } })}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                </select>
                </div>
            </>
            )}

            {/* Save Text Block */}
            {block.type === 'save_text' && (
            <>
                <ElementPicker 
                value={block.params.element}
                placeholder="Pick element to extract text from"
                isPicking={isPicking}
                isEditing={isEditing}
                onEditChange={setIsEditing}
                onStartPicking={handlePick}
                onStopPicking={() => setIsPicking(false)}
                onChange={(el) => onUpdate?.(id, { 
                    params: { 
                    ...block.params, 
                    element: el 
                    } 
                })}
                />
                <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">Label</span>
                <input 
                    type="text" 
                    value={block.params.save_as?.label || ''}
                    onChange={(e) => {
                    const label = e.target.value;
                    const key = label.toLowerCase().replace(/\s+/g, '_');
                    onUpdate?.(id, { 
                        params: { 
                        ...block.params, 
                        save_as: { key, label } 
                        } 
                    });
                    }}
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-purple-300/80 focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="e.g., Order ID"
                />
                </div>
            </>
            )}

            {/* Save Page Content Block */}
            {block.type === 'save_page_content' && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 italic">
                  Captures all visible text on the page without requiring element selection.
                  Useful for dynamic content testing.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono w-12">Save as</span>
                  <input 
                    type="text" 
                    value={block.params.save_as?.label || ''}
                    onChange={(e) => {
                      const label = e.target.value;
                      const key = label.toUpperCase().replace(/\s+/g, '_');
                      onUpdate?.(id, { 
                        params: { 
                          ...block.params, 
                          save_as: { key, label } 
                        } 
                      });
                    }}
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-purple-300/80 focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="e.g., PAGE_TEXT"
                  />
                </div>
              </div>
            )}


            {block.type === 'verify_page_title' && (
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">Title</span>
                <VariableInput 
                    value={block.params.title || ''}
                    onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, title: val } })}
                    savedValues={savedValues}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-zinc-500 focus:border-white/20 transition-all"
                    placeholder="Expected page title"
                />
            </div>
            )}

            {block.type === 'verify_url' && (
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">Contains</span>
                <VariableInput 
                    value={block.params.url_part || ''}
                    onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, url_part: val } })}
                    savedValues={savedValues}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-zinc-500 focus:border-white/20 transition-all"
                    placeholder="Expected URL part"
                />
            </div>
            )}

            {/* Verify Element Enabled Block */}
            {block.type === 'verify_element_enabled' && (
            <>
                <ElementPicker 
                value={block.params.element}
                placeholder="Pick element to verify"
                isPicking={isPicking}
                isEditing={isEditing}
                onEditChange={setIsEditing}
                onStartPicking={handlePick}
                onStopPicking={() => setIsPicking(false)}
                onChange={(el) => onUpdate?.(id, { 
                    params: { 
                    ...block.params, 
                    element: el 
                    } 
                })}
                />
                <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-12">State</span>
                <div className="flex bg-black/40 border border-white/10 rounded p-0.5">
                    <button
                    onClick={() => onUpdate?.(id, { params: { ...block.params, should_be_enabled: true } })}
                    className={cn(
                        "px-3 py-1 rounded text-[10px] font-medium transition-all",
                        block.params.should_be_enabled ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                    )}
                    >
                    Enabled
                    </button>
                    <button
                    onClick={() => onUpdate?.(id, { params: { ...block.params, should_be_enabled: false } })}
                    className={cn(
                        "px-3 py-1 rounded text-[10px] font-medium transition-all",
                        !block.params.should_be_enabled ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                    )}
                    >
                    Disabled
                    </button>
                </div>
                </div>
            </>
            )}

            {block.type === 'use_saved_value' && (
                <div className="space-y-3">
                    <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                        Saved Value
                    </label>
                    <select
                        className="w-full bg-gray-900/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 focus:border-blue-500/50 outline-none"
                        value={block.params.value_ref?.key || ''}
                        onChange={(e) => {
                            const selected = savedValues?.find(v => v.key === e.target.value);
                            if (selected) {
                                onUpdate?.(id, {
                                    params: { 
                                        ...block.params, 
                                        value_ref: { key: selected.key, label: selected.label } 
                                    }
                                });
                            }
                        }}
                    >
                        <option value="" disabled>Select a saved value...</option>
                        {savedValues?.map(sv => (
                            <option key={sv.key} value={sv.key}>
                                {sv.label}
                            </option>
                        ))}
                    </select>
                    {!savedValues?.length && (
                        <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black tracking-widest italic opacity-70">
                            No saved values available. Add a "Save Text" block first.
                        </p>
                    )}
                    </div>

                    <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                        Action to Perform
                    </label>
                    <div className="grid grid-cols-1 gap-1">
                         <select
                            className="w-full bg-gray-900/50 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 focus:border-white focus:outline-none transition-all"
                            value={block.params.target?.action || 'enter_text'}
                            onChange={(e) => onUpdate?.(id, {
                                params: { ...block.params, target: { ...block.params.target, action: e.target.value } }
                            })}
                        >
                            <option value="enter_text">Enter Text (Type in field)</option>
                            <option value="verify_equals">Verify Equals</option>
                            <option value="verify_contains">Verify Contains</option>
                        </select>
                    </div>
                </div>
                </div>
            )}

            {block.type === 'verify_network_request' && (
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">URL Pattern</label>
                        <VariableInput 
                            value={block.params.url_pattern || ''}
                            onChange={(val: string) => onUpdate?.(id, { params: { ...block.params, url_pattern: val } })}
                            savedValues={savedValues}
                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                            placeholder="e.g. /api/v1/user"
                        />
                        <p className="text-[10px] text-gray-600">Substring match on requested URLs</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="flex-1 space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</label>
                            <select
                                value={block.params.method || 'ANY'}
                                onChange={(e) => onUpdate?.(id, { params: { ...block.params, method: e.target.value } })}
                                className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                                <option value="ANY">Any</option>
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                         </div>
                         <div className="flex-1 space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Code</label>
                            <input
                                type="number"
                                value={block.params.status_code || ''}
                                onChange={(e) => onUpdate?.(id, { params: { ...block.params, status_code: e.target.value ? parseInt(e.target.value) : null } })}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                                placeholder="Any"
                             />
                         </div>
                    </div>
                </div>
            )}

            {block.type === 'submit_form' && (
                <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 italic pb-1">Triggers high-level form submission.</p>
                    <ElementPicker 
                        value={block.params.element}
                        onChange={(element) => onUpdate?.(id, { params: { ...block.params, element } })}
                        onStartPicking={handlePick}
                        placeholder="Select form to submit"
                    />
                </div>
            )}

            {block.type === 'confirm_dialog' && (
                <div className="py-1">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Accepts next system alert or confirm dialog.</p>
                </div>
            )}

            {block.type === 'dismiss_dialog' && (
                <div className="py-1">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Dismisses next system alert or cancel dialog.</p>
                </div>
            )}

            {block.type === 'activate_primary_action' && (
                <div className="space-y-2 py-1">
                    <div className="flex items-center gap-2 p-2.5 rounded bg-zinc-900/50 border border-white/10">
                        <AlertCircle className="w-3.5 h-3.5 text-white" />
                        <p className="text-[10px] text-zinc-400 leading-tight font-medium uppercase tracking-widest">
                            Advanced: WebLens will heuristically find and trigger the primary action on the page.
                        </p>
                    </div>
                </div>
            )}

            {block.type === 'submit_current_input' && (
                <div className="space-y-2">
                    <ElementPicker 
                        value={block.params.element}
                        placeholder="Pick input field (optional)"
                        isPicking={isPicking}
                        isEditing={isEditing}
                        onEditChange={setIsEditing}
                        onStartPicking={handlePick}
                        onStopPicking={() => setIsPicking(false)}
                        onChange={(el) => onUpdate?.(id, { 
                            params: { 
                                ...block.params, 
                                element: el 
                            } 
                        })}
                    />
                    <p className="text-[10px] text-gray-500 italic px-1">
                        Presses Enter on the selected element, or the currently focused input if none selected.
                    </p>
                </div>
            )}

            {block.type === 'verify_page_content' && (
                <div className="space-y-3">
                    <p className="text-[10px] text-gray-500 italic">Checks the entire page for specific text.</p>
                    <div className="flex gap-2">
                        <select 
                            value={block.params.match.mode}
                            onChange={(e) => onUpdate?.(id, { params: { ...block.params, match: { ...block.params.match, mode: e.target.value } } })}
                            className="bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
                        >
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                        </select>
                        <VariableInput 
                            value={block.params.match.value}
                            onChange={(value) => onUpdate?.(id, { params: { ...block.params, match: { ...block.params.match, value } } })}
                            savedValues={savedValues}
                            placeholder="Text to find..."
                        />
                    </div>
                </div>
            )}

            {block.type === 'verify_performance' && (
                <div className="space-y-3">
                    <p className="text-[10px] text-gray-500 italic">Verifies page load performance.</p>
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono w-16">Metric</span>
                        <select
                            value={block.params.metric || 'page_load_time'}
                            onChange={(e) => onUpdate?.(id, { params: { ...block.params, metric: e.target.value } })}
                            className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white/20"
                        >
                            <option value="page_load_time">Page Load Time</option>
                            <option value="dom_interactive">DOM Interactive</option>
                            <option value="first_byte">First Byte (TTFB)</option>
                            <option value="network_requests">Network Requests (Count)</option>
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono w-16">{block.params.metric === 'network_requests' ? 'Max Req' : 'Max Time'}</span>
                        <input
                            type="number"
                            value={block.params.threshold_ms || 2000}
                             onChange={(e) => onUpdate?.(id, { params: { ...block.params, threshold_ms: parseInt(e.target.value) } })}
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                             placeholder="e.g. 2000"
                        />
                         <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">{block.params.metric === 'network_requests' ? 'requests' : 'ms'}</span>
                    </div>
                </div>
            )}

            {block.type === 'switch_tab' && (
                <div className="space-y-3">
                    <p className="text-[10px] text-gray-500 italic">Switch browser focus to another tab.</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono w-16">Target</span>
                        <div className="flex bg-black/40 border border-white/10 rounded p-0.5">
                            <button
                                onClick={() => onUpdate?.(id, { params: { ...block.params, to_newest: true } })}
                                className={cn(
                                    "px-3 py-1 rounded text-[10px] font-medium transition-all",
                                    block.params.to_newest ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                Newest
                            </button>
                            <button
                                onClick={() => onUpdate?.(id, { params: { ...block.params, to_newest: false } })}
                                className={cn(
                                    "px-3 py-1 rounded text-[10px] font-medium transition-all",
                                    !block.params.to_newest ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                By Index
                            </button>
                        </div>
                    </div>
                    {!block.params.to_newest && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <span className="text-xs text-gray-500 font-mono w-16">Index</span>
                            <input
                                type="number"
                                min="0"
                                value={block.params.tab_index || 0}
                                onChange={(e) => onUpdate?.(id, { params: { ...block.params, tab_index: parseInt(e.target.value) } })}
                                className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-white/20 transition-all"
                            />
                        </div>
                    )}
                </div>
            )}

            {(block.type === 'get_cookies' || block.type === 'get_local_storage' || block.type === 'get_session_storage') && (
                <div className="py-1">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest leading-relaxed">
                        Captures {block.type.replace(/_/g, ' ')} for diagnostic evidence.
                    </p>
                </div>
            )}

            {block.type === 'observe_network' && (
                <div className="py-1">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest leading-relaxed">
                        Starts background network traffic monitoring.
                    </p>
                </div>
            )}
        </div> {/* Close Content UI (original 355) */}
      </div> {/* Close Main Block Container (added 234) */}

      {/* Sequential Children (Snapped Blocks) - Data Driven */}
      {renderBlockList?.({ parentId: id, branchKey: undefined as 'then' | 'else' | 'body' | undefined })}
    </div>
  );
});

// Structural Shell - Handles DND logic and positioning separate from content
export const BaseBlock = memo((props: BaseBlockProps & { style?: React.CSSProperties }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(props.block.position && !props.isActive ? { // isActive check ensures overlay doesn't double-position
            position: 'absolute' as const,
            left: `${props.block.position.x}px`,
            top: `${props.block.position.y}px`,
            zIndex: isDragging ? 500 : 10
        } : {})
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <BaseBlockContent 
                {...props}
                dragListeners={listeners}
                isDragging={isDragging}
            />
        </div>
    );
});

export const BaseBlockOverlay = memo((props: BaseBlockProps) => {
    // Overlay is just the content forced into dragging state
    return (
        <BaseBlockContent 
            {...props}
            isOverlay={true}
            isDragging={true}
        />
    );
});
