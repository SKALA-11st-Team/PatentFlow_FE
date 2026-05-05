import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { notifications } from "../mocks/notifications.mock";
import type { AppNotification } from "../types/notification";
import type { UserRole } from "../types/patent";

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 공통 헤더 알림 목록을 역할 기준으로 조회한다.
 */
export async function getNotifications(role: UserRole): Promise<AppNotification[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<AppNotification[]>>(`/api/v1/notifications?role=${role}`);

    return response.data;
  }

  return notifications.filter((notification) => notification.targetRole === "COMMON" || notification.targetRole === role);
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 알림 읽음/읽지 않음 상태를 저장한다.
 */
export async function updateNotificationReadState(notificationId: string, isRead: boolean) {
  if (isBackendApiEnabled()) {
    await requestJson<ApiEnvelope<AppNotification>>(`/api/v1/notifications/${notificationId}/read-state`, {
      body: JSON.stringify({ isRead }),
      method: "PUT",
    });
  }
}
