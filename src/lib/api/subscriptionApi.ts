// src/lib/api/subscriptionApi.ts

import axiosInstance from "../axiosInstance";

/**
 * 구독 요청 시 서버에 전달할 payload 타입 정의
 */
export interface SubscribePayload {
  email: string;
}

/**
 * 서버로부터 반환받는 구독 관련 응답 타입 정의
 */
export interface SubscriptionResponse {
  message: string;
}

/**
 * 이메일 구독 요청 API
 *
 * @param payload - 이메일을 포함한 구독 요청 정보
 * @returns 서버로부터 받은 응답 메시지
 *
 * @example
 * const res = await subscribe({ email: "you@example.com" });
 * console.log(res.message); // "구독이 완료되었습니다."
 */
export const subscribe = async (
  payload: SubscribePayload
): Promise<SubscriptionResponse> => {
  const res = await axiosInstance.post("/subscriptions", payload);
  return res.data;
};

/**
 * 이메일 구독 취소 API
 *
 * @param email - 구독 해지할 이메일 주소
 * @returns 서버로부터 받은 응답 메시지
 *
 * @example
 * const res = await unsubscribe("you@example.com");
 * console.log(res.message); // "구독이 해지되었습니다."
 */
export const unsubscribe = async (
  email: string
): Promise<SubscriptionResponse> => {
  const res = await axiosInstance.delete(`/subscriptions/${email}`);
  return res.data;
};