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

export interface KeywordTag {
  id: string;
  text: string;
}

export interface GoogleSheetInfo {
  sheetUrl: string;
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
  linkColumn: string;
  credentials: File | null;
}

interface BlogState {
  blogs: Blog[];
  scrapedPosts: BlogPost[];
  keywords: KeywordTag[];
  googleSheetInfo: GoogleSheetInfo;
  startDate: string | null;
  addBlog: (blog: Omit<Blog, 'id'>) => void;
  removeBlog: (id: string) => void;
  removeAllBlogs: () => void;
  addScrapedPost: (post: Omit<BlogPost, 'id'>) => void;
  removeScrapedPost: (id: string) => void;
  clearScrapedPosts: () => void;
  setKeywords: (keywords: KeywordTag[]) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (id: string) => void;
  clearKeywords: () => void;
  updateGoogleSheetInfo: (info: Partial<GoogleSheetInfo>) => void;
  setStartDate: (date: string | null) => void;
}

export const useBlogStore = create<BlogState>()(
  persist(
    (set) => ({
      blogs: [],
      scrapedPosts: [],
      keywords: [],
      startDate: null,
      googleSheetInfo: {
        sheetUrl: '',
        sheetName: 'Sheet1',
        titleColumn: 'A',
        contentColumn: 'B',
        linkColumn: 'E',
        credentials: null
      },
      
      addBlog: (blog) => 
        set((state) => ({
          blogs: [...state.blogs, { ...blog, id: Date.now().toString() }]
        })),
      
      removeBlog: (id) => 
        set((state) => ({
          blogs: state.blogs.filter(blog => blog.id !== id),
          scrapedPosts: state.scrapedPosts.filter(post => post.blogId !== id)
        })),
      
      removeAllBlogs: () =>
        set((state) => ({
          blogs: [],
          scrapedPosts: []
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

      setKeywords: (keywords) =>
        set({ keywords }),
        
      addKeyword: (keyword) =>
        set((state) => {
          // 이미 존재하는 키워드인지 확인
          const exists = state.keywords.some(k => k.text.toLowerCase() === keyword.toLowerCase());
          if (exists || !keyword.trim()) return state;
          
          return {
            keywords: [...state.keywords, { id: Date.now() + Math.random().toString(), text: keyword }]
          };
        }),
        
      removeKeyword: (id) =>
        set((state) => ({
          keywords: state.keywords.filter(k => k.id !== id)
        })),
        
      clearKeywords: () =>
        set({ keywords: [] }),

      updateGoogleSheetInfo: (info) =>
        set((state) => ({
          googleSheetInfo: { ...state.googleSheetInfo, ...info }
        })),

      setStartDate: (date) =>
        set({ startDate: date }),
    }),
    {
      name: 'blog-storage',
      partialize: (state) => ({
        blogs: state.blogs,
        scrapedPosts: state.scrapedPosts,
        keywords: state.keywords,
        googleSheetInfo: {
          sheetUrl: state.googleSheetInfo.sheetUrl,
          sheetName: state.googleSheetInfo.sheetName,
          titleColumn: state.googleSheetInfo.titleColumn,
          contentColumn: state.googleSheetInfo.contentColumn,
          linkColumn: state.googleSheetInfo.linkColumn,
          // File 객체는 직렬화할 수 없으므로 저장하지 않음
          credentials: null
        }
      }),
    }
  )
); 