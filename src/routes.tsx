import { createBrowserRouter, Navigate } from "react-router";
import { ProtectedLayout } from "./views/ProtectedLayout";
import { DashboardView } from "./views/DashboardView";
import { Login } from "./views/Login";
import Layout from "./components/layout/layout";
import SipCallsView from "./views/SipCallsView";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    path: "/login",
    element: <Login />,
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardView />,
          },
          {
            path: "/sip/calls",
            element: <SipCallsView />,
          },
        ],
      },
    ],
  },
]);
