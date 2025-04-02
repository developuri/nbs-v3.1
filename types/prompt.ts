export interface PromptTemplate {
  name: string;
  model: string;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  max_tokens: number;
  system: string;
}

export const DEFAULT_TEMPLATE: PromptTemplate = {
  name: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  top_p: 1.0,
  presence_penalty: 0,
  frequency_penalty: 0,
  max_tokens: 2000,
  system: ''
}; 