export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    flow_generated?: boolean;
    error?: boolean;
    [key: string]: any;
  };
}

export interface ChatHistory {
  messages?: ChatMessage[];
  last_updated?: number;
}
