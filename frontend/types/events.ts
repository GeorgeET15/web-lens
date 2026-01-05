export interface StreamEvent {
  type: string;
  data: any;
}

export interface ExecutionEvent {
  type: 'block_execution';
  data: {
    block_id: string;
    type: 'info' | 'error' | 'success';
    status: 'running' | 'success' | 'failed';
    message: string;
    timestamp: string;
    screenshot?: string; // Base64 screenshot
  };
}

export interface ExecutionCompleteEvent extends ExecutionEvent {
  result: Record<string, any>;
}
