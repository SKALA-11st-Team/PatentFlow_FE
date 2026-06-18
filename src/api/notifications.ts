/**
 * @author 유건욱
 * @date 2026-05-06
 */
import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { notifications } from "../mocks/notifications.mock";
import type { AppNotification } from "../types/notification";
import type { UserRole } from "../types/patent";

interface BackendNotification {
  notificationId: string;
  title: string;
  message: string;
  targetRole: string;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
}

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description 공통 헤더 알림 목록을 역할 기준으로 조회한다.
 */
export async function getNotifications(role: UserRole): Promise<AppNotification[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendNotification[]>>(`/notifications?role=${role}`);
    return (response.data ?? []).map((n) => ({
      id: n.notificationId,
      title: n.title,
      message: n.message,
      targetRole: n.targetRole as AppNotification["targetRole"],
      isRead: n.isRead,
      createdAt: n.createdAt,
      link: n.link,
    }));
  }

  return notifications.filter((notification) => notification.targetRole === "COMMON" || notification.targetRole === role);
}

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description 알림 읽음/읽지 않음 상태를 저장한다.
 */
export async function updateNotificationReadState(notificationId: string, isRead: boolean) {
  if (isBackendApiEnabled()) {
    await requestJson(`/notifications/${notificationId}/read-state`, {
      body: JSON.stringify({ isRead }),
      method: "PATCH",
    });
    return;
  }

  const notification = notifications.find((item) => item.id === notificationId);
  if (notification) {
    notification.isRead = isRead;
  }
}

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description NOTI-08: 역할 대상 알림을 모두 읽음 처리한다(BE read-all 연동).
 */
export async function markAllNotificationsRead(role: UserRole) {
  if (isBackendApiEnabled()) {
    await requestJson(`/notifications/read-all?role=${role}`, { method: "PATCH" });
    return;
  }

  notifications
    .filter((notification) => notification.targetRole === "COMMON" || notification.targetRole === role)
    .forEach((notification) => {
      notification.isRead = true;
    });
}
