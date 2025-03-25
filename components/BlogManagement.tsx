'use client';

import { useState } from 'react';
import axios from 'axios';
import { useBlogStore, Blog } from '../store/blogStore';

export default function BlogManagement() {
  const { blogs, addBlog, removeBlog } = useBlogStore();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError('블로그 URL을 입력해주세요.');
      return;
    }
    
    if (!url.includes('blog.naver.com')) {
      setError('현재 네이버 블로그만 지원합니다.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 블로그 정보 가져오기
      const response = await axios.post('/api/scrape', { url });
      const { blogName } = response.data;
      
      // 이미 등록된 URL인지 확인
      const isDuplicate = blogs.some(blog => blog.url === url);
      if (isDuplicate) {
        setError('이미 등록된 블로그입니다.');
        return;
      }
      
      // 블로그 저장
      addBlog({ name: blogName, url });
      setUrl('');
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
        <div className="flex items-start">
          <div className="flex-grow">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="네이버 블로그 주소를 입력하세요"
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isLoading}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            className="ml-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading}
          >
            {isLoading ? '등록 중...' : '등록'}
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
                  className="text-blue-500 hover:underline text-sm"
                >
                  {blog.url}
                </a>
              </div>
              <button
                onClick={() => handleRemove(blog.id)}
                className="text-red-500 hover:text-red-700"
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