import { Link } from "react-router-dom";
import type { AppNotification } from "../../types/notification";

interface NotificationPanelProps {
  notifications: AppNotification[];
  onClose: () => void;
  onToggleRead: (notificationId: string, isRead: boolean) => void;
  onMarkAllRead?: () => void;
}

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description 공통 헤더에서 관리자/사업부 대상 알림 목록을 오늘, 지난주, 그 이전으로 묶어 표시한다.
 */
export function NotificationPanel({ notifications, onClose, onToggleRead, onMarkAllRead }: NotificationPanelProps) {
  const groupedNotifications = getGroupedNotifications(notifications);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="notification-panel" role="dialog" aria-label="알림">
      <div className="notification-panel-header">
        <strong>알림</strong>
        <span>{unreadCount}개 미확인</span>
        {onMarkAllRead && unreadCount > 0 ? (
          <button className="notification-mark-all" onClick={onMarkAllRead} type="button">
            모두 읽음
          </button>
        ) : null}
      </div>
      <div className="notification-list">
        {groupedNotifications.map((group) => (
          <section className="notification-group" key={group.label}>
            <h3>{group.label}</h3>
            <div className="notification-group-list">
              {group.notifications.map((notification) => (
                <article className={`notification-item ${notification.isRead ? "is-read" : ""} ${notification.link ? "has-link" : ""}`} key={notification.id}>
                  <div className="notification-item-header">
                    <strong>{notification.title}</strong>
                    <time>{formatNotificationTime(notification.createdAt)}</time>
                    <button
                      className="notification-read-toggle"
                      onClick={(e) => { e.stopPropagation(); onToggleRead(notification.id, !notification.isRead); }}
                      type="button"
                    >
                      {notification.isRead ? "읽지 않음으로 표시" : "읽음으로 표시"}
                    </button>
                  </div>
                  {notification.link ? (
                    <Link
                      className="notification-link"
                      to={notification.link}
                      onClick={() => { onToggleRead(notification.id, true); onClose(); }}
                    >
                      {notification.message}
                    </Link>
                  ) : (
                    <p>{notification.message}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description 알림 버튼에 사용할 종 모양 아이콘을 렌더링한다.
 */
export function BellIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M18 8.4c0-3.31-2.69-6-6-6s-6 2.69-6 6v3.36l-1.42 2.84A1 1 0 0 0 5.47 16h13.06a1 1 0 0 0 .89-1.4L18 11.76V8.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.75 18a2.25 2.25 0 0 0 4.5 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description 알림 생성 시간을 헤더 알림 창에서 표시할 날짜 형식으로 변환한다.
 */
function formatNotificationTime(createdAt: string) {
  const createdDate = new Date(createdAt);
  const now = new Date();

  if (isSameDate(createdDate, now)) {
    const diffMinutes = Math.max(1, Math.floor((now.getTime() - createdDate.getTime()) / 60_000));

    if (diffMinutes < 60) {
      return `${diffMinutes}분 전`;
    }

    return `${Math.floor(diffMinutes / 60)}시간 전`;
  }

  return createdAt.slice(0, 10);
}

/**
 * @relatedFR FR-COM-02
 * @relatedUI UI-COM-03
 * @description 알림 목록을 오늘, 지난주, 그 이전으로 묶는다.
 */
function getGroupedNotifications(notifications: AppNotification[]) {
  const sortedNotifications = [...notifications].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
  const groups = [
    { label: "오늘", notifications: [] as AppNotification[] },
    { label: "지난주", notifications: [] as AppNotification[] },
    { label: "그 이전", notifications: [] as AppNotification[] },
  ];

  sortedNotifications.forEach((notification) => {
    const groupLabel = getNotificationGroupLabel(notification.createdAt);
    const group = groups.find((item) => item.label === groupLabel);
    group?.notifications.push(notification);
  });

  return groups.filter((group) => group.notifications.length > 0);
}

function getNotificationGroupLabel(createdAt: string) {
  const createdDate = new Date(createdAt);
  const now = new Date();

  if (isSameDate(createdDate, now)) {
    return "오늘";
  }

  const diffDays = Math.floor((getDateStart(now).getTime() - getDateStart(createdDate).getTime()) / 86_400_000);

  return diffDays <= 7 ? "지난주" : "그 이전";
}

function isSameDate(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function getDateStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
