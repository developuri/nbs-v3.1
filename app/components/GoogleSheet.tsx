'use client';

import { useState } from 'react';
import axios from 'axios';
import { useBlogStore } from '../../store/blogStore';

// 알파벳 A부터 Z까지 배열 생성
const COLUMNS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export default function GoogleSheet() {
  const { scrapedPosts } = useBlogStore();
  
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [titleColumn, setTitleColumn] = useState('A');
  const [contentColumn, setContentColumn] = useState('B');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ 
    text: '', 
    type: '' 
  });

  const validateSheetUrl = (url: string) => {
    // Google Sheets URL 형식: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    const regex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/edit/;
    return regex.test(url);
  };

  const handleSaveToSheet = async () => {
    if (!scrapedPosts.length) {
      setMessage({ 
        text: '저장할 스크랩 데이터가 없습니다. 먼저 블로그 스크랩을 진행해주세요.', 
        type: 'error' 
      });
      return;
    }

    if (!validateSheetUrl(sheetUrl)) {
      setMessage({ 
        text: '유효한 구글 시트 URL을 입력해주세요.', 
        type: 'error' 
      });
      return;
    }

    if (!sheetName.trim()) {
      setMessage({ 
        text: '시트 이름을 입력해주세요.', 
        type: 'error' 
      });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ text: '', type: '' });

      const response = await axios.post('/api/sheets', {
        sheetUrl,
        sheetName,
        titleColumn,
        contentColumn,
        posts: scrapedPosts
      });

      if (response.data.success) {
        setMessage({ 
          text: `성공적으로 ${scrapedPosts.length}개의 포스트를 구글 시트에 저장했습니다.`, 
          type: 'success' 
        });
      } else {
        setMessage({ 
          text: response.data.error || '구글 시트 저장 중 오류가 발생했습니다.', 
          type: 'error' 
        });
      }
    } catch (error: any) {
      console.error('구글 시트 저장 오류:', error);
      setMessage({ 
        text: error.response?.data?.error || '구글 시트 저장 중 오류가 발생했습니다.', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">구글 시트 저장</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="sheetUrl" className="block text-sm font-medium text-gray-700 mb-1">
            구글 시트 URL
          </label>
          <input
            id="sheetUrl"
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            구글 시트 URL을 입력해주세요. 시트에 대한 편집 권한이 필요합니다.
          </p>
        </div>
        
        <div>
          <label htmlFor="sheetName" className="block text-sm font-medium text-gray-700 mb-1">
            시트 이름
          </label>
          <input
            id="sheetName"
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Sheet1"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="titleColumn" className="block text-sm font-medium text-gray-700 mb-1">
              제목 열
            </label>
            <select
              id="titleColumn"
              value={titleColumn}
              onChange={(e) => setTitleColumn(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {COLUMNS.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label htmlFor="contentColumn" className="block text-sm font-medium text-gray-700 mb-1">
              내용 열
            </label>
            <select
              id="contentColumn"
              value={contentColumn}
              onChange={(e) => setContentColumn(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {COLUMNS.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="pt-2">
          <button
            onClick={handleSaveToSheet}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '저장 중...' : '구글 시트로 저장하기'}
          </button>
        </div>
        
        {message.text && (
          <div className={`mt-3 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 
            message.type === 'error' ? 'bg-red-50 text-red-800' : ''
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium">스크랩된 포스트:</span> {scrapedPosts.length}개
          </p>
        </div>
      </div>
    </div>
  );
} 