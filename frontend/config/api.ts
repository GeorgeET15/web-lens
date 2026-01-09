export const API_BASE_URL = 'http://localhost:8000';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  
  // Execution
  EXECUTE: 'http://localhost:8000/api/execute/start',
  STATUS: 'http://localhost:8000/api/status',
  EXECUTIONS: 'http://localhost:8000/api/executions',
  CLOUD_PUBLISH: (runId: string) => `http://localhost:8000/api/executions/${runId}/publish`,
  REPORTS: 'http://localhost:8000/api/reports',
  
  // Flow Validation
  FLOW_VALIDATE: 'http://localhost:8000/api/flow/validate',
  
  // Inspector - Live Mode
  INSPECTOR_START: 'http://localhost:8000/api/inspector/start',
  INSPECTOR_STOP: 'http://localhost:8000/api/inspector/stop',
  INSPECTOR_RESYNC: 'http://localhost:8000/api/inspector/resync',
  INSPECTOR_WS: 'ws://localhost:8000/ws/inspector', // FIXED: was /api/inspector/ws
  
  // Inspector - Embedded Mode
  INSPECTOR_EMBEDDED_START: 'http://localhost:8000/api/inspector/embedded/start',
  INSPECTOR_EMBEDDED_INTERACT: 'http://localhost:8000/api/inspector/embedded/interact',
  
  // Environments
  ENVIRONMENTS: 'http://localhost:8000/api/environments',
  
  // Scenarios (Post-V1 Feature)
  SCENARIOS_GENERATE_TEMPLATE: 'http://localhost:8000/api/scenarios/generate-template',
  SCENARIOS_DOWNLOAD_TEMPLATE: 'http://localhost:8000/api/scenarios/download-template',
  SCENARIOS_VALIDATE: 'http://localhost:8000/api/scenarios/validate',
  SCENARIOS_EXECUTE: 'http://localhost:8000/api/scenarios/execute',
  
  // Health & Metadata
  HEALTH: 'http://localhost:8000/api/health',
  BLOCKS_TYPES: 'http://localhost:8000/api/blocks/types',

  // AI Bridge
  AI_DRAFT: 'http://localhost:8000/api/ai/draft-flow',
};

export const SAMPLE_FLOW = {
  name: "My First Flow",
  entry_block: "",
  blocks: []
};
