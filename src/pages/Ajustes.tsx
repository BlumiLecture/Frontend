import React, { useEffect, useState } from "react";
import { BlumiHeader } from "../app/BlumiHeader";
import apiClient from "../api/axiosClient";
import { useAuth } from "../app/authContext";
import { PinkLoader } from "../app/PinkLoader";
import { PinkSelect } from "../app/PinkSelect";

type UiPeriod = "anos" | "meses" | "semanas" | "dias" | "none";

const goalToUi: Record<string, UiPeriod> = {
  YEAR: "anos",
  MONTH: "meses",
  WEEK: "semanas",
  DAY: "dias",
};

const uiToGoal: Record<UiPeriod, string | null> = {
  anos: "YEAR",
  meses: "MONTH",
  semanas: "WEEK",
  dias: "DAY",
  none: null,
};

export default function Ajustes() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [units, setUnits] = useState<string>("");
  const [period, setPeriod] = useState<UiPeriod>("none");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("auth/users/me/");
        const data = res.data?.data || res.data;
        if (!mounted) return;
        setName(data?.name || "");
        if (data?.reading_goal_units != null) {
          setUnits(String(data.reading_goal_units));
        }
        if (data?.reading_goal_period) {
          setPeriod(goalToUi[data.reading_goal_period] || "none");
        }
      } catch (e: any) {
        if (!mounted) return;
        setError("No se pudo cargar tus datos. Intenta de nuevo.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
      };
      const goalPeriod = uiToGoal[period];
      payload.reading_goal_units = units ? parseInt(units, 10) : null;
      payload.reading_goal_period = goalPeriod;

      const res = await apiClient.patch("auth/users/me/", payload);
      const data = res.data?.data || res.data;
      setSuccess("Tus ajustes se guardaron correctamente.");
      // Mantener el estado sincronizado
      setName(data?.name || name);
      if (data?.name) updateUser({ name: data.name });
    } catch (e: any) {
      setError(e?.response?.data?.detail || "No se pudo guardar los cambios. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        <main className="max-w-6xl mx-auto pt-16 pb-16 px-6">
          <PinkLoader
            title="Cargando tus ajustes…"
            subtitle={`Preparando tu espacio rosita, ${user?.name || "lectora"}.`}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blumi-soft-bg">
      <BlumiHeader />
      <main className="max-w-6xl mx-auto pt-10 pb-16 px-6">
        <div className="bg-white border border-blumi-accent rounded-3xl p-6 soft-shadow max-w-xl mx-auto">
          <h1 className="text-2xl font-black text-slate-800">Ajustes de tu cuenta</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Cambia tu nombre y tu objetivo de lectura cuando quieras.{" "}
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 ml-1">Nombre</label>
              <input
                className="w-full rounded-2xl border-2 border-blumi-light-pink px-4 py-3 outline-none focus:border-blumi-pink"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 ml-1">Objetivo de lectura</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  className="w-full border-2 border-blumi-light-pink rounded-2xl p-3 focus:ring-blumi-pink focus:border-blumi-pink text-center text-lg font-bold text-blumi-dark-pink outline-none"
                  placeholder="10"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                />
                <PinkSelect<UiPeriod>
                  value={period}
                  onChange={(v) => setPeriod(v)}
                  options={[
                    { value: "none", label: "Sin objetivo fijo" },
                    { value: "anos", label: "libros al año" },
                    { value: "meses", label: "libros al mes" },
                    { value: "semanas", label: "libros a la semana" },
                    { value: "dias", label: "libros al día" },
                  ]}
                />
              </div>
              <p className="text-xs text-slate-400 ml-1">
                Puedes dejarlo sin objetivo si solo quieres documentar tus lecturas.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl bg-blumi-light-pink/40 border border-blumi-pink/40 px-4 py-3 text-blumi-dark-pink font-semibold text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || loading}
              className="w-full mt-2 rounded-2xl bg-blumi-pink text-white font-bold py-3.5 px-6 shadow-lg hover:bg-blumi-dark-pink transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

