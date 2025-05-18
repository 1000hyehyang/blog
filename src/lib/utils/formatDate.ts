// src/lib/utils/formatDate.ts
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 날짜를 'yyyy.MM.dd' 형식으로 변환
 */
export function formatDate(date: string | Date): string {
  if (!date) return "-";

  const d = typeof date === "string" ? parseISO(date) : date;

  if (isNaN(d.getTime())) return "-";

  return format(d, "yyyy.MM.dd", { locale: ko });
}