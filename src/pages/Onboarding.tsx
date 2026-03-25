import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosClient";
import { CheckCircle2 } from "lucide-react";
import { PinkSelect } from "../app/PinkSelect";

type GoalPeriod = "DAY" | "WEEK" | "MONTH" | "YEAR";

const periodToGoal: Record<string, GoalPeriod> = {
  dias: "DAY",
  semanas: "WEEK",
  meses: "MONTH",
  anos: "YEAR",
};

export default function Onboarding() {
  const nav = useNavigate();
  const [count, setCount] = useState(10);
  const [period, setPeriod] = useState("anos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  useEffect(() => {
    const type = window.localStorage.getItem("blumiShowSuccessModalType");
    if (type === "register") {
      setShowSuccessModal(true);
      // Limpia después de mostrar para no reaparecer.
      const t = window.setTimeout(() => {
        setShowSuccessModal(false);
        window.localStorage.removeItem("blumiShowSuccessModalType");
      }, 1400);
      return () => window.clearTimeout(t);
    }
  }, []);

  const saveGoal = async (opts: { hasGoal: boolean }) => {
    setError(null);
    setLoading(true);
    try {
      const payload = opts.hasGoal
        ? {
            reading_goal_units: count > 0 ? count : null,
            reading_goal_period: periodToGoal[period] ?? null,
          }
        : {
            reading_goal_units: null,
            reading_goal_period: null,
          };

      // Usamos PATCH (parcial) porque el backend exige `email`/`name` con PUT completo.
      await apiClient.patch("auth/users/me/", payload);

      window.localStorage.setItem("blumiOnboardingCompleted", "true");
      // Mostramos modal de éxito especial al llegar a Inicio/Biblioteca.
      window.localStorage.setItem("blumiShowSuccessModalType", "goal");
      nav("/app/inicio", { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail || "No se pudo guardar tu objetivo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center p-4 bg-blumi-soft-bg"
    >
      <div className="w-full max-w-md bg-blumi-soft-bg/60 rounded-xl-plus shadow-xl border-4 border-blumi-pink p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blumi-light-pink rounded-full opacity-50"></div>
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blumi-light-pink rounded-full opacity-50"></div>

        <header className="text-center mb-8 relative z-10">
          <div className="animate-floating mb-4 inline-block">
            <span className="text-5xl" role="img" aria-label="Book Icon">
              📖
            </span>
          </div>
          <h1 className="text-3xl text-blumi-dark-pink font-bold mb-2">BlumiLecture</h1>
          <p className="text-xl text-gray-700 font-semibold font-playful">¿Cuál es tu objetivo de lectura?</p>
        </header>

        <div className="space-y-6 relative z-10">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-600 ml-1">Quiero leer...</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value || "0", 10))}
                className="w-full border-2 border-blumi-light-pink rounded-2xl p-3 focus:ring-blumi-pink focus:border-blumi-pink text-center text-lg font-bold text-blumi-dark-pink outline-none"
                min="1"
              />
              <PinkSelect
                value={period as any}
                onChange={(v) => setPeriod(String(v))}
                options={[
                  { value: "anos", label: "libros al año" },
                  { value: "meses", label: "libros al mes" },
                  { value: "semanas", label: "libros a la semana" },
                  { value: "dias", label: "libros al día" },
                ] as any}
              />
            </div>
          </div>

          <button
            onClick={() => saveGoal({ hasGoal: true })}
            disabled={loading}
            className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-4 rounded-2xl shadow-lg transition-all duration-300 text-lg hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            {loading ? "Guardando..." : "¡Vamos a leer! ✨"}
          </button>

          <div className="flex items-center gap-3 my-4">
            <hr className="flex-grow border-blumi-light-pink" />
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">o tal vez</span>
            <hr className="flex-grow border-blumi-light-pink" />
          </div>

          <button
            onClick={() => saveGoal({ hasGoal: false })}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-blumi-light-pink text-gray-500 font-medium hover:bg-blumi-light-pink hover:text-blumi-dark-pink transition-all duration-300 text-sm cursor-pointer"
          >
            Sin objetivo, solo quiero documentar
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm">
            {error}
          </div>
        ) : null}

        <footer className="mt-8 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Hecho con ❤️ para amantes de los libros</p>
        </footer>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl border-4 border-blumi-light-pink p-8 shadow-2xl max-w-sm w-full text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-blumi-pink/10 border border-blumi-pink/30 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-blumi-pink" />
            </div>
            <h3 className="text-2xl font-black text-blumi-dark-pink">¡Cuenta creada!</h3>
            <p className="mt-2 text-sm text-slate-600 font-semibold">Listo. Vamos con tu objetivo de lectura.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

