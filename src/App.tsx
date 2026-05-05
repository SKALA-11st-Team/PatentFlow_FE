import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminMailingPage } from "./pages/admin/AdminMailingPage";
import { AdminPatentDetailPage } from "./pages/admin/AdminPatentDetailPage";
import { AdminPatentEditPage } from "./pages/admin/AdminPatentEditPage";
import { AdminPatentListPage } from "./pages/admin/AdminPatentListPage";
import { AdminReviewTargetPage } from "./pages/admin/AdminReviewTargetPage";
import { AdminSalesCandidatePage } from "./pages/admin/AdminSalesCandidatePage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { BusinessDashboardPage } from "./pages/business/BusinessDashboardPage";
import { BusinessPatentDetailPage } from "./pages/business/BusinessPatentDetailPage";
import { BusinessReviewRequestPage } from "./pages/business/BusinessReviewRequestPage";
import { BusinessSettingsPage } from "./pages/business/BusinessSettingsPage";
import { BusinessSubmissionDetailPage } from "./pages/business/BusinessSubmissionDetailPage";
import { BusinessSubmissionHistoryPage } from "./pages/business/BusinessSubmissionHistoryPage";
import { LoginPage } from "./pages/LoginPage";

/**
 * @relatedFR FR-001, FR-002, FR-003, FR-004, FR-009, FR-013, FR-014, FR-015, FR-016, FR-017
 * @relatedUI UI-002, UI-003, UI-004, UI-005, UI-007, UI-008, UI-009
 * @description PatentFlow 관리자/사업부 화면 라우트 정의
 */
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/admin/dashboard", element: <AdminDashboardPage /> },
  { path: "/admin/review-targets", element: <AdminReviewTargetPage /> },
  { path: "/admin/patents", element: <AdminPatentListPage /> },
  { path: "/admin/patents/:patentId/edit", element: <AdminPatentEditPage /> },
  { path: "/admin/mailing", element: <AdminMailingPage /> },
  { path: "/admin/sales-candidates", element: <AdminSalesCandidatePage /> },
  { path: "/admin/settings", element: <AdminSettingsPage /> },
  { path: "/admin/patents/:patentId", element: <AdminPatentDetailPage /> },
  { path: "/business/dashboard", element: <BusinessDashboardPage /> },
  { path: "/business/review-requests", element: <BusinessReviewRequestPage /> },
  { path: "/business/submissions", element: <BusinessSubmissionHistoryPage /> },
  { path: "/business/submissions/:patentId", element: <BusinessSubmissionDetailPage /> },
  { path: "/business/settings", element: <BusinessSettingsPage /> },
  { path: "/business/patents/:patentId", element: <BusinessPatentDetailPage /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
