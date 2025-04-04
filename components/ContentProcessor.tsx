'use client';

import { useState, useMemo } from 'react';
import { usePromptStore } from '../store/promptStore';
import { useBlogStore } from '../store/blogStore';
import { useGptStore } from '../store/gptStore';
import { useContentStore } from '../store/contentStore';

interface ProcessingStatus {
  current: number;
  total: number;
  isProcessing: boolean;
  error?: string;
  completed?: boolean;
  processedCount?: number;
}

const COLUMN_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' },
  { value: 'H', label: 'H' },
  { value: 'I', label: 'I' },
  { value: 'J', label: 'J' },
];

export default function ContentProcessor() {
  const { templates } = usePromptStore();
  const { apiKey } = useGptStore();
  const { googleSheetInfo } = useBlogStore();
  const { 
    selectedTemplate, 
    outputSheet, 
    setSelectedTemplate, 
    setOutputSheet 
  } = useContentStore();
  
  const [status, setStatus] = useState<ProcessingStatus>({
    current: 0,
    total: 0,
    isProcessing: false,
  });

  // 사용 가능한 열 옵션 계산
  const availableColumns = useMemo(() => {
    const usedColumns = new Set([outputSheet.titleColumn, outputSheet.contentColumn]);
    return COLUMN_OPTIONS.filter(option => !usedColumns.has(option.value) || option.value === outputSheet.titleColumn || option.value === outputSheet.contentColumn);
  }, [outputSheet.titleColumn, outputSheet.contentColumn]);

  const handleProcess = async () => {
    if (!selectedTemplate || !outputSheet.sheetName || !outputSheet.titleColumn || !outputSheet.contentColumn) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (!apiKey) {
      alert('GPT API 키가 설정되어 있지 않습니다.');
      return;
    }

    try {
      setStatus({
        current: 0,
        total: 0,
        isProcessing: true,
        error: undefined,
      });

      const response = await fetch('/api/content/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceSheet: {
            url: googleSheetInfo.sheetUrl,
            sheetName: googleSheetInfo.sheetName,
            titleColumn: googleSheetInfo.titleColumn,
            contentColumn: googleSheetInfo.contentColumn,
            linkColumn: googleSheetInfo.linkColumn,
          },
          outputSheet: {
            sheetName: outputSheet.sheetName,
            titleColumn: outputSheet.titleColumn,
            contentColumn: outputSheet.contentColumn,
          },
          template: templates[parseInt(selectedTemplate)],
          apiKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '처리 중 오류가 발생했습니다.');
      }

      // SSE 처리
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('스트림을 읽을 수 없습니다.');
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'progress':
                setStatus(prev => ({
                  ...prev,
                  current: data.current,
                  total: data.total,
                  processedCount: data.processed,
                  isProcessing: true,
                }));
                break;

              case 'complete':
                setStatus(prev => ({
                  ...prev,
                  current: data.total,
                  total: data.total,
                  processedCount: data.processed,
                  isProcessing: false,
                  completed: true,
                }));
                break;

              case 'error':
                throw new Error(data.error);
            }
          }
        }
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.',
        completed: false
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">컨텐츠 가공</h2>
      
      {/* 템플릿 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          프롬프트 템플릿 선택
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="">템플릿을 선택하세요</option>
          {templates.map((template, index) => (
            <option key={index} value={index}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      {/* 출력 시트 설정 */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-medium">출력 시트 설정</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            시트 이름
          </label>
          <input
            type="text"
            value={outputSheet.sheetName}
            onChange={(e) => setOutputSheet({ ...outputSheet, sheetName: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="결과를 저장할 시트 이름"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제목 열
          </label>
          <select
            value={outputSheet.titleColumn}
            onChange={(e) => setOutputSheet({ ...outputSheet, titleColumn: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">열을 선택하세요</option>
            {COLUMN_OPTIONS.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.value === outputSheet.contentColumn}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            내용 열
          </label>
          <select
            value={outputSheet.contentColumn}
            onChange={(e) => setOutputSheet({ ...outputSheet, contentColumn: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">열을 선택하세요</option>
            {COLUMN_OPTIONS.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.value === outputSheet.titleColumn}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 진행 상태 */}
      {(status.isProcessing || status.completed) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>진행률</span>
              <span>{status.total > 0 ? Math.round((status.current / status.total) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  status.completed ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${status.total > 0 ? (status.current / status.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center">
            {status.isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                <p className="text-sm text-gray-600">
                  처리 중... ({status.current}/{status.total})
                </p>
              </>
            ) : status.completed ? (
              <div className="text-sm text-gray-600">
                <p className="flex items-center text-green-600 font-medium mb-1">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  처리 완료
                </p>
                <p>총 {status.total}개의 항목 중 {status.processedCount}개가 새로 처리되었습니다.</p>
                <p className="text-gray-500 text-xs mt-1">(이미 처리된 항목 제외)</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {status.error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{status.error}</span>
        </div>
      )}

      {/* 실행 버튼 */}
      <button
        onClick={handleProcess}
        disabled={status.isProcessing}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status.isProcessing ? '처리 중...' : '컨텐츠 가공 시작'}
      </button>
    </div>
  );
} 