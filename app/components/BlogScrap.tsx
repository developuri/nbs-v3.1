'use client';

import { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useBlogStore, BlogPost } from '../../store/blogStore';

export default function BlogScrap() {
  const { blogs, scrapedPosts, addScrapedPost, removeScrapedPost, clearScrapedPosts } = useBlogStore();
  
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  
  const handleScrap = async () => {
    if (blogs.length === 0) {
      setError('등록된 블로그가 없습니다. 먼저 블로그를 등록해주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      let totalPostsFound = 0;
      
      for (const blog of blogs) {
        try {
          const response = await axios.post('/api/scrape', {
            url: blog.url,
            keyword,
            startDate,
            endDate,
          });
          
          const { posts } = response.data;
          console.log(`'${blog.name}' 블로그에서 ${posts.length}개의 포스트를 찾았습니다.`);
          totalPostsFound += posts.length;
          
          // 가져온 각 포스트를 저장
          for (const post of posts) {
            addScrapedPost({
              blogId: blog.id,
              title: post.title,
              content: post.content,
              url: post.url,
              date: post.date,
            });
          }
        } catch (blogError) {
          console.error(`'${blog.name}' 블로그 스크랩 오류:`, blogError);
        }
      }
      
      if (totalPostsFound === 0) {
        setError('포스트를 찾을 수 없습니다. 다른 키워드나 날짜 범위를 시도해보세요.');
      } else {
        setError(null);
      }
    } catch (error) {
      console.error('스크랩 오류:', error);
      setError('블로그 스크랩 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewContent = async (post: BlogPost) => {
    if (post.content) {
      setSelectedPost(post);
      return;
    }
    
    try {
      setSelectedPost({...post, content: '내용을 불러오는 중...'});
      
      const response = await axios.post('/api/content', {
        url: post.url,
      });
      
      const { content, error } = response.data;
      
      // 오류가 있는 경우 메시지를 표시
      if (error) {
        console.error("컨텐츠 가져오기 오류:", error);
        const errorContent = `
          <div class="error-content">
            <p>포스트 내용을 가져오는 중 오류가 발생했습니다.</p>
            <p>${error}</p>
            <p><a href="${post.url}" target="_blank" rel="noopener noreferrer">원본 포스트로 이동하기</a></p>
          </div>
        `;
        
        const updatedPost = { ...post, content: errorContent };
        addScrapedPost(updatedPost);
        setSelectedPost(updatedPost);
        return;
      }
      
      // 내용 업데이트
      const updatedPost = { ...post, content };
      addScrapedPost(updatedPost);
      setSelectedPost(updatedPost);
    } catch (error: any) {
      console.error('포스트 내용 가져오기 오류:', error);
      const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다.';
      const errorContent = `
        <div class="error-content">
          <p>포스트 내용을 가져오는 중 오류가 발생했습니다.</p>
          <p>${errorMessage}</p>
          <p><a href="${post.url}" target="_blank" rel="noopener noreferrer">원본 포스트로 이동하여 확인해주세요.</a></p>
        </div>
      `;
      
      setSelectedPost({
        ...post, 
        content: errorContent
      });
    }
  };
  
  const handleRemovePost = (id: string) => {
    if (window.confirm('이 포스트를 삭제하시겠습니까?')) {
      removeScrapedPost(id);
      if (selectedPost && selectedPost.id === id) {
        setSelectedPost(null);
      }
    }
  };
  
  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
        <h3 className="font-medium mb-2">네이버 블로그 RSS 피드로 데이터를 가져옵니다</h3>
        <p>등록한 네이버 블로그의 RSS 피드를 활용하여 최신 글을 스크랩합니다.</p>
        <p className="mt-1 text-sm">일부 블로그는 RSS 피드를 제공하지 않을 수 있습니다. 블로그 설정에서 RSS 피드를 활성화하면 정상적으로 데이터를 가져올 수 있습니다.</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">스크랩 필터</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              키워드
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색 키워드 (선택사항)"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료일
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleScrap}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading}
          >
            {isLoading ? '스크랩 중...' : '스크랩 시작'}
          </button>
          
          <button
            onClick={() => {
              if (window.confirm('모든 스크랩 결과를 삭제하시겠습니까?')) {
                clearScrapedPosts();
                setSelectedPost(null);
              }
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            disabled={scrapedPosts.length === 0}
          >
            결과 초기화
          </button>
        </div>
        
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">스크랩 결과 ({scrapedPosts.length})</h2>
          
          {scrapedPosts.length === 0 ? (
            <p className="text-gray-500">스크랩된 포스트가 없습니다.</p>
          ) : (
            <ul className="border border-gray-200 rounded divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {scrapedPosts.map((post) => {
                // 해당 블로그 정보 찾기
                const blog = blogs.find(blog => blog.id === post.blogId);
                
                return (
                  <li 
                    key={post.id} 
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedPost?.id === post.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between">
                      <div onClick={() => handleViewContent(post)}>
                        <h3 className="font-medium truncate">{post.title}</h3>
                        <p className="text-sm text-gray-500">
                          {blog?.name} · {post.date}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePost(post.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">포스트 내용</h2>
          
          {selectedPost ? (
            <div className="border border-gray-200 rounded p-4 max-h-[600px] overflow-y-auto">
              <h3 className="text-lg font-medium mb-2">{selectedPost.title}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {selectedPost.date} · <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">원본 보기</a>
              </p>
              
              {/* 로딩 중 상태 표시 */}
              {selectedPost.content === '내용을 불러오는 중...' && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-2">내용을 불러오는 중...</span>
                </div>
              )}
              
              {/* 프레임셋 관련 오류 감지 */}
              {selectedPost.content && selectedPost.content.includes('oFramesetTitleController') && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                  <p className="font-medium">프레임셋 관련 오류가 발생했습니다.</p>
                  <p className="text-sm mt-1">네이버 블로그의 보안 정책으로 인해 내용을 가져올 수 없습니다.</p>
                </div>
              )}
              
              {/* 컨텐츠 표시 영역 */}
              <div
                key={`content-${selectedPost.id}`}
                className="prose max-w-none blog-content"
                dangerouslySetInnerHTML={{ 
                  __html: selectedPost.content || '내용을 불러오는 중...'
                }}
              />
              
              {/* 404 오류 시 */}
              {selectedPost.content && (selectedPost.content.includes('404') || selectedPost.content.includes('찾을 수 없습니다')) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  <p className="font-medium">포스트를 찾을 수 없습니다.</p>
                  <p className="text-sm mt-1">포스트가 삭제되었거나 접근 권한이 없을 수 있습니다.</p>
                  <p className="text-sm mt-1">
                    <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      원본 링크로 직접 확인해보세요.
                    </a>
                  </p>
                </div>
              )}
              
              {/* 네이버 블로그 콘텐츠 접근 제한 안내 */}
              {selectedPost.content && selectedPost.content.includes('블로그 포스트 내용을 가져오지 못했습니다') && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
                  <p className="font-medium">네이버 블로그 접근 제한 안내</p>
                  <p className="text-sm mt-1">네이버 블로그의 보안 정책으로 인해 외부에서 콘텐츠를 가져오지 못했습니다.</p>
                  <p className="text-sm mt-1">
                    이 문제를 해결하기 위한 방법:
                  </p>
                  <ol className="text-sm mt-1 list-decimal list-inside">
                    <li>브라우저에서 직접 네이버 블로그에 로그인한 후 다시 시도</li>
                    <li>블로그 소유자인 경우 블로그 설정에서 외부 접근 허용 확인</li>
                    <li>원본 블로그에서 직접 콘텐츠 확인</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded p-4 text-center text-gray-500">
              포스트를 선택하면 내용이 여기에 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 