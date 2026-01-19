import React, { useState } from 'react';
import { FileDown, Upload, Play, AlertCircle, Save, Layers, Trash2 } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { Scenario, ScenarioSuiteReport } from '../editor/entities';
import { ExecutionStatusModal } from './execution/ExecutionStatusModal';
import { useAuth } from '../contexts/AuthContext';

import { FlowGraph, ScenarioSet as CanonicalScenarioSet } from '../types/flow';

interface ScenarioPanelProps {
    flowJson: FlowGraph;
    onExecutionComplete?: (report: ScenarioSuiteReport) => void;
    onUpdateFlow?: (updatedFlow: FlowGraph) => void;
}

export const ScenarioPanel: React.FC<ScenarioPanelProps> = ({ 
    flowJson, 
    onExecutionComplete,
    onUpdateFlow 
}) => {
    const { session } = useAuth();
    const token = session?.access_token;
    
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [setName, setSetName] = useState('');
    const [isSavingSet, setIsSavingSet] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executingSuiteId, setExecutingSuiteId] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const handleGenerateTemplate = async () => {
        setIsGenerating(true);
        setErrors([]);
        
        try {
            const response = await fetch(API_ENDPOINTS.SCENARIOS_DOWNLOAD_TEMPLATE, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(flowJson)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate template');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scenario_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Generation failed']);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUploadCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsValidating(true);
        setErrors([]);

        try {
            const formData = new FormData();
            formData.append('csv_file', file);
            formData.append('flow', JSON.stringify(flowJson));

            const response = await fetch(API_ENDPOINTS.SCENARIOS_VALIDATE, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail?.errors?.join(', ') || 'CSV validation failed');
            }

            const data = await response.json();
            setScenarios(data.scenarios);

        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Upload failed']);
        } finally {
            setIsValidating(false);
        }
    };

    const handleExecuteScenarios = async () => {
        if (scenarios.length === 0) return;

        setIsExecuting(true);
        setExecutingSuiteId(null); 
        setErrors([]);

        try {
            const response = await fetch(API_ENDPOINTS.SCENARIOS_EXECUTE, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    flow: flowJson,
                    scenarios: scenarios
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Scenario execution failed');
            }

            const data = await response.json();
            setExecutingSuiteId(data.suite_id);

        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Execution failed']);
            setIsExecuting(false);
            setExecutingSuiteId(null);
        }
    };

    const handleSaveAsSet = async () => {
        if (!setName || scenarios.length === 0) return;
        
        setIsSavingSet(true);
        setErrors([]);
        
        try {
            const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/flows/update-with-set`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    flow: flowJson,
                    set_name: setName,
                    scenarios: scenarios.map((s: Scenario) => ({
                        scenario_id: s.scenarioId || `s_${Math.random().toString(36).substr(2, 9)}`,
                        scenario_name: s.scenarioName,
                        values: s.values
                    }))
                })
            });
            
            if (!response.ok) throw new Error('Failed to save scenario set');
            
            const updatedFlow = await response.json();
            onUpdateFlow?.(updatedFlow);
            setSetName('');
            
        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Saving failed']);
        } finally {
            setIsSavingSet(false);
        }
    };

    const handleLoadSet = (set: CanonicalScenarioSet) => {
        setScenarios(set.scenarios.map(s => ({
            scenarioId: s.scenario_id,
            scenarioName: s.scenario_name,
            values: s.values
        })));
    };

    const hasGlobalVariables = flowJson?.variables && Object.keys(flowJson.variables).length > 0;

    return (
        <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Scenarios</h2>

            {!hasGlobalVariables ? (
                <div className="p-3 rounded-lg border border-white/5 bg-zinc-900/50">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Global Variables Required</p>
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                        Add at least one Global Variable to enable scenario testing. Scenarios override variable values for each test run.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Scenario Sets Selection */}
                    {flowJson.scenario_sets && flowJson.scenario_sets.length > 0 && (
                        <div className="mb-4">
                            <p className="text-[9px] uppercase text-zinc-600 font-black tracking-widest mb-2 flex items-center gap-1.5">
                                <Layers className="w-3 h-3 text-indigo-500" />
                                Saved Sets
                            </p>
                            <div className="grid grid-cols-1 gap-1">
                                {flowJson.scenario_sets.map((set: CanonicalScenarioSet) => (
                                    <button
                                        key={set.id}
                                        onClick={() => handleLoadSet(set)}
                                        className="flex items-center justify-between p-2 rounded border border-white/5 bg-zinc-900/30 hover:bg-zinc-800 transition-all text-left group"
                                    >
                                        <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">{set.name}</span>
                                        <span className="text-[8px] text-zinc-600 font-black group-hover:text-zinc-400">{set.scenarios.length}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generate Template Button */}
                    <button
                        onClick={handleGenerateTemplate}
                        disabled={isGenerating}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                            <FileDown className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                            {isGenerating ? 'Generating...' : 'Generate Template'}
                        </span>
                    </button>

                    {/* Upload CSV Button */}
                    <label className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group cursor-pointer">
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                            <Upload className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                            {isValidating ? 'Validating...' : 'Upload Scenarios'}
                        </span>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleUploadCSV}
                            className="hidden"
                            disabled={isValidating}
                        />
                    </label>

                    {/* Scenario List & Save as Set */}
                    {scenarios.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <div className="p-3 rounded-lg border border-white/5 bg-black/20">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] uppercase text-zinc-600 font-black tracking-widest">
                                        {scenarios.length} Scenario{scenarios.length !== 1 ? 's' : ''} Loaded
                                    </p>
                                    <button 
                                        onClick={() => setScenarios([])}
                                        className="text-zinc-700 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-1.5 mb-3">
                                    {scenarios.map((scenario: Scenario, idx: number) => {
                                        // Handle both camelCase and snake_case from backend
                                        const name = scenario.scenarioName || (scenario as any).scenario_name || `Scenario ${idx + 1}`;
                                        return (
                                            <div key={idx} className="flex items-center gap-2 text-[10px] text-zinc-200 bg-zinc-900/80 px-2.5 py-1.5 rounded border border-white/10">
                                                <span className="text-[9px] font-bold text-zinc-600 min-w-[20px]">#{idx + 1}</span>
                                                <span className="font-medium">{name}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Save as Set Section */}
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] uppercase text-zinc-600 font-black tracking-widest flex items-center gap-1.5">
                                            <Save className="w-3 h-3 text-indigo-500" />
                                            Save as Reusable Set
                                        </p>
                                        <div className="group relative">
                                            <AlertCircle className="w-3 h-3 text-zinc-600 hover:text-zinc-400 cursor-help" />
                                            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-black border border-white/10 rounded text-[9px] text-zinc-400 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                Save these scenarios to your flow file for easy reuse. They'll be available in the "Saved Sets" section.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <input 
                                            type="text"
                                            placeholder="e.g., Login Regression Suite"
                                            value={setName}
                                            onChange={(e) => setSetName(e.target.value)}
                                            className="w-full bg-zinc-900/80 border border-white/20 rounded px-3 py-2 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                                        />
                                        <button
                                            onClick={handleSaveAsSet}
                                            disabled={!setName || isSavingSet}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-wider"
                                        >
                                            <Save className="w-3 h-3" />
                                            {isSavingSet ? 'Saving...' : 'Save Set'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Execute Button */}
                    <button
                        onClick={handleExecuteScenarios}
                        disabled={scenarios.length === 0 || isExecuting}
                        className="flex items-center gap-2 w-full p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500 hover:border-indigo-400 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        <div className="p-1.5 rounded bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                            <Play className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-100 group-hover:text-white transition-colors">
                            {isExecuting ? 'Executing Suite...' : 'Run Scenario Suite'}
                        </span>
                    </button>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {errors.map((error: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border border-rose-500/10 bg-rose-500/5 text-rose-500 text-[10px] font-bold">
                                    <AlertCircle className="w-3.5 h-3.5 flex-none" />
                                    <p>{error}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Live Progress Modal */}
            {isExecuting && (
                <ExecutionStatusModal 
                    suiteId={executingSuiteId}
                    mode="execution"
                    totalScenarios={scenarios.length}
                    onComplete={(report) => {
                        setExecutingSuiteId(null);
                        setIsExecuting(false);
                        onExecutionComplete?.(report);
                    }}
                    onCancel={() => {
                        setExecutingSuiteId(null);
                        setIsExecuting(false);
                    }}
                />
            )}
        </div>
    );
};
