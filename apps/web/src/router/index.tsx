import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import HomePage from "../pages/public/HomePage";
import PublicLayout from "../components/public/PublicLayout";
import NotFoundPage from "../pages/NotFoundPage";
import { PageLoader } from "../components/PageLoader";

function RouteFallback() {
  return <PageLoader />;
}

function AdminRouteFallback() {
  return <PageLoader admin />;
}

export const router = createBrowserRouter([
  {
    // Halaman public berbagi layout yang memasang intro situs.
    element: <PublicLayout />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      { path: "/", element: <HomePage /> },
      {
        // Link proyek (/projects/:slug) membuka halaman daftar dengan drawer proyek itu.
        path: "/projects/:slug?",
        lazy: () => import("../pages/public/ProjectsPage").then((m) => ({ Component: m.default })),
      },
    ],
  },
  {
    path: "/admin/login",
    lazy: () => import("../pages/admin/LoginPage").then((m) => ({ Component: m.default })),
    hydrateFallbackElement: <RouteFallback />,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    hydrateFallbackElement: <AdminRouteFallback />,
    children: [
      {
        index: true,
        lazy: () => import("../pages/admin/DashboardPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "content",
        element: <Navigate to="/admin/content/hero" replace />,
      },
      {
        path: "content/:section",
        lazy: () => import("../pages/admin/ContentPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "content/experience/new",
        lazy: () => import("../pages/admin/ExperienceFormPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "content/experience/:id/edit",
        lazy: () => import("../pages/admin/ExperienceFormPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "tautan-media",
        lazy: () => import("../pages/admin/SocialLinksPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "announcements",
        lazy: () => import("../pages/admin/AnnouncementsPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "inbox",
        lazy: () => import("../pages/admin/InboxPage").then((m) => ({ Component: m.default })),
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);