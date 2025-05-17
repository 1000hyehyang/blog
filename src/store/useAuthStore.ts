// src/store/useAuthStore.ts
import { create } from "zustand";

type Role = "USER" | "ADMIN";

interface User {
  id: number;
  nickname: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem("accessToken"),
  setUser: (user) => set({ user }),
  setAccessToken: (token) => {
    localStorage.setItem("accessToken", token);
    set({ accessToken: token });
  },
  logout: () => {
    localStorage.removeItem("accessToken");
    set({ user: null, accessToken: null });
  },
}));
