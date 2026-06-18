/**
 * @author 유건욱
 * @date 2026-05-06
 */
import type { UserRole } from "./patent";

export type NotificationTargetRole = UserRole | "COMMON";

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description 공통 헤더 알림 창에서 사용하는 알림 도메인 타입
 */
export interface AppNotification {
  id: string;
  targetRole: NotificationTargetRole;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string | null;
}
