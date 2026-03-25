import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/authContext";

export default function Logout() {
  const nav = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    nav("/login", { replace: true });
  }, [logout, nav]);

  return null;
}

