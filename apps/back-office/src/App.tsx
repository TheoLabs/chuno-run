import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "./api/config";
import { AdminLayout } from "./layouts/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UserListPage } from "./pages/UserListPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { RoomListPage } from "./pages/RoomListPage";
import { RoomDetailPage } from "./pages/RoomDetailPage";
import { AgreementPage } from "./pages/AgreementPage";
import { AdminAccountsPage } from "./pages/AdminAccountsPage";
import { AuthProvider } from "./auth/AuthContext";
import { RedirectIfAuth, RequireAuth } from "./auth/guards";

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    ),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "users", element: <UserListPage /> },
      { path: "users/:id", element: <UserDetailPage /> },
      { path: "rooms", element: <RoomListPage /> },
      { path: "rooms/:id", element: <RoomDetailPage /> },
      { path: "agreements", element: <AgreementPage /> },
      { path: "admins", element: <AdminAccountsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
