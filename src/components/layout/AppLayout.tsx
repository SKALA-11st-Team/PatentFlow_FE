import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { logout } from "../../api/auth";
import { getStoredAuthUser } from "../../api/authStorage";
import { getNotifications, markAllNotificationsRead, updateNotificationReadState } from "../../api/notifications";
import { BellIcon, NotificationPanel } from "../notification/NotificationPanel";
import type { AppNotification } from "../../types/notification";
import type { UserRole } from "../../types/patent";

const NOTIFICATION_REFRESH_INTERVAL_MS = 60_000;

interface AppLayoutProps {
  children: ReactNode;
  role: UserRole;
  title: string;
  description?: string;
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-LEGAL-03, FR-LEGAL-04, FR-BUS-01, FR-LEGAL-11, FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14, FR-LEGAL-15
 * @relatedUI UI-COM-02, UI-COM-03, UI-LEGAL-01, UI-LEGAL-03, UI-LEGAL-05, UI-LEGAL-06, UI-LEGAL-07, UI-LEGAL-08, UI-BUS-01, UI-BUS-04, UI-BUS-06
 * @description 관리자/사업부 공통 앱 레이아웃과 역할별 기본 내비게이션을 제공한다.
 */
export function AppLayout({ children, role, title, description }: AppLayoutProps) {
  const isAdmin = role === "ADMIN";
  const currentUser = getStoredAuthUser();
  const businessDepartmentLabel = !isAdmin ? currentUser?.departmentName?.trim() || "사업부" : null;
  const [notificationItems, setNotificationItems] = useState<AppNotification[]>([]);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = () => {
      getNotifications(role)
        .then((items) => {
          if (isMounted) {
            setNotificationItems(items);
          }
        })
        .catch(() => {});
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, NOTIFICATION_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [role]);
  const navItems = isAdmin
    ? [
        { label: "대시보드", to: "/admin/dashboard" },
        { label: "특허관리", to: "/admin/patents" },
        { label: "AI 레포트 메일 발송", to: "/admin/mailing" },
        { label: "사업부/계정 관리", to: "/admin/users" },
        { label: "설정", to: "/admin/settings" },
      ]
    : [
        { label: "대시보드", to: "/business/dashboard" },
        { label: "제출 이력", to: "/business/submissions" },
        { label: "설정", to: "/business/settings" },
      ];
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  useEffect(() => {
    if (!isNotificationOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationMenuRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isNotificationOpen]);

  // NOTI-07: 백엔드(및 mock fallback)가 이미 역할로 필터하므로 표시 레이어에서 재필터하지 않는다.
  const unreadCount = notificationItems.filter((notification) => !notification.isRead).length;
  const handleToggleNotificationRead = (notificationId: string, isRead: boolean) => {
    setNotificationItems((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead } : notification,
      ),
    );
    updateNotificationReadState(notificationId, isRead).catch(() => {});
  };
  // NOTI-08: 모두 읽음 — 낙관적 업데이트 후 BE read-all 호출.
  const handleMarkAllNotificationsRead = () => {
    setNotificationItems((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, isRead: true })),
    );
    markAllNotificationsRead(role).catch(() => {});
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to={isAdmin ? "/admin/dashboard" : "/business/dashboard"}>
          <span className="brand-mark">PF</span>
          <span>
            <strong>PatentFlow</strong>
            <small>SK AX 특허 관리 시스템</small>
          </span>
        </Link>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>연차료 검토 진행 중</strong>
          <span>검토 대상, 사업부 의견, 최종 판단 상태를 순서대로 확인합니다.</span>
        </div>
      </aside>
      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">{isAdmin ? "Legal팀 워크스페이스" : `${businessDepartmentLabel} 워크스페이스`}</p>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          <div className="header-actions">
            <div className="notification-menu" ref={notificationMenuRef}>
              <button
                aria-expanded={isNotificationOpen}
                aria-label={`알림 ${unreadCount}개`}
                className="notification-button"
                onClick={() => setIsNotificationOpen((current) => !current)}
                type="button"
              >
                <BellIcon />
                {unreadCount > 0 ? <span className="notification-count">{unreadCount}</span> : null}
              </button>
              {isNotificationOpen ? (
                <NotificationPanel
                  notifications={notificationItems}
                  onClose={() => setIsNotificationOpen(false)}
                  onToggleRead={handleToggleNotificationRead}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                />
              ) : null}
            </div>
            <Link className="logout-link" onClick={logout} to="/login">
              로그아웃
            </Link>
            {businessDepartmentLabel ? <span className="user-department-label">{businessDepartmentLabel}</span> : null}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
