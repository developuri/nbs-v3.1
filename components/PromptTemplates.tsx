'use client';

import { useState } from 'react';
import { usePromptStore } from '../store/promptStore';
import { useGptStore } from '../store/gptStore';
import { useGptModels } from '../hooks/useGptModels';
import { PromptTemplate, DEFAULT_TEMPLATE } from '../types/prompt';
import PromptPreviewModal from './PromptPreviewModal';

export default function PromptTemplates() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, currentTemplate, setCurrentTemplate } = usePromptStore();
  const { apiKey } = useGptStore();
  const { models, loading, error } = useGptModels(apiKey);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const template: PromptTemplate = {
      name: formData.get('name') as string,
      model: formData.get('model') as string,
      temperature: parseFloat(formData.get('temperature') as string),
      top_p: parseFloat(formData.get('top_p') as string),
      presence_penalty: parseFloat(formData.get('presence_penalty') as string),
      frequency_penalty: parseFloat(formData.get('frequency_penalty') as string),
      max_tokens: parseInt(formData.get('max_tokens') as string),
      system: formData.get('system') as string,
    };

    if (editIndex !== null) {
      updateTemplate(editIndex, template);
    } else {
      addTemplate(template);
    }

    setIsEditing(false);
    setEditIndex(null);
    setCurrentTemplate({ ...DEFAULT_TEMPLATE });
  };

  const handleEdit = (template: PromptTemplate, index: number) => {
    setCurrentTemplate(template);
    setEditIndex(index);
    setIsEditing(true);
  };

  const handleDelete = (index: number) => {
    if (window.confirm('이 템플릿을 삭제하시겠습니까?')) {
      deleteTemplate(index);
    }
  };

  const handleNew = () => {
    setCurrentTemplate({ ...DEFAULT_TEMPLATE });
    setIsEditing(true);
    setEditIndex(null);
  };

  const handlePreview = (template: PromptTemplate) => {
    setPreviewTemplate(template);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">프롬프트 템플릿 관리</h2>
        <button
          onClick={handleNew}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          새 템플릿
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              템플릿 이름
            </label>
            <input
              type="text"
              name="name"
              defaultValue={currentTemplate.name}
              required
              className="w-full p-2 border border-gray-300 rounded"
            />
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
                  name="model"
                  defaultValue={currentTemplate.model}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (0-2)
              </label>
              <input
                type="range"
                name="temperature"
                min="0"
                max="2"
                step="0.1"
                defaultValue={currentTemplate.temperature}
                className="w-full"
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.nextElementSibling!.textContent = value;
                }}
              />
              <span className="text-sm text-gray-600">{currentTemplate.temperature}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top P (0-1)
              </label>
              <input
                type="range"
                name="top_p"
                min="0"
                max="1"
                step="0.1"
                defaultValue={currentTemplate.top_p}
                className="w-full"
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.nextElementSibling!.textContent = value;
                }}
              />
              <span className="text-sm text-gray-600">{currentTemplate.top_p}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presence Penalty (-2 to 2)
              </label>
              <input
                type="range"
                name="presence_penalty"
                min="-2"
                max="2"
                step="0.1"
                defaultValue={currentTemplate.presence_penalty}
                className="w-full"
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.nextElementSibling!.textContent = value;
                }}
              />
              <span className="text-sm text-gray-600">{currentTemplate.presence_penalty}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency Penalty (-2 to 2)
              </label>
              <input
                type="range"
                name="frequency_penalty"
                min="-2"
                max="2"
                step="0.1"
                defaultValue={currentTemplate.frequency_penalty}
                className="w-full"
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.nextElementSibling!.textContent = value;
                }}
              />
              <span className="text-sm text-gray-600">{currentTemplate.frequency_penalty}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens (100-4000)
            </label>
            <input
              type="number"
              name="max_tokens"
              min="100"
              max="4000"
              defaultValue={currentTemplate.max_tokens}
              required
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              name="system"
              defaultValue={currentTemplate.system}
              required
              rows={16}
              className="w-full p-2 border border-gray-300 rounded min-h-[200px]"
              placeholder="시스템 프롬프트를 입력하세요. 변수는 {title}, {content}, {url} 형식으로 사용할 수 있습니다."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditIndex(null);
                setCurrentTemplate({ ...DEFAULT_TEMPLATE });
              }}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
            >
              <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-1">모델: {template.model}</p>
              <p className="text-sm text-gray-600 mb-1">Temperature: {template.temperature}</p>
              <p className="text-sm text-gray-600 mb-1">Top P: {template.top_p}</p>
              <p className="text-sm text-gray-600 mb-1">
                Presence Penalty: {template.presence_penalty}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Frequency Penalty: {template.frequency_penalty}
              </p>
              <p className="text-sm text-gray-600 mb-1">Max Tokens: {template.max_tokens}</p>
              <p className="text-sm text-gray-600 mb-4">
                System Prompt: {template.system.substring(0, 100)}
                {template.system.length > 100 ? '...' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(template)}
                  className="flex-1 bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700"
                >
                  프리뷰
                </button>
                <button
                  onClick={() => handleEdit(template, index)}
                  className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="flex-1 bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromptPreviewModal
        isOpen={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
        apiKey={apiKey}
      />
    </div>
  );
} 