
import React, { useState } from 'react';
import { X, Plus, Trash2, Globe, Key, AlertCircle } from 'lucide-react';
import { Environment } from '../types/environment';
import { Skeleton } from './Skeleton';

interface EnvironmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  isLoading?: boolean;
  onAdd: (env: Environment) => void;
  onDelete: (id: string) => void;
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  isOpen,
  onClose,
  environments,
  isLoading,
  onAdd,
  onDelete
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvVars, setNewEnvVars] = useState<string>('BASE_URL=http://localhost:3000');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newEnvName.trim()) return;

    const variables: Record<string, string> = {};
    newEnvVars.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        variables[key.trim()] = values.join('=').trim();
      }
    });

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: newEnvName,
      variables
    });

    setNewEnvName('');
    setNewEnvVars('BASE_URL=http://localhost:3000');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                <Globe className="w-4 h-4 text-white" />
             </div>
             <div>
                <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Environments</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Manage execution contexts</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <Skeleton className="w-8 h-8 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-48 rounded-full" />
                    <Skeleton className="h-3 w-32 rounded-full opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : environments.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
               <Globe className="w-12 h-12 opacity-10 mb-4" />
               <p className="text-[11px] font-bold uppercase tracking-widest italic">No environments defined</p>
               <button 
                 onClick={() => setIsAdding(true)}
                 className="mt-4 px-4 py-2 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
               >
                 Create First Environment
               </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {environments.map(env => (
                <div 
                  key={env.id}
                  className="p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-[13px] font-bold text-white mb-1">{env.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">{env.id}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDelete(env.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      title="Delete Environment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                    <div className="space-y-2">
                    {Object.entries(env.variables || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 text-[11px]">
                        <Key className="w-3 h-3 text-zinc-500" />
                        <span className="text-zinc-400 font-bold">{key}:</span>
                        <span className="text-white font-mono">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAdding && (
            <div className="p-6 bg-white/5 border border-white/20 rounded-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Name</label>
                  <input 
                    type="text"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    placeholder="e.g. Staging, Production"
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-[12px] text-white focus:outline-none focus:border-white/40 transition-all font-bold"
                  />
               </div>

               <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block">Variables</label>
                    <span className="text-[9px] text-zinc-600 italic font-medium">KEY=VALUE per line</span>
                  </div>
                  <textarea 
                    value={newEnvVars}
                    onChange={(e) => setNewEnvVars(e.target.value)}
                    rows={4}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-[12px] text-zinc-400 focus:outline-none focus:border-white/40 transition-all font-mono"
                  />
               </div>

               <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={handleAdd}
                    className="flex-1 px-4 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Environment
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-3 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/50 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-500">
               <AlertCircle className="w-3.5 h-3.5" />
               <span className="text-[9px] font-bold uppercase tracking-wider italic">Relative URLs will prepend BASE_URL</span>
            </div>
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                New Environment
              </button>
            )}
        </div>
      </div>
    </div>
  );
};
