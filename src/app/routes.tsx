import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Logout from "../pages/Logout";
import ProtectedRoute from "./ProtectedRoute";
import Onboarding from "../pages/Onboarding";
import Setup from "../pages/Setup";
import Biblioteca from "../pages/Biblioteca";
import Favoritos from "../pages/Favoritos";
import Inicio from "../pages/Inicio";
import Ajustes from "../pages/Ajustes";
import Check from "../pages/Check";
import PlanPicker from "../pages/PlanPicker";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "logout", element: <Logout /> },

      {
        path: "app",
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <Navigate to="/app/inicio" replace /> },
          {
            path: "onboarding",
            element: <Onboarding />,
          },
          {
            path: "setup",
            element: <Setup />,
          },
          { path: "planes", element: <PlanPicker /> },
          { path: "inicio", element: <Inicio /> },
          { path: "biblioteca", element: <Biblioteca /> },
          { path: "favoritos", element: <Favoritos /> },
          { path: "ajustes", element: <Ajustes /> },
          { path: "check/:bookId", element: <Check /> },
        ],
      },
    ],
  },
]);

