import { FlowGraph, FlowBlock } from '../types/flow';
import { DEFAULT_BLOCKS } from '../editor/constants';
import { EditorBlock, BlockType } from '../editor/entities';

/**
 * Handles conversion between Canonical Flow JSON (Backend) and Editor State (Frontend).
 * STRICTLY TYPED. NO DATA LOSS.
 */
export const FlowTransformer = {

  /**
   * Converts Editor State (Tree/List) to Canonical Flow JSON.
   */
  toCanonical: (
    flowName: string, 
    blocks: EditorBlock[], 
    globalVariables: { key: string, value: string }[],
    scenarioSets: any[] = [],
    schema_version: number = 1,
    id?: string,
    description?: string,
    chat_history?: any
  ): FlowGraph => {
    
    // 1. Convert Variables
    const variables: Record<string, string> = {};
    globalVariables.forEach(v => {
      if (v.key) variables[v.key] = v.value;
    });

    // 2. Map Blocks to FlowBlocks
    // We need to re-calculate next_block based on the visual list order
    const flowBlocks: FlowBlock[] = blocks.map((block) => {
      let nextBlockId: string | null = null;
      
      // 1. Check for a sequential child (explicit snap to this specific block)
      const sequentialChild = blocks.find(b => b.parentId === block.id && b.branchKey === undefined);
      if (sequentialChild) {
          nextBlockId = sequentialChild.id;
      } 
      // 2. If no direct child, check for a sibling in the same chain/branch
      // This includes root blocks (where parentId is undefined)
      else {
          const sameLevelBlocks = blocks.filter(b => 
            b.parentId === block.parentId && 
            b.branchKey === block.branchKey
          );
          const index = sameLevelBlocks.findIndex(b => b.id === block.id);
          const nextSibling = sameLevelBlocks[index + 1];
          if (nextSibling) {
              nextBlockId = nextSibling.id;
          }
      }

      // Resolve nested block IDs for branches
      // The backend expects a LIST of IDs for the branch body.
      // Since 'blocks' is our source of truth for order, we filter by parentId
      const then_blocks = blocks
        .filter(b => b.parentId === block.id && b.branchKey === 'then')
        .map(b => b.id);
        
      const else_blocks = blocks
        .filter(b => b.parentId === block.id && b.branchKey === 'else')
        .map(b => b.id);
        
      const body_blocks = blocks
        .filter(b => b.parentId === block.id && b.branchKey === 'body')
        .map(b => b.id);

      // Construct Canonical Block
      const flowBlock: FlowBlock = {
        id: block.id,
        type: block.type,
        label: block.label,
        next_block: nextBlockId,
        position: block.position,
        ...block.params, // Spread existing params (url, element, etc)
      };

      // Assign branch specific fields if applicable
      if (block.type === 'if_condition') {
        flowBlock['then_blocks'] = then_blocks;
        flowBlock['else_blocks'] = else_blocks;
      }
      if (block.type === 'repeat_until') {
        flowBlock['body_blocks'] = body_blocks;
      }

      return flowBlock;
    });

    // 3. Determine Entry Block
    // The entry block is the first block with no parent
    const entryBlock = blocks.find(b => !b.parentId);

    return {
      id,
      name: flowName,
      schema_version,
      description,
      entry_block: entryBlock ? entryBlock.id : '',
      blocks: flowBlocks,
      variables,
      scenario_sets: scenarioSets.map(set => ({
        id: set.id,
        name: set.name,
        created_at: set.createdAt || set.created_at,
        scenarios: set.scenarios.map((s: any) => ({
          scenario_id: s.scenarioId || s.scenario_id,
          scenario_name: s.scenarioName || s.scenario_name,
          values: s.values
        }))
      })),
      chat_history: chat_history || {}
    };
  },

  /**
   * Converts Canonical Flow JSON to Editor State (Rehydration).
   * RECURSIVE RECONSTRUCTION.
   */
  toEditorState: (flow: FlowGraph): { 
    blocks: EditorBlock[], 
    name: string, 
    variables: { id: string, key: string, value: string }[],
    scenarioSets: any[],
    schemaVersion: number,
    description?: string
  } => {
    
    // 1. Index blocks for O(1) lookup
    const blockMap = new Map<string, FlowBlock>();
    flow.blocks.forEach(b => blockMap.set(b.id, b));

    const resultBlocks: EditorBlock[] = [];
    
    // Helper to process a chain of blocks as siblings
    function processChain(startId: string, parentId?: string, branchKey?: 'then' | 'else' | 'body') {
      let currentId: string | null | undefined = startId;
      let isFirst = true;
      let chainHeadId: string | undefined = undefined;

      while (currentId && blockMap.has(currentId) && !processedIds.has(currentId)) {
        const rawBlock = blockMap.get(currentId);
        if (!rawBlock) break;
        processedIds.add(currentId);

        const { id, type, next_block, ...params } = rawBlock;
        const defaults = DEFAULT_BLOCKS[type as BlockType];
        
        let effectiveParentId = parentId;
        let effectiveBranchKey = branchKey;

        if (!isFirst && !branchKey) {
            effectiveParentId = chainHeadId;
            effectiveBranchKey = undefined;
        }

        const editorBlock: EditorBlock = {
          id: rawBlock.id,
          type: rawBlock.type as BlockType,
          label: defaults?.label || rawBlock.type,
          params: params,
          parentId: effectiveParentId,
          branchKey: effectiveBranchKey,
          position: rawBlock.position
        };
        resultBlocks.push(editorBlock);
        
        if (isFirst) {
            chainHeadId = id;
        }

        if (type === 'if_condition') {
          const thenIds = (rawBlock['then_blocks'] as string[]) || [];
          const elseIds = (rawBlock['else_blocks'] as string[]) || [];
          if (thenIds[0]) processChain(thenIds[0], id, 'then');
          if (elseIds[0]) processChain(elseIds[0], id, 'else');
        }
        if (type === 'repeat_until') {
          const bodyIds = (rawBlock['body_blocks'] as string[]) || [];
          if (bodyIds[0]) processChain(bodyIds[0], id, 'body');
        }

        isFirst = false;
        currentId = next_block;
      }
    }

    const processedIds = new Set<string>();
    // First, process the main entry chain
    if (flow.entry_block) {
        processChain(flow.entry_block);
    }

    // Then, process any potential orphaned root heads
    flow.blocks.forEach(b => {
        if (!processedIds.has(b.id)) {
            // Check if this block is a head (no one points to it)
            const isHead = !flow.blocks.some(other => 
                other.next_block === b.id || 
                (other['then_blocks'] as string[])?.includes(b.id) ||
                (other['else_blocks'] as string[])?.includes(b.id) ||
                (other['body_blocks'] as string[])?.includes(b.id)
            );
            
            if (isHead) {
                processChain(b.id);
            }
        }
    });

    // Finally, if anything is STILL left (cycles or weirdness), process it
    flow.blocks.forEach(b => {
        if (!processedIds.has(b.id)) {
            processChain(b.id);
        }
    });
    
    // 3. Restore Variables
    const variables = Object.entries(flow.variables || {}).map(([key, value]) => ({
      id: `var_${Math.random().toString(36).substr(2, 9)}`,
      key,
      value: value as string
    }));

    return {
      blocks: resultBlocks,
      name: flow.name,
      variables,
      scenarioSets: (flow.scenario_sets || []).map(set => ({
        id: set.id,
        name: set.name,
        createdAt: set.created_at || (set as any).createdAt,
        scenarios: set.scenarios.map((s: any) => ({
          scenarioId: s.scenario_id || s.scenarioId,
          scenarioName: s.scenario_name || s.scenarioName,
          values: s.values
        }))
      })),
      schemaVersion: flow.schema_version || 1,
      description: flow.description
    };
  }
};
