import { notifications } from "../mocks/notifications.mock";
import type { AppNotification } from "../types/notification";
import type { UserRole } from "../types/patent";

/**
 * @relatedFR N/A
 * @relatedUI UI-COM-03
 * @description 공통 헤더 알림 목록을 역할 기준으로 조회한다.
 */
export async function getNotifications(role: UserRole): Promise<AppNotification[]> {
  return notifications.filter((notification) => notification.targetRole === "COMMON" || notification.targetRole === role);
}

/**
 * @relatedFR N/A
 * @relatedUI UI-COM-03
 * @description 알림 읽음/읽지 않음 상태를 저장한다.
 */
export async function updateNotificationReadState(notificationId: string, isRead: boolean) {
  const notification = notifications.find((item) => item.id === notificationId);

  if (notification) {
    notification.isRead = isRead;
  }
}
