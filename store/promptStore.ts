import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PromptTemplate, DEFAULT_TEMPLATE } from '../types/prompt';

interface PromptStore {
  templates: PromptTemplate[];
  currentTemplate: PromptTemplate;
  addTemplate: (template: PromptTemplate) => void;
  updateTemplate: (index: number, template: PromptTemplate) => void;
  deleteTemplate: (index: number) => void;
  setCurrentTemplate: (template: PromptTemplate) => void;
}

export const usePromptStore = create<PromptStore>()(
  persist(
    (set) => ({
      templates: [],
      currentTemplate: { ...DEFAULT_TEMPLATE },
      addTemplate: (template) =>
        set((state) => ({
          templates: [...state.templates, template],
        })),
      updateTemplate: (index, template) =>
        set((state) => ({
          templates: state.templates.map((t, i) => (i === index ? template : t)),
        })),
      deleteTemplate: (index) =>
        set((state) => ({
          templates: state.templates.filter((_, i) => i !== index),
        })),
      setCurrentTemplate: (template) =>
        set(() => ({
          currentTemplate: template,
        })),
    }),
    {
      name: 'prompt-storage',
    }
  )
); 