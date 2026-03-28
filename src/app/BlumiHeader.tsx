import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, Settings, LogOut, UserRound } from "lucide-react";
import { useAuth } from "./authContext";

export function BlumiHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.name || "Estudiante";

  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setIsAvatarMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="w-full bg-blumi-soft-bg/90 backdrop-blur border-b border-blumi-accent/70 relative z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => navigate("/app/inicio")}
          role="button"
        >
          <div className="w-10 h-10 bg-blumi-dark-pink rounded-full flex items-center justify-center text-white text-2xl">
            📖
          </div>
          <span className="font-display text-2xl font-bold text-blumi-dark-pink">BlumiLecture</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink
            to="/app/inicio"
            className={({ isActive }) =>
              isActive
                ? "font-bold text-blumi-dark-pink cursor-pointer"
                : "text-blumi-pink/80 hover:text-blumi-dark-pink font-semibold transition-colors cursor-pointer"
            }
          >
            Mi lectura
          </NavLink>
          <NavLink
            to="/app/biblioteca"
            className={({ isActive }) =>
              isActive
                ? "font-bold text-blumi-dark-pink cursor-pointer"
                : "text-blumi-pink/80 hover:text-blumi-dark-pink font-semibold transition-colors cursor-pointer"
            }
          >
            Biblioteca
          </NavLink>
          <NavLink
            to="/app/favoritos"
            className={({ isActive }) =>
              isActive
                ? "font-bold text-blumi-dark-pink cursor-pointer"
                : "text-blumi-pink/80 hover:text-blumi-dark-pink font-semibold transition-colors cursor-pointer"
            }
          >
            Favoritos
          </NavLink>
        </nav>

        {/* Avatar dropdown */}
        <div className="relative z-50" ref={menuRef}>
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer hover:bg-blumi-soft-bg/60 rounded-lg px-1 py-1 transition-colors"
            onClick={() => setIsAvatarMenuOpen((v) => !v)}
            aria-label="Abrir menú de perfil"
          >
            {/* Icono (sin avatar externo), como en la referencia */}
            <div className="h-10 w-10 rounded-full border-2 border-blumi-accent bg-blumi-light-pink/40 flex items-center justify-center">
              <div className="h-7 w-7 rounded-full bg-blumi-pink/10 flex items-center justify-center">
                <UserRound className="w-4 h-4 text-blumi-pink" />
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-blumi-pink" />
          </button>

          {isAvatarMenuOpen && (
            <div className="absolute right-0 mt-3 w-44 bg-white border border-blumi-accent rounded-2xl shadow-xl overflow-hidden z-50">
              <button
                className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-blumi-soft-bg cursor-pointer flex items-center gap-2 transition-colors"
                type="button"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  navigate("/app/ajustes");
                }}
              >
                <Settings className="w-4 h-4 text-blumi-dark-pink" />
                Ajustes
              </button>
              <button
                className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2 transition-colors"
                type="button"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  // Cierre de sesión inmediato para evitar estados raros según el orden de navegación.
                  logout();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

