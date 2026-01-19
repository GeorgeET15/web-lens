import { ExecutionReport } from '../types/execution';


export type BlockType = 'open_page' | 'click_element' | 'enter_text' | 'wait_until_visible' | 'assert_visible' | 'if_condition' | 'repeat_until' | 'delay' | 'refresh_page' | 'wait_for_page_load' | 'select_option' | 'upload_file' | 'verify_text' | 'verify_page_content' | 'scroll_to_element' | 'save_text' | 'save_page_content' | 'verify_page_title' | 'verify_url' | 'verify_element_enabled' | 'use_saved_value' | 'verify_network_request' | 'verify_performance' | 'submit_form' | 'confirm_dialog' | 'dismiss_dialog' | 'activate_primary_action' | 'submit_current_input' | 'get_cookies' | 'get_local_storage' | 'get_session_storage' | 'observe_network' | 'switch_tab' | 'visual_verify' | 'ai_prompt';



export interface EditorBlock {
  id: string;
  type: BlockType;
  label: string;
  params: Record<string, any>;
  parentId?: string;
  branchKey?: 'then' | 'else' | 'body';
  position?: { x: number; y: number };
}

export interface SavedValue {
    key: string;
    label: string;
}

// ============================================================================
// SCENARIO EXPANSION TYPES (Post-V1 Feature)
// ============================================================================

export interface ScenarioTemplate {
    flowId: string;
    columns: string[];
    blockMappings: Record<string, string>;
    generatedAt: number;
}

export interface Scenario {
    scenarioId?: string;
    scenarioName: string;
    values: Record<string, string>;
}

export interface ScenarioSet {
    id: string;
    name: string;
    scenarios: Scenario[];
    createdAt: number;
}

export interface ScenarioExecutionResult {
    scenarioName: string;
    runId: string;
    success: boolean;
    report: ExecutionReport;
}

export interface ScenarioSuiteReport {
    suiteId: string;
    flowName: string;
    startedAt: number;
    finishedAt?: number;
    results: ScenarioExecutionResult[];
}
