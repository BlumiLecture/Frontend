import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import apiClient from "../api/axiosClient";
import { BookOpen, Calendar, CircleHelp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthErrorMessage } from "../api/authError";
import { PinkSelect } from "../app/PinkSelect";

type UiFrequency =
  | { kind: "DAILY" }
  | { kind: "EVERY_N_DAYS"; everyN: number }
  | { kind: "WEEKLY" }
  | { kind: "MONTHLY" }
  | { kind: "YEARLY" };

type UiAdvance = "PAGES" | "CHAPTERS" | "OTHER";

function parseDateISO(s: string) {
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
  return new Date(y, m1, 0).getDate();
}

function addMonthsAligned(start: Date, months: number) {
  const startLast = start.getDate() === lastDayOfMonth(start.getFullYear(), start.getMonth() + 1);
  const baseMonth = start.getMonth() + months;
  const y = start.getFullYear() + Math.floor(baseMonth / 12);
  const m = ((baseMonth % 12) + 12) % 12;
  const last = lastDayOfMonth(y, m + 1);
  const d = startLast ? last : Math.min(start.getDate(), last);
  return new Date(y, m, d);
}

function addYearsAligned(start: Date, years: number) {
  const y = start.getFullYear() + years;
  const m = start.getMonth();
  const d = start.getDate();
  const dt = new Date(y, m, d);
  if (dt.getMonth() !== m) return new Date(y, m, 28);
  return dt;
}

function alignedEndDateForFrequency(startIso: string, targetIso: string, kind: UiFrequency["kind"], everyN: number) {
  const start = parseDateISO(startIso);
  const target = parseDateISO(targetIso);
  if (target < start) return targetIso;
  if (kind === "DAILY") return targetIso;
  if (kind === "EVERY_N_DAYS") {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.floor((target.getTime() - start.getTime()) / msPerDay);
    const n = Math.max(1, everyN || 1);
    return formatISODate(addDays(start, Math.floor(diff / n) * n));
  }
  if (kind === "WEEKLY") {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.floor((target.getTime() - start.getTime()) / msPerDay);
    return formatISODate(addDays(start, Math.floor(diff / 7) * 7));
  }
  if (kind === "MONTHLY") {
    let i = 0;
    let current = start;
    while (true) {
      const next = addMonthsAligned(start, i + 1);
      if (next > target) break;
      current = next;
      i += 1;
      if (i > 1200) break;
    }
    return formatISODate(current);
  }
  if (kind === "YEARLY") {
    let i = 0;
    let current = start;
    while (true) {
      const next = addYearsAligned(start, i + 1);
      if (next > target) break;
      current = next;
      i += 1;
      if (i > 200) break;
    }
    return formatISODate(current);
  }
  return targetIso;
}

function sessionsCountForRange(startIso: string, endIso: string, kind: UiFrequency["kind"], everyN: number) {
  if (!startIso || !endIso) return 0;
  const start = parseDateISO(startIso);
  const end = parseDateISO(endIso);
  if (end < start) return 0;

  if (kind === "DAILY") {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.floor((end.getTime() - start.getTime()) / msPerDay);
    return diff + 1;
  }
  if (kind === "EVERY_N_DAYS") {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.floor((end.getTime() - start.getTime()) / msPerDay);
    const n = Math.max(1, everyN || 1);
    return Math.floor(diff / n) + 1;
  }
  if (kind === "WEEKLY") {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.floor((end.getTime() - start.getTime()) / msPerDay);
    return Math.floor(diff / 7) + 1;
  }
  if (kind === "MONTHLY") {
    let count = 0;
    while (true) {
      const dt = addMonthsAligned(start, count);
      if (dt > end) break;
      count += 1;
      if (count > 1200) break;
    }
    return count;
  }
  if (kind === "YEARLY") {
    let count = 0;
    while (true) {
      const dt = addYearsAligned(start, count);
      if (dt > end) break;
      count += 1;
      if (count > 200) break;
    }
    return count;
  }
  return 0;
}

function lastPossibleEndDateForOneUnitPerSession(startIso: string, totalUnits: number, kind: UiFrequency["kind"], everyN: number) {
  if (!startIso || totalUnits <= 0) return "";
  const start = parseDateISO(startIso);
  const sessionsAhead = Math.max(0, totalUnits - 1);
  if (kind === "DAILY") return formatISODate(addDays(start, sessionsAhead));
  if (kind === "EVERY_N_DAYS") return formatISODate(addDays(start, sessionsAhead * Math.max(1, everyN || 1)));
  if (kind === "WEEKLY") return formatISODate(addDays(start, sessionsAhead * 7));
  if (kind === "MONTHLY") return formatISODate(addMonthsAligned(start, sessionsAhead));
  if (kind === "YEARLY") return formatISODate(addYearsAligned(start, sessionsAhead));
  return startIso;
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex align-middle ml-1 group">
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-blumi-accent/70 text-blumi-pink bg-white hover:bg-blumi-soft-bg transition-colors cursor-help"
        aria-label={text}
      >
        <CircleHelp className="w-3.5 h-3.5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 z-30 w-56 rounded-xl border border-blumi-pink/40 bg-blumi-light-pink/95 text-blumi-dark-pink text-[11px] font-semibold leading-relaxed px-3 py-2 shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0">
        {text}
      </span>
    </span>
  );
}

export default function Setup() {
  const nav = useNavigate();
  const loc = useLocation();
  const startRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLInputElement | null>(null);

  const todayISO = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);
  const [book, setBook] = useState({
    title: "",
    author: "",
    totalUnits: "",
    startDate: "",
    endDate: "",
    frequencyKind: "DAILY" as UiFrequency["kind"],
    everyNDays: 2,
    advanceType: "PAGES" as UiAdvance,
    otherUnitLabel: "",
  });
  const [draftBookId, setDraftBookId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adjustDateOpen, setAdjustDateOpen] = useState(false);
  const [adjustedEndDate, setAdjustedEndDate] = useState<string | null>(null);

  // Si venimos desde "Planes" con un draft, precargamos el formulario para que no se pierda.
  useEffect(() => {
    const draft = (loc.state as any)?.draft as any | undefined;
    const bookId = (loc.state as any)?.bookId as number | undefined;
    if (!draft) return;
    if (typeof bookId === "number") setDraftBookId(bookId);
    setBook((prev) => ({
      ...prev,
      title: typeof draft.title === "string" ? draft.title : prev.title,
      author: typeof draft.author === "string" ? draft.author : prev.author,
      totalUnits: draft.totalUnits != null ? String(draft.totalUnits) : prev.totalUnits,
      startDate: typeof draft.startDate === "string" ? draft.startDate : prev.startDate,
      endDate: typeof draft.endDate === "string" ? draft.endDate : prev.endDate,
      frequencyKind: draft.frequencyKind ?? prev.frequencyKind,
      everyNDays: draft.everyNDays ?? prev.everyNDays,
      advanceType: draft.advanceType ?? prev.advanceType,
      otherUnitLabel: typeof draft.otherUnitLabel === "string" ? draft.otherUnitLabel : prev.otherUnitLabel,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unitLabel = useMemo(() => {
    if (book.advanceType === "PAGES") return "páginas";
    if (book.advanceType === "CHAPTERS") return "capítulos";
    return (book.otherUnitLabel || "unidades").trim().toLowerCase();
  }, [book.advanceType, book.otherUnitLabel]);

  const frequencyPayload: UiFrequency = useMemo(() => {
    if (book.frequencyKind === "EVERY_N_DAYS") return { kind: "EVERY_N_DAYS", everyN: Math.max(1, Number(book.everyNDays) || 1) };
    if (book.frequencyKind === "WEEKLY") return { kind: "WEEKLY" };
    if (book.frequencyKind === "MONTHLY") return { kind: "MONTHLY" };
    if (book.frequencyKind === "YEARLY") return { kind: "YEARLY" };
    return { kind: "DAILY" };
  }, [book.frequencyKind, book.everyNDays]);

  const daysSpan = useMemo(() => {
    if (!book.startDate || !book.endDate) return null;
    const [sy, sm, sd] = book.startDate.split("-").map((x) => parseInt(x, 10));
    const [ey, em, ed] = book.endDate.split("-").map((x) => parseInt(x, 10));
    if (!sy || !sm || !sd || !ey || !em || !ed) return null;
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  }, [book.endDate, book.startDate]);

  const isFrequencyAllowed = (kind: UiFrequency["kind"], span: number | null) => {
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
    ] as Array<{ value: UiFrequency["kind"]; label: string }>;
    return all.filter((o) => isFrequencyAllowed(o.value, daysSpan));
  }, [daysSpan]);

  useEffect(() => {
    if (!daysSpan || daysSpan <= 0) return;
    setBook((prev) => {
      let next = prev;
      if (!isFrequencyAllowed(prev.frequencyKind, daysSpan)) {
        next = { ...next, frequencyKind: "DAILY" };
      }
      const maxEveryN = Math.max(1, daysSpan);
      if (prev.everyNDays > maxEveryN) {
        next = { ...next, everyNDays: maxEveryN };
      }
      return next;
    });
  }, [daysSpan]);

  const totalUnitsNumber = useMemo(() => {
    const n = parseInt(book.totalUnits, 10);
    return Number.isFinite(n) ? n : 0;
  }, [book.totalUnits]);

  const maxEndDateAllowed = useMemo(() => {
    if (!book.startDate || !totalUnitsNumber) return "";
    return lastPossibleEndDateForOneUnitPerSession(
      book.startDate,
      totalUnitsNumber,
      book.frequencyKind,
      Math.max(1, Number(book.everyNDays) || 1)
    );
  }, [book.startDate, totalUnitsNumber, book.frequencyKind, book.everyNDays]);

  const frequencySummary = useMemo(() => {
    if (book.frequencyKind === "EVERY_N_DAYS") return `cada ${Math.max(1, Number(book.everyNDays) || 1)} días`;
    if (book.frequencyKind === "WEEKLY") return "cada semana";
    if (book.frequencyKind === "MONTHLY") return "cada mes";
    if (book.frequencyKind === "YEARLY") return "cada año";
    return "todos los días";
  }, [book.everyNDays, book.frequencyKind]);

  const formatLongDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
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
    if (!y || !m || !d) return iso;
    return `${d} de ${months[m - 1]} del ${y}`;
  };

  const validateForm = () => {
      const totalUnits = parseInt(book.totalUnits, 10);
      if (!book.title.trim()) throw new Error("El título es obligatorio.");
      if (!book.startDate) throw new Error("La fecha de inicio es obligatoria.");
      if (!book.endDate) throw new Error("La fecha meta es obligatoria.");
      if (book.endDate < book.startDate) {
        throw new Error("La fecha meta debe ser igual o posterior a la fecha de inicio.");
      }
      if (!Number.isFinite(totalUnits) || totalUnits <= 0) throw new Error(`El total de ${unitLabel} debe ser mayor a 0.`);
      if (book.advanceType === "OTHER" && !book.otherUnitLabel.trim()) {
        throw new Error("Escribe cómo se llama tu forma de avanzar (por ejemplo: lecciones).");
      }
    if (!isFrequencyAllowed(book.frequencyKind, daysSpan)) {
      if (book.frequencyKind === "WEEKLY") throw new Error("Para leer cada semana, el rango entre inicio y fin debe abarcar al menos 7 días.");
      if (book.frequencyKind === "MONTHLY") throw new Error("Para leer cada mes, el rango entre inicio y fin debe abarcar al menos 30 días.");
      if (book.frequencyKind === "YEARLY") throw new Error("Para leer cada año, el rango entre inicio y fin debe abarcar al menos 365 días.");
      throw new Error("La frecuencia elegida no es válida para el rango de fechas.");
    }
    if (book.frequencyKind === "EVERY_N_DAYS" && daysSpan && book.everyNDays > daysSpan) {
      throw new Error(`No puedes leer cada ${book.everyNDays} días si tu rango total es de ${daysSpan} días.`);
    }
    const alignedEndDate = alignedEndDateForFrequency(
      book.startDate,
      book.endDate,
      book.frequencyKind,
      Math.max(1, Number(book.everyNDays) || 1)
    );
    if (alignedEndDate !== book.endDate) {
      throw new Error("La fecha meta debe caer exactamente en un día de lectura según la frecuencia elegida.");
    }
    const sessions = sessionsCountForRange(
      book.startDate,
      book.endDate,
      book.frequencyKind,
      Math.max(1, Number(book.everyNDays) || 1)
    );
    if (sessions > totalUnits) {
      throw new Error(
        `Con ese rango y frecuencia tendrías ${sessions} sesiones, pero solo tienes ${totalUnits} ${unitLabel}. Reduce la fecha meta o aumenta el total para evitar sesiones en 0.`
      );
    }
    if (maxEndDateAllowed && book.endDate > maxEndDateAllowed) {
      throw new Error(`La fecha meta máxima para evitar sesiones en 0 es ${maxEndDateAllowed}.`);
    }
    return totalUnits;
  };

  const handleOpenConfirm = () => {
    setError(null);
    try {
      validateForm();
      setConfirmOpen(true);
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Revisa los datos del formulario.";
      setError(String(msg));
    }
  };

  const handleCreate = async () => {
    setError(null);
    setLoading(true);
    try {
      const totalUnits = validateForm();

      const payload = {
        title: book.title.trim(),
        author: book.author.trim(),
        unit_type: book.advanceType,
        custom_unit_label: book.advanceType === "OTHER" ? book.otherUnitLabel.trim() : "",
        total_units: totalUnits,
      };

      // Creamos (o actualizamos) el borrador en backend antes de elegir plan.
      let bookId = draftBookId;
      if (!bookId) {
        const created = await apiClient.post("books/", payload);
        bookId = Number(created.data?.id);
        if (!bookId) throw new Error("No se pudo crear el borrador del libro.");
        setDraftBookId(bookId);
      } else {
        await apiClient.patch(`books/${bookId}/`, payload);
      }

      // Ahora elegimos el plan en una pantalla dedicada.
      nav("/app/planes", {
        state: {
          bookId,
          draft: {
            title: book.title,
            author: book.author,
            totalUnits,
            startDate: book.startDate,
            endDate: book.endDate,
            frequencyKind: frequencyPayload.kind,
            everyNDays: frequencyPayload.kind === "EVERY_N_DAYS" ? frequencyPayload.everyN : book.everyNDays,
            advanceType: book.advanceType,
            otherUnitLabel: book.otherUnitLabel,
          },
        },
      });
      setConfirmOpen(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.message === "string" ? e.message : null) ||
        getAuthErrorMessage(e, "No se pudo continuar. Intenta de nuevo.");
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex items-center justify-center p-4 bg-blumi-soft-bg"
    >
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 md:p-10 cute-shadow border-4 border-blumi-light-pink">
        <header className="text-center mb-8">
          <div className="inline-block p-3 bg-blumi-light-pink rounded-full mb-4">
            <BookOpen className="h-10 w-10 text-blumi-pink" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Configurar nuevo libro</h1>
          <p className="text-blumi-purple font-medium">¡Vamos a planear tu lectura!</p>
        </header>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              Título del libro
              <HelpTip text="Escribe el nombre del libro para identificarlo en tu biblioteca." />
            </label>
            <input
              type="text"
              placeholder="Ej: El Principito"
              value={book.title}
              onChange={(e) => setBook({ ...book, title: e.target.value })}
              className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink focus:ring-0 transition-colors outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              Autor (opcional)
              <HelpTip text="Puedes dejarlo vacío si no conoces el autor." />
            </label>
            <input
              type="text"
              placeholder="Ej: Antoine de Saint‑Exupéry"
              value={book.author}
              onChange={(e) => setBook({ ...book, author: e.target.value })}
              className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink focus:ring-0 transition-colors outline-none"
            />
          </div>

          <div className="bg-blumi-light-pink/30 p-5 rounded-[2rem] border-2 border-dashed border-blumi-pink">
            <span className="block text-sm font-bold text-gray-700 mb-4 text-center">
              ¿Cómo quieres avanzar?
              <HelpTip text="Elige la unidad de progreso: páginas, capítulos u otra personalizada." />
            </span>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { key: "PAGES", label: "Páginas" },
                { key: "CHAPTERS", label: "Capítulos" },
                { key: "OTHER", label: "Otro" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setBook({ ...book, advanceType: t.key as UiAdvance })}
                  className={`px-6 py-2 rounded-full border-2 font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    book.advanceType === (t.key as UiAdvance)
                      ? "bg-blumi-pink text-white border-blumi-pink"
                      : "bg-white text-blumi-purple border-blumi-light-pink"
                  }`}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>

            {book.advanceType === "OTHER" ? (
              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
                  ¿Cómo se llama tu forma de avanzar?
                  <HelpTip text="Ejemplo: temas, lecciones, sesiones, ejercicios." />
                </label>
                <input
                  type="text"
                  value={book.otherUnitLabel}
                  onChange={(e) => setBook({ ...book, otherUnitLabel: e.target.value })}
                  placeholder="Ej: lecciones / sesiones / temas"
                  className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink focus:ring-0 transition-colors outline-none bg-white"
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              Total de {unitLabel}
              <HelpTip text="Cantidad total que tiene el libro (páginas, capítulos u otra unidad)." />
            </label>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="Ej: 120"
              value={book.totalUnits}
              onChange={(e) => setBook({ ...book, totalUnits: e.target.value })}
              onWheel={(e) => {
                // Evita que la rueda cambie el número (bug típico: 100 -> 99 por scroll)
                (e.currentTarget as HTMLInputElement).blur();
              }}
              className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink focus:ring-0 transition-colors text-gray-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                Fecha de inicio
                <HelpTip text="Día en que empiezas a leer. Desde aquí se calculan todas tus sesiones." />
              </label>
              <div className="relative">
                <input
                  ref={startRef}
                  type="date"
                  min={todayISO}
                  value={book.startDate}
                  onChange={(e) => setBook({ ...book, startDate: e.target.value })}
                  className="pink-date w-full px-5 pr-12 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink focus:ring-0 transition-colors text-gray-600 outline-none cursor-pointer"
                />
                <button
                  type="button"
                  aria-label="Elegir fecha de inicio"
                  onClick={() => {
                    const el = startRef.current;
                    if (!el) return;
                    // Chrome/Edge soportan showPicker()
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
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                Fecha meta
                <HelpTip text="Día en que finaliza tu lectura. Debe ser un día de lectura válido." />
              </label>
              <div className="relative">
                <input
                  ref={endRef}
                  type="date"
                  min={book.startDate || todayISO}
                  max={maxEndDateAllowed || undefined}
                  value={book.endDate}
                  onChange={(e) => setBook({ ...book, endDate: e.target.value })}
                  className="pink-date w-full px-5 pr-12 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink focus:ring-0 transition-colors text-gray-600 outline-none cursor-pointer"
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
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
              Frecuencia de lectura
              <HelpTip text="Define cada cuánto lees. La fecha meta se valida para que coincida con esta frecuencia." />
            </label>
            <PinkSelect
              value={book.frequencyKind as any}
              onChange={(v) => setBook({ ...book, frequencyKind: v as any })}
              options={frequencyOptions as any}
            />

            {book.frequencyKind === "EVERY_N_DAYS" ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="text-sm font-bold text-gray-700">Cada</div>
                <input
                  type="number"
                  min={1}
                  max={daysSpan && daysSpan > 0 ? daysSpan : undefined}
                  value={book.everyNDays}
                  onChange={(e) => {
                    const n = parseInt(e.target.value || "1", 10);
                    const maxN = daysSpan && daysSpan > 0 ? daysSpan : Number.MAX_SAFE_INTEGER;
                    setBook({ ...book, everyNDays: Math.min(Math.max(1, n), maxN) });
                  }}
                  className="w-24 px-4 py-2 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink outline-none text-center font-black text-blumi-dark-pink cursor-pointer"
                />
                <div className="text-sm font-bold text-gray-700">días</div>
                <HelpTip text="Número de días entre sesiones cuando eliges la frecuencia 'Cada N días'." />
              </div>
            ) : null}
            {daysSpan && daysSpan > 0 ? (
              <div className="mt-2 text-xs text-slate-500 font-semibold">
                Tu rango de lectura es de {daysSpan} día{daysSpan === 1 ? "" : "s"}.
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm ">
              {error}
            </div>
          ) : null}

          <div className="pt-4">
            <button
              onClick={handleOpenConfirm}
              disabled={loading}
              className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform transition-all hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
              type="button"
            >
              {loading ? "Creando..." : "Crear plan de lectura ✨"}
            </button>
          </div>

          <footer className="text-center">
            <button
              onClick={() => {
                // Si hay un borrador creado, lo eliminamos.
                const go = () => nav("/app/inicio");
                if (!draftBookId) return go();
                setLoading(true);
                apiClient
                  .delete(`books/${draftBookId}/`)
                  .catch(() => null)
                  .finally(() => {
                    setDraftBookId(null);
                    setLoading(false);
                    go();
                  });
              }}
              className="text-blumi-purple hover:text-blumi-pink text-sm font-medium transition-colors cursor-pointer"
              type="button"
            >
              Cancelar y volver
            </button>
          </footer>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">¿Confirmamos tu meta?</div>
              <div className="mt-3 text-slate-600 font-semibold">
                Tu meta es leer{" "}
                <span className="font-black text-slate-800">{totalUnitsNumber}</span> <span className="font-black text-slate-800">{unitLabel}</span>{" "}
                comenzando el <span className="font-black text-slate-800">{formatLongDate(book.startDate)}</span> y terminando el{" "}
                <span className="font-black text-slate-800">{formatLongDate(book.endDate)}</span>, leyendo{" "}
                <span className="font-black text-slate-800">{frequencySummary}</span>.
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm ">
                {error}
              </div>
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
                onClick={handleCreate}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Creando..." : "Sí, crear plan ✨"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adjustDateOpen && adjustedEndDate ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">Ajuste de fecha meta</div>
              <div className="mt-3 text-slate-600 font-semibold">
                Con la frecuencia <span className="font-black text-slate-800">{frequencySummary}</span>, tu última sesión dentro del rango cae el{" "}
                <span className="font-black text-slate-800">{formatLongDate(adjustedEndDate)}</span>.
              </div>
              <div className="mt-2 text-slate-600 font-semibold">
                Si aceptas, la fecha meta cambiará de{" "}
                <span className="font-black text-slate-800">{formatLongDate(book.endDate)}</span> a{" "}
                <span className="font-black text-slate-800">{formatLongDate(adjustedEndDate)}</span>.
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAdjustDateOpen(false);
                  setAdjustedEndDate(null);
                }}
                className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink font-bold text-blumi-purple hover:text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setBook((prev) => ({ ...prev, endDate: adjustedEndDate }));
                  setAdjustDateOpen(false);
                  setAdjustedEndDate(null);
                  setConfirmOpen(true);
                }}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer"
                disabled={loading}
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

