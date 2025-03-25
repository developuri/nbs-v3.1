import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Blog {
  id: string;
  name: string;
  url: string;
}

export interface BlogPost {
  id: string;
  blogId: string;
  title: string;
  content: string;
  url: string;
  date: string;
}

interface BlogState {
  blogs: Blog[];
  scrapedPosts: BlogPost[];
  addBlog: (blog: Omit<Blog, 'id'>) => void;
  removeBlog: (id: string) => void;
  addScrapedPost: (post: Omit<BlogPost, 'id'>) => void;
  removeScrapedPost: (id: string) => void;
  clearScrapedPosts: () => void;
}

export const useBlogStore = create<BlogState>()(
  persist(
    (set) => ({
      blogs: [],
      scrapedPosts: [],
      
      addBlog: (blog) => 
        set((state) => ({
          blogs: [...state.blogs, { ...blog, id: Date.now().toString() }]
        })),
      
      removeBlog: (id) => 
        set((state) => ({
          blogs: state.blogs.filter(blog => blog.id !== id),
          scrapedPosts: state.scrapedPosts.filter(post => post.blogId !== id)
        })),
      
      addScrapedPost: (post) =>
        set((state) => {
          // 이미 동일한 URL의 포스트가 있는지 확인
          const exists = state.scrapedPosts.some(p => p.url === post.url);
          if (exists) return state;
          
          return {
            scrapedPosts: [...state.scrapedPosts, { ...post, id: Date.now().toString() }]
          };
        }),
      
      removeScrapedPost: (id) =>
        set((state) => ({
          scrapedPosts: state.scrapedPosts.filter(post => post.id !== id)
        })),
        
      clearScrapedPosts: () =>
        set({ scrapedPosts: [] }),
    }),
    {
      name: 'blog-storage',
    }
  )
); 