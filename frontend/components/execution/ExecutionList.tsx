import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  Search, Trash2
} from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import { ExecutionSummary } from '../../types/execution';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../Skeleton';
import { supabase } from '../../lib/supabase';
import { ConfirmationDialog } from '../ConfirmationDialog';

interface Props {
  onSelect: (runId: string) => void;
  selectedRunId?: string;
  className?: string;
}

const ExecutionList: React.FC<Props> = ({ 
  onSelect, 
  selectedRunId,
  className 
}) => {
  const [runs, setRuns] = useState<ExecutionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchRuns();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
        fetchRuns(true); // silent fetch
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchRuns = async (isPolling = false) => {
    try {
      if (!isPolling) setIsLoading(true);
      const res = await fetch(API_ENDPOINTS.EXECUTIONS); 
      if (!res.ok) throw new Error('Failed to fetch execution history');
      const data = await res.json();
      setRuns(data);
    } catch (err) {
      if (!isPolling) setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (deletingId) return;

    setConfirmDialog({
        isOpen: true,
        title: 'Delete Execution',
        message: 'Are you sure you want to delete this execution trace? This cannot be undone.',
        isDestructive: true,
        onConfirm: async () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            try {
                setDeletingId(runId);
                
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const res = await fetch(`${API_ENDPOINTS.EXECUTIONS}/${runId}`, {
                    method: 'DELETE',
                    headers
                });
                
                if (!res.ok) throw new Error('Failed to delete');
                
                // Optimistic update
                setRuns(prev => prev.filter(r => r.run_id !== runId));
                (window as any).addToast?.('success', 'Execution trace deleted');

            } catch (err) {
                console.error('Delete failed:', err);
                (window as any).addToast?.('error', 'Failed to delete execution trace');
            } finally {
                setDeletingId(null);
            }
        }
    });
  };

  const handleClearHistory = async () => {
    if (isClearing) return;

    setConfirmDialog({
        isOpen: true,
        title: 'Clear History',
        message: 'DANGER: This will permanently delete ALL execution history, including screenshots and logs. This action CANNOT be undone.',
        isDestructive: true,
        onConfirm: async () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            try {
                setIsClearing(true);
                
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const res = await fetch(API_ENDPOINTS.EXECUTIONS, {
                    method: 'DELETE',
                    headers
                });

                if (!res.ok) throw new Error('Failed to clear history');

                setRuns([]);
                (window as any).addToast?.('success', 'Execution history cleared');
                
            } catch (err) {
                console.error('Clear history failed:', err);
                (window as any).addToast?.('error', 'Failed to clear execution history');
            } finally {
                setIsClearing(false);
            }
        }
    });
  };

  const filteredRuns = runs.filter(run => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    return (
      run.run_id.toLowerCase().includes(search) ||
      (run.scenario_name || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className={cn("flex flex-col h-full bg-black overflow-hidden", className)}>
      {/* List Header (Filter + Clear) */}
      <div className="p-3 border-b border-zinc-900 bg-black/20 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input 
            type="text" 
            placeholder="Search executions..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-zinc-900/40 border border-white/5 rounded py-1 pl-8 pr-3 text-[10px] text-zinc-400 placeholder:text-zinc-700 focus:outline-none focus:border-white/10 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-zinc-700 uppercase tracking-widest">
            {filteredRuns.length} Match
          </div>
        </div>
        
        {filteredRuns.length > 0 && (
            <button 
                onClick={handleClearHistory}
                disabled={isClearing}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/20 text-rose-500/60 hover:text-rose-400 transition-colors text-[9px] font-medium"
            >
                {isClearing ? (
                    <Clock className="w-3 h-3 animate-spin" />
                ) : (
                    <Trash2 className="w-3 h-3" />
                )}
                Clear History
            </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700">
        {isLoading ? (
           <div className="p-3 space-y-3">
             {Array.from({ length: 12 }).map((_, i) => (
               <div key={i} className="p-3 rounded-xl border border-white/5 bg-zinc-900/10 space-y-2.5">
                 <div className="flex items-center gap-2">
                   <Skeleton className="w-3.5 h-3.5 rounded-full" />
                   <Skeleton className="h-3 w-3/4 rounded-full" />
                 </div>
                 <div className="flex justify-between pl-5.5">
                   <Skeleton className="h-2 w-16 opacity-50" />
                   <Skeleton className="h-2 w-24 opacity-50" />
                 </div>
               </div>
             ))}
           </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500/80">
             <p className="text-[10px]">{error}</p>
             <button onClick={() => fetchRuns()} className="mt-2 text-[9px] underline">Retry</button>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
             <p className="text-[10px] italic">No executions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredRuns.map(run => {
              const isSelected = run.run_id === selectedRunId;
              const isDeleting = deletingId === run.run_id;
              
              return (
                <button
                  key={run.run_id}
                  onClick={() => onSelect(run.run_id)}
                  disabled={isDeleting}
                  className={cn(
                    "w-full text-left p-3 hover:bg-white/5 transition-all group relative",
                    isSelected && "bg-white/5",
                    isDeleting && "opacity-50 pointer-events-none"
                  )}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500" />
                  )}
                  
                  {/* Hover Delete Button */}
                  <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div 
                            role="button"
                            onClick={(e) => handleDelete(e, run.run_id)}
                            className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-600 hover:text-rose-400 transition-colors"
                            title="Delete Trace"
                        >
                            {isDeleting ? (
                                <Clock className="w-3 h-3 animate-spin text-zinc-500" />
                            ) : (
                                <Trash2 className="w-3 h-3" />
                            )}
                        </div>
                  </div>
                  
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1 min-w-0 pr-6"> {/* Add padding for delete button space */}
                      <div className="flex items-center gap-2 mb-1">
                         {run.success ? (
                           <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 flex-none" />
                         ) : (
                           <XCircle className="w-3.5 h-3.5 text-rose-500/80 flex-none" />
                         )}
                         <span className={cn(
                           "text-[10px] font-bold truncate block",
                           isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-300"
                         )}>
                           {run.scenario_name || `Manual Run ${run.run_id.substring(0,6)}`}
                         </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pl-5.5">
                     <span className="text-[9px] text-zinc-600 font-medium font-mono">
                       #{run.run_id.substring(0,8)}
                     </span>
                     <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                       <Clock className="w-2.5 h-2.5" />
                       {run.finished_at ? (
                         <span>{((run.finished_at - run.started_at)).toFixed(1)}s</span>
                       ) : (
                         <span>--</span>
                       )}
                       <span className="text-zinc-800">|</span>
                       <span>
                            {formatDistanceToNow(run.started_at * 1000, { addSuffix: true })
                                .replace('about ', '')
                                .replace('less than a minute', 'just now')}
                       </span>
                     </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      <ConfirmationDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmDialog.isDestructive}
        confirmLabel={confirmDialog.title.includes('Clear') ? 'Clear All' : 'Delete'}
      />
    </div>
  );
};

export default ExecutionList;
