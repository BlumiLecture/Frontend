import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/axiosClient";
import { getAuthErrorMessage } from "../api/authError";
import { PinkSelect } from "../app/PinkSelect";
import { Calendar, CheckCircle2 } from "lucide-react";

type UiAdvance = "PAGES" | "CHAPTERS" | "OTHER";
type UiFrequencyKind = "DAILY" | "EVERY_N_DAYS" | "WEEKLY" | "MONTHLY" | "YEARLY";

type Draft = {
  title: string;
  author: string;
  totalUnits: number;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  frequencyKind: UiFrequencyKind;
  everyNDays: number;
  advanceType: UiAdvance;
  otherUnitLabel: string;
};

type PlanOption = {
  kind: "fixed_end_distribution" | "fixed_units_finish_date";
  units_per_session: number;
  sessions: number;
  days_span: number;
  finish_date: string; // iso
  base_units: number | null;
  extra_units_days: number | null;
};

function dedupePlanOptions(list: PlanOption[]) {
  const seen = new Set<string>();
  const out: PlanOption[] = [];
  for (const o of list) {
    // Consideramos duplicada una opción que produce el mismo plan práctico.
    const key = [o.units_per_session, o.finish_date, o.sessions].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

function unitLabelFromDraft(d: Draft) {
  if (d.advanceType === "PAGES") return "páginas";
  if (d.advanceType === "CHAPTERS") return "capítulos";
  return (d.otherUnitLabel || "unidades").trim().toLowerCase();
}

function parseDateISO(s: string) {
  // yyyy-mm-dd
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatISODate(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function lastDayOfMonth(y: number, m1: number) {
  return new Date(y, m1, 0).getDate(); // m1 is 1-based
}

function addMonthsAligned(start: Date, months: number) {
  const startLast = start.getDate() === lastDayOfMonth(start.getFullYear(), start.getMonth() + 1);
  const baseMonth = start.getMonth() + months;
  const y = start.getFullYear() + Math.floor(baseMonth / 12);
  const m = ((baseMonth % 12) + 12) % 12; // 0-based
  const last = lastDayOfMonth(y, m + 1);
  const d = startLast ? last : Math.min(start.getDate(), last);
  return new Date(y, m, d);
}

function addYearsAligned(start: Date, years: number) {
  const y = start.getFullYear() + years;
  const m = start.getMonth();
  const d = start.getDate();
  const dt = new Date(y, m, d);
  // Feb 29 -> Mar 1 in JS; clamp to Feb 28
  if (dt.getMonth() !== m) return new Date(y, m, 28);
  return dt;
}

function finishDateForUnits(opts: {
  startDate: string;
  totalUnits: number;
  unitsPerSession: number;
  frequencyKind: UiFrequencyKind;
  everyNDays: number;
}) {
  const start = parseDateISO(opts.startDate);
  const sessionsNeeded = Math.ceil(opts.totalUnits / Math.max(1, opts.unitsPerSession));
  if (opts.frequencyKind === "DAILY") return formatISODate(addDays(start, sessionsNeeded - 1));
  if (opts.frequencyKind === "EVERY_N_DAYS") return formatISODate(addDays(start, (sessionsNeeded - 1) * Math.max(1, opts.everyNDays || 1)));
  if (opts.frequencyKind === "WEEKLY") return formatISODate(addDays(start, (sessionsNeeded - 1) * 7));
  if (opts.frequencyKind === "MONTHLY") return formatISODate(addMonthsAligned(start, sessionsNeeded - 1));
  if (opts.frequencyKind === "YEARLY") return formatISODate(addYearsAligned(start, sessionsNeeded - 1));
  return opts.startDate;
}

function freqLabel(kind: UiFrequencyKind, everyN: number) {
  if (kind === "DAILY") return "todos los días";
  if (kind === "EVERY_N_DAYS") return `cada ${Math.max(1, everyN)} días`;
  if (kind === "WEEKLY") return "cada semana";
  if (kind === "MONTHLY") return "cada mes";
  return "cada año";
}

function prettyDateSpanish(isoDate: string) {
  const dt = parseDateISO(isoDate);
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${dt.getDate()} de ${months[dt.getMonth()]}`;
}

function durationLabel(days: number) {
  const safeDays = Math.max(1, days || 0);
  if (safeDays % 30 === 0) {
    const months = safeDays / 30;
    return `${months} ${months === 1 ? "mes" : "meses"} (${safeDays} días)`;
  }
  return `${safeDays} días`;
}

function readingPaceLabel(units: number, unitLabel: string, kind: UiFrequencyKind, everyN: number) {
  if (kind === "EVERY_N_DAYS") {
    return `${units} ${unitLabel} cada ${Math.max(1, everyN)} días`;
  }
  return `${units} ${unitLabel} por sesión`;
}

function dateForSessionIndex(startIso: string, kind: UiFrequencyKind, everyN: number, sessionIndex: number) {
  const start = parseDateISO(startIso);
  const idx = Math.max(0, sessionIndex);
  if (kind === "DAILY") return addDays(start, idx);
  if (kind === "EVERY_N_DAYS") return addDays(start, idx * Math.max(1, everyN));
  if (kind === "WEEKLY") return addDays(start, idx * 7);
  if (kind === "MONTHLY") return addMonthsAligned(start, idx);
  if (kind === "YEARLY") return addYearsAligned(start, idx);
  return start;
}

function unitForCount(unitLabel: string, count: number) {
  if (count !== 1) return unitLabel;
  const lower = unitLabel.toLowerCase();
  if (lower.endsWith("es")) return unitLabel.slice(0, -2);
  if (lower.endsWith("s")) return unitLabel.slice(0, -1);
  return unitLabel;
}

function sessionsLabel(n: number) {
  return `${n} ${n === 1 ? "sesión" : "sesiones"}`;
}

function friendlyDateRangeError(msg: string) {
  const m = String(msg || "");
  if (m.includes("target_end_date must be >= start_date")) {
    return "La fecha meta debe ser igual o posterior a la fecha de inicio. Corrige las fechas para ver los planes.";
  }
  return m;
}

export default function PlanPicker() {
  const nav = useNavigate();
  const loc = useLocation();
  const endRef = useRef<HTMLInputElement | null>(null);

  const bookId = (loc.state as any)?.bookId as number | undefined;
  const draft = (loc.state as any)?.draft as Draft | undefined;
  const unitLabel = useMemo(() => (draft ? unitLabelFromDraft(draft) : "unidades"), [draft]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<PlanOption[]>([]);

  const [frequencyKind, setFrequencyKind] = useState<UiFrequencyKind>(draft?.frequencyKind ?? "DAILY");
  const [everyNDays, setEveryNDays] = useState<number>(draft?.everyNDays ?? 2);
  const [targetEndDate, setTargetEndDate] = useState<string>(draft?.endDate ?? "");
  const effectiveEndDate = targetEndDate || draft?.endDate || "";

  const daysSpan = useMemo(() => {
    if (!draft || !effectiveEndDate) return null;
    const start = parseDateISO(draft.startDate);
    const end = parseDateISO(effectiveEndDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  }, [draft, effectiveEndDate]);

  const isFrequencyAllowed = (kind: UiFrequencyKind, span: number | null) => {
    if (!span || span <= 0) return true;
    if (kind === "DAILY") return true;
    if (kind === "EVERY_N_DAYS") return true;
    if (kind === "WEEKLY") return span >= 7;
    if (kind === "MONTHLY") return span >= 30;
    if (kind === "YEARLY") return span >= 365;
    return true;
  };

  const frequencyOptions = useMemo(() => {
    const all = [
      { value: "DAILY", label: "Todos los días" },
      { value: "EVERY_N_DAYS", label: "Cada N días" },
      { value: "WEEKLY", label: "Cada semana" },
      { value: "MONTHLY", label: "Cada mes" },
      { value: "YEARLY", label: "Cada año" },
    ] as Array<{ value: UiFrequencyKind; label: string }>;
    return all.filter((o) => isFrequencyAllowed(o.value, daysSpan));
  }, [daysSpan]);

  const frequencyValidationError = () => {
    if (!isFrequencyAllowed(frequencyKind, daysSpan)) {
      if (frequencyKind === "WEEKLY") return "Para leer cada semana, el rango entre inicio y fin debe abarcar al menos 7 días.";
      if (frequencyKind === "MONTHLY") return "Para leer cada mes, el rango entre inicio y fin debe abarcar al menos 30 días.";
      if (frequencyKind === "YEARLY") return "Para leer cada año, el rango entre inicio y fin debe abarcar al menos 365 días.";
      return "La frecuencia elegida no es válida para este rango de fechas.";
    }
    if (frequencyKind === "EVERY_N_DAYS" && daysSpan && everyNDays > daysSpan) {
      return `No puedes leer cada ${everyNDays} días si tu rango total es de ${daysSpan} días.`;
    }
    return null;
  };

  const [customUnits, setCustomUnits] = useState<string>("");
  const [customConfirmOpen, setCustomConfirmOpen] = useState(false);
  const [pendingCustom, setPendingCustom] = useState<(PlanOption & { _isCustom?: boolean }) | null>(null);
  const [lastAcceptedCustomUnits, setLastAcceptedCustomUnits] = useState<number | null>(null);
  const [endDateConfirmOpen, setEndDateConfirmOpen] = useState(false);
  const [pendingEndDate, setPendingEndDate] = useState<string | null>(null);
  const customUnitsError = useMemo(() => {
    if (!draft) return null;
    const raw = customUnits.trim();
    if (!raw) return null;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return "Ingresa un número válido mayor a 0.";
    if (n > draft.totalUnits) {
      return `No puedes leer más de ${draft.totalUnits} ${unitForCount(unitLabel, draft.totalUnits)} por sesión para este libro.`;
    }
    return null;
  }, [customUnits, draft, unitLabel]);
  const customOption = useMemo(() => {
    const n = parseInt(customUnits, 10);
    if (!draft) return null;
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n > draft.totalUnits) return null;
    const finish = finishDateForUnits({
      startDate: draft.startDate,
      totalUnits: draft.totalUnits,
      unitsPerSession: n,
      frequencyKind,
      everyNDays,
    });
    const sessions = Math.ceil(draft.totalUnits / n);
    return {
      kind: "fixed_units_finish_date" as const,
      units_per_session: n,
      sessions,
      days_span: 0,
      finish_date: finish,
      base_units: null,
      extra_units_days: null,
      _isCustom: true,
    };
  }, [customUnits, draft, everyNDays, frequencyKind]);

  const [selected, setSelected] = useState<PlanOption | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!draft) nav("/app/setup", { replace: true });
  }, [draft, nav]);

  useEffect(() => {
    if (!daysSpan || daysSpan <= 0) return;
    if (!isFrequencyAllowed(frequencyKind, daysSpan)) {
      setFrequencyKind("DAILY");
    }
    if (everyNDays > daysSpan) {
      setEveryNDays(daysSpan);
    }
  }, [daysSpan, everyNDays, frequencyKind]);

  const maybeOpenCustomConfirm = () => {
    if (customUnitsError) {
      setError(customUnitsError);
      return;
    }
    if (!customOption) return;
    if (lastAcceptedCustomUnits === customOption.units_per_session) return;
    setPendingCustom(customOption);
    setCustomConfirmOpen(true);
  };

  const hasCustomReadingConfigured = () => {
    const n = parseInt(customUnits, 10);
    return Number.isFinite(n) && n > 0;
  };

  const handleTargetEndDateChange = (nextDate: string) => {
    if (!nextDate) {
      setTargetEndDate(nextDate);
      return;
    }
    if (hasCustomReadingConfigured()) {
      setPendingEndDate(nextDate);
      setEndDateConfirmOpen(true);
      return;
    }
    setTargetEndDate(nextDate);
  };

  const loadOptions = async () => {
    if (!draft) return;
    const invalidFrequencyMsg = frequencyValidationError();
    if (invalidFrequencyMsg) {
      setError(invalidFrequencyMsg);
      setOptions([]);
      setSelected(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("plans/calculate/", {
        total_units: draft.totalUnits,
        unit_type: draft.advanceType,
        start_date: draft.startDate,
        target_end_date: targetEndDate || draft.endDate,
        frequency_type: frequencyKind,
        every_n_days: frequencyKind === "EVERY_N_DAYS" ? Math.max(1, everyNDays) : null,
      });
      const list = dedupePlanOptions((res.data?.options || []) as PlanOption[]);
      setOptions(list);
      setSelected(list[0] || null);
    } catch (e: any) {
      const raw = getAuthErrorMessage(e, "No se pudieron calcular planes. Intenta de nuevo.");
      setError(friendlyDateRangeError(raw));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequencyKind, everyNDays, targetEndDate]);

  const handleConfirm = async () => {
    if (!draft || !selected) return;
    if (!bookId) {
      setError("Falta el borrador del libro. Vuelve a Setup e intenta de nuevo.");
      return;
    }
    const invalidFrequencyMsg = frequencyValidationError();
    if (invalidFrequencyMsg) {
      setError(invalidFrequencyMsg);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // En el nuevo sistema, guardamos solo la configuración (rango + frecuencia).
      // El reparto (units por sesión) se calcula dinámicamente a partir de logs.
      await apiClient.post("plans/", {
        book: bookId,
        start_date: draft.startDate,
        // Guardamos la fecha real del plan seleccionado (no solo la fecha meta del input).
        target_end_date: selected.finish_date,
        frequency_type: frequencyKind,
        every_n_days: frequencyKind === "EVERY_N_DAYS" ? Math.max(1, everyNDays) : null,
        is_active: true,
      });

      setConfirmOpen(false);
      nav("/app/inicio", { replace: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.message === "string" ? e.message : null) ||
        getAuthErrorMessage(e, "No se pudo guardar tu plan. Intenta de nuevo.");
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  if (!draft) return null;

  const mergedOptions: Array<PlanOption & { _isCustom?: boolean }> = useMemo(() => {
    const base = options.filter((o) => o.units_per_session <= draft.totalUnits) as Array<PlanOption & { _isCustom?: boolean }>;
    if (customOption) {
      const duplicateIdx = base.findIndex(
        (o) => o.units_per_session === customOption.units_per_session && o.finish_date === customOption.finish_date && o.sessions === customOption.sessions
      );
      if (duplicateIdx >= 0) {
        base[duplicateIdx] = { ...base[duplicateIdx], _isCustom: true };
      } else {
        base.unshift(customOption as any);
      }
    }
    return base;
  }, [customOption, draft.totalUnits, options]);

  const daysBetweenStartAndFinish = (finishDate: string) => {
    const start = parseDateISO(draft.startDate);
    const finish = parseDateISO(finishDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.round((finish.getTime() - start.getTime()) / msPerDay) + 1);
  };

  const exactDistributionLabel = (o: PlanOption) => {
    if (o.kind === "fixed_units_finish_date") {
      const total = Math.max(0, draft.totalUnits);
      const perSession = Math.max(1, o.units_per_session);
      const fullSessions = Math.floor(total / perSession);
      const remainder = total % perSession;
      if (!remainder || fullSessions <= 0) {
        return readingPaceLabel(perSession, unitLabel, frequencyKind, everyNDays);
      }
      const cutoffDate = dateForSessionIndex(draft.startDate, frequencyKind, everyNDays, fullSessions - 1);
      return (
        <>
          <span className="text-blumi-dark-pink">
            {perSession} {unitForCount(unitLabel, perSession)}
          </span>{" "}
          <span className="text-slate-900">hasta {prettyDateSpanish(formatISODate(cutoffDate))}</span>{" "}
          <span className="text-slate-600">({sessionsLabel(fullSessions)})</span>
          <br />
          <span className="text-slate-900">y luego</span>{" "}
          <span className="text-blumi-dark-pink">
            {remainder} {unitForCount(unitLabel, remainder)}
          </span>{" "}
          <span className="text-slate-900">hasta terminar</span>{" "}
          <span className="text-slate-600">(1 sesión hasta terminar)</span>.
        </>
      );
    }
    const base = o.base_units ?? o.units_per_session;
    const extraSessions = Math.max(0, o.extra_units_days ?? 0);
    if (!extraSessions) {
      return readingPaceLabel(base, unitLabel, frequencyKind, everyNDays);
    }
    const normalSessions = Math.max(0, o.sessions - extraSessions);
    if (normalSessions <= 0) {
      const totalSessions = Math.max(1, o.sessions);
      return (
        <>
          {base + 1} {unitForCount(unitLabel, base + 1)} hasta terminar{" "}
          <span className="text-slate-800">({sessionsLabel(totalSessions)})</span>.
        </>
      );
    }
    // Importante: debe coincidir con el backend dinámico.
    // generate_reading_plan asigna base+1 a las primeras `extra` sesiones pendientes.
    const firstPhaseCutoff = dateForSessionIndex(draft.startDate, frequencyKind, everyNDays, extraSessions - 1);
    const firstPhaseSessions = extraSessions;
    const secondPhaseSessions = normalSessions;
    return (
      <>
        <span className="text-blumi-dark-pink">
          {base + 1} {unitForCount(unitLabel, base + 1)}
        </span>{" "}
        <span className="text-slate-900">hasta {prettyDateSpanish(formatISODate(firstPhaseCutoff))}</span>{" "}
        <span className="text-slate-600">({sessionsLabel(firstPhaseSessions)})</span>
        <br />
        <span className="text-slate-900">y luego</span>{" "}
        <span className="text-blumi-dark-pink">
          {base} {unitForCount(unitLabel, base)}
        </span>{" "}
        <span className="text-slate-900">hasta terminar</span>{" "}
        <span className="text-slate-600">({sessionsLabel(secondPhaseSessions)} restantes)</span>.
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="min-h-screen flex items-center justify-center p-4 bg-blumi-soft-bg"
    >
      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] p-8 md:p-10 cute-shadow border-4 border-blumi-light-pink">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Elige tu plan de lectura</h1>
          <p className="text-blumi-purple font-medium">
            Para <span className="font-black text-blumi-dark-pink">{draft.title || "tu libro"}</span>, con {draft.totalUnits}{" "}
            {unitLabel}.
          </p>
          <p className="mt-2 text-sm text-slate-600 font-semibold">
            Aquí puedes ajustar la frecuencia, la fecha meta y cuántas {unitLabel} leer por sesión para comparar opciones.
            Si quieres cambiar más cosas del libro, usa <span className="font-black text-blumi-dark-pink">"Volver a editar"</span>.
          </p>
        </header>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Frecuencia</label>
              <PinkSelect
                value={frequencyKind as any}
                onChange={(v) => setFrequencyKind(v as any)}
                options={frequencyOptions as any}
              />
              {frequencyKind === "EVERY_N_DAYS" ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-sm font-bold text-gray-700">Cada</div>
                  <input
                    type="number"
                    min={1}
                    max={daysSpan && daysSpan > 0 ? daysSpan : undefined}
                    value={everyNDays}
                    onChange={(e) => {
                      const n = parseInt(e.target.value || "1", 10);
                      const maxN = daysSpan && daysSpan > 0 ? daysSpan : Number.MAX_SAFE_INTEGER;
                      setEveryNDays(Math.min(Math.max(1, n), maxN));
                    }}
                    className="w-24 px-4 py-2 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink outline-none text-center font-black text-blumi-dark-pink cursor-pointer"
                  />
                  <div className="text-sm font-bold text-gray-700">días</div>
                </div>
              ) : null}
              {daysSpan && daysSpan > 0 ? (
                <div className="mt-2 text-xs text-slate-500 font-semibold">
                  Tu rango de lectura es de {daysSpan} día{daysSpan === 1 ? "" : "s"}.
                </div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Fecha meta</label>
              <div className="relative">
                <input
                  ref={endRef}
                  type="date"
                  value={targetEndDate}
                  min={draft.startDate}
                  onChange={(e) => handleTargetEndDateChange(e.target.value)}
                  className="pink-date w-full px-3 pr-10 py-3 text-sm rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink outline-none cursor-pointer"
                />
                <button
                  type="button"
                  aria-label="Elegir fecha meta"
                  onClick={() => {
                    const el = endRef.current;
                    if (!el) return;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const anyEl = el as any;
                    if (typeof anyEl.showPicker === "function") anyEl.showPicker();
                    else el.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blumi-pink hover:text-blumi-dark-pink transition-colors cursor-pointer"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Yo quiero leer…</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Ej: 11"
                  value={customUnits}
                  onChange={(e) => setCustomUnits(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      maybeOpenCustomConfirm();
                    }
                  }}
                  className="flex-1 min-w-[110px] px-4 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink outline-none text-center font-black text-blumi-dark-pink"
                />
                <div className="text-sm font-bold text-gray-700 whitespace-nowrap">/sesión</div>
                <button
                  type="button"
                  onClick={maybeOpenCustomConfirm}
                  disabled={!customOption}
                  className="shrink-0 px-4 py-2 rounded-2xl bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Aplicar
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-semibold">
                Calculamos cuándo terminarías si lees ese número {freqLabel(frequencyKind, everyNDays)}.
              </div>
              {customUnitsError ? <div className="mt-2 text-xs font-bold text-red-600">{customUnitsError}</div> : null}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="md:col-span-2 rounded-[28px] bg-white/70 border-2 border-blumi-light-pink soft-shadow p-8 text-center">
                <div className="text-2xl font-black text-blumi-dark-pink">Calculando planes…</div>
                <div className="mt-2 text-sm text-slate-500 font-semibold">Preparando tu opción más rosita.</div>
              </div>
            ) : (
              mergedOptions.map((o, idx) => {
                const isSelected = selected?.kind === o.kind && selected?.units_per_session === o.units_per_session && selected?.finish_date === o.finish_date;
                const spanDays = o.days_span && o.days_span > 0 ? o.days_span : daysBetweenStartAndFinish(o.finish_date);
                return (
                  <button
                    key={`${o.kind}-${o.units_per_session}-${o.finish_date}-${idx}`}
                    type="button"
                    onClick={() => setSelected(o)}
                    className={`text-left rounded-[26px] border-2 p-5 transition-all cursor-pointer hover:-translate-y-0.5 ${
                      isSelected ? "border-blumi-pink bg-blumi-soft-bg soft-shadow" : "border-blumi-light-pink bg-white hover:bg-blumi-soft-bg/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black text-blumi-dark-pink">Opción {idx + 1}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-600">Si quieres terminar en...</div>
                        <div className="text-xl font-black text-slate-800">{durationLabel(spanDays)}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-600">{unitLabel[0].toUpperCase() + unitLabel.slice(1)}</div>
                        <div className="text-xl font-black text-slate-800">
                          {exactDistributionLabel(o)}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-600">Fecha de finalización</div>
                        <div className="text-xl font-black text-slate-800">{prettyDateSpanish(o.finish_date)}</div>
                        <div className="mt-2 text-xs font-bold text-slate-500">
                          {o.finish_date}
                        </div>
                      </div>
                      {isSelected ? <CheckCircle2 className="w-6 h-6 text-blumi-pink" /> : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="pt-2 flex flex-col md:flex-row gap-3">
            <button
              type="button"
              onClick={() =>
                nav("/app/setup", {
                  state: {
                    bookId,
                    draft: {
                      ...draft,
                      frequencyKind,
                      everyNDays,
                      endDate: targetEndDate || draft.endDate,
                    },
                  },
                })
              }
              className="w-full md:w-auto px-6 py-3 rounded-2xl border-2 border-blumi-light-pink font-bold text-blumi-purple hover:text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
              disabled={loading}
            >
              Volver a editar
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={loading || !selected}
              className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transform transition-all hover:-translate-y-1 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              Elegir este plan ✨
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && selected ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">¿Confirmamos tu plan?</div>
              <div className="mt-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-700 font-bold text-sm">
                Esta elección es definitiva y no se podrá cambiar después.
              </div>
              <div className="mt-2 text-slate-600 font-semibold">
                Tu elección fue: leer{" "}
                <span className="font-black text-slate-800">{exactDistributionLabel(selected)}</span>
              </div>
              <div className="mt-4 text-xs font-bold text-slate-500">Terminas: {prettyDateSpanish(selected.finish_date)} ({selected.finish_date})</div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm">{error}</div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink font-bold text-blumi-purple hover:text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Guardando…" : "Sí, esta es mi elección 💗"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {customConfirmOpen && pendingCustom ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">¿Aplicar este ritmo?</div>
              <div className="mt-2 text-slate-600 font-semibold">
                Si lees{" "}
                <span className="font-black text-slate-800">{readingPaceLabel(pendingCustom.units_per_session, unitLabel, frequencyKind, everyNDays)}</span>,
                tu fecha meta cambiará a{" "}
                <span className="font-black text-slate-800">{prettyDateSpanish(pendingCustom.finish_date)}</span>.
              </div>
              <div className="mt-2 text-xs font-bold text-slate-500">{pendingCustom.finish_date}</div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCustomConfirmOpen(false);
                  setPendingCustom(null);
                }}
                className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink font-bold text-blumi-purple hover:text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(pendingCustom);
                  setTargetEndDate(pendingCustom.finish_date);
                  setLastAcceptedCustomUnits(pendingCustom.units_per_session);
                  setCustomConfirmOpen(false);
                  setPendingCustom(null);
                }}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {endDateConfirmOpen && pendingEndDate ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">¿Cambiar fecha meta?</div>
              <div className="mt-2 text-slate-600 font-semibold">
                Se priorizará la nueva fecha meta{" "}
                <span className="font-black text-slate-800">{prettyDateSpanish(pendingEndDate)}</span> y se borrará tu valor de{" "}
                <span className="font-black text-slate-800">"Yo quiero leer…"</span>.
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEndDateConfirmOpen(false);
                  setPendingEndDate(null);
                }}
                className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink font-bold text-blumi-purple hover:text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetEndDate(pendingEndDate);
                  setCustomUnits("");
                  setLastAcceptedCustomUnits(null);
                  setPendingCustom(null);
                  setEndDateConfirmOpen(false);
                  setPendingEndDate(null);
                }}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

