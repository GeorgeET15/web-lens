// Use window.location for runtime detection (works in packaged app)
const isDev = window.location.hostname === 'localhost' && window.location.port === '5173';
const BASE = isDev ? 'http://localhost:8000' : `${window.location.protocol}//${window.location.host}`;
const WS_BASE = isDev ? 'ws://localhost:8000' : (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;

export const API_BASE_URL = BASE;

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  
  // Execution
  EXECUTE: `${BASE}/api/execute/start`,
  STATUS: `${BASE}/api/status`,
  EXECUTIONS: `${BASE}/api/executions`,
  CLOUD_PUBLISH: (runId: string) => `${BASE}/api/executions/${runId}/publish`,
  REPORTS: `${BASE}/api/reports`,
  
  // Flow Validation
  FLOW_VALIDATE: `${BASE}/api/flow/validate`,
  
  // Inspector - Live Mode
  INSPECTOR_START: `${BASE}/api/inspector/start`,
  INSPECTOR_STOP: `${BASE}/api/inspector/stop`,
  INSPECTOR_RESYNC: `${BASE}/api/inspector/resync`,
  INSPECTOR_WS: `${WS_BASE}/ws/inspector`,
  
  // Inspector - Embedded Mode
  INSPECTOR_EMBEDDED_START: `${BASE}/api/inspector/embedded/start`,
  INSPECTOR_EMBEDDED_INTERACT: `${BASE}/api/inspector/embedded/interact`,
  
  // Environments
  ENVIRONMENTS: `${BASE}/api/environments`,
  
  // Scenarios (Post-V1 Feature)
  SCENARIOS_GENERATE_TEMPLATE: `${BASE}/api/scenarios/generate-template`,
  SCENARIOS_DOWNLOAD_TEMPLATE: `${BASE}/api/scenarios/download-template`,
  SCENARIOS_VALIDATE: `${BASE}/api/scenarios/validate`,
  SCENARIOS_EXECUTE: `${BASE}/api/scenarios/execute`,
  
  // Health & Metadata
  HEALTH: `${BASE}/api/health`,
  BLOCKS_TYPES: `${BASE}/api/blocks/types`,
  
  // Flows
  FLOWS: `${BASE}/api/flows`,
  
  // User Stats
  USER_STATS: `${BASE}/api/user/stats`,
};

export const SAMPLE_FLOW = {
  name: "My First Flow",
  entry_block: "",
  blocks: []
};
