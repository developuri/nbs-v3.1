import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WordPressBlog, WordPressBlogInput } from '../types/wordpress';

export interface AutoPostingSettings {
  sheetName: string;
  titleColumn: string;
  contentColumn: string;
  scheduleColumn: string;
  resultColumn: string;
  urlColumn: string;
  selectedBlogId: string;
}

interface WordPressState {
  blogs: WordPressBlog[];
  addBlog: (blog: WordPressBlogInput) => void;
  updateBlog: (id: string, blog: WordPressBlogInput) => void;
  removeBlog: (id: string) => void;
  getBlog: (id: string) => WordPressBlog | undefined;
  autoPostingSettings: {
    sheetName: string;
    titleColumn: string;
    contentColumn: string;
    scheduleColumn: string;
    resultColumn: string;
    urlColumn: string;
    selectedBlogId: string;
  };
  updateAutoPostingSettings: (settings: AutoPostingSettings) => void;
}

export const useWordPressStore = create<WordPressState>()(
  persist(
    (set, get) => ({
      blogs: [],
      
      addBlog: (blog: WordPressBlogInput) => 
        set((state) => ({
          blogs: [...state.blogs, { ...blog, id: Date.now().toString() }]
        })),
      
      updateBlog: (id: string, blog: WordPressBlogInput) =>
        set((state) => ({
          blogs: state.blogs.map((b) => 
            b.id === id ? { ...blog, id } : b
          )
        })),
      
      removeBlog: (id: string) =>
        set((state) => ({
          blogs: state.blogs.filter((b) => b.id !== id)
        })),
      
      getBlog: (id: string) => {
        const state = get();
        return state.blogs.find((b) => b.id === id);
      },
      
      autoPostingSettings: {
        sheetName: '',
        titleColumn: '',
        contentColumn: '',
        scheduleColumn: '',
        resultColumn: '',
        urlColumn: '',
        selectedBlogId: '',
      },
      
      updateAutoPostingSettings: (settings) => set(() => ({
        autoPostingSettings: settings
      })),
    }),
    {
      name: 'wordpress-storage',
    }
  )
); 