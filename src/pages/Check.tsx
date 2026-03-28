import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { BlumiHeader } from "../app/BlumiHeader";
import { getBookLogs, getCheckInfo, upsertBookLog } from "../api/services/library";
import { PinkLoader } from "../app/PinkLoader";
import apiClient from "../api/axiosClient";
import crownPink from "../assets/corona.png";

function formatISODate(d: Date) {
  // Usamos fecha local para que "hoy" coincida con la percepción del usuario.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseISODate(s: string) {
  // Assumes YYYY-MM-DD and returns local midnight date.
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

function isScheduled(plan: any, dayISO: string) {
  const start = parseISODate(plan.start_date);
  const day = parseISODate(dayISO);
  const deltaDays = Math.floor((day.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (dayISO < plan.start_date || dayISO > plan.target_end_date) return false;

  if (plan.frequency_type === "DAILY") return true;
  if (plan.frequency_type === "EVERY_N_DAYS") {
    const step = plan.every_n_days || 1;
    return deltaDays % step === 0;
  }
  if (plan.frequency_type === "WEEKLY") {
    return deltaDays % 7 === 0;
  }
  if (plan.frequency_type === "MONTHLY") {
    // Sesiones mensuales alineadas al día de inicio.
    const startIsLast = start.getDate() === lastDayOfMonth(start);
    const dayIsLast = day.getDate() === lastDayOfMonth(day);
    if (startIsLast) return dayIsLast;
    return day.getDate() === start.getDate();
  }
  if (plan.frequency_type === "YEARLY") {
    return day.getMonth() === start.getMonth() && day.getDate() === start.getDate();
  }
  return false;
}

function lastDayOfMonth(d: Date) {
  if (d.getMonth() === 11) return new Date(d.getFullYear() + 1, 0, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function ProgressChart({ dates, values }: { dates: string[]; values: number[] }) {
  const width = 720;
  const height = 220;
  const padding = 20;

  const maxVal = Math.max(1, ...values);
  const xStep = dates.length <= 1 ? 1 : (width - padding * 2) / (dates.length - 1);

  const points = values
    .map((v, i) => {
      const x = padding + i * xStep;
      const y = padding + (1 - v / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full bg-white/60 border border-white rounded-[24px] p-6 soft-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-black text-slate-700">Tu progreso</div>
          <div className="text-xs text-slate-500">Lecturas por día (últimos días)</div>
        </div>
        <div className="text-xs font-bold text-blumi-pink">Páginas</div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" preserveAspectRatio="none">
        <defs>
          <linearGradient id="blumiGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#F06292" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FF85A1" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
          const y = padding + t * (height - padding * 2);
          return <line key={idx} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#F06292" strokeOpacity="0.12" strokeWidth="1" />;
        })}

        <polyline points={points} fill="none" stroke="url(#blumiGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {values.map((v, i) => {
          const x = padding + i * xStep;
          const y = padding + (1 - v / maxVal) * (height - padding * 2);
          return <circle key={i} cx={x} cy={y} r={6} fill="#fff" stroke="#F06292" strokeWidth="4" opacity={v === 0 ? 0.45 : 1} />;
        })}
      </svg>

      <div className="mt-3 flex justify-between text-[11px] text-slate-400 font-semibold px-2">
        <span>{dates[0]}</span>
        <span>{dates[dates.length - 1]}</span>
      </div>
    </div>
  );
}

function frequencyLabel(plan: any) {
  if (!plan) return "";
  if (plan.frequency_type === "DAILY") return "todos los días";
  if (plan.frequency_type === "EVERY_N_DAYS") return `cada ${Math.max(1, Number(plan.every_n_days) || 1)} días`;
  if (plan.frequency_type === "WEEKLY") return "cada semana";
  if (plan.frequency_type === "MONTHLY") return "cada mes";
  if (plan.frequency_type === "YEARLY") return "cada año";
  return String(plan.frequency_type);
}

function unitLabelFromBook(book: any) {
  if (!book) return "unidades";
  if (book.unit_type === "PAGES") return "páginas";
  if (book.unit_type === "CHAPTERS") return "capítulos";
  const other = (book.custom_unit_label || "").toString().trim().toLowerCase();
  return other || "unidades";
}

function unitForCount(unitLabel: string, count: number) {
  if (count !== 1) return unitLabel;
  const lower = unitLabel.toLowerCase();
  if (lower.endsWith("es")) return unitLabel.slice(0, -2);
  if (lower.endsWith("s")) return unitLabel.slice(0, -1);
  return unitLabel;
}

function monthNameES(monthIndex: number) {
  const names = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return names[monthIndex] || "";
}

// Nota: mantenemos `monthNameES` y `formatISODate` para fechas cortas en UI.

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function CrownPinkMark({ active }: { active: boolean }) {
  if (!active) return null;
  // Corona rosa para el día meta cuando ya se hizo check.
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <img
        src={crownPink}
        alt=""
        aria-hidden="true"
        className="h-7 w-7 object-contain drop-shadow-[0_0_10px_rgba(240,98,146,0.95)] saturate-125"
      />
    </div>
  );
}

function FlowerMark({ active }: { active: boolean }) {
  if (!active) return null;
  // SVG simple tipo flor rosada (para verse bien encima del día).
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none ">
      <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M32 12c3.5 0 6.2 2.8 6.2 6.2 0 1.2-.3 2.3-.8 3.2 4.1-2.2 8.8.5 10 5 1.2 4.5-1.6 8.7-6.2 9.1 2.4 3.6.6 8.5-3.4 10.1-4 1.6-8.3-.2-10-4.2-1.7 3.9-6 5.8-10 4.2-4-1.6-5.8-6.5-3.4-10.1-4.6-.4-7.4-4.6-6.2-9.1 1.2-4.5 5.9-7.2 10-5-.5-.9-.8-2-.8-3.2C25.8 14.8 28.5 12 32 12Z"
          fill="#FF85A1"
          opacity="0.9"
        />
        <path
          d="M32 23c5.0 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9Z"
          fill="#F06292"
        />
      </svg>
    </div>
  );
}

function PlannedFlower() {
  // Flor rosada "filtro" para indicar días planificados (no necesariamente leídos todavía).
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
      <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M32 12c3.5 0 6.2 2.8 6.2 6.2 0 1.2-.3 2.3-.8 3.2 4.1-2.2 8.8.5 10 5 1.2 4.5-1.6 8.7-6.2 9.1 2.4 3.6.6 8.5-3.4 10.1-4 1.6-8.3-.2-10-4.2-1.7 3.9-6 5.8-10 4.2-4-1.6-5.8-6.5-3.4-10.1-4.6-.4-7.4-4.6-6.2-9.1 1.2-4.5 5.9-7.2 10-5-.5-.9-.8-2-.8-3.2C25.8 14.8 28.5 12 32 12Z"
          fill="#FF85A1"
          opacity="0.9"
        />
        <path d="M32 23c5.0 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9Z" fill="#F06292" />
      </svg>
    </div>
  );
}

function PlannedCrown() {
  // Corona pálida para indicar día meta planificado aún sin check.
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-45">
      <img
        src={crownPink}
        alt=""
        aria-hidden="true"
        className="h-6 w-6 object-contain"
      />
    </div>
  );
}

function PinkProgressCalendar({
  plan,
  logs,
  onToggleDay,
  todayISO,
  isMutating,
  unitLabel,
  plannedUnitsByISO,
}: {
  plan: any;
  logs: Record<string, number>;
  onToggleDay: (dayISO: string) => void;
  todayISO: string;
  isMutating: boolean;
  unitLabel: string;
  plannedUnitsByISO: Record<string, number>;
}) {
  const start = parseISODate(plan.start_date);
  const end = parseISODate(plan.target_end_date);

  const minMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const maxMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(start.getFullYear(), start.getMonth(), 1));

  useEffect(() => {
    // Si el plan cambia (raro), reubicamos el calendario al inicio del rango.
    setViewMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, plan?.start_date, plan?.target_end_date]);

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  // Layout fijo (42 celdas), así que no dependemos del número de días del mes.

  // Ajuste: 0 = domingo. Queremos calendario tipo domingo-lunes.
  const firstWeekday = firstOfMonth.getDay();

  const minDayISO = plan.start_date;
  const maxDayISO = plan.target_end_date;

  const viewMonthLabel = `${monthNameES(viewMonth.getMonth())} ${viewMonth.getFullYear()}`;

  const canPrev = viewMonth > minMonth;
  const canNext = viewMonth < maxMonth;

  // Mostramos hasta 6 filas (42 celdas) para evitar que el layout cambie.
  const totalCells = 42;
  const cells: Array<{ date: Date; iso: string; inMonth: boolean }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstWeekday;
    const d = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 + dayOffset);
    const iso = formatISODate(d);
    const inMonth = d.getMonth() === viewMonth.getMonth();
    cells.push({ date: d, iso, inMonth });
  }

  const isInRange = (iso: string) => iso >= minDayISO && iso <= maxDayISO;

  return (
    <div className="mt-8 bg-white/60 border border-white rounded-[28px] soft-shadow p-6">
      {isMutating ? (
        <div className="mb-4 rounded-2xl bg-white/80 border border-blumi-light-pink px-4 py-3 text-slate-700 font-semibold text-sm">
          Guardando tu check…
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="text-slate-600 font-black text-lg">Calendario rosa</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => canPrev && setViewMonth((prev) => addMonths(prev, -1))}
            disabled={!canPrev}
            className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
              canPrev ? "bg-white border-blumi-accent/60 hover:bg-blumi-soft-bg" : "bg-white border-slate-200 cursor-not-allowed opacity-60"
            }`}
            aria-label="Mes anterior"
          >
            ←
          </button>
          <div className="px-2 text-center text-sm font-bold text-slate-800">{viewMonthLabel}</div>
          <button
            type="button"
            onClick={() => canNext && setViewMonth((prev) => addMonths(prev, 1))}
            disabled={!canNext}
            className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
              canNext ? "bg-white border-blumi-accent/60 hover:bg-blumi-soft-bg" : "bg-white border-slate-200 cursor-not-allowed opacity-60"
            }`}
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-3 text-center text-[11px] font-black text-slate-400">
        {["D", "L", "M", "X", "J", "V", "S"].map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map(({ date, iso, inMonth }) => {
          const scheduled = isScheduled(plan, iso);
          const active = (logs[iso] || 0) > 0;
          const inRange = isInRange(iso);
          const planned = scheduled && inRange;
          const isMetaDay = iso === maxDayISO;
          const isTodayDay = iso === todayISO;
          const canCheck = planned && iso <= todayISO;
          const disabled = !canCheck || isMutating;
          const dayNum = date.getDate();
          const unitsPlanned = plannedUnitsByISO[iso] ?? 0;
          const unitsActual = logs[iso] || 0;
          const unitsToShow = iso <= todayISO ? unitsActual : unitsPlanned;
          const isPastPending = planned && !active && iso < todayISO;

          const infoText = active
            ? `✓ ${unitsToShow} ${unitForCount(unitLabel, unitsToShow)}`
            : canCheck
              ? `+${unitsPlanned} ${unitForCount(unitLabel, unitsPlanned)}`
              : `${unitsToShow} ${unitForCount(unitLabel, unitsToShow)}`;

          const infoClass = active ? "text-blumi-dark-pink" : canCheck ? "text-blumi-pink" : "text-slate-500";

          return (
            <button
              key={`${iso}-${inMonth ? "m" : "o"}`}
              type="button"
              onClick={() => onToggleDay(iso)}
              disabled={disabled}
              className={`relative h-12 rounded-[16px] border transition-all ${
                isMetaDay
                  ? active
                    ? "bg-yellow-100/70 border-yellow-500 ring-2 ring-yellow-300/40 shadow-[0_0_18px_rgba(234,179,8,0.35)]"
                    : planned
                      ? "bg-yellow-100/60 border-yellow-400 ring-2 ring-yellow-300/35"
                      : "bg-white border-slate-200 opacity-50 cursor-not-allowed"
                  : active
                    ? "bg-blumi-pink/15 border-blumi-pink cursor-pointer hover:bg-blumi-pink/20"
                    : planned
                      ? canCheck
                        ? isPastPending
                          ? "bg-violet-100 border-violet-500 hover:bg-violet-100/80 cursor-pointer animate-pulse ring-2 ring-violet-300/60 shadow-[0_0_16px_rgba(139,92,246,0.35)]"
                          : "bg-white border-blumi-accent/60 hover:bg-blumi-soft-bg cursor-pointer"
                        : "bg-blumi-pink/5 border-blumi-pink/30 cursor-not-allowed"
                      : "bg-white border-slate-200 opacity-50 cursor-not-allowed"
              } ${isTodayDay && !isMetaDay ? "ring-2 ring-blumi-pink/80 shadow-[0_0_18px_rgba(240,98,146,0.45)]" : ""}`}
            >
              <div className={`absolute top-2 left-2 text-xs font-black ${active ? "text-blumi-dark-pink" : "text-slate-700"}`}>
                {dayNum}
              </div>
              {isMetaDay && active ? <CrownPinkMark active={active} /> : <FlowerMark active={active} />}
              {!active && planned && iso > todayISO && unitsToShow > 0 ? (isMetaDay ? <PlannedCrown /> : <PlannedFlower />) : null}
              {planned && (iso <= todayISO || unitsToShow > 0) ? (
                <div className={`absolute bottom-1 left-1 right-1 z-10 text-[10px] font-bold text-center ${infoClass}`}>
                  {infoText}
                </div>
              ) : null}
              {isMetaDay && !isTodayDay ? (
                <div className="absolute top-1 right-2 text-[9px] font-black text-yellow-800 bg-yellow-100/90 border border-yellow-400 rounded-full px-2 py-0.5">
                  Meta
                </div>
              ) : null}
              {isTodayDay ? (
                <div className="absolute top-1 right-2 text-[9px] font-black text-blumi-dark-pink bg-blumi-pink/20 border border-blumi-pink/70 rounded-full px-2 py-0.5">
                  Hoy
                </div>
              ) : null}
              {isPastPending ? (
                <div className="absolute top-1 right-2 text-[9px] font-black text-violet-700 bg-violet-100/90 border border-violet-400 rounded-full px-2 py-0.5">
                  Pendiente
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-slate-500 font-semibold">
        Flor rosada = día marcado como leído (según tu frecuencia).
      </div>
    </div>
  );
}

export default function Check() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const id = Number(bookId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [plan, setPlan] = useState<any | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<Record<string, number>>({});
  const [plannedUnitsByISOFromServer, setPlannedUnitsByISOFromServer] = useState<Record<string, number>>({});
  const [totalUnits, setTotalUnits] = useState<number>(0);
  const [isMutating, setIsMutating] = useState(false);
  const [unitLabel, setUnitLabel] = useState<string>("unidades");
  const mutatingRef = useRef(false);
  const [plansHistory, setPlansHistory] = useState<any[]>([]);

  const [todayModalOpen, setTodayModalOpen] = useState(false);
  // Usamos string para permitir borrar el valor completo (sin forzar 0).
  const [todayUnitsInput, setTodayUnitsInput] = useState<string>("");
  const [todayModalError, setTodayModalError] = useState<string | null>(null);

  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaMessage, setMetaMessage] = useState<string>("");
  const [metaTitle, setMetaTitle] = useState<string>("Fecha meta");
  const [metaPlaneadoLine, setMetaPlaneadoLine] = useState<string>("");
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [uncheckConfirmOpen, setUncheckConfirmOpen] = useState(false);
  const [pendingUncheckISO, setPendingUncheckISO] = useState<string | null>(null);

  const todayISO = useMemo(() => formatISODate(new Date()), []);

  const loadPlansHistory = async () => {
    if (!id) return;
    try {
      const res = await apiClient.get("plans/", { params: { book: id } });
      setPlansHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      // No bloqueamos la pantalla principal si falla el historial.
    }
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const check = await getCheckInfo(id);
      setPlan(check.plan);
      setBookTitle(check.book.title);
      setProgressPercent(check.progress_percent);
      setTotalUnits(check.book.total_units || 0);
      setUnitLabel(unitLabelFromBook(check.book));

      // Fuente de verdad para lo "planeado" por fecha (unidades planificadas) en el calendario.
      const plannedMap: Record<string, number> = {};
      (check.planned_days || []).forEach((pd: any) => {
        plannedMap[pd.date] = pd.units_planned;
      });
      setPlannedUnitsByISOFromServer(plannedMap);

      const startISO = check.plan.start_date;
      // Para que el estado visual coincida con el cálculo determinista del backend,
      // cargamos logs hasta la `target_end_date` (no solo hasta hoy).
      const endISO = check.plan.target_end_date;
      const res = await getBookLogs(id, startISO, endISO);
      const map: Record<string, number> = {};
      res.logs.forEach((l) => {
        // Regla del nuevo sistema: los logs inválidos (no pertenecen a reading_days) deben ignorarse.
        if (isScheduled(check.plan, l.date)) {
          map[l.date] = l.units_read;
        }
      });
      setLogs(map);

      void loadPlansHistory();
    } catch (e: any) {
      setError("No se pudo cargar el check. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const refreshPlanStateOnly = async () => {
    if (!id) return;
    try {
      const check = await getCheckInfo(id);
      setPlan(check.plan);
      setProgressPercent(check.progress_percent);
      setTotalUnits(check.book.total_units || 0);
      setUnitLabel(unitLabelFromBook(check.book));

      const plannedMap: Record<string, number> = {};
      (check.planned_days || []).forEach((pd: any) => {
        plannedMap[pd.date] = pd.units_planned;
      });
      setPlannedUnitsByISOFromServer(plannedMap);
      void loadPlansHistory();
    } catch {
      // Si falla este refresh parcial, no bloqueamos ni mostramos loader global.
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const lastDays = useMemo(() => {
    if (!plan) return [] as string[];
    const today = parseISODate(todayISO);
    const days: string[] = [];
    for (let i = 0; i <= 13; i++) {
      const d = new Date(today.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
      const iso = formatISODate(d);
      if (iso < plan.start_date) continue;
      if (iso > plan.target_end_date) break;
      days.push(iso);
    }
    return days;
  }, [plan, todayISO]);

  const plannedUnitsByISO = useMemo(() => {
    // Fuente de verdad del calendario: el backend (planned_days) ya viene calculado dinámicamente.
    return plannedUnitsByISOFromServer || {};
  }, [plannedUnitsByISOFromServer]);

  const openTodayModal = () => {
    if (!plan) return;
    if (mutatingRef.current) return;
    const scheduled = isScheduled(plan, todayISO);
    if (!scheduled) return;
    setTodayModalError(null);

    const current = logs[todayISO] || 0;
    const suggestedToday = plannedUnitsByISO[todayISO] ?? 0;
    const initial = current > 0 ? String(current) : suggestedToday > 0 ? String(suggestedToday) : "";
    setTodayUnitsInput(initial);
    setTodayModalOpen(true);
  };

  const handleSaveTodayUnits = async () => {
    if (!plan) return;
    if (mutatingRef.current) return;

    setTodayModalError(null);
    setError(null);

    const scheduled = isScheduled(plan, todayISO);
    if (!scheduled) {
      setTodayModalError("Hoy no es un día de lectura según tu plan.");
      return;
    }

    const unitsRead = Math.floor(Number(todayUnitsInput || "0"));
    if (!Number.isFinite(unitsRead) || unitsRead < 0) {
      setTodayModalError("Escribe un número válido (0 o más).");
      return;
    }

    // El backend limita a total_units.
    if (totalUnits > 0 && unitsRead > totalUnits) {
      setTodayModalError(`No puedes leer más de ${totalUnits}.`);
      return;
    }

    // Debe coincidir con el cálculo del backend para esta sesión.
    const plannedTodayBefore = plannedUnitsByISO[todayISO] ?? 0;

    try {
      mutatingRef.current = true;
      setIsMutating(true);
      await upsertBookLog(id, todayISO, unitsRead);

      const nextLogs = { ...logs, [todayISO]: unitsRead };
      setLogs(nextLogs);

      const sumRead = Object.values(nextLogs).reduce((a, b) => a + (b || 0), 0);
      const nextProgress = totalUnits <= 0 ? 0 : Math.round(Math.min(100, (sumRead / totalUnits) * 100));
      setProgressPercent(nextProgress);
      if (nextProgress >= 100) {
        setTodayModalOpen(false);
        setMetaModalOpen(false);
        setCompletionMessage("¡Terminaste este libro! Tu esfuerzo de hoy cerró tu meta.");
        setCompletionModalOpen(true);
        return;
      }

      const planeadoLine = `Planeado: ${plannedTodayBefore}, leíste: ${unitsRead}.`;

      setMetaPlaneadoLine(planeadoLine);
      if (unitsRead > plannedTodayBefore) {
        setMetaTitle("Felicitaciones");
        setMetaMessage(
          "Como leíste más que lo planeado, los siguientes días se ajustaron automáticamente para mantener tu objetivo."
        );
      } else if (unitsRead < plannedTodayBefore) {
        setMetaTitle("Cuidado");
        setMetaMessage("Como leíste menos que lo planeado, lo que no leíste se acumula para los siguientes días.");
      } else {
        setMetaTitle("Felicitaciones");
        setMetaMessage("Leíste como estaba planeado; tu plan sigue igual para el resto del tiempo.");
      }

      setTodayModalOpen(false);
      setMetaModalOpen(true);
    } catch (e: any) {
      setTodayModalError(e?.response?.data?.detail || "No se pudo guardar la lectura de hoy.");
    } finally {
      mutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleToggleDay = async (dayISO: string) => {
    if (!plan) return;
    if (mutatingRef.current) return;
    if (!isScheduled(plan, dayISO)) return;

    const current = logs[dayISO] || 0;
    if (current > 0) {
      // Desmarcar requiere confirmación para evitar errores.
      setPendingUncheckISO(dayISO);
      setUncheckConfirmOpen(true);
      return;
    }

    // En el nuevo sistema, al marcar una sesión como leída en el calendario,
    // usamos las unidades "planeadas" para esa fecha (calculadas dinámicamente en el backend).
    const nextUnits = plannedUnitsByISOFromServer[dayISO] ?? plannedUnitsByISO[dayISO] ?? 0;
    try {
      setError(null);
      mutatingRef.current = true;
      setIsMutating(true);
      await upsertBookLog(id, dayISO, nextUnits);

      const nextLogs = { ...logs, [dayISO]: nextUnits };
      setLogs(nextLogs);
      const sumRead = Object.values(nextLogs).reduce((a, b) => a + (b || 0), 0);
      const nextProgress = totalUnits <= 0 ? 0 : Math.round(Math.min(100, (sumRead / totalUnits) * 100));
      setProgressPercent(nextProgress);
      if (nextProgress >= 100) {
        setCompletionMessage("¡Terminaste este libro! Ya pasó a tus lecturas completadas.");
        setCompletionModalOpen(true);
        return;
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "No se pudo guardar el día.");
    } finally {
      mutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const scheduledToday = plan ? isScheduled(plan, todayISO) : false;
  const todayUnits = logs[todayISO] || 0;

  const nextSessionISO = useMemo(() => {
    if (!plan) return null;
    if (!scheduledToday) return null;
    if (todayUnits <= 0) return todayISO;

    const start = parseISODate(todayISO);
    const msPerDay = 1000 * 60 * 60 * 24;
    for (let i = 1; i < 400; i++) {
      const dt = new Date(start.getTime() + i * msPerDay);
      const iso = formatISODate(dt);
      if (iso > plan.target_end_date) break;
      if (isScheduled(plan, iso)) return iso;
    }
    return null;
  }, [plan, scheduledToday, todayISO, todayUnits]);

  const nextSessionUnits = useMemo(() => {
    if (!nextSessionISO) return 0;
    return plannedUnitsByISO[nextSessionISO] ?? 0;
  }, [nextSessionISO, plannedUnitsByISO]);

  const nextSessionLabel = useMemo(() => {
    if (!nextSessionISO) return "PÁGINAS POR SESIÓN";
    if (nextSessionISO === todayISO) return "PÁGINAS EN LA SESIÓN DE HOY";
    const start = parseISODate(todayISO);
    const end = parseISODate(nextSessionISO);
    const deltaDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    if (deltaDays === 1) return "PÁGINAS EN LA SESIÓN DE MAÑANA";
    if (deltaDays === 7) return "PÁGINAS EN LA SESIÓN EN UNA SEMANA";
    if (deltaDays % 7 === 0) return `PÁGINAS EN LA SESIÓN EN ${deltaDays / 7} SEMANAS`;
    return `PÁGINAS EN LA SESIÓN EN ${deltaDays} DÍAS`;
  }, [nextSessionISO, todayISO]);

  const totalReadSoFar = useMemo(() => {
    return Object.values(logs).reduce((acc, v) => acc + (v || 0), 0);
  }, [logs]);

  const totalRemaining = useMemo(() => {
    return Math.max(0, totalUnits - totalReadSoFar);
  }, [totalUnits, totalReadSoFar]);

  const totalPlannedInPlan = useMemo(() => {
    const sum = Object.values(plannedUnitsByISO || {}).reduce((acc, v) => acc + (v || 0), 0);
    return sum > 0 ? sum : totalUnits;
  }, [plannedUnitsByISO, totalUnits]);

  if (loading || !plan) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        <div className="max-w-5xl mx-auto px-6 pt-14">
          <div className="bg-white/70 border border-white rounded-[24px] p-10 soft-shadow">
            <PinkLoader title="Cargando tu check..." subtitle="Estamos preparando tu lectura de hoy." />
          </div>
        </div>
      </div>
    );
  }

  const datesForChart = lastDays;
  const valuesForChart = lastDays.map((d) => logs[d] || 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-blumi-soft-bg">
      <BlumiHeader />

      <main className="max-w-5xl mx-auto px-6 pt-10 pb-16 space-y-8">
        <div className="bg-white/60 border border-white rounded-[28px] soft-shadow p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <button
                type="button"
                onClick={() => navigate("/app/biblioteca")}
                className="text-blumi-pink font-bold hover:text-blumi-dark-pink text-sm cursor-pointer"
              >
                ← Volver a Biblioteca
              </button>
              <h1 className="mt-3 text-3xl font-black text-slate-800">{bookTitle}</h1>
              <p className="mt-2 text-slate-500 font-semibold">
                Progreso: <span className="text-blumi-pink">{progressPercent}%</span>
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-black tracking-widest text-slate-400">{nextSessionLabel}</div>
              <div className="text-3xl font-black text-blumi-pink">{nextSessionUnits}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-stretch">
            <button
              type="button"
              onClick={openTodayModal}
              disabled={!scheduledToday || isMutating || todayUnits > 0}
              className={`flex-1 rounded-[22px] py-5 px-6 font-black text-lg shadow-lg transition-all ${
                scheduledToday && !isMutating && todayUnits <= 0
                  ? "bg-blumi-pink text-white hover:bg-blumi-dark-pink cursor-pointer"
                  : "bg-white text-slate-400 border border-blumi-accent/70 cursor-not-allowed"
              }`}
            >
              {scheduledToday
                ? todayUnits > 0
                  ? `¡Felicitaciones! Ya leíste hoy`
                  : `Registrar lectura de hoy`
                : "Hoy no es un día de lectura según tu plan"}
            </button>

            <div className="flex items-center justify-center w-full sm:w-60 rounded-[22px] bg-blumi-soft-bg border border-blumi-accent/60 p-4">
              <div className="text-center">
                <div className="text-xs font-bold text-slate-500">Tu rango</div>
                <div className="text-sm font-semibold text-slate-700 mt-1">
                  {plan.start_date} → {plan.target_end_date}
                </div>
                <div className="text-xs font-bold text-slate-400 mt-1">Frecuencia: {frequencyLabel(plan)}</div>
                {plansHistory.length ? (
                  <div className="mt-3 text-left">
                    <div className="text-[11px] font-black text-slate-400">Historial de planes</div>
                    <div className="mt-2 space-y-1">
                      {plansHistory.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className={`text-[12px] font-semibold ${
                            p.is_active ? "text-blumi-pink" : "text-slate-600"
                          }`}
                        >
                          {p.start_date} → {p.target_end_date}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm">
              {error}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white border border-blumi-accent/40 p-3">
              <div className="text-[11px] font-black tracking-wide text-slate-400">TOTAL A LEER</div>
              <div className="mt-1 text-lg font-black text-slate-800">
                {totalPlannedInPlan} {unitForCount(unitLabel, totalPlannedInPlan)}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-blumi-accent/40 p-3">
              <div className="text-[11px] font-black tracking-wide text-slate-400">TOTAL LEÍDO</div>
              <div className="mt-1 text-lg font-black text-blumi-pink">
                {totalReadSoFar} {unitForCount(unitLabel, totalReadSoFar)}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-blumi-accent/40 p-3">
              <div className="text-[11px] font-black tracking-wide text-slate-400">TOTAL FALTANTE</div>
              <div className="mt-1 text-lg font-black text-slate-800">
                {totalRemaining} {unitForCount(unitLabel, totalRemaining)}
              </div>
            </div>
          </div>
        </div>

        <PinkProgressCalendar
          plan={plan}
          logs={logs}
          onToggleDay={handleToggleDay}
          todayISO={todayISO}
          isMutating={isMutating}
          unitLabel={unitLabel}
          plannedUnitsByISO={plannedUnitsByISO}
        />

        <ProgressChart dates={datesForChart} values={valuesForChart} />
      </main>

      {todayModalOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">Lectura de hoy</div>
              <div className="mt-2 text-slate-600 font-semibold text-sm">
                Escribe cuántas <span className="font-black text-slate-800">{unitLabel}</span> leíste hoy.
                <div className="mt-1 text-xs text-slate-500 font-semibold">0 = No leíste hoy</div>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-bold text-gray-700 mb-2">Hoy: {todayISO}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={todayUnitsInput}
                disabled={isMutating}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D+/g, "");
                  // Evitar números fuera de rango si hay totalUnits
                  if (totalUnits > 0 && digitsOnly) {
                    const n = Math.min(parseInt(digitsOnly, 10) || 0, totalUnits);
                    setTodayUnitsInput(String(n));
                  } else {
                    setTodayUnitsInput(digitsOnly);
                  }
                }}
                className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink outline-none text-center font-black text-blumi-dark-pink"
              />
              {todayModalError ? (
                <div className="mt-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 font-semibold text-sm">
                  {todayModalError}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setTodayModalOpen(false)}
                disabled={isMutating}
                className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink font-bold text-blumi-purple hover:text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTodayUnits}
                disabled={isMutating}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isMutating ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {metaModalOpen ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">{metaTitle}</div>
              <div className="mt-3 text-slate-600 font-semibold text-sm">{metaMessage}</div>
              {metaPlaneadoLine ? (
                <div className="mt-2 text-slate-600 font-semibold text-sm">{metaPlaneadoLine}</div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    mutatingRef.current = true;
                    setIsMutating(true);
                    await refreshPlanStateOnly();
                    setMetaModalOpen(false);
                  } catch (e: any) {
                    setError(e?.response?.data?.detail || "No se pudo actualizar el plan.");
                  } finally {
                    mutatingRef.current = false;
                    setIsMutating(false);
                  }
                }}
                disabled={isMutating}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isMutating ? "Procesando…" : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {uncheckConfirmOpen && pendingUncheckISO ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-black text-blumi-dark-pink">¿Desmarcar este día?</div>
              <div className="mt-3 text-slate-600 font-semibold text-sm">
                Si lo desmarcas, ese día volverá a quedar como si no hubieras leído, y el plan se ajustará como estaba antes.
              </div>
              <div className="mt-2 text-slate-600 font-semibold text-sm">
                Día: <span className="font-black text-slate-800">{pendingUncheckISO}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setUncheckConfirmOpen(false);
                  setPendingUncheckISO(null);
                }}
                disabled={isMutating}
                className="w-full px-5 py-3 rounded-2xl border-2 border-blumi-light-pink font-bold text-blumi-purple hover:text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!pendingUncheckISO) return;
                  if (pendingUncheckISO !== todayISO) {
                    setError("Solo puedes desmarcar el check de hoy.");
                    setUncheckConfirmOpen(false);
                    setPendingUncheckISO(null);
                    return;
                  }
                  try {
                    mutatingRef.current = true;
                    setIsMutating(true);
                    await upsertBookLog(id, pendingUncheckISO, 0);
                    const nextLogs = { ...logs, [pendingUncheckISO]: 0 };
                    setLogs(nextLogs);
                    const sumRead = Object.values(nextLogs).reduce((a, b) => a + (b || 0), 0);
                    const nextProgress = totalUnits <= 0 ? 0 : Math.round(Math.min(100, (sumRead / totalUnits) * 100));
                    setProgressPercent(nextProgress);

                    await refreshPlanStateOnly();
                  } catch (e: any) {
                    setError(e?.response?.data?.detail || "No se pudo desmarcar el día.");
                  } finally {
                    mutatingRef.current = false;
                    setIsMutating(false);
                    setUncheckConfirmOpen(false);
                    setPendingUncheckISO(null);
                  }
                }}
                disabled={isMutating}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Sí, desmarcar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {completionModalOpen ? (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/35">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md rounded-[28px] bg-white border-2 border-blumi-light-pink soft-shadow p-6 overflow-hidden"
          >
            <motion.div
              className="absolute -top-14 -left-14 w-40 h-40 rounded-full bg-blumi-light-pink/50"
              animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-16 -right-12 w-44 h-44 rounded-full bg-blumi-accent/45"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.25 }}
            />
            <div className="relative text-center">
              <motion.img
                src={crownPink}
                alt="Corona de logro"
                className="mx-auto h-20 w-20 object-contain drop-shadow-[0_0_14px_rgba(240,98,146,0.7)]"
                animate={{ y: [0, -5, 0], rotate: [0, -2, 2, 0] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
              <div className="mt-3 text-2xl font-black text-blumi-dark-pink">¡Libro completado!</div>
              <div className="mt-2 text-sm font-semibold text-slate-600">{completionMessage}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">
                Lo encontrarás en la sección de completados en tu Biblioteca.
              </div>
            </div>
            <div className="relative mt-6">
              <button
                type="button"
                onClick={() => {
                  setCompletionModalOpen(false);
                  navigate("/app/inicio", { replace: true });
                }}
                className="w-full bg-blumi-pink hover:bg-blumi-dark-pink text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors cursor-pointer"
              >
                Ver mi lectura
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
}

