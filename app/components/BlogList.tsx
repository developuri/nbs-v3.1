import React, { useState } from 'react';
import axios from 'axios';

interface Post {
  title: string;
  link: string;
  date: string;
  content: string;
}

interface BlogListProps {
  blogId: string;
}

export default function BlogList({ blogId }: BlogListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      setPosts([]);
      setSelectedPost(null);

      const response = await axios.get(`/api/rss?blogId=${blogId}`);
      setPosts(response.data.posts);
    } catch (error) {
      console.error('포스트 목록 가져오기 실패:', error);
      setError('블로그 포스트를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">블로그 포스트 목록</h2>
        <button
          onClick={fetchPosts}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? '스크랩 중...' : '스크랩 시작'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h3 className="text-xl font-semibold mb-4">포스트 목록</h3>
          {posts.length === 0 && !loading ? (
            <p className="text-gray-500">스크랩 버튼을 클릭하여 포스트를 가져오세요.</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((post, index) => (
                <li
                  key={index}
                  onClick={() => handlePostClick(post)}
                  className={`cursor-pointer p-2 rounded hover:bg-gray-100 ${
                    selectedPost?.link === post.link ? 'bg-gray-100' : ''
                  }`}
                >
                  <h4 className="font-medium">{post.title}</h4>
                  <p className="text-sm text-gray-500">{new Date(post.date).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded p-4">
          <h3 className="text-xl font-semibold mb-4">포스트 내용</h3>
          {selectedPost ? (
            <div>
              <h4 className="font-bold mb-2">{selectedPost.title}</h4>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(selectedPost.date).toLocaleDateString()}
              </p>
              <div className="prose max-w-none">
                {selectedPost.content.split('\n').map((paragraph, index) => (
                  paragraph.trim() && <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">포스트를 선택하여 내용을 확인하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
} 