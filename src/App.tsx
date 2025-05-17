// src/App.tsx
import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { fetchAndSetUserProfile } from "./lib/utils/authUtils";
import { RouterProvider } from "react-router-dom";
import { router } from "./Router/router";

export default function App() {
  const { user, accessToken, setAccessToken } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("accessToken");
    if (token) {
      setAccessToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setAccessToken]);

  // 토큰 있으면 유저 정보 조회
  useEffect(() => {
    if (accessToken && !user) {
      fetchAndSetUserProfile();
    }
  }, [accessToken, user]);

  return <RouterProvider router={router} />;
}