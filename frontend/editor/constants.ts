
import { EditorBlock, BlockType } from './entities';

export const DEFAULT_BLOCKS: Record<BlockType, Omit<EditorBlock, 'id'>> = {
  ai_prompt: { 
    type: 'ai_prompt', 
    label: 'AI Command', 
    params: { prompt: '' } 
  },
  open_page: {
    type: 'open_page',
    label: 'Open Page',
    params: { url: 'https://example.com' }
  },
  click_element: {
    type: 'click_element',
    label: 'Click Element',
    params: { element: null }
  },
  enter_text: {
    type: 'enter_text',
    label: 'Enter Text',
    params: { element: null, text: 'Hello', clear_first: true }
  },
  wait_until_visible: {
    type: 'wait_until_visible',
    label: 'Wait Until Visible',
    params: { element: null, timeout_seconds: 10 }
  },
  assert_visible: {
    type: 'assert_visible',
    label: 'Assert Visible',
    params: { element: null }
  },
  if_condition: {
    type: 'if_condition',
    label: 'If Condition',
    params: {
      condition: { kind: 'element_visible', element: null },
      then_blocks: [],
      else_blocks: []
    }
  },
  repeat_until: {
    type: 'repeat_until',
    label: 'Repeat Until',
    params: {
      condition: { kind: 'element_visible', element: null },
      body_blocks: [],
      max_iterations: 10
    }
  },
  delay: {
    type: 'delay',
    label: 'Delay',
    params: { seconds: 1 }
  },
  refresh_page: {
    type: 'refresh_page',
    label: 'Refresh Page',
    params: {}
  },
  wait_for_page_load: {
    type: 'wait_for_page_load',
    label: 'Wait For Page Load',
    params: { timeout_seconds: 15 }
  },
  select_option: {
    type: 'select_option',
    label: 'Select From Dropdown',
    params: { element: null, option_text: '' }
  },
  upload_file: {
    type: 'upload_file',
    label: 'Upload File',
    params: { element: null, file: { id: '', name: '', mime_type: null, source: 'local' } }
  },
  verify_text: {
    type: 'verify_text',
    label: 'Verify Text',
    params: { element: null, match: { mode: 'equals', value: '' } }
  },
  scroll_to_element: {
    type: 'scroll_to_element',
    label: 'Scroll To Element',
    params: { element: null, alignment: 'center' }
  },
  save_text: {
    type: 'save_text',
    label: 'Save Text',
    params: { element: null, save_as: { key: '', label: '' } }
  },
  save_page_content: {
    type: 'save_page_content',
    label: 'Save Page Content',
    params: { save_as: { key: '', label: '' } }
  },

  verify_page_title: {
    type: 'verify_page_title',
    label: 'Verify Page Title',
    params: { title: '' }
  },
  verify_url: {
    type: 'verify_url',
    label: 'Verify URL Contains',
    params: { url_part: '' }
  },
  verify_element_enabled: {
    type: 'verify_element_enabled',
    label: 'Verify Element Enabled',
    params: { element: null, should_be_enabled: true }
  },
  use_saved_value: {
    type: 'use_saved_value',
    label: 'Use Saved Value',
    params: { 
        target: { action: 'enter_text' },
        element: null,
        value_ref: { key: '', label: '' }
    }
  },
  verify_network_request: {
      type: 'verify_network_request',
      label: 'Verify Network Request',
      params: { 
          url_pattern: '/api/v1',
          method: 'ANY',
          status_code: 200
      }
  },
  verify_page_content: {
    type: 'verify_page_content',
    label: 'Verify Page Content',
    params: { match: { mode: 'contains', value: '' } }
  },
  verify_performance: {
      type: 'verify_performance',
      label: 'Verify Performance',
      params: { 
          metric: 'page_load_time',
          threshold_ms: 2000
      }
  },
  submit_form: {
    type: 'submit_form',
    label: 'Submit Form',
    params: { element: null }
  },
  confirm_dialog: {
    type: 'confirm_dialog',
    label: 'Confirm Dialog',
    params: {}
  },
  dismiss_dialog: {
    type: 'dismiss_dialog',
    label: 'Dismiss Dialog',
    params: {}
  },
  activate_primary_action: {
    type: 'activate_primary_action',
    label: 'Activate Primary Action',
    params: {}
  },
  submit_current_input: {
    type: 'submit_current_input',
    label: 'Submit Current Input',
    params: { element: null }
  },
  get_cookies: {
    type: 'get_cookies',
    label: 'Get Cookies',
    params: {}
  },
  get_local_storage: {
    type: 'get_local_storage',
    label: 'Get Local Storage',
    params: {}
  },
  get_session_storage: {
    type: 'get_session_storage',
    label: 'Get Session Storage',
    params: {}
  },
  observe_network: {
    type: 'observe_network',
    label: 'Observe Network',
    params: {}
  },
  switch_tab: {
    type: 'switch_tab',
    label: 'Switch Tab',
    params: { to_newest: true, tab_index: 0 }
  }
};
