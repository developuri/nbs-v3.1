'use client';

import { useState } from 'react';
import axios from 'axios';
import { useBlogStore, Blog } from '../store/blogStore';

export default function BlogManagement() {
  const { blogs, addBlog, removeBlog } = useBlogStore();
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
          // 블로그 정보 가져오기
          const response = await axios.post('/api/scrape', { url: cleanUrl });
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
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">블로그 주소 등록</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-2">
          <div>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="네이버 블로그 주소를 입력하세요 (여러 개의 주소는 줄바꿈으로 구분)"
              className="w-full p-2 border border-gray-300 rounded h-32 resize-y"
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500 mt-1">
              한 줄에 하나의 블로그 주소를 입력하세요. 예: https://blog.naver.com/blogid
            </p>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            {successMessage && <p className="text-green-500 text-sm mt-1">{successMessage}</p>}
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading}
          >
            {isLoading ? '등록 중...' : '블로그 등록'}
          </button>
        </div>
      </form>
      
      <h2 className="text-xl font-semibold mb-4">등록된 블로그 목록</h2>
      
      {blogs.length === 0 ? (
        <p className="text-gray-500">등록된 블로그가 없습니다.</p>
      ) : (
        <ul className="border border-gray-200 rounded divide-y divide-gray-200">
          {blogs.map((blog) => (
            <li key={blog.id} className="p-4 flex justify-between items-center">
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
                className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 