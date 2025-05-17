// src/lib/utils/authUtils.ts
import axiosInstance from "../axiosInstance";
import { useAuthStore } from "../../store/useAuthStore";

/**
 * 현재 로그인된 사용자 정보를 백엔드에서 불러와 Zustand에 저장하는 함수.
 * accessToken이 유효하지 않거나 유저 정보가 없을 경우 자동 로그아웃 처리됨.
 */
export const fetchAndSetUserProfile = async () => {
  try {
    const response = await axiosInstance.get("/account/profile");
    const data = response.data?.data;

    if (!data || !data.id || !data.nickname || !data.role) {
      throw new Error("Invalid user profile data");
    }

    useAuthStore.getState().setUser({
      id: data.id,
      nickname: data.nickname,
      role: data.role,
    });
  } catch (error) {
    console.error("❌ 사용자 정보 불러오기 실패", error);
    useAuthStore.getState().logout();
  }
};
