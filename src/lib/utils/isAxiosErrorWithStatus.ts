// src/lib/utils/isAxiosErrorWithStatus.ts

import { isAxiosError } from "axios";

/**
 * AxiosError이면서 특정 status 코드가 포함된 에러인지 확인
 *
 * @param error - AxiosError 객체
 * @param statusCode - 기대하는 HTTP 상태 코드 (ex: 409, 400 등)
 * @returns boolean
 */
export const isAxiosErrorWithStatus = (
  error: unknown,
  statusCode: number
): boolean => {
  return (
    isAxiosError(error) &&
    error.response?.status === statusCode
  );
};