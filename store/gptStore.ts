import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { encryptData, decryptData } from '../utils/encryption';

interface GptStore {
  apiKey: string;
  model: string;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
}

// 커스텀 스토리지 객체 생성
const encryptedStorage = {
  getItem: async (name: string) => {
    const value = localStorage.getItem(name);
    if (!value) return null;
    
    try {
      const data = JSON.parse(value);
      if (data.state && data.state.apiKey) {
        // API 키 복호화
        data.state.apiKey = await decryptData(data.state.apiKey);
      }
      return JSON.stringify(data);
    } catch (error) {
      console.error('Failed to decrypt:', error);
      return null;
    }
  },
  
  setItem: async (name: string, value: string) => {
    try {
      const data = JSON.parse(value);
      if (data.state && data.state.apiKey) {
        // API 키 암호화
        data.state.apiKey = await encryptData(data.state.apiKey);
      }
      localStorage.setItem(name, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to encrypt:', error);
    }
  },
  
  removeItem: (name: string) => localStorage.removeItem(name),
};

export const useGptStore = create<GptStore>()(
  persist(
    (set) => ({
      apiKey: '',
      model: 'gpt-4o-mini-tts',
      setApiKey: (key) => set({ apiKey: key }),
      setModel: (model) => set({ model }),
    }),
    {
      name: 'gpt-settings-storage',
    }
  )
); 