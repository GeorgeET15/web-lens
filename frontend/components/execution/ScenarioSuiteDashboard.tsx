import React, { useState } from 'react';
import { AIInsight } from '../ai/AIInsight';
import { AIDisclaimer } from '../ai/AIDisclaimer';
import { 
  CheckCircle2, XCircle, Clock, 
  BarChart3, LayoutList, Sparkles,
  ChevronUp
} from 'lucide-react';
import { ScenarioSuiteReport } from '../../editor/entities';
import { cn } from '../../lib/utils';
import { DownloadDropdown } from '../DownloadDropdown';

interface ScenarioSuiteDashboardProps {
  report: ScenarioSuiteReport;
  onViewScenario: (runId: string) => void;
  onBackToEditor: () => void;
  flowJson?: any;
}

export const ScenarioSuiteDashboard: React.FC<ScenarioSuiteDashboardProps> = ({ 
  report, 
  onViewScenario,
  onBackToEditor,
  flowJson
}) => {
  const startedAt = report.startedAt || 0;
  const finishedAt = report.finishedAt || 0;
  const duration = finishedAt ? (finishedAt - startedAt).toFixed(1) : '?';
  const total = report.results?.length || 0;
  const passed = (report.results || []).filter(r => r.success).length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const flowName = report.flowName || 'Unnamed Flow';
  const suiteId = report.suiteId || 'Unknown ID';
  const [scenarioInsights, setScenarioInsights] = useState<Record<string, { content: string, isLoading: boolean, isCollapsed: boolean }>>({});

  // Role 2: Run Summary Commentary State
  const [stabilityInsight, setStabilityInsight] = useState<string>("");
  const [isStabilityLoading, setIsStabilityLoading] = useState(false);

  const handleInvestigate = async (result: any) => {
    const runId = result.runId || result.run_id;
    
    if (scenarioInsights[runId] && !scenarioInsights[runId].isLoading) {
      setScenarioInsights(prev => ({
        ...prev,
        [runId]: { ...prev[runId], isCollapsed: !prev[runId].isCollapsed }
      }));
      return;
    }

    setScenarioInsights(prev => ({
      ...prev,
      [runId]: { content: "", isLoading: true, isCollapsed: false }
    }));

    try {
      const res = await fetch('/api/ai/investigate-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: result,
          flow: flowJson || { name: flowName }
        })
      });
      const data = await res.json();
      setScenarioInsights(prev => ({
        ...prev,
        [runId]: { content: data.review, isLoading: false, isCollapsed: false }
      }));
    } catch (err) {
      console.error("Scenario investigation failed:", err);
      setScenarioInsights(prev => ({
        ...prev,
        [runId]: { content: "Investigation failed.", isLoading: false, isCollapsed: false }
      }));
    }
  };

  const handleStabilityAudit = async () => {
    if (isStabilityLoading) return;
    setIsStabilityLoading(true);
    setStabilityInsight("");

    try {
      const res = await fetch('/api/ai/stability-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report.results.map(r => r.report))
      });
      const data = await res.json();
      setStabilityInsight(data.summary);
    } catch (err) {
      console.error("Stability Audit failed:", err);
      setStabilityInsight("Unable to generate summary commentary at this time.");
    } finally {
      setIsStabilityLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white font-mono animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-8 border-b border-white/10 flex items-center justify-between bg-zinc-950">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Scenario Suite Report</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Flow: <span className="text-white">{flowName}</span> • Run ID: <span className="text-zinc-400 text-[9px] font-normal">{suiteId}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DownloadDropdown suiteId={suiteId} type="suite" />
          <button 
            onClick={handleStabilityAudit}
            disabled={isStabilityLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all disabled:opacity-50"
          >
            <Sparkles className={cn("w-3 h-3", isStabilityLoading && "animate-spin")} />
            {isStabilityLoading ? 'Summarizing...' : '[EXPERIMENTAL] Run Summary (Computed + Commentary)'}
          </button>
          <button 
            onClick={onBackToEditor}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 text-zinc-400 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Back to Editor
          </button>
        </div>
      </div>

      {/* Removed stabilityInsight from top */}

      {/* Summary Ribbon */}
      <div className="grid grid-cols-4 border-b border-white/10">
        <div className="p-8 border-r border-white/10 bg-zinc-950/50">
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-3">Total Scenarios</p>
          <div className="text-4xl font-black">{total}</div>
        </div>
        <div className="p-8 border-r border-white/10 bg-zinc-950/50">
          <p className="text-[9px] text-emerald-500/80 font-black uppercase tracking-[0.2em] mb-3">Passed</p>
          <div className="text-4xl font-black text-emerald-400">{passed}</div>
        </div>
        <div className="p-8 border-r border-white/10 bg-zinc-950/50">
          <p className="text-[9px] text-rose-500/80 font-black uppercase tracking-[0.2em] mb-3">Failed</p>
          <div className="text-4xl font-black text-rose-400">{failed}</div>
        </div>
        <div className="p-8 bg-zinc-950/50">
          <p className="text-[9px] text-indigo-500/80 font-black uppercase tracking-[0.2em] mb-3">Duration</p>
          <div className="text-4xl font-black">{duration}s</div>
        </div>
      </div>

      {/* Pass Rate Progress */}
      <div className="h-1.5 w-full bg-zinc-900 overflow-hidden flex">
        <div 
          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" 
          style={{ width: `${passRate}%` }} 
        />
        <div 
          className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-1000" 
          style={{ width: `${100 - passRate}%` }} 
        />
      </div>


      {/* Scenario List */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-950/30">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
          <LayoutList className="w-3.5 h-3.5" />
          Execution Timeline
        </h3>

        <div className="grid gap-3">
          {(report.results || []).map((result) => (
            <div
              key={result.runId}
              className="group w-full p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/30 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => onViewScenario(result.runId)}
                >
                  <div className={`p-2 rounded-full ${result.success ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                    {result.success ? (
                      <CheckCircle2 className={`w-5 h-5 ${result.success ? 'text-emerald-400' : 'text-rose-400'}`} />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider group-hover:text-white transition-colors">
                      {result.scenarioName}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[9px] text-zinc-500">
                      <span className="flex items-center gap-1 uppercase font-bold tracking-widest">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          const rReport = result.report;
                          if (!rReport) return '0.0s';
                          const start = rReport.started_at || 0;
                          const end = rReport.finished_at || 0;
                          return (end - start).toFixed(1);
                        })()}s
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span className="opacity-50 font-medium font-mono text-[8px]">#{(result.runId).split('_').pop() || 'ID'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInvestigate(result);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all border",
                      scenarioInsights[result.runId] && !scenarioInsights[result.runId].isCollapsed
                        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
                    )}
                  >
                    {scenarioInsights[result.runId]?.isLoading ? (
                      <Sparkles className="w-3 h-3 animate-spin" />
                    ) : scenarioInsights[result.runId] && !scenarioInsights[result.runId].isCollapsed ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {scenarioInsights[result.runId] && !scenarioInsights[result.runId].isCollapsed ? 'Collapse' : 'Review Commentary'}
                  </button>
                  {!result.success && (
                    <span className="text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Fail
                    </span>
                  )}
                </div>
              </div>

              {/* Inline AI Insight */}
              {scenarioInsights[result.runId] && !scenarioInsights[result.runId].isCollapsed && (
                <div className="mt-4 border-t border-white/5 pt-4 animate-in slide-in-from-top-2 duration-300">
                  <AIInsight
                    type="inspection"
                    content={scenarioInsights[result.runId].content}
                    isLoading={scenarioInsights[result.runId].isLoading}
                    isCollapsible={false}
                    roleLabel="AI Commentary (Non-Authoritative)"
                  />
                  <div className="mt-4 opacity-50">
                    <AIDisclaimer />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {stabilityInsight && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Global Commentary (Optional)
            </h3>
            <AIInsight 
              type="stability"
              roleLabel="Run Summary Commentary (Non-Authoritative)"
              content={stabilityInsight}
              onClose={() => setStabilityInsight("")}
              isOpen={true}
            />
            <AIDisclaimer />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/10 bg-black text-center">
        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.4em]">
          WebLens Scenario Suite • Deterministic Telemetry
        </p>
      </div>
    </div>
  );
};
