'use client';

import { useState, useEffect } from 'react';
import { useWordPressStore } from '../../store/wordpressStore';
import { useBlogStore } from '../../store/blogStore';

// 알파벳 A부터 Z까지 배열 생성
const COLUMNS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

interface AutoPostingSettings {
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
  scheduleColumn: string;
  resultColumn: string;
  urlColumn: string;
  selectedBlogId: string;
}

export default function AutoPosting() {
  const { blogs, autoPostingSettings, updateAutoPostingSettings } = useWordPressStore();
  const { googleSheetInfo } = useBlogStore();
  const [settings, setSettings] = useState<AutoPostingSettings>({
    sheetName: googleSheetInfo.sheetName || '',
    titleColumn: autoPostingSettings.titleColumn || '',
    contentColumn: autoPostingSettings.contentColumn || '',
    scheduleColumn: autoPostingSettings.scheduleColumn || '',
    resultColumn: autoPostingSettings.resultColumn || '',
    urlColumn: autoPostingSettings.urlColumn || '',
    selectedBlogId: autoPostingSettings.selectedBlogId || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | ''; text: string }>({
    type: '',
    text: ''
  });
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    isProcessing: false,
    completed: false,
    processedCount: 0
  });

  // settings가 변경될 때마다 스토어에 저장
  useEffect(() => {
    updateAutoPostingSettings(settings);
  }, [settings, updateAutoPostingSettings]);

  // 사용 가능한 열 목록 생성 (이미 선택된 열 제외)
  const getAvailableColumns = (currentColumn: string) => {
    const selectedColumns = [
      settings.titleColumn,
      settings.contentColumn,
      settings.scheduleColumn,
      settings.resultColumn,
      settings.urlColumn
    ];
    return COLUMNS.filter(col => !selectedColumns.includes(col) || col === currentColumn);
  };

  const validateSettings = () => {
    if (!settings.selectedBlogId) return '워드프레스 블로그를 선택해주세요.';
    if (!settings.sheetName) return '시트 이름을 입력해주세요.';
    if (!settings.titleColumn) return '제목 열을 선택해주세요.';
    if (!settings.contentColumn) return '내용 열을 선택해주세요.';
    if (!googleSheetInfo.sheetUrl) return '구글 시트 URL이 설정되지 않았습니다. 워드프레스 등록 메뉴에서 구글 시트 설정을 먼저 완료해주세요.';
    return '';
  };

  const getSheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleStartPosting = async () => {
    try {
      // 설정 검증
      const validationError = validateSettings();
      if (validationError) {
        setMessage({ type: 'error', text: validationError });
        return;
      }

      setIsLoading(true);
      setMessage({ type: 'info', text: '자동 포스팅을 시작합니다...' });
      setProgress({
        current: 0,
        total: 0,
        isProcessing: true,
        completed: false,
        processedCount: 0
      });

      // 선택된 블로그 정보 가져오기
      const selectedBlog = blogs.find(blog => blog.id === settings.selectedBlogId);
      if (!selectedBlog) {
        throw new Error('선택된 블로그 정보를 찾을 수 없습니다.');
      }

      // 구글 시트 ID 추출
      const sheetId = getSheetId(googleSheetInfo.sheetUrl);
      if (!sheetId) {
        throw new Error('구글 시트 URL이 올바르지 않습니다. 워드프레스 등록 메뉴에서 구글 시트 설정을 확인해주세요.');
      }

      const response = await fetch('/api/autopost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          blogInfo: {
            selectedBlog,
            googleSheetInfo: {
              ...googleSheetInfo,
              sheetId
            }
          }
        }),
      });

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
                setProgress(prev => ({
                  ...prev,
                  current: data.current,
                  total: data.total,
                  processedCount: data.processed,
                  isProcessing: true,
                }));
                break;

              case 'complete':
                setProgress(prev => ({
                  ...prev,
                  current: data.total,
                  total: data.total,
                  processedCount: data.processed,
                  isProcessing: false,
                  completed: true,
                }));
                setMessage({ type: 'success', text: '자동 포스팅이 완료되었습니다.' });
                break;

              case 'error':
                throw new Error(data.error);
            }
          }
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setProgress(prev => ({
        ...prev,
        isProcessing: false,
        completed: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">자동포스팅</h2>
      
      <div className="space-y-6">
        {/* 워드프레스 블로그 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            워드프레스 블로그 선택
          </label>
          {blogs.length === 0 ? (
            <div className="text-sm text-gray-500 mb-2">
              등록된 워드프레스 블로그가 없습니다.
              <a href="/post" className="text-blue-500 hover:underline ml-2">
                워드프레스 등록 메뉴에서 블로그를 먼저 등록해주세요.
              </a>
            </div>
          ) : (
            <select
              value={settings.selectedBlogId}
              onChange={(e) => setSettings({ ...settings, selectedBlogId: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">블로그를 선택하세요</option>
              {blogs.map((blog) => (
                <option key={blog.id} value={blog.id}>
                  {blog.name} ({blog.url})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 구글 시트 설정 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">구글 시트 설정</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시트 이름
            </label>
            <input
              type="text"
              value={settings.sheetName}
              onChange={(e) => setSettings({ ...settings, sheetName: e.target.value })}
              placeholder="Sheet1"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 제목 열 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 열 (HTML)
              </label>
              <select
                value={settings.titleColumn}
                onChange={(e) => setSettings({ ...settings, titleColumn: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">열 선택</option>
                {getAvailableColumns(settings.titleColumn).map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* 내용 열 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용 열 (HTML)
              </label>
              <select
                value={settings.contentColumn}
                onChange={(e) => setSettings({ ...settings, contentColumn: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">열 선택</option>
                {getAvailableColumns(settings.contentColumn).map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* 예약발행시간 열 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예약발행시간 열
              </label>
              <select
                value={settings.scheduleColumn}
                onChange={(e) => setSettings({ ...settings, scheduleColumn: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">열 선택 (선택사항)</option>
                {getAvailableColumns(settings.scheduleColumn).map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* 발행결과 열 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발행결과 열
              </label>
              <select
                value={settings.resultColumn}
                onChange={(e) => setSettings({ ...settings, resultColumn: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">열 선택 (자동생성)</option>
                {getAvailableColumns(settings.resultColumn).map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* 발행주소 열 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발행주소 열
              </label>
              <select
                value={settings.urlColumn}
                onChange={(e) => setSettings({ ...settings, urlColumn: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">열 선택 (자동생성)</option>
                {getAvailableColumns(settings.urlColumn).map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 진행 상태 */}
        {(progress.isProcessing || progress.completed) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>진행률</span>
                <span>{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progress.completed ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center">
              {progress.isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                  <p className="text-sm text-gray-600">
                    포스팅 중... ({progress.current}/{progress.total})
                  </p>
                </>
              ) : progress.completed ? (
                <div className="text-sm text-gray-600">
                  <p className="flex items-center text-green-600 font-medium mb-1">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    포스팅 완료
                  </p>
                  <p>총 {progress.total}개의 포스트 중 {progress.processedCount}개가 발행되었습니다.</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {message.text && (
          <div className={`mb-6 p-4 rounded-md flex items-start ${
            message.type === 'error' ? 'bg-red-50 text-red-600' :
            message.type === 'success' ? 'bg-green-50 text-green-600' :
            'bg-blue-50 text-blue-600'
          }`}>
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {message.type === 'error' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              )}
            </svg>
            <span>{message.text}</span>
          </div>
        )}

        <button
          onClick={handleStartPosting}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '포스팅 중...' : '자동 포스팅 시작'}
        </button>
      </div>
    </div>
  );
} 