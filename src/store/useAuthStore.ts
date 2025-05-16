import { create } from "zustand";

interface User {
  id: string;
  nickname: string;
  role: "USER" | "ADMIN";
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

// 관리자 모드
export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: "dev-user",
    nickname: "관리자",
    role: "ADMIN",
  },
  setUser: (user) => set({ user }),
}));

// export const useAuthStore = create<AuthState>((set) => ({
//   user: null,
//   setUser: (user) => set({ user }),
// }));