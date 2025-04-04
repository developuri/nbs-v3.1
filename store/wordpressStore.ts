import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WordPressBlog, WordPressBlogInput } from '../types/wordpress';

interface WordPressState {
  blogs: WordPressBlog[];
  addBlog: (blog: WordPressBlogInput) => void;
  updateBlog: (id: string, blog: WordPressBlogInput) => void;
  removeBlog: (id: string) => void;
  getBlog: (id: string) => WordPressBlog | undefined;
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
    }),
    {
      name: 'wordpress-storage',
    }
  )
); 