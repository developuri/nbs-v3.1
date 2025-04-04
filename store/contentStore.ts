import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContentProcessorState {
  selectedTemplate: string;
  outputSheet: {
    sheetName: string;
    titleColumn: string;
    contentColumn: string;
  };
  setSelectedTemplate: (template: string) => void;
  setOutputSheet: (sheet: { sheetName: string; titleColumn: string; contentColumn: string; }) => void;
  reset: () => void;
}

export const useContentStore = create<ContentProcessorState>()(
  persist(
    (set) => ({
      selectedTemplate: '',
      outputSheet: {
        sheetName: '',
        titleColumn: '',
        contentColumn: '',
      },
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),
      setOutputSheet: (sheet) => set({ outputSheet: sheet }),
      reset: () => set({
        selectedTemplate: '',
        outputSheet: {
          sheetName: '',
          titleColumn: '',
          contentColumn: '',
        },
      }),
    }),
    {
      name: 'content-processor-storage',
    }
  )
); 