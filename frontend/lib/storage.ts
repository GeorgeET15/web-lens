import { FlowGraph } from '../types/flow';
import { ChatHistory } from '../types/chat';
import { supabase } from './supabase';

const STORAGE_KEY = 'antigravity_flows';
const API_BASE = '/api';

export interface SavedFlowMetadata {
  id: string;
  name: string;
  updatedAt: number;
  lastUsedAt?: number;
  lastRun?: string | number;
  source?: 'local' | 'cloud';
  sources?: ('local' | 'cloud')[];
  primarySource?: 'local' | 'cloud';
}

export interface SavedFlow extends SavedFlowMetadata {
  flow: FlowGraph;
}

export const FlowStorage = {
  // --- Local Storage (Legacy/Offline) ---
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
    const usage = FlowStorage.getUsageMap();
    return Object.values(all)
      .map(({ id, name, updatedAt }) => ({ 
          id, 
          name, 
          updatedAt, 
          lastUsedAt: usage[id],
          source: 'local' as const,
          sources: ['local' as const]
      }))
      .sort((a, b) => (b.lastUsedAt || b.updatedAt) - (a.lastUsedAt || a.updatedAt));
  },

  save: (flow: FlowGraph, existingId?: string): SavedFlowMetadata => {
    const all = FlowStorage.getAll();
    const id = existingId || crypto.randomUUID();
    
    const record: SavedFlow = {
      id,
      name: flow.name,
      updatedAt: Date.now(),
      flow,
      source: 'local',
      sources: ['local']
    };

    all[id] = record;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return record;
  },

  // --- Cloud Storage (Supabase Proxy) ---
  saveCloud: async (flow: FlowGraph): Promise<{ id: string } | null> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await fetch(`${API_BASE}/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ flow })
      });

      if (!res.ok) throw new Error('Failed to save to cloud');
      return await res.json();
    } catch (e) {
      console.error('Cloud save failed', e);
      return null;
    }
  },

  listCloud: async (): Promise<SavedFlowMetadata[]> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return [];

      const res = await fetch(`${API_BASE}/flows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) return [];
      const cloudFlows = await res.json();
      const usage = FlowStorage.getUsageMap();
      
      return cloudFlows.map((f: { id: string; name: string; updated_at: string; last_run?: string }) => ({
        id: f.id,
        name: f.name,
        updatedAt: new Date(f.updated_at).getTime(),
        lastRun: f.last_run,
        lastUsedAt: usage[f.id] || (f.last_run ? new Date(f.last_run).getTime() : undefined),
        source: 'cloud',
        sources: ['cloud']
      })).sort((a: SavedFlowMetadata, b: SavedFlowMetadata) => {
        const aTime = a.lastUsedAt || a.updatedAt;
        const bTime = b.lastUsedAt || b.updatedAt;
        return bTime - aTime;
      });
    } catch (e) {
      console.error('Cloud list failed', e);
      return [];
    }
  },

  trackUsageCloud: async (id: string): Promise<void> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      await fetch(`${API_BASE}/usage/track-flow/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Cloud usage tracking failed', e);
    }
  },

  loadCloud: async (id: string): Promise<FlowGraph | null> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return null;

      const res = await fetch(`${API_BASE}/flows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) return null;
      const cloudFlows = await res.json();
      // The backend returns the list with 'graph' key
      const found = cloudFlows.find((f: { id: string; graph: FlowGraph; chat_history?: ChatHistory }) => f.id === id);
      if (!found) return null;
      return {
        ...found.graph,
        chat_history: found.chat_history || found.graph?.chat_history || {}
      };
    } catch (e) {
      console.error('Cloud load failed', e);
      return null;
    }
  },

  syncChatToCloud: async (id: string, chatHistory: ChatHistory): Promise<boolean> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return false;

      console.log(`[FlowStorage] Syncing chat to cloud for flow ${id}`, chatHistory);
      const res = await fetch(`${API_BASE}/ai/flows/${id}/chat`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chat_history: chatHistory })
      });

      return res.ok;
    } catch (e) {
      console.error('Chat sync failed', e);
      return false;
    }
  },

  syncChatLocally: (id: string, chatHistory: ChatHistory) => {
    try {
      const all = FlowStorage.getAll();
      if (all[id]) {
        all[id].flow.chat_history = chatHistory;
        all[id].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.error('Local chat sync failed', e);
    }
  },

  load: (id: string): FlowGraph | null => {
    const all = FlowStorage.getAll();
    return all[id]?.flow || null;
  },

  deleteCloud: async (id: string): Promise<boolean> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return false;

      const res = await fetch(`${API_BASE}/flows/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return res.ok;
    } catch (e) {
      console.error('Cloud delete failed', e);
      return false;
    }
  },

  delete: (id: string) => {
    const all = FlowStorage.getAll();
    if (all[id]) {
      delete all[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  },

  // --- Usage Tracking ---
  trackUsage: (id: string) => {
    try {
      const usage = JSON.parse(localStorage.getItem('antigravity_flow_usage') || '{}');
      usage[id] = Date.now();
      localStorage.setItem('antigravity_flow_usage', JSON.stringify(usage));
    } catch (e) {
      console.error('Failed to track usage', e);
    }
  },

  getUsageMap: (): Record<string, number> => {
    try {
      return JSON.parse(localStorage.getItem('antigravity_flow_usage') || '{}');
    } catch (e) {
      return {};
    }
  }
};

