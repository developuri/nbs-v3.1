'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useBlogStore, BlogPost, KeywordTag } from '../../store/blogStore';

// 진행 상태 인터페이스
interface ScrapProgress {
  current: number;
  total: number;
  percent: number;
  title: string;
}

// SSE 이벤트 타입 정의
interface SSEEvent extends Event {
  data: string;
}

export default function BlogScrap() {
  const { 
    blogs, 
    scrapedPosts, 
    keywords,
    addScrapedPost, 
    removeScrapedPost, 
    clearScrapedPosts,
    setKeywords,
    addKeyword: storeAddKeyword,
    removeKeyword: storeRemoveKeyword
  } = useBlogStore();
  
  const [keywordInput, setKeywordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  
  // 진행률 관련 상태
  const [progress, setProgress] = useState<ScrapProgress | null>(null);
  const [totalFound, setTotalFound] = useState<number | null>(null);
  const [currentBlogName, setCurrentBlogName] = useState<string | null>(null);
  
  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    
    // 쉼표로 구분된 키워드를 배열로 변환
    const newKeywordsText = keywordInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .filter(k => !keywords.some(existingKeyword => existingKeyword.text === k));
    
    if (newKeywordsText.length > 0) {
      // 각 키워드를 스토어에 개별적으로 추가
      newKeywordsText.forEach(text => storeAddKeyword(text));
      setKeywordInput('');
    }
  };
  
  const handleRemoveKeyword = (id: string) => {
    storeRemoveKeyword(id);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };
  
  const handleScrap = async () => {
    if (blogs.length === 0) {
      setError('등록된 블로그가 없습니다. 먼저 블로그를 등록해주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 스크랩 시작 시 이전 결과 초기화
      clearScrapedPosts();
      setSelectedPost(null);
      setProgress(null);
      setTotalFound(null);
      setCurrentBlogName(null);
      
      // 키워드 배열 생성
      const keywordList = keywords.map(k => k.text);
      
      for (const blog of blogs) {
        try {
          setCurrentBlogName(blog.name);
          
          // SSE를 사용한 스트리밍 방식으로 요청
          const eventSource = new EventSource(`/api/scrape/stream?url=${encodeURIComponent(blog.url)}&keywords=${encodeURIComponent(JSON.stringify(keywordList))}`);
          
          // 이벤트 리스너 등록
          await new Promise<void>((resolve, reject) => {
            // 스크랩 시작 이벤트
            eventSource.addEventListener('start', (event) => {
              const data = JSON.parse((event as SSEEvent).data);
              console.log('스크랩 시작:', data.message);
            });
            
            // 블로그 정보 이벤트
            eventSource.addEventListener('blog', (event) => {
              const data = JSON.parse((event as SSEEvent).data);
              setCurrentBlogName(data.blogName);
            });
            
            // 포스트 개수 이벤트
            eventSource.addEventListener('count', (event) => {
              const data = JSON.parse((event as SSEEvent).data);
              setTotalFound(data.total);
              console.log(`${data.total}개의 포스트를 찾았습니다.`);
            });
            
            // 진행 상황 이벤트
            eventSource.addEventListener('progress', (event) => {
              const progressData = JSON.parse((event as SSEEvent).data);
              setProgress(progressData);
            });
            
            // 포스트 데이터 이벤트
            eventSource.addEventListener('post', (event) => {
              const post = JSON.parse((event as SSEEvent).data);
              addScrapedPost({
                blogId: blog.id,
                title: post.title,
                content: post.content,
                url: post.url,
                date: post.date,
              });
            });
            
            // 완료 이벤트
            eventSource.addEventListener('complete', (event) => {
              const data = JSON.parse((event as SSEEvent).data);
              console.log('스크랩 완료:', data.message);
              eventSource.close();
              resolve();
            });
            
            // 오류 이벤트
            eventSource.addEventListener('error', (event) => {
              console.error('SSE 오류:', event);
              eventSource.close();
              
              // 오류 데이터가 있으면 파싱
              try {
                const errorData = JSON.parse((event as SSEEvent).data);
                setError(errorData.message);
                // 대체 데이터가 있으면 처리
                if (errorData.posts) {
                  for (const post of errorData.posts) {
                    addScrapedPost({
                      blogId: blog.id,
                      title: post.title,
                      content: post.content,
                      url: post.url,
                      date: post.date,
                    });
                  }
                }
              } catch (e) {
                setError('블로그 스크랩 중 오류가 발생했습니다.');
              }
              
              resolve();
            });
          });
          
        } catch (blogError) {
          console.error(`'${blog.name}' 블로그 스크랩 오류:`, blogError);
        }
      }
      
      // 모든 블로그 스크랩 완료 후, 저장된 포스트가 있는지 확인
      // 상태 업데이트는 비동기적이므로, 여기서 useBlogStore()에서 직접 스크랩된 포스트를 가져옴
      const currentScrapedPosts = useBlogStore.getState().scrapedPosts;
      
      if (currentScrapedPosts.length > 0) {
        // 포스트가 있으면 첫번째 포스트 선택
        setSelectedPost(currentScrapedPosts[0]);
        // 오류 메시지가 남아있으면 지움
        setError(null);
      } else if (blogs.length > 0) {
        // 블로그는 있지만 스크랩된 포스트가 없는 경우
        setError('포스트를 찾을 수 없습니다. 다른 키워드를 시도해보세요.');
      }
      
    } catch (error) {
      console.error('스크랩 오류:', error);
      setError('블로그 스크랩 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setProgress(null);
      setCurrentBlogName(null);
    }
  };
  
  // 스크랩된 포스트 목록이 변경되면 첫 번째 포스트 자동 선택
  useEffect(() => {
    if (scrapedPosts.length > 0 && !selectedPost) {
      setSelectedPost(scrapedPosts[0]);
    }
  }, [scrapedPosts, selectedPost]);
  
  const handleViewContent = async (post: BlogPost) => {
    // 이미 내용이 있으면 바로 선택
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
        const errorContent = `내용을 가져오는 중 오류가 발생했습니다. ${error}`;
        
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
      
      setSelectedPost({
        ...post, 
        content: `내용을 가져오는 중 오류가 발생했습니다. ${errorMessage}`
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
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">블로그 글 스크랩</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-blue-800">
        <h3 className="font-medium mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          네이버 블로그 RSS 피드로 데이터를 가져옵니다
        </h3>
        <p>등록한 네이버 블로그의 RSS 피드를 활용하여 최신 글을 스크랩합니다.</p>
        <p className="mt-1 text-sm">일부 블로그는 RSS 피드를 제공하지 않을 수 있습니다. 블로그 설정에서 RSS 피드를 활성화하면 정상적으로 데이터를 가져올 수 있습니다.</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">스크랩 필터</h3>
        
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            키워드 추가
          </label>
          <div className="flex">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="검색 키워드 (쉼표로 구분하여 여러 개 입력)"
              className="flex-grow p-3 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="bg-blue-600 text-white px-4 py-3 rounded-r-md hover:bg-blue-700 transition-colors"
            >
              추가
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            여러 키워드는 쉼표(,)로 구분하여 입력하거나 키워드를 하나씩 추가할 수 있습니다.
          </p>
          
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {keywords.map(keyword => (
                <div key={keyword.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
                  <span>{keyword.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword.id)}
                    className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                    aria-label="키워드 삭제"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleScrap}
            className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                스크랩 중...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                스크랩 시작
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              if (window.confirm('모든 스크랩 결과를 삭제하시겠습니까?')) {
                clearScrapedPosts();
                setSelectedPost(null);
              }
            }}
            className="bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 disabled:bg-red-300 transition-colors flex items-center"
            disabled={scrapedPosts.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            결과 초기화
          </button>
        </div>
        
        {/* 진행 상황 표시 */}
        {isLoading && (
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-blue-600">
                {currentBlogName ? `${currentBlogName} 스크랩 중` : '스크랩 준비 중...'}
              </span>
              {progress && (
                <span className="text-sm font-medium text-blue-600">
                  {progress.current}/{progress.total} ({progress.percent}%)
                </span>
              )}
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: progress ? `${progress.percent}%` : '0%' }}
              ></div>
            </div>
            
            {progress && (
              <div className="mt-1 text-xs text-gray-500 truncate">
                현재 포스트: {progress.title}
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">스크랩 결과 ({scrapedPosts.length})</h3>
          </div>
          
          {scrapedPosts.length === 0 ? (
            <div className="p-6 text-gray-500 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <p>스크랩된 포스트가 없습니다.</p>
              <p className="text-sm mt-1">스크랩 버튼을 클릭하여 포스트를 가져오세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {scrapedPosts.map((post) => {
                // 해당 블로그 정보 찾기
                const blog = blogs.find(blog => blog.id === post.blogId);
                
                return (
                  <li 
                    key={post.id} 
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedPost?.id === post.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between">
                      <div onClick={() => handleViewContent(post)} className="flex-1 min-w-0 mr-2">
                        <h4 className="font-medium break-words whitespace-normal">{post.title}</h4>
                        <p className="text-sm text-gray-500 mt-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {blog?.name} · {post.date}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePost(post.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm flex-shrink-0 p-2 rounded-full hover:bg-red-50"
                        aria-label="포스트 삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold">포스트 내용</h3>
          </div>
          
          {selectedPost ? (
            <div className="p-4 max-h-[600px] overflow-y-auto">
              <h4 className="text-xl font-medium mb-2 break-words whitespace-normal">{selectedPost.title}</h4>
              <p className="text-sm text-gray-500 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {selectedPost.date} · 
                <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:underline flex items-center">
                  원본 보기
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
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
              <div className="prose max-w-none">
                {selectedPost.content.split('\n').map((paragraph, index) => (
                  paragraph.trim() && <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-gray-500 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>포스트를 선택하여 내용을 확인하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 