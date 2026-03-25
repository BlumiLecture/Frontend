import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./app/authContext";

export default function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Lectura Libros</h1>
        <nav style={{ display: "flex", gap: 12 }}>
          {isAuthenticated ? (
            <>
              <span>{user?.name || user?.email}</span>
              <Link to="/logout">Salir</Link>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Registro</Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ marginTop: 24 }}>
        <p>
          Front conectado al backend con JWT (SimpleJWT). Usa <code>/api/auth/token/</code>,{" "}
          <code>/api/auth/token/refresh/</code> y <code>/api/auth/users/</code>.
        </p>
      </main>
    </div>
  );
}

