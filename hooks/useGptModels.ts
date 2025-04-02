import { useState, useEffect } from 'react';

interface Model {
  id: string;
  created: number;
  owned_by: string;
}

// 폴백용 기본 모델 목록
export const DEFAULT_MODELS = [
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
];

export function useGptModels(apiKey: string) {
  const [models, setModels] = useState<string[]>(DEFAULT_MODELS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      if (!apiKey || !apiKey.startsWith('sk-')) {
        setModels(DEFAULT_MODELS);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('API 키가 유효하지 않거나 모델 목록을 가져오는데 실패했습니다.');
        }

        const data = await response.json();
        const gptModels = data.data
          .filter((model: Model) => 
            model.id.includes('gpt') && 
            !model.id.includes('instruct') &&
            !model.id.includes('0314') &&
            !model.id.includes('0301')
          )
          .map((model: Model) => model.id)
          .sort((a: string, b: string) => {
            // GPT-4 모델을 상위에 정렬
            if (a.includes('gpt-4') && !b.includes('gpt-4')) return -1;
            if (!a.includes('gpt-4') && b.includes('gpt-4')) return 1;
            return b.localeCompare(a);
          });

        setModels(gptModels);
      } catch (err) {
        setError(err instanceof Error ? err.message : '모델 목록을 가져오는데 실패했습니다.');
        setModels(DEFAULT_MODELS);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [apiKey]);

  return { models, loading, error };
} 