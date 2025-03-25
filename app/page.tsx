'use client';

import { useState, useEffect } from 'react';
import BlogManagement from '../components/BlogManagement';
import BlogScrap from './components/BlogScrap';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'management' | 'scrap'>('management');
  
  // iframe 오류 관련 코드 추가
  useEffect(() => {
    // Frameset 오류 감지 및 처리
    const handleFramesetError = () => {
      const framesetErrors = document.querySelectorAll('text[data-action="sourcepos"]');
      if (framesetErrors.length > 0) {
        console.log('Frameset 관련 오류 감지됨, 정리 중...');
        framesetErrors.forEach(error => error.remove());
      }
    };
    
    // 문서 로드 시 및 DOM 변경 시 오류 처리
    handleFramesetError();
    
    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver(handleFramesetError);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <main className="container mx-auto max-w-6xl p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">블로그 스크랩 도구</h1>
      
      {/* 탭 메뉴 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 text-lg font-medium ${
            activeTab === 'management'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('management')}
        >
          블로그 주소 관리
        </button>
        <button
          className={`py-2 px-4 text-lg font-medium ${
            activeTab === 'scrap'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('scrap')}
        >
          블로그 글 스크랩
        </button>
      </div>
      
      {/* 탭 내용 */}
      <div className="mt-4">
        {activeTab === 'management' ? (
          <BlogManagement />
        ) : (
          <BlogScrap />
        )}
      </div>
    </main>
  );
} 