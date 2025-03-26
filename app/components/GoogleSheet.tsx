'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useBlogStore } from '../../store/blogStore';

// 알파벳 A부터 Z까지 배열 생성
const COLUMNS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export default function GoogleSheet() {
  const { scrapedPosts, googleSheetInfo, updateGoogleSheetInfo } = useBlogStore();
  
  const [sheetUrl, setSheetUrl] = useState(googleSheetInfo.sheetUrl);
  const [sheetName, setSheetName] = useState(googleSheetInfo.sheetName);
  const [titleColumn, setTitleColumn] = useState(googleSheetInfo.titleColumn);
  const [contentColumn, setContentColumn] = useState(googleSheetInfo.contentColumn);
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | '' }>({ 
    text: '', 
    type: '' 
  });

  // Store에 값을 저장하는 함수
  const saveToStore = (field: string, value: string) => {
    updateGoogleSheetInfo({ [field]: value } as any);
  };

  const validateSheetUrl = (url: string) => {
    // Google Sheets URL 형식: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    const regex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/edit/;
    return regex.test(url);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // JSON 파일만 허용
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setCredentialsFile(file);
        updateGoogleSheetInfo({ credentials: file });
        setMessage({ text: '', type: '' });
      } else {
        setCredentialsFile(null);
        updateGoogleSheetInfo({ credentials: null });
        setMessage({ 
          text: 'JSON 파일만 업로드할 수 있습니다.', 
          type: 'error' 
        });
      }
    }
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

    if (!credentialsFile) {
      setMessage({ 
        text: '구글 서비스 계정 인증 파일을 업로드해주세요.', 
        type: 'error' 
      });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ text: '', type: '' });

      // 인증 파일을 읽기
      const credentialsJson = await readFileAsText(credentialsFile);
      
      // JSON 형식 확인
      try {
        JSON.parse(credentialsJson);
      } catch (e) {
        setMessage({ 
          text: '유효한 JSON 형식의 인증 파일이 아닙니다.', 
          type: 'error' 
        });
        setIsLoading(false);
        return;
      }

      // FormData 객체 생성
      const formData = new FormData();
      formData.append('credentials', credentialsFile);
      formData.append('data', JSON.stringify({
        sheetUrl,
        sheetName,
        titleColumn,
        contentColumn,
        posts: scrapedPosts
      }));

      const response = await axios.post('/api/sheets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // 중복 데이터가 있는지 확인
        if (response.data.skippedRows && response.data.skippedRows > 0) {
          if (response.data.updatedRows === 0) {
            // 모든 데이터가 중복인 경우 warning으로 표시
            setMessage({ 
              text: response.data.message || '모든 포스트가 이미 시트에 존재합니다.', 
              type: 'warning' 
            });
          } else {
            // 일부 데이터만 중복인 경우 success로 표시하되 중복 정보도 포함
            setMessage({ 
              text: response.data.message || `${response.data.updatedRows}개의 새 포스트가 추가되었습니다. (${response.data.skippedRows}개 중복 건너뜀)`, 
              type: 'success' 
            });
          }
        } else {
          // 중복 데이터 없이 모두 추가된 경우
          setMessage({ 
            text: response.data.message || `성공적으로 ${response.data.updatedRows}개의 포스트를 구글 시트에 저장했습니다.`, 
            type: 'success' 
          });
        }
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

  // 파일을 텍스트로 읽기
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new Error('파일 읽기 실패'));
        }
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsText(file);
    });
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
            onChange={(e) => {
              setSheetUrl(e.target.value);
              saveToStore('sheetUrl', e.target.value);
            }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            구글 시트 URL을 입력해주세요. 시트에 대한 편집 권한이 필요합니다.
          </p>
        </div>

        <div>
          <label htmlFor="credentials" className="block text-sm font-medium text-gray-700 mb-1">
            구글 서비스 계정 인증 파일
          </label>
          <div className="flex items-center">
            <input
              id="credentials"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 p-2 border border-gray-300 rounded-md text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 truncate"
            >
              {credentialsFile ? credentialsFile.name : '파일 선택...'}
            </button>
            {credentialsFile && (
              <button
                onClick={() => {
                  setCredentialsFile(null);
                  updateGoogleSheetInfo({ credentials: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="ml-2 p-2 text-red-600 hover:text-red-800"
                title="파일 제거"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            구글 서비스 계정 키 JSON 파일을 업로드해주세요. 이 파일은 서버에 저장되지 않고 요청 시에만 사용됩니다.
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
            onChange={(e) => {
              setSheetName(e.target.value);
              saveToStore('sheetName', e.target.value);
            }}
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
              onChange={(e) => {
                setTitleColumn(e.target.value);
                saveToStore('titleColumn', e.target.value);
              }}
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
              onChange={(e) => {
                setContentColumn(e.target.value);
                saveToStore('contentColumn', e.target.value);
              }}
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
            message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' : ''
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium">스크랩된 포스트:</span> {scrapedPosts.length}개
          </p>
          <p className="text-xs text-gray-500 mt-1">
            중복된 제목의 포스트는 자동으로 건너뜁니다.
          </p>
        </div>
      </div>
    </div>
  );
} 