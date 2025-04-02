'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useBlogStore } from '../../store/blogStore';
import GoogleCredentialsUploader from './GoogleCredentialsUploader';

// 알파벳 A부터 Z까지 배열 생성
const COLUMNS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export default function GoogleSheet() {
  const { scrapedPosts, googleSheetInfo, updateGoogleSheetInfo } = useBlogStore();
  
  const [sheetUrl, setSheetUrl] = useState(googleSheetInfo.sheetUrl);
  const [sheetName, setSheetName] = useState(googleSheetInfo.sheetName);
  const [titleColumn, setTitleColumn] = useState(googleSheetInfo.titleColumn);
  const [contentColumn, setContentColumn] = useState(googleSheetInfo.contentColumn);
  const [linkColumn, setLinkColumn] = useState(googleSheetInfo.linkColumn);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | '' }>({ 
    text: '', 
    type: '' 
  });

  // 구글시트 정보가 변경될 때마다 로컬 상태 업데이트
  useEffect(() => {
    setSheetUrl(googleSheetInfo.sheetUrl);
    setSheetName(googleSheetInfo.sheetName);
    setTitleColumn(googleSheetInfo.titleColumn);
    setContentColumn(googleSheetInfo.contentColumn);
    setLinkColumn(googleSheetInfo.linkColumn);
  }, [googleSheetInfo]);

  // 인증 파일 상태 확인
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const response = await fetch('/api/google/credentials/check');
        const data = await response.json();
        setHasCredentials(data.hasCredentials);
      } catch (error) {
        console.error('인증 파일 상태 확인 실패:', error);
        setHasCredentials(false);
      }
    };

    checkCredentials();
  }, []);

  // Store에 값을 저장하는 함수
  const saveToStore = (field: string, value: string) => {
    updateGoogleSheetInfo({ [field]: value } as any);
  };

  const validateSheetUrl = (url: string) => {
    // Google Sheets URL 형식: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    const regex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/edit/;
    return regex.test(url);
  };

  // URL에서 쿼리 파라미터 제거
  const cleanUrl = (url: string) => {
    return url.split('?')[0];
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

    if (!hasCredentials) {
      setMessage({ 
        text: '구글 서비스 계정 인증 파일을 먼저 업로드해주세요.', 
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
        linkColumn,
        posts: scrapedPosts.map(post => ({
          ...post,
          url: cleanUrl(post.url)
        }))
      });

      if (response.data.success) {
        if (response.data.skippedRows && response.data.skippedRows > 0) {
          if (response.data.updatedRows === 0) {
            setMessage({ 
              text: response.data.message || '모든 포스트가 이미 시트에 존재합니다.', 
              type: 'warning' 
            });
          } else {
            setMessage({ 
              text: response.data.message || `${response.data.updatedRows}개의 새 포스트가 추가되었습니다. (${response.data.skippedRows}개 중복 건너뜀)`, 
              type: 'success' 
            });
          }
        } else {
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

  // 사용 가능한 열 목록 생성
  const getAvailableColumns = (currentColumn: string, selectedColumns: string[]) => {
    return COLUMNS.filter(col => !selectedColumns.includes(col) || col === currentColumn);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">구글 시트 저장</h2>
      
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">1. 구글 서비스 계정 인증</h3>
          <GoogleCredentialsUploader onSuccess={() => setHasCredentials(true)} />
          {hasCredentials && (
            <div className="mt-2 text-sm text-green-600">
              ✓ 인증 파일이 저장되어 있습니다
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">2. 구글 시트 설정</h3>
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
                {getAvailableColumns(titleColumn, [contentColumn, linkColumn]).map((col) => (
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
                {getAvailableColumns(contentColumn, [titleColumn, linkColumn]).map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="linkColumn" className="block text-sm font-medium text-gray-700 mb-1">
                링크 열
              </label>
              <select
                id="linkColumn"
                value={linkColumn}
                onChange={(e) => {
                  setLinkColumn(e.target.value);
                  saveToStore('linkColumn', e.target.value);
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {getAvailableColumns(linkColumn, [titleColumn, contentColumn]).map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="pt-2">
          <button
            onClick={handleSaveToSheet}
            disabled={isLoading || !hasCredentials}
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