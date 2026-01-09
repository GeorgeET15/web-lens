import { FlowGraph } from '../types/flow';
import { supabase } from './supabase';

const STORAGE_KEY = 'antigravity_flows';
const API_BASE = 'http://localhost:8000/api';

export interface SavedFlowMetadata {
  id: string;
  name: string;
  updatedAt: number;
  source?: 'local' | 'cloud';
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
    return Object.values(all)
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt, source: 'local' as const }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  save: (flow: FlowGraph, existingId?: string): SavedFlowMetadata => {
    const all = FlowStorage.getAll();
    const id = existingId || crypto.randomUUID();
    
    const record: SavedFlow = {
      id,
      name: flow.name,
      updatedAt: Date.now(),
      flow,
      source: 'local'
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
      
      return cloudFlows.map((f: any) => ({
        id: f.id,
        name: f.name,
        updatedAt: new Date(f.updated_at).getTime(),
        source: 'cloud'
      }));
    } catch (e) {
      console.error('Cloud list failed', e);
      return [];
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
      const found = cloudFlows.find((f: any) => f.id === id);
      return found ? found.graph : null;
    } catch (e) {
      console.error('Cloud load failed', e);
      return null;
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
  }
};
