// src/lib/utils/logout.ts
import axiosInstance from "../axiosInstance";
import { useAuthStore } from "../../store/useAuthStore";

/**
 * 로그아웃 요청을 서버에 보내고 클라이언트 상태를 초기화.
 * 서버는 Redis에서 refreshToken 삭제 + 쿠키 무효화 처리까지 수행.
 */
export async function logoutUser() {
  try {
    await axiosInstance.post("/auth/logout");
  } catch (error) {
    console.warn("❗ 로그아웃 요청 실패", error);
  } finally {
    useAuthStore.getState().logout();
  }
}
