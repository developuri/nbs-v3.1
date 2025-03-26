'use client';

import { useState } from 'react';
import axios from 'axios';
import { useBlogStore, Blog } from '../store/blogStore';

export default function BlogManagement() {
  const { blogs, addBlog, removeBlog, removeAllBlogs } = useBlogStore();
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urls.trim()) {
      setError('블로그 URL을 입력해주세요.');
      return;
    }
    
    // 줄바꿈으로 구분된 여러 URL을 배열로 변환
    const urlList = urls.split('\n').filter(url => url.trim());
    
    if (urlList.length === 0) {
      setError('블로그 URL을 입력해주세요.');
      return;
    }
    
    // 네이버 블로그 URL 확인
    const nonNaverBlogs = urlList.filter(url => !url.includes('blog.naver.com'));
    if (nonNaverBlogs.length > 0) {
      setError('현재 네이버 블로그만 지원합니다: ' + nonNaverBlogs[0]);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      let addedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      
      // 각 URL에 대해 처리
      for (const url of urlList) {
        const cleanUrl = url.trim();
        if (!cleanUrl) continue;
        
        // 이미 등록된 URL인지 확인
        const isDuplicate = blogs.some(blog => blog.url === cleanUrl);
        if (isDuplicate) {
          duplicateCount++;
          continue;
        }
        
        try {
          // 블로그 정보 가져오기 (포스트 스크랩 없이 블로그 이름만 가져옴)
          const response = await axios.get(`/api/blogInfo?url=${encodeURIComponent(cleanUrl)}`);
          const { blogName } = response.data;
          
          // 블로그 저장
          addBlog({ name: blogName, url: cleanUrl });
          addedCount++;
        } catch (error) {
          console.error(`'${cleanUrl}' 블로그 추가 오류:`, error);
          errorCount++;
        }
      }
      
      // 결과 메시지 생성
      let message = '';
      if (addedCount > 0) message += `${addedCount}개의 블로그를 추가했습니다. `;
      if (duplicateCount > 0) message += `${duplicateCount}개의 블로그는 이미 등록되어 있습니다. `;
      if (errorCount > 0) message += `${errorCount}개의 블로그는 정보를 가져오는데 실패했습니다.`;
      
      if (addedCount > 0) {
        setSuccessMessage(message);
        setUrls('');
      } else if (message) {
        setError(message);
      }
    } catch (error) {
      console.error('블로그 추가 오류:', error);
      setError('블로그 정보를 가져오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemove = (id: string) => {
    if (window.confirm('이 블로그를 삭제하시겠습니까?')) {
      removeBlog(id);
    }
  };
  
  const handleRemoveAll = () => {
    if (window.confirm('모든 블로그를 삭제하시겠습니까?')) {
      removeAllBlogs();
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">블로그 주소 관리</h2>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">블로그 주소 등록</h3>
        
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="space-y-4">
            <div>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="네이버 블로그 주소를 입력하세요 (여러 개의 주소는 줄바꿈으로 구분)"
                className="w-full p-3 border border-gray-300 rounded-md h-32 resize-y focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-2">
                한 줄에 하나의 블로그 주소를 입력하세요. 예: https://blog.naver.com/blogid
              </p>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? '등록 중...' : '블로그 등록'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">등록된 블로그 목록 ({blogs.length})</h3>
          {blogs.length > 0 && (
            <button 
              onClick={handleRemoveAll}
              className="text-red-500 hover:text-red-700 text-sm border border-red-300 px-3 py-1 rounded hover:bg-red-50"
            >
              전체 삭제
            </button>
          )}
        </div>
        
        {blogs.length === 0 ? (
          <div className="text-gray-500 p-4 bg-gray-50 rounded-md">등록된 블로그가 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {blogs.map((blog) => (
              <li key={blog.id} className="py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{blog.name}</h3>
                  <a
                    href={blog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm break-all"
                  >
                    {blog.url}
                  </a>
                </div>
                <button
                  onClick={() => handleRemove(blog.id)}
                  className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0 p-2 rounded-full hover:bg-red-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 