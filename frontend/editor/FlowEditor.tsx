
import { useState, useMemo, useImperativeHandle, forwardRef, useEffect, memo, useRef } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import type { FlowGraph } from '../types/flow';
import { BaseBlock, BaseBlockOverlay } from './blocks/BaseBlock';
import { Plus, Minus, Save, FolderOpen, Trash2, X, LocateFixed, Sparkles } from 'lucide-react';
import { FlowStorage, SavedFlowMetadata } from '../lib/storage';
import { OnboardingModal } from '../components/OnboardingModal';
import { Minimap } from './Minimap';
import { SnapGuides } from './SnapGuides';
import { FlowTransformer } from '../lib/flow-transformer';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ScenarioPanel } from '../components/ScenarioPanel';
import { EditorBlock, BlockType, SavedValue, ScenarioSuiteReport } from './entities';
import { ScenarioSuiteDashboard } from '../components/execution/ScenarioSuiteDashboard';
import { AIInsight } from '../components/ai/AIInsight';
import { cn } from '../lib/utils';

export interface FlowEditorRef {
  highlightBlockActive: (blockId: string, message?: string) => void;
  highlightBlockSuccess: (blockId: string, message?: string) => void;
  highlightBlockFailed: (blockId: string, message?: string) => void;
  clearHighlighting: () => void;
  scrollToBlock: (blockId: string) => void;
  createNewFlow: () => void;
}

export const LAYOUT_CONSTANTS = {
    BLOCK_WIDTH: 320,
    BLOCK_HEIGHT: 130, // Standardized 
    VERTICAL_GAP: 20,
    BRANCH_X_OFFSET: 40,
    GRID_SIZE: 20
};

interface FlowEditorProps {
  onFlowChange?: (flow: FlowGraph | null) => void;
  onValidationError?: (errors: string[]) => void;
  onRequestPick?: (blockType: string, callback: (element: any) => void) => void;
  highlightBlockId?: string | null;
  onBlockClick?: (id: string) => void;
  showOnboarding?: boolean;
  setShowOnboarding?: (show: boolean) => void;
  onViewScenario?: (runId: string) => void;
  lastReport?: any;
}



export const DEFAULT_BLOCKS: Record<BlockType, Omit<EditorBlock, 'id'>> = {
  open_page: {
    type: 'open_page',
    label: 'Open Page',
    params: { url: 'https://example.com' }
  },
  click_element: {
    type: 'click_element',
    label: 'Click Element',
    params: { element: null }
  },
  enter_text: {
    type: 'enter_text',
    label: 'Enter Text',
    params: { element: null, text: 'Hello' }
  },
  wait_until_visible: {
    type: 'wait_until_visible',
    label: 'Wait Until Visible',
    params: { element: null, timeout_seconds: 10 }
  },
  assert_visible: {
    type: 'assert_visible',
    label: 'Assert Visible',
    params: { element: null }
  },
  if_condition: {
    type: 'if_condition',
    label: 'If Condition',
    params: {
      condition: { kind: 'element_visible', element: null },
      then_blocks: [],
      else_blocks: []
    }
  },
  repeat_until: {
    type: 'repeat_until',
    label: 'Repeat Until',
    params: {
      condition: { kind: 'element_visible', element: null },
      body_blocks: [],
      max_iterations: 10
    }
  },
  delay: {
    type: 'delay',
    label: 'Delay',
    params: { seconds: 1 }
  },
  refresh_page: {
    type: 'refresh_page',
    label: 'Refresh Page',
    params: {}
  },
  wait_for_page_load: {
    type: 'wait_for_page_load',
    label: 'Wait For Page Load',
    params: { timeout_seconds: 15 }
  },
  select_option: {
    type: 'select_option',
    label: 'Select From Dropdown',
    params: { element: null, option_text: '' }
  },
  upload_file: {
    type: 'upload_file',
    label: 'Upload File',
    params: { element: null, file: { id: '', name: '', mime_type: null, source: 'local' } }
  },
  verify_text: {
    type: 'verify_text',
    label: 'Verify Text',
    params: { element: null, match: { mode: 'equals', value: '' } }
  },
  scroll_to_element: {
    type: 'scroll_to_element',
    label: 'Scroll To Element',
    params: { element: null, alignment: 'center' }
  },
  save_text: {
    type: 'save_text',
    label: 'Save Text',
    params: { element: null, save_as: { key: '', label: '' } }
  },
  save_page_content: {
    type: 'save_page_content',
    label: 'Save Page Content',
    params: { save_as: { key: '', label: '' } }
  },

  verify_page_title: {
    type: 'verify_page_title',
    label: 'Verify Page Title',
    params: { title: '' }
  },
  verify_url: {
    type: 'verify_url',
    label: 'Verify URL Contains',
    params: { url_part: '' }
  },
  verify_element_enabled: {
    type: 'verify_element_enabled',
    label: 'Verify Element Enabled',
    params: { element: null, should_be_enabled: true }
  },
  use_saved_value: {
    type: 'use_saved_value',
    label: 'Use Saved Value',
    params: { 
        target: { action: 'enter_text' },
        element: null,
        value_ref: { key: '', label: '' }
    }
  },
  verify_network_request: {
      type: 'verify_network_request',
      label: 'Verify Network Request',
      params: { 
          url_pattern: '/api/v1',
          method: 'ANY',
          status_code: 200
      }
  },
  verify_page_content: {
    type: 'verify_page_content',
    label: 'Verify Page Content',
    params: { match: { mode: 'contains', value: '' } }
  },
  verify_performance: {
      type: 'verify_performance',
      label: 'Verify Performance',
      params: { 
          metric: 'page_load_time',
          threshold_ms: 2000
      }
  },
  submit_form: {
    type: 'submit_form',
    label: 'Submit Form',
    params: { element: null }
  },
  confirm_dialog: {
    type: 'confirm_dialog',
    label: 'Confirm Dialog',
    params: {}
  },
  dismiss_dialog: {
    type: 'dismiss_dialog',
    label: 'Dismiss Dialog',
    params: {}
  },
  activate_primary_action: {
    type: 'activate_primary_action',
    label: 'Activate Primary Action',
    params: {}
  },
  submit_current_input: {
    type: 'submit_current_input',
    label: 'Submit Current Input',
    params: { element: null }
  },
  get_cookies: {
    type: 'get_cookies',
    label: 'Get Cookies',
    params: {}
  },
  get_local_storage: {
    type: 'get_local_storage',
    label: 'Get Local Storage',
    params: {}
  },
  get_session_storage: {
    type: 'get_session_storage',
    label: 'Get Session Storage',
    params: {}
  },
  observe_network: {
    type: 'observe_network',
    label: 'Observe Network',
    params: {}
  },
  switch_tab: {
    type: 'switch_tab',
    label: 'Switch Tab',
    params: { to_newest: true, tab_index: 0 }
  }
};
// Helper to separate render logic
const RenderBlockList = memo(({ 
  blocks, 
  parentId, 
  branchKey,
  blockStatuses,
  blockMessages,
  contextUrl,
  globalVariables,
  deleteBlock,
  duplicateBlock,
  updateBlock,
  onAddBlock,
  onRequestPick,
  onMoveToBranch,
  highlightBlockId,
  onBlockClick,
  activeSnapTarget,
  savedValues,
  activeFlowIds = new Set<string>(),
  selectionExists = false
}: any) => {
  const levelBlocks = useMemo(() => {
    const filtered = blocks.filter((b: any) => b.parentId === parentId && b.branchKey === branchKey);
    return filtered;
  }, [blocks, parentId, branchKey]);

  // Callback for BaseBlock to render its nested lists
  // This avoids passing mixed children arrays and allows BaseBlock to own the structural logic
  const renderBlockListCallback = ({ parentId, branchKey }: { parentId: string, branchKey?: string }) => (
      <RenderBlockList 
        blocks={blocks}
        parentId={parentId}
        branchKey={branchKey}
        blockStatuses={blockStatuses}
        blockMessages={blockMessages}
        contextUrl={contextUrl}
        globalVariables={globalVariables}
        deleteBlock={deleteBlock}
        duplicateBlock={duplicateBlock}
        updateBlock={updateBlock}
        onAddBlock={onAddBlock}
        onRequestPick={onRequestPick}
        onMoveToBranch={onMoveToBranch}
        highlightBlockId={highlightBlockId}
        onBlockClick={onBlockClick}
        activeSnapTarget={activeSnapTarget}
        activeFlowIds={activeFlowIds}
        selectionExists={selectionExists}
        savedValues={savedValues}
      />
  );

  
  if (!parentId) {
      // Root Level - High Contrast Spatial Rendering
      return (
          <SortableContext items={levelBlocks.map((b: any) => b.id)} strategy={rectSortingStrategy}>
            {levelBlocks.map((block: any, index: number) => {
                const effectivePos = block.position || { x: 100, y: 100 + (index * 125) };
                
                return (
                  <BaseBlock
                    key={block.id}
                    id={block.id}
                    block={{ ...block, position: effectivePos }}
                    status={blockStatuses[block.id] || 'idle'}
                    message={blockMessages[block.id]}
                    onDelete={deleteBlock}
                    onDuplicate={duplicateBlock}
                    onUpdate={updateBlock}
                    onAddBlock={onAddBlock}
                    onRequestPick={onRequestPick}
                    branchKey={branchKey}
                    onMoveToBranch={onMoveToBranch}
                    isActive={highlightBlockId === block.id}
                    isHighlighted={activeFlowIds.has(block.id)}
                    isSnapped={activeSnapTarget?.id === block.id}
                    selectionExists={selectionExists}
                    onClick={() => onBlockClick?.(block.id)}
                    availableBranches={blocks
                        .filter((b: any) => (b.type === 'if_condition' || b.type === 'repeat_until') && b.id !== block.id)
                        .map((b: any) => ({ id: b.id, label: b.label, type: b.type }))
                    }
                    savedValues={savedValues}
                    blocks={blocks}
                    renderBlockList={renderBlockListCallback}
                  />
                );
            })}
          </SortableContext>
      );
  }

  return (
    <SortableContext items={levelBlocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-0">
        {levelBlocks.map((block: any) => (
          <BaseBlock
            key={block.id}
            id={block.id}
            block={block}
            status={blockStatuses[block.id] || 'idle'}
            message={blockMessages[block.id]}
            onDelete={deleteBlock}
            onDuplicate={duplicateBlock}
            onUpdate={updateBlock}
            onAddBlock={onAddBlock}
            onRequestPick={onRequestPick}
            branchKey={branchKey}
            onMoveToBranch={onMoveToBranch}
            isActive={highlightBlockId === block.id}
            isHighlighted={activeFlowIds.has(block.id)}
            selectionExists={selectionExists}
            onClick={() => onBlockClick?.(block.id)}
            availableBranches={blocks
                .filter((b: any) => (b.type === 'if_condition' || b.type === 'repeat_until') && b.id !== block.id)
                .map((b: any) => ({ id: b.id, label: b.label, type: b.type }))
            }
            savedValues={savedValues}
            blocks={blocks}
            renderBlockList={renderBlockListCallback}
          />
        ))}
      </div>
    </SortableContext>
  );
});
;

export const FlowEditor = forwardRef<FlowEditorRef, FlowEditorProps>(
  ({ onFlowChange, onValidationError, onRequestPick, highlightBlockId, onBlockClick,
    showOnboarding,
    setShowOnboarding,
    onViewScenario,
    lastReport
  }, ref) => {
    // State for blocks
    const [blocks, setBlocks] = useState<EditorBlock[]>([]);
    const [flowName, setFlowName] = useState('My Test Flow');
    const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
    const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
    const [isSidebarOpen] = useState(true); 
    const [globalVariables, setGlobalVariables] = useState<{ id: string, key: string, value: string }[]>([]);
    const [scenarioSets, setScenarioSets] = useState<any[]>([]);
    const [suiteReport, setSuiteReport] = useState<ScenarioSuiteReport | null>(null);
    const [schemaVersion, setSchemaVersion] = useState(1);
    
    // AI Roles State
    const [aiReview, setAiReview] = useState<string>("");
    const [isAiReviewLoading, setIsAiReviewLoading] = useState(false);
    const [showAiReview, setShowAiReview] = useState(false);
    
    // Role 1: Translator State
    const [intentText, setIntentText] = useState("");
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const [translatorFeedback, setTranslatorFeedback] = useState<string>("");

    // Role 4: Companion State
    const [companionQuery, setCompanionQuery] = useState("");
    const [companionAnswer, setCompanionAnswer] = useState("");
    const [isCompanionLoading, setIsCompanionLoading] = useState(false);
    
    // Persistence UI State
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [savedFlows, setSavedFlows] = useState<SavedFlowMetadata[]>([]);
    
    // Block search
    const [blockSearchQuery, setBlockSearchQuery] = useState('');

const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    showCancel?: boolean;
}>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
});

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [blockStatuses, setBlockStatuses] = useState<Record<string, 'idle' | 'running' | 'success' | 'failed'>>({});
    const [blockMessages, setBlockMessages] = useState<Record<string, string>>({});
    const [isPanning, setIsPanning] = useState(false);
    const [activeSnapTarget, setActiveSnapTarget] = useState<{ id: string, type: 'bottom' | 'then' | 'else' | 'body' } | null>(null);
    const snapTargetRef = useRef<{ id: string, type: 'bottom' | 'then' | 'else' | 'body' } | null>(null);

    // dnd-kit sensors - Higher distance threshold for intentional start, avoiding accidental jitters
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 2, // Even more "liquid" start
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    // Initial blocks
    useEffect(() => {
        if (blocks.length === 0) {
            const initialBlocks: EditorBlock[] = [
                { id: 'block_1', ...DEFAULT_BLOCKS.open_page, position: { x: 100, y: 100 } }
            ];
            setBlocks(initialBlocks);
        }
    }, [])

    // Expose highlighting methods
    const [sidebarWidth, setSidebarWidth] = useState(() => {
      const saved = localStorage.getItem('flow-sidebar-width');
      return saved ? parseInt(saved, 10) : 256;
    });
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);

    useEffect(() => {
      const flow = FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion);
      
      onFlowChange?.(flow);
      onValidationError?.([]); 
    }, [blocks, flowName, globalVariables, schemaVersion]);

    const normalizedSavedValues: SavedValue[] = useMemo(() => {
        const globalVars = globalVariables.map(v => ({ key: v.key, label: v.key || 'Untitled' }));
        const blockVars = blocks
            .filter(b => (b.type === 'save_text' || b.type === 'save_page_content') && b.params.save_as?.key)
            .map(b => ({ key: b.params.save_as.key, label: b.params.save_as.label || b.params.save_as.key }));
        return [...globalVars, ...blockVars].filter(v => v.key && v.key.trim() !== '');
    }, [globalVariables, blocks]);

    const byParent = useMemo(() => {
        const map = new Map<string, EditorBlock[]>();
        blocks.forEach(b => {
            const key = `${b.parentId || 'root'}:${b.branchKey || 'main'}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(b);
        });
        return map;
    }, [blocks]);

    const effectivePositions = useMemo(() => {
        const positions: Record<string, { x: number, y: number }> = {};
        
        const processChain = (parentId: string | undefined, branchKey: string | undefined, startX: number, startY: number): number => {
            const key = `${parentId || 'root'}:${branchKey || 'main'}`;
            const chain = byParent.get(key) || [];
            let currentY = startY;
            let totalHeight = 0;
            
            chain.forEach((block) => {
                positions[block.id] = { x: startX, y: currentY };
                const totalBlockSpace = LAYOUT_CONSTANTS.BLOCK_HEIGHT + LAYOUT_CONSTANTS.VERTICAL_GAP;
                
                // Process branches (which are nested)
                let branchPadding = 0;
                if (block.type === 'if_condition') {
                    const thenHeight = processChain(block.id, 'then', startX + LAYOUT_CONSTANTS.BRANCH_X_OFFSET, currentY + LAYOUT_CONSTANTS.BLOCK_HEIGHT);
                    const elseHeight = processChain(block.id, 'else', startX + LAYOUT_CONSTANTS.BRANCH_X_OFFSET, currentY + LAYOUT_CONSTANTS.BLOCK_HEIGHT + thenHeight);
                    branchPadding = thenHeight + elseHeight;
                } else if (block.type === 'repeat_until') {
                    branchPadding = processChain(block.id, 'body', startX + LAYOUT_CONSTANTS.BRANCH_X_OFFSET, currentY + LAYOUT_CONSTANTS.BLOCK_HEIGHT);
                }
                
                currentY += totalBlockSpace + branchPadding;
                totalHeight += totalBlockSpace + branchPadding;
            });
            return totalHeight;
        };

        blocks.filter(b => !b.parentId).forEach(root => {
            const pos = root.position || { x: 100, y: 100 };
            positions[root.id] = pos;
            processChain(root.id, undefined, pos.x, pos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT + LAYOUT_CONSTANTS.VERTICAL_GAP);
        });

        return positions;
    }, [blocks, byParent]);


    useImperativeHandle(ref, () => ({
        highlightBlockActive: (id, message) => {
            setBlockStatuses(prev => ({ ...prev, [id]: 'running' }));
            if (message) setBlockMessages(prev => ({ ...prev, [id]: message }));
        },
        highlightBlockSuccess: (id, message) => {
            setBlockStatuses(prev => ({ ...prev, [id]: 'success' }));
            if (message) setBlockMessages(prev => ({ ...prev, [id]: message }));
        },
        highlightBlockFailed: (id, message) => {
            setBlockStatuses(prev => ({ ...prev, [id]: 'failed' }));
            if (message) setBlockMessages(prev => ({ ...prev, [id]: message }));
        },
        clearHighlighting: () => {
            setBlockStatuses({});
            setBlockMessages({});
        },
        scrollToBlock: (id) => {
            const pos = effectivePositions[id];
            if (pos) {
                const containerWidth = window.innerWidth - (isSidebarOpen ? sidebarWidth : 0) - (showAiReview ? 350 : 0);
                const containerHeight = window.innerHeight - 56; 
                
                // Focus the block in the center of the available canvas area
                setView(prev => ({
                    ...prev,
                    x: (containerWidth / 2) - (pos.x * prev.scale + (LAYOUT_CONSTANTS.BLOCK_WIDTH / 2) * prev.scale),
                    y: (containerHeight / 2) - (pos.y * prev.scale + (LAYOUT_CONSTANTS.BLOCK_HEIGHT / 2) * prev.scale)
                }));
            }
        },
        createNewFlow: () => {
            resetToNewFlow();
        }
    }));

    const handleReviewFlow = async () => {
        if (blocks.length < 2) {
            setAiReview("Please add more blocks to your flow and run it at least once so the AI has enough evidence to provide a helpful review.");
            setShowAiReview(true);
            return;
        }
        setShowAiReview(true);
        setIsAiReviewLoading(true);
        const flowData = FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion);
        
        // Attach latest execution evidence if available
        // Priority: 1. Manual run report (lastReport), 2. Scenario suite report (suiteReport)
        const lastExecution = lastReport || suiteReport?.results?.[0]?.report;
        const payload = {
            ...flowData,
            execution_report: lastExecution || null
        };

        console.log("Sending AI Review Payload:", payload);
        try {
            const res = await fetch('/api/ai/investigate-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flow: flowData,
                    result: { report: lastExecution }
                })
            });
            const data = await res.json();
            console.log("Raw AI Review Data:", data.review);
            console.log("AI Review Length:", data.review.length);
            setAiReview(data.review);
        } catch (err) {
            console.error("AI Flow Review failed:", err);
            setAiReview("Unable to review flow at this time.");
        } finally {
            setIsAiReviewLoading(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!intentText.trim()) return;
        
        setIsGeneratingDraft(true);
        setTranslatorFeedback("");
        
        try {
            const res = await fetch('/api/ai/draft-flow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intent: intentText })
            });
            const data = await res.json();
            const text = data.review || "";
            
            // Extract JSON blocks if present
            const jsonMatch = text.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
            const feedbackText = text.replace(/---JSON_START---([\s\S]*?)---JSON_END---/, "").trim();
            
            setTranslatorFeedback(feedbackText);
            
            if (jsonMatch) {
                try {
                    const parsedBlocks = JSON.parse(jsonMatch[1]);
                    // Store as preview blocks, maybe user wants to see them before applying
                    // For now, let's keep them in feedback or a separate state
                    (window as any).__draftBlocks = parsedBlocks;
                } catch (e) {
                    console.error("Failed to parse draft JSON:", e);
                }
            }
        } catch (err) {
            console.error("AI Draft generation failed:", err);
            setTranslatorFeedback("Unable to generate draft flow at this time.");
        } finally {
    setIsGeneratingDraft(false);
        }
    };

    const handleApplyDraft = () => {
        const draftBlocks = (window as any).__draftBlocks;
        if (!draftBlocks) return;
        
        // Valid block types from entities.ts
        const validBlockTypes = new Set([
            'open_page', 'click_element', 'enter_text', 'wait_until_visible', 'assert_visible',
            'if_condition', 'repeat_until', 'delay', 'refresh_page', 'wait_for_page_load',
            'select_option', 'upload_file', 'verify_text', 'verify_page_content', 'scroll_to_element',
            'save_text', 'save_page_content', 'verify_page_title', 'verify_url', 'verify_element_enabled',
            'use_saved_value', 'verify_network_request', 'verify_performance', 'submit_form',
            'confirm_dialog', 'dismiss_dialog', 'activate_primary_action', 'submit_current_input',
            'get_cookies', 'get_local_storage', 'get_session_storage', 'observe_network'
        ]);
        
        // Filter out invalid blocks
        const validDraftBlocks = draftBlocks.filter((b: any) => {
            if (!validBlockTypes.has(b.type)) {
                console.warn(`Skipping invalid block type: ${b.type}`);
                return false;
            }
            return true;
        });
        
        if (validDraftBlocks.length === 0) {
            console.error("No valid blocks to apply");
            return;
        }
        
        // Convert to EditorBlocks with SNAPPED flow
        // To snap blocks, we chain them via parentId and ONLY set position for the root (first) block.
        // Child blocks must have position: undefined to flow naturally in the UI.
        const timestamp = Date.now();
        const newBlocks: EditorBlock[] = validDraftBlocks.map((b: any, i: number) => {
            const blockId = `draft_${timestamp}_${i}`;
            const parentBlockId = i > 0 ? `draft_${timestamp}_${i - 1}` : undefined;
            
            return {
                id: blockId,
                type: b.type,
                label: b.label || `Block ${i + 1}`,
                params: b.params || {},
                parentId: parentBlockId,
                // Only the first block gets a specific position on canvas.
                // Subsequent blocks effectively "snap" to the previous one by not having a position.
                position: i === 0 ? { x: 100, y: 100 } : undefined
            };
        });
        
        // Replace existing blocks with the new flow
        setBlocks(newBlocks);
        setTranslatorFeedback("");
        setIntentText("");
        (window as any).__draftBlocks = null;
    };

    const handleAskCompanion = async () => {
        if (!companionQuery.trim()) return;
        setIsCompanionLoading(true);
        setCompanionAnswer("");
        
        try {
            const flowData = FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion);
            const res = await fetch('/api/ai/ask-companion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insight: {
                        flow: flowData,
                        execution_report: lastReport || null
                    },
                    query: companionQuery
                })
            });
            const data = await res.json();
            setCompanionAnswer(data.answer);
        } catch (err) {
            console.error("AI Companion failed:", err);
            setCompanionAnswer("The WebLens Companion is currently unavailable.");
        } finally {
            setIsCompanionLoading(false);
        }
    };

    // Resizing Logic
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizingSidebar) return;
        const newWidth = e.clientX;
        const minWidth = 200;
        const maxWidth = 500;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setSidebarWidth(newWidth);
          localStorage.setItem('flow-sidebar-width', newWidth.toString());
        }
      };

      const handleMouseUp = () => {
        setIsResizingSidebar(false);
      };

      if (isResizingSidebar) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizingSidebar]);

    // Handlers
    function handleDragStart(event: DragStartEvent) {
      setActiveDragId(event.active.id as string);
    }

    function handleDragMove(event: DragMoveEvent) {
        const { active, collisions, delta } = event;
        const activeBlock = blocks.find(b => b.id === active.id);
        if (!activeBlock) return;

        // Skip snap logic if block is already part of the flow structure (repositioning, not adding from palette)
        // A block is part of the flow if it:
        // 1. Has no position (nested blocks rely on auto-layout), OR
        // 2. Has children (other blocks reference it as parent)
        const hasChildren = blocks.some(b => b.parentId === activeBlock.id);
        const isPartOfFlow = activeBlock.position === undefined || hasChildren;
        
        if (isPartOfFlow) {
            // Clear any existing snap target
            if (snapTargetRef.current) {
                snapTargetRef.current = null;
                setActiveSnapTarget(null);
            }
            return;
        }

        // Use effective position as starting point if fixed position is missing
        const startPos = activeBlock.position || effectivePositions[activeBlock.id];
        if (!startPos) return;

        const currentX = startPos.x + delta.x / view.scale;
        const currentY = startPos.y + delta.y / view.scale;

        let nearestTarget: { id: string, type: 'bottom' | 'then' | 'else' | 'body' } | null = null;
        let minDistance = 120; // Increased magnetic radius for better feel
        
        // 1. Check Collisions (Direct Hover)
        if (collisions && collisions.length > 0) {
            const firstCollision = collisions[0];
            const targetId = firstCollision.id as string;
            const targetBlock = blocks.find(b => b.id === targetId);

            if (targetBlock && targetId !== active.id) {
                // If it's a control block, we might want to snap to branches
                if (targetBlock.type === 'if_condition') {
                    // Decide based on X offset relative to target
                    // If far right, snap to THEN/ELSE
                    const isRight = currentX > (targetBlock.position?.x || 0) + 150;
                    if (isRight) {
                        nearestTarget = { id: targetId, type: currentY > (targetBlock.position?.y || 0) + 150 ? 'else' : 'then' };
                    } else {
                        nearestTarget = { id: targetId, type: 'bottom' };
                    }
                } else if (targetBlock.type === 'repeat_until') {
                    const isRight = currentX > (targetBlock.position?.x || 0) + 150;
                    nearestTarget = { id: targetId, type: isRight ? 'body' : 'bottom' };
                } else {
                    nearestTarget = { id: targetId, type: 'bottom' };
                }
            }
        }

        // 2. Proximity-based Snapping (Magnetic fallback)
        if (!nearestTarget) {
            for (const target of blocks) {
                // Cannot snap to self or own children
                if (target.id === active.id) continue;
                
                // Deep parent check to prevent circular snaps
                let p = target.parentId;
                let isChild = false;
                while (p) {
                    if (p === active.id) { isChild = true; break; }
                    p = blocks.find(b => b.id === p)?.parentId;
                }
                if (isChild) continue;

                const targetPos = effectivePositions[target.id];
                if (!targetPos) continue;

                // Check Sequential (Bottom)
                const snapY = targetPos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT + LAYOUT_CONSTANTS.VERTICAL_GAP;
                const dist = Math.sqrt((currentX - targetPos.x)**2 + (currentY - snapY)**2);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestTarget = { id: target.id, type: 'bottom' };
                }

                // Check Branches if target is a control block
                if (target.type === 'if_condition') {
                    // Then branch snap point
                    const thenY = targetPos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT;
                    const thenX = targetPos.x + LAYOUT_CONSTANTS.BRANCH_X_OFFSET;
                    const dThen = Math.sqrt((currentX - thenX)**2 + (currentY - thenY)**2);
                    if (dThen < minDistance) {
                        minDistance = dThen;
                        nearestTarget = { id: target.id, type: 'then' };
                    }

                    // Else branch snap point (estimated)
                    const elseY = thenY + 60; // Approximate offset for empty branch
                    const dElse = Math.sqrt((currentX - thenX)**2 + (currentY - elseY)**2);
                    if (dElse < minDistance) {
                        minDistance = dElse;
                        nearestTarget = { id: target.id, type: 'else' };
                    }
                } else if (target.type === 'repeat_until') {
                    const bodyY = targetPos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT;
                    const bodyX = targetPos.x + LAYOUT_CONSTANTS.BRANCH_X_OFFSET;
                    const dBody = Math.sqrt((currentX - bodyX)**2 + (currentY - bodyY)**2);
                    if (dBody < minDistance) {
                        minDistance = dBody;
                        nearestTarget = { id: target.id, type: 'body' };
                    }
                }
            }
        }

        if (nearestTarget?.id !== snapTargetRef.current?.id || nearestTarget?.type !== snapTargetRef.current?.type) {
            snapTargetRef.current = nearestTarget;
            setActiveSnapTarget(nearestTarget);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
      const { active, delta } = event;
      
      setBlocks((prev) => {
          const activeBlock = prev.find(b => b.id === active.id);
          if (!activeBlock) return prev;

          // 1. Snapping to a target
          if (activeSnapTarget) {
              const targetId = activeSnapTarget.id;
              const target = prev.find(b => b.id === targetId);
              if (!target) return prev;

              const isSequential = activeSnapTarget.type === 'bottom';
              
              let newParentId: string | undefined;
              let newBranchKey: 'then' | 'else' | 'body' | undefined;

              if (isSequential) {
                  // If target is root, we become its first child. 
                  // If target has a parent, we become a sibling (same parent/branch).
                  newParentId = target.parentId ? target.parentId : target.id;
                  newBranchKey = target.parentId ? target.branchKey : undefined;
              } else {
                  // Inside a branch
                  newParentId = target.id;
                  newBranchKey = activeSnapTarget.type as any;
              }

              const activeIdx = prev.findIndex(b => b.id === active.id);
              let newBlocks = [...prev];
              const blockToMove = { 
                  ...newBlocks[activeIdx], 
                  parentId: newParentId, 
                  branchKey: newBranchKey, 
                  position: undefined 
              };

              // Remove from old position and insert after target for stable sequence
              newBlocks.splice(activeIdx, 1);
              const targetIdx = newBlocks.findIndex(b => b.id === targetId);
              newBlocks.splice(targetIdx + 1, 0, blockToMove);

              return newBlocks;
          }

          // 2. Handle root-level swapping for "app icon" style rearranging
          if (!activeSnapTarget && event.over && active.id !== event.over.id) {
            const over = event.over;
            const activeIdx = prev.findIndex(b => b.id === active.id);
            const overIdx = prev.findIndex(b => b.id === over.id);
            
            if (activeIdx !== -1 && overIdx !== -1) {
                const activeB = prev[activeIdx];
                const overB = prev[overIdx];
                
                if (!activeB.parentId && !overB.parentId) {
                    // We swap positions and also reorder in the array so SortableContext is happy
                    const aPos = activeB.position || effectivePositions[activeB.id];
                    const oPos = overB.position || effectivePositions[overB.id];
                    
                    if (aPos && oPos) {
                        const newBlocks = arrayMove(prev, activeIdx, overIdx);
                        // After move, the indices changed, find them again
                        const newActiveIdx = newBlocks.findIndex(b => b.id === active.id);
                        const newOverIdx = newBlocks.findIndex(b => b.id === over.id);
                        
                        newBlocks[newActiveIdx] = { ...activeB, position: oPos };
                        newBlocks[newOverIdx] = { ...overB, position: aPos };
                        return newBlocks;
                    }
                }
            }
          }

          // Fallback to spatial movement (Detaching from chain if necessary)
          return prev.map(b => {
              if (b.id === active.id) {
                  const startPos = b.position || effectivePositions[b.id];
                  if (!startPos) return b;

                  const currentX = startPos.x + delta.x / view.scale;
                  const currentY = startPos.y + delta.y / view.scale;

                  return {
                      ...b,
                      parentId: undefined, // Fully detach if moving spatially
                      branchKey: undefined,
                      position: { 
                        x: Math.round(currentX / LAYOUT_CONSTANTS.GRID_SIZE) * LAYOUT_CONSTANTS.GRID_SIZE, 
                        y: Math.round(currentY / LAYOUT_CONSTANTS.GRID_SIZE) * LAYOUT_CONSTANTS.GRID_SIZE 
                      }
                  };
              }
              return b;
          });
      });

      setActiveDragId(null);
      setActiveSnapTarget(null);
      snapTargetRef.current = null;
    }

    const resetView = () => {
        setView({ x: 0, y: 0, scale: 1 });
    };

    const getCanvasCenter = () => {
        // Calculate the center of the visible area relative to the current view
        const actualWidth = window.innerWidth - (isSidebarOpen ? sidebarWidth : 0);
        const actualHeight = window.innerHeight - 56;
        
        const centerX = (actualWidth / 2 - view.x) / view.scale;
        const centerY = (actualHeight / 2 - view.y) / view.scale;
        
        // Add a small random jitter to avoid perfect overlap when spawning multiple blocks
        const jitterX = (Math.random() - 0.5) * 60;
        const jitterY = (Math.random() - 0.5) * 60;
        
        return { 
            x: centerX - (LAYOUT_CONSTANTS.BLOCK_WIDTH / 2) + jitterX, 
            y: Math.max(80, centerY - (LAYOUT_CONSTANTS.BLOCK_HEIGHT / 2) + jitterY) 
        };
    };

    function addBlock(type: BlockType, parentId?: string, branchKey?: 'then' | 'else' | 'body', position?: { x: number, y: number }) {
        const newBlock: EditorBlock = {
            id: `block_${crypto.randomUUID()}`,
            ...DEFAULT_BLOCKS[type],
            parentId,
            branchKey,
            position: position || (parentId ? undefined : getCanvasCenter())
        };
        setBlocks(prev => [...prev, newBlock]);
    }

    function updateBlock(id: string, updates: Partial<EditorBlock>) {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }

    function deleteBlock(id: string) {
        setBlocks(prev => {
            const toDelete = new Set<string>();

            const collect = (blockId: string) => {
                toDelete.add(blockId);
                prev.filter(b => b.parentId === blockId).forEach(b => collect(b.id));
            };

            collect(id);
            return prev.filter(b => !toDelete.has(b.id));
        });
    }

    function duplicateBlock(id: string) {
        setBlocks(prev => {
            const sourceIdx = prev.findIndex(b => b.id === id);
            if (sourceIdx === -1) return prev;

            const clones: EditorBlock[] = [];

            const cloneRec = (block: EditorBlock, parentId?: string) => {
                const newId = `block_${crypto.randomUUID()}`;
                
                const copy: EditorBlock = {
                    ...block,
                    id: newId,
                    parentId,
                    position: block.position
                        ? { x: block.position.x + 40, y: block.position.y + 40 }
                        : undefined
                };
                clones.push(copy);

                prev
                    .filter(b => b.parentId === block.id)
                    .forEach(child => cloneRec(child, newId));
            };

            const rootBlock = prev[sourceIdx];
            cloneRec(rootBlock, rootBlock.parentId);

            // Splice the clones into the array right after the original source structure
            const next = [...prev];
            next.splice(sourceIdx + 1, 0, ...clones);
            return next;
        });
    }

    function handleMoveToBranch(blockId: string, parentId?: string, branchKey?: 'then' | 'else' | 'body') {
        setBlocks(prev => {
            // Cycle Check
            if (parentId) {
                let current = prev.find(b => b.id === parentId);
                while (current) {
                    if (current.id === blockId) {
                        if ((window as any).addToast) (window as any).addToast('error', 'Cannot move block into its own descendant');
                        return prev; 
                    }
                    current = prev.find(b => b.id === current?.parentId);
                }
            }

            return prev.map(b => b.id === blockId ? { ...b, parentId, branchKey } : b);
        });
    }
    
    // --- Persistence Handlers ---

    const handleSave = () => {
        try {
            const flow = FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets);
            const saved = FlowStorage.save(flow, currentFlowId || undefined);
            setCurrentFlowId(saved.id);
        } catch (e) {
            console.error(e);
            if ((window as any).addToast) {
                (window as any).addToast('error', 'Failed to save flow');
            }
        }
    };

    const handleOpenLoadModal = () => {
        setSavedFlows(FlowStorage.list());
        setIsLoadModalOpen(true);
    };

    const handleLoadFlow = (id: string, isTemplate: boolean = false) => {
        const flow = isTemplate ? id as any : FlowStorage.load(id); 
        // Hack: reused function for template requiring flow object
        if (!flow) return;
        
        if (blocks.length > 2) { 
            setDialogConfig({
                isOpen: true,
                title: 'Discard Changes',
                message: 'Discard current changes and load this flow?',
                confirmLabel: 'Discard & Load',
                onConfirm: () => {
                    performLoad(flow, id, isTemplate);
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
            return;
        }

        performLoad(flow, id, isTemplate);
    };

    const performLoad = (flow: FlowGraph, id: string, isTemplate: boolean) => {

        try {
            const { blocks: newBlocks, name, variables, scenarioSets: newSets, schemaVersion } = FlowTransformer.toEditorState(flow);
            console.log('[FlowEditor] Loaded flow:', name, 'Schema:', schemaVersion);
            
            // Architectural Refinement: Orphan Cleanup
            // Remove blocks with a parentId that doesn't exist in the set of IDs
            const allIds = new Set(newBlocks.map(b => b.id));
            const cleanedBlocks = newBlocks.filter(b => !b.parentId || allIds.has(b.parentId));
            
            setBlocks(cleanedBlocks);
            setFlowName(name);
            setGlobalVariables(variables);
            setScenarioSets(newSets || []);
            setSchemaVersion(schemaVersion);
            
            if (isTemplate) {
                setCurrentFlowId(null);
                setShowOnboarding?.(false);
            } else {
                setCurrentFlowId(id);
                setIsLoadModalOpen(false);
            }

        } catch (e) {
            console.error(e);
            if ((window as any).addToast) {
                (window as any).addToast('error', 'Failed to load flow: Incompatible data version.');
            }
        }
    };

    const handleLoadTemplate = (flow: FlowGraph) => {
         handleLoadFlow(flow as any, true);
    };

    const resetToNewFlow = (withConfirmation = true) => {
        const performReset = () => {
            setBlocks([{ id: `block_${crypto.randomUUID()}`, ...DEFAULT_BLOCKS.open_page }]);
            setFlowName('My Test Flow');
            setGlobalVariables([]);
            setCurrentFlowId(null);
            setDialogConfig(prev => ({ ...prev, isOpen: false }));
        };

        if (withConfirmation) {
            setDialogConfig({
                isOpen: true,
                title: 'New Flow',
                message: 'Create a new flow? All unsaved changes on the current canvas will be lost.',
                confirmLabel: 'Create New',
                isDestructive: true,
                onConfirm: performReset
            });
        } else {
            performReset();
        }
    };

    const handleDeleteCurrent = () => {
        if (!currentFlowId) {
            resetToNewFlow(true);
            return;
        }
        if (currentFlowId) {
            setDialogConfig({
                isOpen: true,
                title: 'Delete Flow',
                message: `Delete "${flowName}"? This cannot be undone.`,
                confirmLabel: 'Delete Forever',
                isDestructive: true,
                onConfirm: () => {
                    FlowStorage.delete(currentFlowId);
                    setCurrentFlowId(null);
                    setBlocks([{ id: `block_${crypto.randomUUID()}`, ...DEFAULT_BLOCKS.open_page }]);
                    setFlowName('My Test Flow');
                    setGlobalVariables([]);
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        }
    };

    const activeBlock = blocks.find(b => b.id === activeDragId);
    const contextUrl = blocks.find(b => b.type === 'open_page')?.params.url;

    // Selection Helpers
    const getConnectedChain = (targetId: string): Set<string> => {
        const chain = new Set<string>();
        
        // Find the root of this chain
        let rootId = targetId;
        const visitedRoot = new Set();
        while (rootId && !visitedRoot.has(rootId)) {
            visitedRoot.add(rootId);
            // Re-evaluating based on EditorBlock parentId
            const currentBlock = blocks.find(x => x.id === rootId);
            if (currentBlock?.parentId) {
                rootId = currentBlock.parentId;
            } else {
                break;
            }
        }

        // BFS to find all descendants from root
        const queue = [rootId];
        while (queue.length > 0) {
            const id = queue.shift()!;
            if (chain.has(id)) continue;
            chain.add(id);
            
            const children = blocks.filter(b => b.parentId === id);
            children.forEach(c => queue.push(c.id));
        }

        return chain;
    };

    const activeFlowIds = useMemo(() => {
        if (!highlightBlockId) return new Set<string>();
        return getConnectedChain(highlightBlockId);
    }, [blocks, highlightBlockId]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('[data-block-id], button, input, select, textarea');
        if (!isInteractive) {
            onBlockClick?.('');
        }
    };

    // Callback for Overlay structural rendering
    const renderOverlayBlockList = ({ parentId, branchKey }: { parentId: string, branchKey?: string }) => (
        <RenderBlockList 
            blocks={blocks}
            parentId={parentId}
            branchKey={branchKey}
            blockStatuses={blockStatuses}
            blockMessages={blockMessages}
            contextUrl={contextUrl}
            globalVariables={globalVariables}
            deleteBlock={deleteBlock}
            duplicateBlock={duplicateBlock}
            updateBlock={updateBlock}
            onAddBlock={addBlock}
            onRequestPick={onRequestPick}
            onMoveToBranch={handleMoveToBranch}
            highlightBlockId={highlightBlockId}
            onBlockClick={onBlockClick}
            activeSnapTarget={activeSnapTarget}
            activeFlowIds={activeFlowIds}
            selectionExists={!!highlightBlockId}
            savedValues={normalizedSavedValues}
        />
    );



    return (
      <div className="flex h-full bg-gray-950 text-gray-200 font-sans">
        {/* Sidebar */}
        <div 
          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
          className={`
            flex flex-col border-r border-zinc-900 bg-black relative z-40
            ${isResizingSidebar ? '' : 'transition-[width] duration-300'}
        `}>
          {/* VSCode-style Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/20">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Blocks</span>
          </div>

          {/* Resizer Handle */}
          {isSidebarOpen && (
            <div 
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingSidebar(true);
                }}
                className={`absolute -right-0.5 top-0 bottom-0 w-1 cursor-col-resize z-40 transition-colors ${isResizingSidebar ? 'bg-white' : 'hover:bg-white/50'}`}
                title="Resize Sidebar"
            />
          )}

          <div className={`flex flex-col h-full overflow-hidden ${!isSidebarOpen && 'hidden'}`}>
              {/* Search Blocks */}
              <div className="p-4 border-b border-white/10 flex-none">
                <input
                  type="text"
                  placeholder="Search blocks..."
                  value={blockSearchQuery}
                  onChange={(e) => setBlockSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 rounded px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all font-bold tracking-tight"
                />
              </div>

              {/* Scrollable Blocks Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* Core Blocks */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Core</h2>
                  <div className="grid gap-2">
                    {(['open_page', 'delay', 'refresh_page', 'wait_for_page_load'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Control Flow */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Control Flow</h2>
                  <div className="grid gap-2">
                    {(['if_condition', 'repeat_until'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Actions</h2>
                  <div className="grid gap-2">
                    {(['click_element', 'enter_text', 'submit_form', 'submit_current_input', 'activate_primary_action', 'select_option', 'upload_file'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dialog */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Dialog</h2>
                  <div className="grid gap-2">
                    {(['confirm_dialog', 'dismiss_dialog'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verification */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Verification</h2>
                  <div className="grid gap-2">
                    {(['wait_until_visible', 'assert_visible', 'verify_text', 'verify_page_content', 'verify_page_title', 'verify_url', 'verify_element_enabled', 'verify_network_request', 'verify_performance', 'observe_network'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Navigation</h2>
                  <div className="grid gap-2">
                    {(['scroll_to_element', 'switch_tab'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Data</h2>
                  <div className="grid gap-2">
                    {(['save_text', 'save_page_content', 'use_saved_value', 'get_cookies', 'get_local_storage', 'get_session_storage'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-gray-800/50 hover:bg-gray-800 hover:border-indigo-500/30 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-gray-900 text-gray-400 group-hover:text-indigo-400">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variables Section */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-default select-none">Global Variables</h2>
                    <button 
                      onClick={() => setGlobalVariables(prev => [...prev, { id: `var_${crypto.randomUUID()}`, key: `var_${prev.length + 1}`, value: '' }])}
                      className="p-1 rounded bg-gray-900 border border-white/10 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {globalVariables.map((variable) => (
                      <div key={variable.id} className="group relative bg-gray-800/30 border border-white/5 rounded p-2 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder="Name..."
                            value={variable.key}
                            onChange={(e) => setGlobalVariables(prev => prev.map(v => v.id === variable.id ? { ...v, key: e.target.value } : v))}
                            className="bg-black/20 border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:outline-none focus:border-white/20 w-full"
                          />
                          <button 
                            onClick={() => setGlobalVariables(prev => prev.filter(v => v.id !== variable.id))}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-rose-500 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Value..."
                          value={variable.value}
                          onChange={(e) => setGlobalVariables(prev => prev.map(v => v.id === variable.id ? { ...v, value: e.target.value } : v))}
                          className="bg-black/20 border border-white/5 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 focus:outline-none focus:border-white/20 w-full"
                        />
                      </div>
                    ))}
                    {globalVariables.length === 0 && (
                      <p className="text-[10px] text-gray-600 italic px-1">No variables defined</p>
                    )}
                  </div>
                </div>

                {/* Scenario Testing Section */}
                <div className="pt-4 border-t border-white/10">
                  <ScenarioPanel 
                    flowJson={FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion)}
                    onExecutionComplete={(report) => {
                      setSuiteReport(report);
                    }}
                    onUpdateFlow={(updatedFlow) => {
                      setScenarioSets(updatedFlow.scenario_sets || []);
                      // Auto-save when a set is updated
                      setTimeout(handleSave, 100);
                    }}
                  />
                </div>
              </div>
              
              <div className="border-t border-white/10 p-4 space-y-4 bg-black flex-none">

                 <div className="space-y-1.5">
                     <label className="text-[9px] uppercase text-zinc-600 font-black tracking-widest">Flow Name</label>
                     <input
                      value={flowName}
                      onChange={e => setFlowName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/20 transition-all placeholder:text-zinc-700 font-bold tracking-tight"
                      placeholder="e.g. Checkout Test"
                    />
                 </div>
                 
                  <div className="grid grid-cols-2 gap-2 mt-4">
                      <button 
                         onClick={handleSave}
                         className="flex items-center justify-center gap-2 bg-white text-black py-2 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 border border-white"
                      >
                         <Save className="w-3.5 h-3.5" />
                         Save
                      </button>
                      <button 
                         onClick={handleOpenLoadModal}
                         className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 active:scale-95 shadow-lg"
                      >
                         <FolderOpen className="w-3.5 h-3.5" />
                         Load
                      </button>
                      <button 
                         onClick={handleDeleteCurrent}
                         className={`flex items-center justify-center gap-2 col-span-2 py-2 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all border active:scale-95 ${
                            currentFlowId 
                            ? 'bg-zinc-950 border-white/20 text-white hover:bg-zinc-900 shadow-inner' 
                            : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800'
                         }`}
                      >
                         {currentFlowId ? <Trash2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                         {currentFlowId ? 'Delete Flow' : 'Clear Canvas'}
                      </button>
                  </div>
              </div>
          </div>
        </div>

        
        {/* Helper Handle when closed to reopen easily if the small toggle is hard to hit (optional, keeping clean for now) */}


        <div 
            className="flex-1 relative overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing"
            onClick={handleCanvasClick}
            onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    setView(prev => ({ ...prev, scale: Math.min(Math.max(0.2, prev.scale * delta), 3) }));
                } else {
                     setView(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
                }
            }}
            onMouseDown={(e) => {
                 const target = e.target as HTMLElement;
                 const isInteractive = target.closest('[data-block-id], button, input, select, textarea, [role="button"]');
                 
                 // Enable panning on middle mouse button or when clicking on non-interactive canvas areas
                 if (e.button === 1 || !isInteractive) {
                     if (e.button === 1) e.preventDefault();
                     setIsPanning(true);
                 }
            }}
            onMouseMove={(e) => {
                if (isPanning) {
                    setView(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
                }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
        >
          {/* Background Grid Pattern */}
          <div 
             className="absolute inset-0 canvas-bg" 
             style={{ 
                 backgroundPosition: `${view.x}px ${view.y}px`,
                 backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
                 backgroundImage: `radial-gradient(rgba(255,255,255,0.1) ${1.5 * view.scale}px, transparent ${1.5 * view.scale}px)`
             }} 
          />

          {/* Transform Container */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}

            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
                <div 
                    style={{ 
                        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                        transformOrigin: '0 0',
                    }}
                    className="absolute inset-0 w-full h-full"
                >
                    <div className="relative w-full h-full min-w-[10000px] min-h-[10000px]">
                        <RenderBlockList 
                            blocks={blocks}
                            parentId={undefined}
                            branchKey={undefined}
                            blockStatuses={blockStatuses}
                            blockMessages={blockMessages}
                            contextUrl={contextUrl}
                            globalVariables={globalVariables}
                            deleteBlock={deleteBlock}
                            duplicateBlock={duplicateBlock}
                            updateBlock={updateBlock}
                            onAddBlock={addBlock}
                            onRequestPick={onRequestPick}
                            onMoveToBranch={handleMoveToBranch}
                            highlightBlockId={highlightBlockId}
                            onBlockClick={onBlockClick}
                            activeSnapTarget={activeSnapTarget}
                            activeFlowIds={activeFlowIds}
                            selectionExists={!!highlightBlockId}
                            savedValues={normalizedSavedValues}
                        />


                        {blocks.filter(b => !b.parentId).length === 0 && (
                            <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/5 rounded-xl canvas-bg">
                                <p>Drag blocks here or click to add</p>
                            </div>
                        )}

                        <SnapGuides 
                            activeSnapTarget={activeSnapTarget}
                            blocks={blocks}
                            effectivePositions={effectivePositions}
                        />
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeBlock ? (
                        <div style={{ 
                            transform: `scale(${view.scale})`,
                            transformOrigin: 'top left',
                            willChange: 'transform',
                            zIndex: 1000
                        }}>
                            <BaseBlockOverlay
                                id={activeBlock.id} 
                                block={activeBlock} 
                                isActive 
                                blocks={blocks}
                                renderBlockList={renderOverlayBlockList}
                            /> 
                        </div>
                    ) : null}
                </DragOverlay>
          </DndContext>
          
          {/* Canvas Toolbar */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-50">
             <button 
                onClick={resetView}
                className="flex items-center justify-center p-3 bg-zinc-950 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)] active:scale-95 group"
                title="Reset View"
             >
                <LocateFixed className="w-4 h-4 group-hover:scale-110 transition-transform" />
             </button>

              <button 
                 onClick={() => setShowAiReview(!showAiReview)}
                 className={cn(
                    "flex items-center justify-center p-3 bg-zinc-950 border rounded-xl transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)] active:scale-95 group",
                    showAiReview ? "border-indigo-500 text-white bg-indigo-500/10" : "border-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-900/40"
                 )}
                 title="AI Assistant"
              >
                 <Sparkles className={cn("w-4 h-4 group-hover:scale-110 transition-transform", showAiReview && "animate-pulse")} />
              </button>
             
             <div className="bg-zinc-950 border border-white/10 rounded-xl p-1.5 flex flex-col items-center gap-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                <button 
                    onClick={() => setView(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }))}
                    className="flex items-center justify-center p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
                <div className="text-[10px] font-black w-10 text-center text-zinc-600 tracking-tighter tabular-nums select-none">
                    {Math.round(view.scale * 100)}%
                </div>
                <button 
                    onClick={() => setView(prev => ({ ...prev, scale: Math.max(0.2, prev.scale - 0.1) }))}
                    className="flex items-center justify-center p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <Minus className="w-4 h-4" />
                </button>
             </div>
          </div>

          <Minimap 
            blocks={blocks}
            view={view}
            onViewChange={(x, y) => setView({ ...view, x, y })}
          />

          {/* Load Modal */}
          {isLoadModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] w-[450px] flex flex-col max-h-[80vh] overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-black flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Load Test Flow</h3>
                        <button onClick={() => setIsLoadModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-950/50">
                        {savedFlows.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600 text-[10px] font-black uppercase tracking-widest italic opacity-50">No saved flows available</div>
                        ) : (
                            savedFlows.map(f => (
                                <div key={f.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 group border border-transparent hover:border-white/10 transition-all cursor-pointer shadow-sm active:scale-[0.98]" onClick={() => handleLoadFlow(f.id)}>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors truncate">{f.name}</div>
                                        <div className="text-[9px] font-bold text-zinc-600 mt-1 uppercase tracking-tight">{new Date(f.updatedAt).toLocaleString()}</div>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDialogConfig({
                                                isOpen: true,
                                                title: 'Delete Flow',
                                                message: `Permanentely delete "${f.name}"?`,
                                                confirmLabel: 'Delete',
                                                isDestructive: true,
                                                onConfirm: () => {
                                                    FlowStorage.delete(f.id);
                                                    setSavedFlows(FlowStorage.list());
                                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                }
                                            });
                                        }}
                                        className="p-2 text-zinc-800 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Flow"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
          )}

            <OnboardingModal 
                onDismiss={() => setShowOnboarding?.(false)} 
                onLoadFlow={handleLoadTemplate} 
                forceOpen={!!showOnboarding}
            />

            <ConfirmationDialog 
                {...dialogConfig}
                onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Scenario Suite Dashboard Overlay */}
            {suiteReport && (
                <div className="fixed inset-0 z-[100] bg-black">
                <ScenarioSuiteDashboard 
                    report={suiteReport}
                    flowJson={FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion)}
                    onViewScenario={(runId) => {
                        console.log("View scenario:", runId);
                        onViewScenario?.(runId);
                    }}
                    onBackToEditor={() => setSuiteReport(null)}
                />
                </div>
            )}
        </div>

        {/* AI Side Panel (Right-side Collapsible) */}
        <div 
            className={cn(
                "bg-zinc-950 border-l border-white/5 flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden z-40 relative",
                showAiReview ? "w-[400px]" : "w-0 border-l-0"
            )}
        >
            <div className="w-[400px] flex flex-col h-full bg-black/40 backdrop-blur-xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-400" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">AI Control Panel</h3>
                    </div>
                    <button 
                        onClick={() => setShowAiReview(false)}
                        className="p-2 hover:bg-white/5 rounded-xl text-zinc-600 hover:text-white transition-all active:scale-90"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {/* Role 1: AI Translator */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">AI Translator</h4>
                            <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-indigo-500/20">Draft Mode</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                            Describe your intent. AI creates a non-runnable draft (Role 1).
                        </p>
                        <textarea 
                            value={intentText}
                            onChange={(e) => setIntentText(e.target.value)}
                            placeholder="e.g. Test checkout flow with empty cart..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/30 transition-all resize-none h-24 placeholder:text-zinc-700 font-medium shadow-inner"
                        />
                        <button 
                            onClick={handleGenerateDraft}
                            disabled={isGeneratingDraft || !intentText.trim()}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isGeneratingDraft && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                            {isGeneratingDraft ? 'Translating...' : 'Generate Test Draft'}
                        </button>

                        {translatorFeedback && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <AIInsight 
                                    roleLabel="AI Draft"
                                    type="draft"
                                    content={translatorFeedback}
                                    isCollapsible={false}
                                    className="bg-indigo-500/5 border-indigo-500/10"
                                />
                                <button 
                                    onClick={handleApplyDraft}
                                    className="w-full mt-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-300 rounded-xl transition-all"
                                >
                                    Apply to Canvas
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Role 3: Live Investigator */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Flow Review</h4>
                            <span className="text-[8px] bg-white/5 text-zinc-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-white/10">Evidence Based</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
                            Audit the current flow (Role 3) for logic and potential failure points.
                        </p>
                        <button 
                            onClick={handleReviewFlow}
                            disabled={isAiReviewLoading}
                            className="w-full py-3 border border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isAiReviewLoading && <div className="w-3 h-3 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />}
                            Run Flow Review
                        </button>

                        {aiReview && !isAiReviewLoading && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <AIInsight 
                                    type="inspection" 
                                    roleLabel="AI Analysis"
                                    content={aiReview} 
                                    isCollapsible={false}
                                />
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Role 4: WebLens Assistant */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">WebLens Assistant</h4>
                            <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-blue-500/20">Educational</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
                            Ask about philosophies or block behaviors (Role 4).
                        </p>
                        <div className="relative">
                            <input 
                                value={companionQuery}
                                onChange={(e) => setCompanionQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskCompanion()}
                                placeholder="What is a 'Save Text' block?"
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/30 transition-all placeholder:text-zinc-700 font-medium"
                            />
                            <button 
                                onClick={handleAskCompanion}
                                disabled={isCompanionLoading || !companionQuery.trim()}
                                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-all active:scale-90"
                            >
                                <Plus size={16} className={isCompanionLoading ? "animate-spin" : ""} />
                            </button>
                        </div>

                        {companionAnswer && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <AIInsight 
                                    roleLabel="AI Explanation"
                                    type="inspection"
                                    content={companionAnswer}
                                    onClose={() => setCompanionAnswer("")}
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 border-t border-white/5 bg-black/20">
                    <p className="text-[9px] text-zinc-700 uppercase tracking-[0.2em] text-center font-black">
                        Constitutional Advisory Only
                    </p>
                </div>
            </div>
        </div>

        {/* Global Resize Overlay */}
        {isResizingSidebar && (
            <div className="fixed inset-0 z-[9999] cursor-col-resize" />
        )}
      </div>
    );
  }
);
