/**
 * User-Understandable Error System
 * 
 * Transforms cryptic backend/pydantic errors into actionable feedback.
 */

export interface EnrichedError {
  title: string;
  message: string;
  suggestion?: string;
  category: 'validation' | 'connection' | 'execution' | 'system';
  relatedBlockId?: string;
  raw?: string;
  // Canonical Failure Fields
  intent?: string;
  reason?: string;
  evidence?: Record<string, any>;
  owner?: 'USER' | 'APP' | 'ENGINE' | 'SYSTEM';
  determinism?: 'CERTAIN' | 'HEURISTIC' | 'UNKNOWN';
}

export function parseError(rawError: string | any): EnrichedError {
  // 0. Canonical Error Direct Pass-through
  if (typeof rawError === 'object' && rawError !== null && 'intent' in rawError && 'reason' in rawError) {
      return {
          title: rawError.title || 'Action Failed',
          message: rawError.message || rawError.reason, // Use full message or reason
          suggestion: rawError.suggestion || rawError.guidance, // Backend calls it guidance, model has suggestion
          category: 'execution', // Default to execution for now
          relatedBlockId: rawError.related_block_id,
          raw: JSON.stringify(rawError),
          intent: rawError.intent,
          reason: rawError.reason,
          evidence: rawError.evidence,
          owner: rawError.owner,
          determinism: rawError.determinism
      };
  }

  const errorStr = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);
  
  // 1. Connection Errors
  if (errorStr.includes('Failed to fetch') || errorStr.includes('Connection to event stream lost')) {
    return {
      title: 'Connection Lost',
      message: 'The connection to the testing server was interrupted.',
      suggestion: 'Ensure the backend server is running and your internet connection is stable.',
      category: 'connection',
      raw: errorStr
    };
  }

  // 2. Pydantic Validation Errors (The "Cryptic" ones)
  // Pattern: blocks.5.OpenPageBlock.url Field required
  if (errorStr.includes('validation errors for FlowGraph')) {
    const errorCountMatch = errorStr.match(/(\d+) validation errors/);
    const count = errorCountMatch ? parseInt(errorCountMatch[1]) : 1;

    // Try to extract the first/most relevant error
    // Example: blocks.5.OpenPageBlock.url Field required
    const blockErrorMatch = errorStr.match(/blocks\.(\d+)\.(\w+)Block\.(\w+)\s+([^\[\n]+)/);
    
    if (blockErrorMatch) {
      const [_, index, blockType, field, message] = blockErrorMatch;
      const humanBlockType = blockType.replace(/([A-Z])/g, ' $1').trim();
      
      let humanMessage = `The ${humanBlockType} (at step ${parseInt(index) + 1}) has an issue.`;
      let suggestion = '';

      if (message.includes('Field required')) {
        humanMessage = `The ${humanBlockType} is missing a required value: "${field}".`;
        suggestion = `Please open step ${parseInt(index) + 1} and enter a value for ${field}.`;
      } else if (message.includes('Input should be')) {
        humanMessage = `The ${humanBlockType} has an invalid configuration for "${field}".`;
        suggestion = `Check the settings for step ${parseInt(index) + 1}.`;
      }

      return {
        title: 'Validation Error',
        message: humanMessage,
        suggestion: suggestion || 'Please review your flow configuration.',
        category: 'validation',
        raw: errorStr
      };
    }

    return {
      title: 'Incomplete Flow',
      message: `Your flow has ${count} configuration ${count === 1 ? 'issue' : 'issues'} that prevent it from running.`,
      suggestion: 'Check your blocks for missing URLs, text, or required parameters.',
      category: 'validation',
      raw: errorStr
    };
  }

  // 3. Execution Errors (Browser issues, timeouts)
  if (errorStr.includes('Timeout') || errorStr.includes('waiting for selector')) {
    return {
      title: 'Execution Timeout',
      message: 'The test timed out while waiting for a page element or response.',
      suggestion: 'Try increasing the timeout duration or verify the element exists on the page.',
      category: 'execution',
      raw: errorStr
    };
  }

  // Default Fallback
  return {
    title: 'Execution Failed',
    message: errorStr.length > 200 ? 'Something went wrong during the test run.' : errorStr,
    suggestion: 'Review the execution logs below for more details.',
    category: 'system',
    raw: errorStr
  };
}
