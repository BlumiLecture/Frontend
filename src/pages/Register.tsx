import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as apiRegister } from "../api/services/auth";
import { getAuthErrorMessage } from "../api/authError";
import { useAuth } from "../app/authContext";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Validación visual (como Proyecto copiar)
  const passwordHasMinLength = password.length >= 8;
  const passwordHasUppercase = /[A-ZÁÉÍÓÚÑ]/.test(password);
  const passwordHasNumber = /\d/.test(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRegister({
        email,
        name,
        password,
      });
      // Igual que en `Proyecto copiar`: al crear cuenta, iniciar sesión automáticamente.
      await login(email, password);
      // Primera vez: mostrar objetivo de lectura (form de onboarding).
      window.localStorage.setItem("blumiShowSuccessModalType", "register");
      nav("/app/onboarding", { replace: true });
    } catch (err: any) {
      const msg = getAuthErrorMessage(err, "Error al registrarse. Intenta de nuevo.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blumi-soft-bg px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius-xl-plus)] border border-blumi-accent bg-white p-6 soft-shadow">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blumi-dark-pink text-2xl text-white">
            ✨
          </div>
          <h2 className="font-display text-3xl font-bold text-blumi-dark-pink">Crear cuenta</h2>
          <p className="mt-1 text-sm text-gray-600">Empieza a planear tu lectura</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-gray-700">
            Nombre
            <input
              className="rounded-2xl border-2 border-blumi-light-pink px-4 py-3 outline-none focus:border-blumi-pink"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

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
                placeholder="Mínimo 8 caracteres"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                autoComplete="new-password"
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

          <div className="rounded-2xl bg-blumi-soft-bg border border-blumi-accent px-4 py-3">
            <div className="text-xs font-bold text-pink-700 mb-2">Tu contraseña debe cumplir:</div>
            <ul className="space-y-1 text-xs font-semibold">
              <li className={(!passwordTouched || password.length === 0) ? "text-gray-500" : (passwordHasMinLength ? "text-emerald-600" : "text-red-600")}>
                - Mínimo 8 caracteres
              </li>
              <li className={(!passwordTouched || password.length === 0) ? "text-gray-500" : (passwordHasUppercase ? "text-emerald-600" : "text-red-600")}>
                - Al menos una mayúscula
              </li>
              <li className={(!passwordTouched || password.length === 0) ? "text-gray-500" : (passwordHasNumber ? "text-emerald-600" : "text-red-600")}>
                - Al menos un número
              </li>
            </ul>
          </div>

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
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold text-pink-700 hover:underline">
            ← Volver a la landing
          </Link>
          <Link to="/login" className="font-semibold text-pink-700 hover:underline">
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}

