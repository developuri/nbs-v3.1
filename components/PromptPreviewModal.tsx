'use client';

import { useState, useEffect } from 'react';
import { PromptTemplate } from '../types/prompt';
import { useBlogStore } from '../store/blogStore';

interface SheetRow {
  title: string;
  content: string;
  url: string;
  [key: string]: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template: PromptTemplate | null;
  apiKey: string;
}

export default function PromptPreviewModal({ isOpen, onClose, template, apiKey }: Props) {
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { googleSheetInfo } = useBlogStore();

  // 구글 시트 데이터 로드
  useEffect(() => {
    const fetchSheetData = async () => {
      if (!isOpen || !template) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const searchParams = new URLSearchParams({
          sheetUrl: googleSheetInfo.sheetUrl,
          sheetName: googleSheetInfo.sheetName,
          titleColumn: googleSheetInfo.titleColumn,
          contentColumn: googleSheetInfo.contentColumn,
          linkColumn: googleSheetInfo.linkColumn,
        });

        const response = await fetch(`/api/sheets/preview?${searchParams.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '시트 데이터를 불러오는데 실패했습니다.');
        }

        // 처음 10개 행만 사용
        setSheetData(data.rows.slice(0, 10));
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSheetData();
  }, [isOpen, template, googleSheetInfo]);

  const handleRowSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(event.target.value);
    setSelectedRow(sheetData[index]);
    setResult(null);
  };

  const handlePreview = async () => {
    if (!template || !selectedRow || !apiKey) return;

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const systemPrompt = template.system
        .replace(/{title}/g, selectedRow.title)
        .replace(/{content}/g, selectedRow.content)
        .replace(/{url}/g, selectedRow.url);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
          ],
          model: template.model,
          temperature: template.temperature,
          top_p: template.top_p,
          presence_penalty: template.presence_penalty,
          frequency_penalty: template.frequency_penalty,
          max_tokens: template.max_tokens,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'GPT API 요청에 실패했습니다.');
      }

      setResult(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프리뷰 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            프롬프트 템플릿 프리뷰: {template?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <label className="font-medium">테스트할 행 선택:</label>
            <select
              onChange={handleRowSelect}
              className="flex-1 max-w-xs p-2 border border-gray-300 rounded-md"
              disabled={isLoading || sheetData.length === 0}
            >
              <option value="">행을 선택하세요</option>
              {sheetData.map((row, index) => (
                <option key={index} value={index}>
                  {index + 1}행: {row.title.substring(0, 30)}{row.title.length > 30 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* 왼쪽: 선택된 데이터 */}
          <div className="w-1/2 border-r border-gray-200 p-4 overflow-auto">
            <h3 className="text-lg font-medium mb-4">선택된 데이터</h3>
            {isLoading && !sheetData.length ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 p-4 rounded-md bg-red-50">
                {error}
              </div>
            ) : selectedRow ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">제목</h4>
                  <div className="p-3 bg-gray-50 rounded-md">{selectedRow.title}</div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">내용</h4>
                  <div className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{selectedRow.content}</div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">URL</h4>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <a href={selectedRow.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedRow.url}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                상단에서 테스트할 행을 선택해주세요.
              </div>
            )}
          </div>

          {/* 오른쪽: 프리뷰 결과 */}
          <div className="w-1/2 p-4 flex flex-col">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">프리뷰 결과</h3>
              <button
                onClick={handlePreview}
                disabled={!selectedRow || isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '생성 중...' : '프리뷰 생성'}
              </button>
            </div>

            {error && (
              <div className="text-red-600 p-4 rounded-md bg-red-50 mb-4">
                {error}
              </div>
            )}

            {result ? (
              <div className="flex-1 overflow-auto p-4 bg-gray-50 border border-gray-200 rounded-md">
                <pre className="whitespace-pre-wrap">{result}</pre>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                프리뷰 생성 버튼을 클릭하여 결과를 확인하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 