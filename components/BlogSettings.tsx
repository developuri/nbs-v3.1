'use client';

import { useState } from 'react';
import { useWordPressStore } from '../store/wordpressStore';
import type { WordPressBlog, WordPressBlogInput } from '../types/wordpress';

export default function BlogSettings() {
  const { blogs, addBlog, updateBlog, removeBlog } = useWordPressStore();
  const [editingBlog, setEditingBlog] = useState<string | null>(null);
  const [checkingBlog, setCheckingBlog] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: { status: 'success' | 'error', message: string }}>({});
  const [formData, setFormData] = useState<WordPressBlogInput>({
    name: '',
    url: '',
    username: '',
    appPassword: '',
  });
  const [errors, setErrors] = useState<Partial<WordPressBlogInput>>({});

  const validateForm = () => {
    const newErrors: Partial<WordPressBlogInput> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '블로그 이름을 입력해주세요.';
    }
    
    if (!formData.url.trim()) {
      newErrors.url = '워드프레스 주소를 입력해주세요.';
    } else if (!/^https?:\/\/.+/i.test(formData.url)) {
      newErrors.url = '올바른 URL 형식이 아닙니다. (예: https://example.com)';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = '사용자 ID를 입력해주세요.';
    }
    
    if (!formData.appPassword.trim()) {
      newErrors.appPassword = '응용프로그램 비밀번호를 입력해주세요.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (editingBlog) {
      updateBlog(editingBlog, formData);
      setEditingBlog(null);
    } else {
      addBlog(formData);
    }
    
    setFormData({
      name: '',
      url: '',
      username: '',
      appPassword: '',
    });
  };

  const handleEdit = (blog: WordPressBlog) => {
    setEditingBlog(blog.id);
    setFormData({
      name: blog.name,
      url: blog.url,
      username: blog.username,
      appPassword: blog.appPassword,
    });
  };

  const handleCancel = () => {
    setEditingBlog(null);
    setFormData({
      name: '',
      url: '',
      username: '',
      appPassword: '',
    });
    setErrors({});
  };

  const checkConnection = async (blog: WordPressBlog) => {
    setCheckingBlog(blog.id);
    try {
      const credentials = btoa(`${blog.username}:${blog.appPassword}`);
      const response = await fetch(`${blog.url}/wp-json/wp/v2/posts?per_page=1`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (response.ok) {
        setConnectionStatus({
          ...connectionStatus,
          [blog.id]: {
            status: 'success',
            message: '연결이 정상적으로 확인되었습니다.'
          }
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus({
        ...connectionStatus,
        [blog.id]: {
          status: 'error',
          message: '연결에 실패했습니다. 설정을 확인해주세요.'
        }
      });
    } finally {
      setCheckingBlog(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-8 text-left">워드프레스 블로그 등록</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* 등록 폼 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-fit">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                블로그 이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="블로그 구분을 위한 이름"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                워드프레스 주소
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사용자 ID
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="워드프레스 로그인 계정"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                응용프로그램 비밀번호
              </label>
              <input
                type="password"
                value={formData.appPassword}
                onChange={(e) => setFormData({ ...formData, appPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="워드프레스에서 생성한 응용프로그램 비밀번호"
              />
              {errors.appPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.appPassword}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                워드프레스 관리자 설정에서 응용프로그램 비밀번호를 생성하여 입력해주세요.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {editingBlog ? '수정' : '등록'}
              </button>
              {editingBlog && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full mt-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 등록된 블로그 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h3 className="text-lg font-semibold mb-4">등록된 블로그 목록</h3>
          
          {blogs.length === 0 ? (
            <p className="text-gray-500">등록된 워드프레스 블로그가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{blog.name}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(blog)}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="수정"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('이 블로그를 삭제하시겠습니까?')) {
                            removeBlog(blog.id);
                          }
                        }}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <a
                    href={blog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm block mb-1"
                  >
                    {blog.url}
                  </a>
                  <p className="text-sm text-gray-500 mb-3">계정: {blog.username}</p>
                  
                  <div className="flex items-center">
                    <button
                      onClick={() => checkConnection(blog)}
                      disabled={checkingBlog === blog.id}
                      className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center space-x-1 min-w-[90px]"
                    >
                      {checkingBlog === blog.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>확인 중...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>연결 확인</span>
                        </>
                      )}
                    </button>
                    <div className="ml-2 min-w-[200px]">
                      {connectionStatus[blog.id] ? (
                        <span className={`text-sm ${
                          connectionStatus[blog.id].status === 'success' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {connectionStatus[blog.id].message}
                        </span>
                      ) : (
                        <span className="text-sm text-transparent select-none">상태 메시지 영역</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 