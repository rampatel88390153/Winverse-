import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  userData: any | null;
  setUser: (user: User | null) => void;
  setUserData: (data: any | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  setUser: (user) => set({ user }),
  setUserData: (data) => set({ userData: data }),
}));

interface GameState {
  currentRoundId: string;
  timer: number;
  status: string;
  mode: string;
  setGameState: (state: Partial<GameState>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentRoundId: '',
  timer: 30,
  status: 'betting',
  mode: 'random',
  setGameState: (state) => set((prev) => ({ ...prev, ...state })),
}));
