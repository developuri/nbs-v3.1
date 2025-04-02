'use client';

import { useState } from 'react';
import BlogManagement from '../../components/BlogManagement';
import BlogScrap from '../components/BlogScrap';
import GoogleSheet from '../components/GoogleSheet';

export default function ScrapPage() {
  const [activeTab, setActiveTab] = useState<'management' | 'scrap' | 'sheet'>('management');
  
  return (
    <>
      {/* 사이드바 */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-700">스크랩 메뉴</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveTab('management')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  activeTab === 'management'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                블로그 주소 관리
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('scrap')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  activeTab === 'scrap'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                블로그 글 스크랩
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('sheet')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center ${
                  activeTab === 'sheet'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                구글 시트 저장
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          version 1.0.0
        </div>
      </aside>
      
      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'management' ? (
          <BlogManagement />
        ) : activeTab === 'scrap' ? (
          <BlogScrap />
        ) : (
          <GoogleSheet />
        )}
      </div>
    </>
  );
} 