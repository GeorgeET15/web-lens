export interface AIInsightData {
  summary?: string;
  intent?: string;
  reason?: string;
  suggestion?: string;
  guidance?: string[];
  reliability?: number;
}

export interface BlockExecution {
  run_id: string;
  block_id: string;
  block_type: string;
  status: 'started' | 'success' | 'failed';
  duration_ms: number;
  taf: {
    trace: string[];
    analysis: string[];
    feedback: string[];
  };
  screenshot?: string;
  message?: string;
  confidence_score?: number;
  expected_attributes?: Record<string, any>;
  actual_attributes?: Record<string, any>;
  semantic_candidates?: any[];
  tier_2_evidence?: {
    baseline?: string;
    current?: string;
    diff_score?: number;
    dom_snapshot?: string;
    network_logs?: any[];
  };
}

export interface ExecutionSummary {
  run_id: string;
  scenario_name?: string | null;
  started_at: number;
  finished_at?: number;
  success: boolean;
}

export interface ExecutionReport {
  run_id: string;
  flow_id?: string;
  started_at: number;
  finished_at?: number;
  success: boolean;
  blocks: BlockExecution[];
  error?: {
    type: string;
    message: string;
    related_block_id?: string;
  } & AIInsightData;
}
