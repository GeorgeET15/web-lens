export interface ElementRef {
  /**
   * Unique identifier for the element within the scope of the capture session
   */
  id?: string;

  /**
   * Semantic role of the element (e.g., 'button', 'input', 'link', 'text')
   */
  role: string;

  /**
   * The visible text content or label of the element.
   */
  name: string;

  /**
   * Source of the semantic name: 'native' (from aria-label/text) or 'user_declared' (manually entered)
   */
  name_source?: 'native' | 'user_declared';

  /**
   * Resolution confidence: 'high' (native labels), 'low' (user-declared), 'declared' (structural)
   */
  confidence?: 'high' | 'low' | 'declared';

  /**
   * Semantic context for user-declared elements (e.g., region)
   */
  context?: Record<string, string>;

  /**
   * Intent type: semantic (preferred) or structural (void elements)
   */
  intent_type?: 'semantic' | 'structural';

  /**
   * Structural system role for semantically void elements
   */
  system_role?: string;

  /**
   * Whether post-action verification is required
   */
  verification_required?: boolean;

  /**
   * Additional semantic context to help identify the element.
   */
  metadata: {
    // Standard Metadata
    tag?: string; // Legacy
    tagName?: string; // New Standard
    id?: string;
    className?: string; // New Standard
    
    // Hints
    placeholder?: string;
    title?: string;
    alt?: string;
    href?: string;
    testId?: string;
    
    // Any other props
    [key: string]: any;
  };

  /**
   * Base64 snapshot of the element for visual confirmation (optional)
   */
  previewImage?: string;
}
