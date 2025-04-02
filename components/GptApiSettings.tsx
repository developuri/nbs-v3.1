'use client';

import { useState, useEffect } from 'react';
import { useGptStore } from '../store/gptStore';
import { useGptModels } from '../hooks/useGptModels';

interface Model {
  id: string;
  created: number;
  owned_by: string;
}

// 폴백용 기본 모델 목록
const DEFAULT_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
];

export default function GptApiSettings() {
  const { apiKey, model, setApiKey, setModel } = useGptStore();
  const [saved, setSaved] = useState(false);
  const [storageStatus, setStorageStatus] = useState<string>('');
  const { models, loading, error } = useGptModels(apiKey);

  // 현재 선택된 모델이 사용 가능한 모델 목록에 없으면 첫 번째 모델로 설정
  useEffect(() => {
    if (models.length > 0 && !models.includes(model)) {
      setModel(models[0]);
    }
  }, [models, model, setModel]);

  // 저장 상태 확인
  useEffect(() => {
    const checkStorage = async () => {
      try {
        const stored = localStorage.getItem('gpt-settings-storage');
        if (stored) {
          const data = JSON.parse(stored);
          setStorageStatus(`API Key ${data.state.apiKey ? '저장됨' : '없음'}`);
        } else {
          setStorageStatus('저장된 데이터 없음');
        }
      } catch (error) {
        setStorageStatus('저장소 확인 중 오류 발생');
        console.error('Storage check error:', error);
      }
    };

    checkStorage();
  }, [apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">GPT API 설정</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="sk-..."
          />
          <p className="mt-1 text-sm text-gray-500">
            OpenAI API 키는 안전하게 브라우저에 저장됩니다.
          </p>
          <p className="mt-1 text-sm text-blue-600">
            저장 상태: {storageStatus}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            모델
          </label>
          {loading ? (
            <div className="flex items-center space-x-2 h-12">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              <span className="text-gray-600">모델 목록을 가져오는 중...</span>
            </div>
          ) : (
            <>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {models.map((modelOption) => (
                  <option key={modelOption} value={modelOption}>
                    {modelOption}
                  </option>
                ))}
              </select>
              {error && (
                <p className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            설정 저장
          </button>
          {saved && (
            <p className="mt-2 text-sm text-green-600">
              설정이 저장되었습니다.
            </p>
          )}
        </div>
      </form>
    </div>
  );
} 