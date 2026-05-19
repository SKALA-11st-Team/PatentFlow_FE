import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { hasStoredAuthSession } from "./api/authStorage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminMailingPage } from "./pages/admin/AdminMailingPage";
import { AdminPatentDetailPage } from "./pages/admin/AdminPatentDetailPage";
import { AdminPatentEditPage } from "./pages/admin/AdminPatentEditPage";
import { AdminPatentListPage } from "./pages/admin/AdminPatentListPage";
import { AdminReviewTargetPage } from "./pages/admin/AdminReviewTargetPage";
import { AdminSalesCandidatePage } from "./pages/admin/AdminSalesCandidatePage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { BusinessDashboardPage } from "./pages/business/BusinessDashboardPage";
import { BusinessPatentDetailPage } from "./pages/business/BusinessPatentDetailPage";
import { BusinessReviewRequestPage } from "./pages/business/BusinessReviewRequestPage";
import { BusinessSettingsPage } from "./pages/business/BusinessSettingsPage";
import { BusinessSubmissionHistoryPage } from "./pages/business/BusinessSubmissionHistoryPage";
import { LoginPage } from "./pages/LoginPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!hasStoredAuthSession()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * @relatedFR FR-001, FR-002, FR-003, FR-004, FR-009, FR-013, FR-014, FR-015, FR-016, FR-017
 * @relatedUI UI-COM-01, UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-04, UI-LEGAL-05, UI-LEGAL-06, UI-LEGAL-07, UI-LEGAL-08, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05, UI-BUS-06
 * @description PatentFlow 관리자/사업부 화면 라우트 정의
 */
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/admin/dashboard", element: <ProtectedRoute><AdminDashboardPage /></ProtectedRoute> },
  { path: "/admin/review-targets", element: <ProtectedRoute><AdminReviewTargetPage /></ProtectedRoute> },
  { path: "/admin/patents", element: <ProtectedRoute><AdminPatentListPage /></ProtectedRoute> },
  { path: "/admin/patents/:patentId/edit", element: <ProtectedRoute><AdminPatentEditPage /></ProtectedRoute> },
  { path: "/admin/mailing", element: <ProtectedRoute><AdminMailingPage /></ProtectedRoute> },
  { path: "/admin/sales-candidates", element: <ProtectedRoute><AdminSalesCandidatePage /></ProtectedRoute> },
  { path: "/admin/settings", element: <ProtectedRoute><AdminSettingsPage /></ProtectedRoute> },
  { path: "/admin/users", element: <ProtectedRoute><AdminUsersPage /></ProtectedRoute> },
  { path: "/admin/patents/:patentId", element: <ProtectedRoute><AdminPatentDetailPage /></ProtectedRoute> },
  { path: "/business/dashboard", element: <ProtectedRoute><BusinessDashboardPage /></ProtectedRoute> },
  { path: "/business/review-requests", element: <ProtectedRoute><BusinessReviewRequestPage /></ProtectedRoute> },
  { path: "/business/submissions", element: <ProtectedRoute><BusinessSubmissionHistoryPage /></ProtectedRoute> },
  { path: "/business/settings", element: <ProtectedRoute><BusinessSettingsPage /></ProtectedRoute> },
  { path: "/business/patents/:patentId", element: <ProtectedRoute><BusinessPatentDetailPage /></ProtectedRoute> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
