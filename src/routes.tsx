import { createBrowserRouter, Navigate } from "react-router";
import { ProtectedLayout } from "./views/ProtectedLayout";
import { DashboardView } from "./views/DashboardView";
import { Login } from "./views/Login";
import Layout from "./components/layout/layout";
import SipCallsView from "./views/SipCallsView";
import SipRegistersView from "./views/SipRegistersView";
import UsersView from "./views/UsersView";
import TrunksView from "./views/TrunksView";

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
          {
            path: "/sip/registers",
            element: <SipRegistersView />,
          },
          {
            path: "/users",
            element: <UsersView />,
          },
          {
            path: "/trunks",
            element: <TrunksView />,
          },
        ],
      },
    ],
  },
]);
