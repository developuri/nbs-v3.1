'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex-1 p-6">
      <h1 className="text-3xl font-bold mb-8">블로그 스크랩 도구</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/scrap" className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-semibold ml-3">블로그 스크랩</h2>
          </div>
          <p className="text-gray-600">네이버 블로그 글을 스크랩하고 구글 시트에 저장할 수 있습니다.</p>
        </Link>

        <Link href="/gpt" className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-xl font-semibold ml-3">GPT</h2>
          </div>
          <p className="text-gray-600">GPT를 활용하여 블로그 컨텐츠를 자동으로 생성하고 가공할 수 있습니다.</p>
        </Link>

        <Link href="/post" className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h2 className="text-xl font-semibold ml-3">POST</h2>
          </div>
          <p className="text-gray-600">블로그 포스팅을 관리하고 설정할 수 있습니다.</p>
        </Link>
      </div>
    </div>
  );
} 