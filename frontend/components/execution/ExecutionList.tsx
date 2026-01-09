import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  Search 
} from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import { ExecutionSummary } from '../../types/execution';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  onSelect: (runId: string) => void;
  selectedRunId?: string;
  className?: string;
}

export const ExecutionList: React.FC<Props> = ({ 
  onSelect, 
  selectedRunId,
  className 
}) => {
  const [runs, setRuns] = useState<ExecutionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(API_ENDPOINTS.EXECUTIONS); // Verify this endpoint exists in api.ts or use string
      if (!res.ok) throw new Error('Failed to fetch execution history');
      const data = await res.json();
      setRuns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
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
      {/* List Header (Filter Only) */}
      <div className="p-3 border-b border-zinc-900 bg-black/20">
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
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Loading history...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500/80">
             <p className="text-[10px]">{error}</p>
             <button onClick={fetchRuns} className="mt-2 text-[9px] underline">Retry</button>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
             <p className="text-[10px] italic">No executions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredRuns.map(run => {
              const isSelected = run.run_id === selectedRunId;
              
              return (
                <button
                  key={run.run_id}
                  onClick={() => onSelect(run.run_id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-white/5 transition-all group relative",
                    isSelected && "bg-white/5"
                  )}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500" />
                  )}
                  
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1 min-w-0">
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
    </div>
  );
};
