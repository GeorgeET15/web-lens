/**
 * Flow model types matching backend schema.
 * These represent the JSON structure sent to the backend.
 */

export interface FlowBlock {
  id: string;
  type: string;
  next_block?: string | null;
  position?: { x: number; y: number };
  [key: string]: any;
}

export interface Scenario {
  scenario_id: string;
  scenario_name: string;
  values: Record<string, string>;
}

export interface ScenarioSet {
  id: string;
  name: string;
  scenarios: Scenario[];
  created_at: number;
}

export interface FlowGraph {
  id?: string;
  name: string;
  schema_version: number;
  description?: string;
  entry_block: string;
  blocks: FlowBlock[];
  variables?: Record<string, string>;
  scenario_sets?: ScenarioSet[];
  chat_history?: Record<string, any>;
}
