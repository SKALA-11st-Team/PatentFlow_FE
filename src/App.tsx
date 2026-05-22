import { useEffect, useState } from "react";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { getCurrentUser } from "./api/auth";
import { isBackendApiEnabled, isMockApiEnabled } from "./api/client";
import { clearAuthSession, getStoredAuthUser, hasStoredAuthSession } from "./api/authStorage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
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
import type { UserRole } from "./types/patent";

function ProtectedRoute({ allowedRole, children }: { allowedRole: UserRole; children: React.ReactNode }) {
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
        if (isMounted) setAuthState(storedUser.role === allowedRole ? "allowed" : "denied");
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
        setAuthState(currentUser?.role === allowedRole ? "allowed" : currentUser ? "denied" : "unauthenticated");
      } catch {
        clearAuthSession();
        if (isMounted) setAuthState("unauthenticated");
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [allowedRole]);

  if (authState === "checking") return <main className="login-page">인증 정보를 확인하는 중입니다.</main>;
  if (authState === "unauthenticated") return <Navigate to="/login" replace />;
  if (authState === "denied") {
    const storedUser = getStoredAuthUser();
    return <Navigate to={storedUser?.role === "ADMIN" ? "/admin/dashboard" : "/business/dashboard"} replace />;
  }
  return <>{children}</>;
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-LEGAL-03, FR-LEGAL-04, FR-BUS-01, FR-LEGAL-11, FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14, FR-LEGAL-15
 * @relatedUI UI-COM-01, UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-04, UI-LEGAL-05, UI-LEGAL-06, UI-LEGAL-07, UI-LEGAL-08, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05, UI-BUS-06
 * @description PatentFlow 관리자/사업부 화면 라우트 정의
 */
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/admin/dashboard", element: <ProtectedRoute allowedRole="ADMIN"><AdminDashboardPage /></ProtectedRoute> },
  { path: "/admin/review-targets", element: <ProtectedRoute allowedRole="ADMIN"><AdminReviewTargetPage /></ProtectedRoute> },
  { path: "/admin/patents", element: <ProtectedRoute allowedRole="ADMIN"><AdminPatentListPage /></ProtectedRoute> },
  { path: "/admin/patents/:patentId/edit", element: <ProtectedRoute allowedRole="ADMIN"><AdminPatentEditPage /></ProtectedRoute> },
  { path: "/admin/mailing", element: <ProtectedRoute allowedRole="ADMIN"><AdminMailingPage /></ProtectedRoute> },
  { path: "/admin/settings", element: <ProtectedRoute allowedRole="ADMIN"><AdminSettingsPage /></ProtectedRoute> },
  { path: "/admin/users", element: <ProtectedRoute allowedRole="ADMIN"><AdminUsersPage /></ProtectedRoute> },
  { path: "/admin/patents/:patentId", element: <ProtectedRoute allowedRole="ADMIN"><AdminPatentDetailPage /></ProtectedRoute> },
  { path: "/business/dashboard", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessDashboardPage /></ProtectedRoute> },
  { path: "/business/review-requests", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessReviewRequestPage /></ProtectedRoute> },
  { path: "/business/submissions", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessSubmissionHistoryPage /></ProtectedRoute> },
  { path: "/business/settings", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessSettingsPage /></ProtectedRoute> },
  { path: "/business/patents/:patentId", element: <ProtectedRoute allowedRole="BUSINESS"><BusinessPatentDetailPage /></ProtectedRoute> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
