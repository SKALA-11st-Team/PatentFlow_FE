import { useEffect, useState } from "react";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { getCurrentUser } from "./api/auth";
import { isBackendApiEnabled, isMockApiEnabled } from "./api/client";
import { clearAuthSession, getStoredAuthUser, hasStoredAuthSession } from "./api/authStorage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminAuditLogPage } from "./pages/admin/AdminAuditLogPage";
import { AdminMailingPage } from "./pages/admin/AdminMailingPage";
import { AdminPatentDetailPage } from "./pages/admin/AdminPatentDetailPage";
import { AdminPatentEditPage } from "./pages/admin/AdminPatentEditPage";
import { AdminPatentListPage } from "./pages/admin/AdminPatentListPage";
import { AdminReviewTargetPage } from "./pages/admin/AdminReviewTargetPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { BusinessDashboardPage } from "./pages/business/BusinessDashboardPage";
import { BusinessPatentDetailPage } from "./pages/business/BusinessPatentDetailPage";
import { BusinessReviewRequestPage } from "./pages/business/BusinessReviewRequestPage";
import { BusinessSettingsPage } from "./pages/business/BusinessSettingsPage";
import { BusinessSubmissionHistoryPage } from "./pages/business/BusinessSubmissionHistoryPage";
import { LoginPage } from "./pages/LoginPage";
import { InvitationAcceptPage } from "./pages/InvitationAcceptPage";
import { ToastProvider } from "./components/common/ToastProvider";
import { isAdminLikeRole, type UserRole } from "./types/patent";

// I3: adminOnly — LEGAL은 검토 업무(관리자 라우트)는 접근하지만 운영(계정·설정) 라우트는 차단된다.
function roleAllowed(role: string | null | undefined, allowedRole: UserRole, adminOnly: boolean): boolean {
  if (!role) {
    return false;
  }
  if (adminOnly) {
    return role === "ADMIN";
  }
  if (allowedRole === "ADMIN") {
    return isAdminLikeRole(role);
  }
  return role === allowedRole;
}

function ProtectedRoute({
  allowedRole,
  adminOnly = false,
  children,
}: { allowedRole: UserRole; adminOnly?: boolean; children: React.ReactNode }) {
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied" | "unauthenticated">(
    hasStoredAuthSession() ? "checking" : "unauthenticated",
  );

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const storedUser = getStoredAuthUser();

      if (!storedUser) {
        if (isMounted) setAuthState("unauthenticated");
        return;
      }

      if (isMockApiEnabled()) {
        if (isMounted) setAuthState(roleAllowed(storedUser.role, allowedRole, adminOnly) ? "allowed" : "denied");
        return;
      }

      if (!isBackendApiEnabled()) {
        clearAuthSession();
        if (isMounted) setAuthState("unauthenticated");
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!isMounted) return;
        setAuthState(roleAllowed(currentUser?.role, allowedRole, adminOnly) ? "allowed" : currentUser ? "denied" : "unauthenticated");
      } catch {
        clearAuthSession();
        if (isMounted) setAuthState("unauthenticated");
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [allowedRole, adminOnly]);

  if (authState === "checking") {
    return (
      <main className="login-page auth-checking-page">
        <section className="auth-checking-panel" aria-live="polite">
          <span className="auth-checking-spinner" aria-hidden="true" />
          <strong>인증 정보를 확인하는 중입니다.</strong>
        </section>
      </main>
    );
  }
  if (authState === "unauthenticated") return <Navigate to="/login" replace />;
  if (authState === "denied") {
    const storedUser = getStoredAuthUser();
    return <Navigate to={isAdminLikeRole(storedUser?.role) ? "/admin/dashboard" : "/business/dashboard"} replace />;
  }
  return <>{children}</>;
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-LEGAL-03, FR-LEGAL-04, FR-BUS-01, FR-LEGAL-11, FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14, FR-LEGAL-15
 * @relatedUI UI-COM-01, UI-COM-04, UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-04, UI-LEGAL-05, UI-LEGAL-06, UI-LEGAL-07, UI-LEGAL-08, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05, UI-BUS-06
 * @description PatentFlow 관리자/사업부 화면 라우트 정의
 */
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/invite/accept", element: <InvitationAcceptPage /> },
  { path: "/admin/dashboard", element: <ProtectedRoute allowedRole="ADMIN"><AdminDashboardPage /></ProtectedRoute> },
  { path: "/admin/review-targets", element: <ProtectedRoute allowedRole="ADMIN"><AdminReviewTargetPage /></ProtectedRoute> },
  { path: "/admin/patents", element: <ProtectedRoute allowedRole="ADMIN"><AdminPatentListPage /></ProtectedRoute> },
  { path: "/admin/patents/:patentId/edit", element: <ProtectedRoute allowedRole="ADMIN"><AdminPatentEditPage /></ProtectedRoute> },
  { path: "/admin/mailing", element: <ProtectedRoute allowedRole="ADMIN"><AdminMailingPage /></ProtectedRoute> },
  { path: "/admin/audit-logs", element: <ProtectedRoute allowedRole="ADMIN"><AdminAuditLogPage /></ProtectedRoute> },
  { path: "/admin/settings", element: <ProtectedRoute allowedRole="ADMIN" adminOnly><AdminSettingsPage /></ProtectedRoute> },
  { path: "/admin/users", element: <ProtectedRoute allowedRole="ADMIN" adminOnly><AdminUsersPage /></ProtectedRoute> },
  { path: "/admin/patents/:patentId", element: <ProtectedRoute allowedRole="ADMIN"><AdminPatentDetailPage /></ProtectedRoute> },
  { path: "/business/dashboard", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessDashboardPage /></ProtectedRoute> },
  { path: "/business/review-requests", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessReviewRequestPage /></ProtectedRoute> },
  { path: "/business/submissions", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessSubmissionHistoryPage /></ProtectedRoute> },
  { path: "/business/settings", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessSettingsPage /></ProtectedRoute> },
  { path: "/business/patents/:patentId", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessPatentDetailPage /></ProtectedRoute> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
