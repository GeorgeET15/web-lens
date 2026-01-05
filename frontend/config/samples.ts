import { FlowGraph } from '../types/flow';

export const SAMPLE_FLOWS: FlowGraph[] = [
  {
    name: 'Login Flow Example',
    schema_version: 1,
    entry_block: 'start',
    blocks: [
      { 
        id: 'start', 
        type: 'open_page', 
        params: { url: 'https://the-internet.herokuapp.com/login' }, 
        next_block: 'user' 
      },
      { 
        id: 'user', 
        type: 'enter_text', 
        params: { 
          text: 'tomsmith',
          element: { 
            id: 'ref_user', 
            role: 'input', 
            name: 'Username', 
            metadata: { tag: 'input', testId: 'username' }
          }
        }, 
        next_block: 'pass' 
      },
      { 
        id: 'pass', 
        type: 'enter_text', 
        params: { 
          text: 'SuperSecretPassword!',
          element: { 
            id: 'ref_pass', 
            role: 'input', 
            name: 'Password', 
            metadata: { tag: 'input', testId: 'password' }
          }
        }, 
        next_block: 'click' 
      },
      { 
        id: 'click', 
        type: 'click_element', 
        params: { 
          element: { 
            id: 'ref_btn', 
            role: 'button', 
            name: 'Login', 
            metadata: { tag: 'button', class: 'radius' }
          }
        }, 
        next_block: 'check' 
      },
      { 
        id: 'check', 
        type: 'assert_visible', 
        params: { 
          element: { 
            id: 'ref_success', 
            role: 'alert', 
            name: 'You logged into a secure area!', 
            metadata: { tag: 'div', id: 'flash' } 
          }
        },
        next_block: null
      }
    ]
  },
  {
    name: 'Cookie Banner Acceptance',
    schema_version: 1,
    entry_block: 'start',
    blocks: [
      { 
        id: 'start', 
        type: 'open_page', 
        params: { url: 'https://www.cookiesandyou.com/' }, 
        next_block: 'wait' 
      },
      { 
        id: 'wait', 
        type: 'wait_until_visible', 
        params: { 
          timeout: 5,
          element: { 
            id: 'ref_banner', 
            role: 'dialog', 
            name: 'Cookie Consent', 
            metadata: { tag: 'div', ariaLabel: 'cookie-consent' }
          }
        }, 
        next_block: 'accept' 
      },
      { 
        id: 'accept', 
        type: 'click_element', 
        params: { 
          element: { 
            id: 'ref_accept', 
            role: 'button', 
            name: 'Accept All', 
            metadata: { tag: 'button' }
          }
        }, 
        next_block: 'gone' 
      },
      { 
        id: 'gone', 
        type: 'assert_visible', 
        params: { 
          // Asserting body is visible means page is essentially still there, 
          // but logically we'd check banner is GONE. 
          // Current editor only has 'assert_visible'. 
          // Asserting main content is better.
          element: { 
            id: 'ref_main', 
            role: 'heading', 
            name: 'What are cookies?', 
            metadata: { tag: 'h1' } 
          }
        },
        next_block: null
      }
    ]
  },
  {
    name: 'Search Wikipedia',
    schema_version: 1,
    entry_block: 'start',
    blocks: [
      { 
        id: 'start', 
        type: 'open_page', 
        params: { url: 'https://www.wikipedia.org/' }, 
        next_block: 'type' 
      },
      { 
        id: 'type', 
        type: 'enter_text', 
        params: { 
          text: 'Zero-code platform',
          element: { 
            id: 'ref_search', 
            role: 'input', 
            name: 'Search Wikipedia', 
            metadata: { tag: 'input', id: 'searchInput' }
          }
        }, 
        next_block: 'submit' 
      },
      { 
        id: 'submit', 
        type: 'click_element', 
        params: { 
          element: { 
            id: 'ref_btn', 
            role: 'button', 
            name: 'Search', 
            metadata: { tag: 'button', type: 'submit' }
          }
        }, 
        next_block: 'wait_res' 
      },
      { 
        id: 'wait_res', 
        type: 'wait_for_page_load', 
        params: { timeout_seconds: 10 }, 
        next_block: null
      }
    ]
  }
];
