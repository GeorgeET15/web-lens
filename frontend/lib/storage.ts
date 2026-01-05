import { FlowGraph } from '../types/flow';

const STORAGE_KEY = 'antigravity_flows';

export interface SavedFlowMetadata {
  id: string;
  name: string;
  updatedAt: number;
}

export interface SavedFlow extends SavedFlowMetadata {
  flow: FlowGraph;
}

export const FlowStorage = {
  getAll: (): Record<string, SavedFlow> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Failed to parse flow storage', e);
      return {};
    }
  },

  list: (): SavedFlowMetadata[] => {
    const all = FlowStorage.getAll();
    return Object.values(all)
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  save: (flow: FlowGraph, existingId?: string): SavedFlowMetadata => {
    const all = FlowStorage.getAll();
    const id = existingId || crypto.randomUUID();
    
    const record: SavedFlow = {
      id,
      name: flow.name,
      updatedAt: Date.now(),
      flow
    };

    all[id] = record;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return record;
  },

  load: (id: string): FlowGraph | null => {
    const all = FlowStorage.getAll();
    return all[id]?.flow || null;
  },

  delete: (id: string) => {
    const all = FlowStorage.getAll();
    if (all[id]) {
      delete all[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  }
};
