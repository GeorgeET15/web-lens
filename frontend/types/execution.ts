/**
 * Execution Insight types matching backend schema.
 */

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
  tier_2_evidence?: any;
}

export interface ExecutionReport {
  run_id: string;
  started_at: number;
  finished_at?: number;
  success: boolean;
  blocks: BlockExecution[];
  error?: {
    type: string;
    message: string;
    related_block_id?: string;
  };
}
