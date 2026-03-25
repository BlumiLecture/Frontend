import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/authContext";
import { getAuthErrorMessage } from "../api/authError";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      window.localStorage.setItem("blumiShowSuccessModalType", "login");
      nav("/app/inicio", { replace: true });
    } catch (err: any) {
      const msg = getAuthErrorMessage(err, "No se pudo iniciar sesión. Intenta de nuevo.");
      const normalized = String(msg).toLowerCase();

      if (normalized.includes("no active account found")) {
        setError("Tu cuenta está desactivada. Si crees que es un error, contacta al administrador.");
      } else if (normalized.includes("credenciales") || normalized.includes("credentials") || normalized.includes("invalid")) {
        setError("Email o contraseña incorrectos. Revisa e inténtalo de nuevo.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blumi-soft-bg px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius-xl-plus)] border border-blumi-accent bg-white p-6 soft-shadow">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blumi-dark-pink text-2xl text-white">
            🔐
          </div>
          <h2 className="font-display text-3xl font-bold text-blumi-dark-pink">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-gray-600">Accede a tu panel de lectura</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-gray-700">
            Email
            <input
              className="rounded-2xl border-2 border-blumi-light-pink px-4 py-3 outline-none focus:border-blumi-pink"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-gray-700">
            Contraseña
            <div className="relative">
              <input
                className="w-full rounded-2xl border-2 border-blumi-light-pink px-4 py-3 pr-12 outline-none focus:border-blumi-pink"
                placeholder="********"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3">
              <div className="text-sm font-semibold text-red-600">{error}</div>
              {error.toLowerCase().includes("conectar con el servidor") ? (
                <div className="mt-1 text-xs font-semibold text-red-600/90">
                  Sugerencia: revisa que `python manage.py runserver` esté activo y que `VITE_API_URL` apunte al backend correcto.
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-2xl bg-blumi-dark-pink px-6 py-3 font-bold text-white transition hover:bg-pink-500 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold text-pink-700 hover:underline">
            ← Volver a la landing
          </Link>
          <Link to="/register" className="font-semibold text-pink-700 hover:underline">
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}

