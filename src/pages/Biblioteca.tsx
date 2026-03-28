import { useEffect, useMemo, useState } from "react";
import { BookOpen, Flower2, Filter, Library, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BlumiHeader } from "../app/BlumiHeader";
import { getCachedInProgressBooks, getInProgressBooks, deleteBook, type InProgressBook } from "../api/services/library";
import apiClient from "../api/axiosClient";
import { useAuth } from "../app/authContext";
import { PinkLoader } from "../app/PinkLoader";

function EmptyShelf({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 relative">
      {/* Decoraciones suaves (parecidas a la referencia) */}
      <div className="hidden md:block absolute left-12 top-10 w-28 h-28 bg-blumi-light-pink/30 rounded-full blur-[2px]" />
      <div className="hidden md:block absolute -left-2 bottom-10 w-24 h-24 bg-blumi-light-pink/30 rounded-full blur-[2px]" />
      <div className="hidden md:block absolute right-6 top-24">
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M32 55s-22-13-22-28c0-8 6-14 14-14 4 0 7 2 8 4 1-2 4-4 8-4 8 0 14 6 14 14 0 15-22 28-22 28z"
            fill="#FFE3E9"
            stroke="#F06292"
            strokeWidth="2"
            opacity="0.65"
          />
        </svg>
      </div>

      <div className="relative w-56 h-56 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-blumi-light-pink/50 blur-[18px]" />
        <div className="relative w-44 h-44 rounded-full border-4 border-white/80 bg-white/40 flex items-center justify-center">
          {/* Ilustración simple de libros */}
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M52 36C52 33.2386 54.2386 31 57 31H92C94.7614 31 97 33.2386 97 36V86C97 88.7614 94.7614 91 92 91H57C54.2386 91 52 88.7614 52 86V36Z"
              fill="#FFE3E9"
              stroke="#F06292"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M23 42C23 39.2386 25.2386 37 28 37H63C65.7614 37 68 39.2386 68 42V92C68 94.7614 65.7614 97 63 97H28C25.2386 97 23 94.7614 23 92V42Z"
              fill="#FFF5F7"
              stroke="#F06292"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M35 47H58"
              stroke="#F06292"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M35 58H60"
              stroke="#F06292"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M35 69H56"
              stroke="#F06292"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-blumi-light-pink/70 border border-blumi-accent flex items-center justify-center text-blumi-dark-pink">
          <Plus className="w-6 h-6" />
        </div>
      </div>

      <h1 className="text-4xl font-black text-slate-800 drop-shadow-sm">
        Tu estantería te espera
      </h1>
      <p className="mt-3 text-slate-500 max-w-xl text-base leading-relaxed">
        Parece que aún no tienes libros en tu biblioteca. ¿Qué tal si empezamos una nueva aventura hoy?
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-7 px-8 py-4 rounded-2xl bg-blumi-pink text-white font-bold text-lg shadow-lg shadow-blumi-pink/30 hover:bg-blumi-dark-pink transition-all flex items-center justify-center gap-3 cursor-pointer"
        aria-label="Añadir mi primer libro"
      >
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/25 border border-white/20">
          <Plus className="w-5 h-5" />
        </span>
        Añadir mi primer libro
      </button>
    </div>
  );
}

function PinkGreetingBanner({ name }: { name?: string }) {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-10">
      <div className="rounded-[26px] border border-blumi-accent/60 bg-gradient-to-r from-white/70 via-blumi-light-pink/30 to-white/60 soft-shadow px-7 py-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-56 h-56 bg-blumi-light-pink/60 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blumi-accent/50 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="text-2xl md:text-3xl font-black text-slate-800">
            Que lindo verte,{" "}
            <span className="text-blumi-dark-pink">{name || "Bella"}</span>!{" "}
            <span className="text-blumi-pink">✨</span>
          </div>
          <div className="mt-2 text-sm md:text-base font-bold text-blumi-dark-pink/90">
            ¡Qué alegría verte de nuevo! <span className="text-blumi-pink">🌸</span>
          </div>
        </div>

        {/* Sparkles top-right (como en la imagen) */}
        <div className="absolute right-6 top-5 text-blumi-light-pink/80">
          <div className="text-xl">✦</div>
          <div className="text-sm -mt-1 ml-3">✦</div>
        </div>
      </div>
    </div>
  );
}

type BookCard = InProgressBook;
type GoalPeriod = "DAY" | "WEEK" | "MONTH" | "YEAR" | null;

function GoalProgressCard({
  completedCount,
  goalUnits,
  goalPeriod,
  goalLoaded,
}: {
  completedCount: number;
  goalUnits: number | null;
  goalPeriod: GoalPeriod;
  goalLoaded: boolean;
}) {
  if (!goalLoaded) {
    return (
      <section className="mb-8 rounded-[24px] border border-blumi-accent/60 bg-white/80 soft-shadow p-5">
        <h2 className="text-lg font-black text-slate-800">Resumen de tu objetivo</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Cargando tu objetivo…</p>
        <div className="mt-4 h-4 rounded-full bg-blumi-light-pink/40 animate-pulse" />
      </section>
    );
  }

  const hasGoal = !!goalUnits && !!goalPeriod;
  const target = hasGoal ? Math.max(1, goalUnits || 0) : 0;
  const ratio = hasGoal ? Math.min(1, completedCount / target) : 1;
  const percent = hasGoal ? Math.round(ratio * 100) : 100;

  const periodLabel =
    goalPeriod === "DAY" ? "día" : goalPeriod === "WEEK" ? "semana" : goalPeriod === "MONTH" ? "mes" : "año";

  return (
    <section className="mb-8 rounded-[24px] border border-blumi-accent/60 bg-white/80 soft-shadow p-5">
      <h2 className="text-lg font-black text-slate-800">Resumen de tu objetivo</h2>
      {hasGoal ? (
        <p className="mt-1 text-sm font-semibold text-slate-600">
          Completaste <span className="text-blumi-dark-pink font-black">{completedCount}</span> de{" "}
          <span className="text-blumi-dark-pink font-black">{target}</span> libros planeados por {periodLabel}.
        </p>
      ) : (
        <p className="mt-1 text-sm font-semibold text-slate-600">
          Elegiste leer sin meta fija. Has leído{" "}
          <span className="text-blumi-dark-pink font-black">{completedCount}</span> libros en total.
        </p>
      )}

      {hasGoal ? (
        <div className="mt-4">
          <div className="h-4 rounded-full bg-blumi-light-pink/50 overflow-hidden border border-blumi-accent/40">
            <div
              className="h-full bg-gradient-to-r from-blumi-pink to-blumi-dark-pink rounded-full transition-all"
              style={{ width: `${Math.max(6, percent)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>0%</span>
            <span>{percent}% del objetivo</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 inline-flex items-center rounded-full bg-blumi-soft-bg border border-blumi-accent/60 px-3 py-1.5 text-xs font-bold text-slate-600">
          Total leído: {completedCount} libros
        </div>
      )}
    </section>
  );
}

function DetailsModal({
  book,
  onClose,
  onRequestDelete,
}: {
  book: BookCard & { status: "ACTIVE" | "COMPLETED" };
  onClose: () => void;
  onRequestDelete: (args: { id: number; title: string }) => void;
}) {
  const totalUnits = book.total_units || 0;
  const totalRead = Math.round(((book.progress_percent || 0) / 100) * totalUnits);
  const remaining = Math.max(0, totalUnits - totalRead);
  const start = (book as any).plan?.start_date;
  const end = (book as any).plan?.target_end_date;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded-[26px] bg-white border-2 border-blumi-light-pink p-6 soft-shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-black text-slate-800">{book.title}</div>
            <div className="text-sm font-semibold text-blumi-pink">{book.author}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-blumi-soft-bg border border-blumi-accent text-sm font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-blumi-soft-bg p-4 border border-blumi-accent/50 md:col-span-2">
            <div className="text-xs font-black tracking-widest text-slate-400">AUTOR</div>
            <div className="mt-1 text-sm font-bold text-slate-700">{book.author || "No se especificó"}</div>
          </div>
          <div className="rounded-2xl bg-blumi-soft-bg p-4 border border-blumi-accent/50">
            <div className="text-xs font-black tracking-widest text-slate-400">TOTAL LEÍDO</div>
            <div className="mt-1 text-xl font-black text-slate-800">{totalRead}</div>
          </div>
          <div className="rounded-2xl bg-blumi-soft-bg p-4 border border-blumi-accent/50">
            <div className="text-xs font-black tracking-widest text-slate-400">FALTA</div>
            <div className="mt-1 text-xl font-black text-slate-800">{remaining}</div>
          </div>
          <div className="rounded-2xl bg-blumi-soft-bg p-4 border border-blumi-accent/50">
            <div className="text-xs font-black tracking-widest text-slate-400">FECHA INICIO</div>
            <div className="mt-1 text-sm font-bold text-slate-700">{start || "—"}</div>
          </div>
          <div className="rounded-2xl bg-blumi-soft-bg p-4 border border-blumi-accent/50">
            <div className="text-xs font-black tracking-widest text-slate-400">FECHA META</div>
            <div className="mt-1 text-sm font-bold text-slate-700">{end || "—"}</div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            aria-label="Eliminar libro"
            className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer border border-red-200"
            onClick={() => onRequestDelete({ id: book.id, title: book.title })}
            title="Eliminar libro"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Biblioteca({ showGreeting = false }: { showGreeting?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialCached = getCachedInProgressBooks();
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<InProgressBook[]>(initialCached?.books || []);
  const [detailsFor, setDetailsFor] = useState<(BookCard & { status: "ACTIVE" | "COMPLETED" }) | null>(null);
  const [pageActive, setPageActive] = useState(1);
  const [pageCompleted, setPageCompleted] = useState(1);
  const PAGE_SIZE = 6;
  const [query, setQuery] = useState("");
  // Mensaje de éxito (login/registro/meta) ahora se maneja en `Inicio.tsx`
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [goalUnits, setGoalUnits] = useState<number | null>(null);
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>(null);
  const [goalLoaded, setGoalLoaded] = useState(false);

  // (intencionalmente vacío)

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const hasCached = !!getCachedInProgressBooks();
        setLoading(!hasCached);
        setError(null);
        const res = await getInProgressBooks({ forceRefresh: false });
        if (!mounted) return;
        setBooks(res.books);
        // Revalidación silenciosa: mantiene la UI estable al volver a Biblioteca.
        void getInProgressBooks({ forceRefresh: true })
          .then((fresh) => {
            if (!mounted) return;
            setBooks(fresh.books);
          })
          .catch(() => {
            // Si ya mostramos cache, no forzamos error visual.
          });
      } catch (e: any) {
        if (!mounted) return;
        setError("No se pudo cargar tu biblioteca. Revisa la conexión e intenta de nuevo.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await apiClient.get("auth/users/me/");
        const data = res.data?.data || res.data;
        if (!mounted) return;
        setGoalUnits(data?.reading_goal_units ?? null);
        setGoalPeriod((data?.reading_goal_period as GoalPeriod) ?? null);
        setGoalLoaded(true);
      } catch {
        if (!mounted) return;
        setGoalUnits(null);
        setGoalPeriod(null);
        setGoalLoaded(true);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const partitioned = useMemo(() => {
    const active = books.filter((b) => (b.progress_percent ?? 0) < 100);
    const completed = books.filter((b) => (b.progress_percent ?? 0) >= 100);
    return { active, completed };
  }, [books]);

  const filteredActive = useMemo(() => {
    const q = query.trim().toLowerCase();
    const src = partitioned.active;
    if (!q) return src;
    return src.filter((b) => (b.title + " " + b.author).toLowerCase().includes(q));
  }, [partitioned, query]);

  const filteredCompleted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const src = partitioned.completed;
    if (!q) return src;
    return src.filter((b) => (b.title + " " + b.author).toLowerCase().includes(q));
  }, [partitioned, query]);

  const totalPagesActive = Math.max(1, Math.ceil(filteredActive.length / PAGE_SIZE));
  const pageActiveSafe = Math.min(Math.max(1, pageActive), totalPagesActive);
  const pagedActive = useMemo(() => {
    const start = (pageActiveSafe - 1) * PAGE_SIZE;
    return filteredActive.slice(start, start + PAGE_SIZE);
  }, [filteredActive, pageActiveSafe]);

  const totalPagesCompleted = Math.max(1, Math.ceil(filteredCompleted.length / PAGE_SIZE));
  const pageCompletedSafe = Math.min(Math.max(1, pageCompleted), totalPagesCompleted);
  const pagedCompleted = useMemo(() => {
    const start = (pageCompletedSafe - 1) * PAGE_SIZE;
    return filteredCompleted.slice(start, start + PAGE_SIZE);
  }, [filteredCompleted, pageCompletedSafe]);

  const bookIconFor = (book: InProgressBook) => {
    if (book.unit_type === "PAGES") return BookOpen;
    if (book.unit_type === "CHAPTERS") return Library;
    return Flower2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        {showGreeting ? <PinkGreetingBanner name={user?.name || "Juli"} /> : null}
        <main className="max-w-6xl mx-auto pt-16 pb-16 px-6">
          <PinkLoader title="Cargando tu biblioteca…" subtitle="Estamos acomodando tus libritos rositas." />
        </main>
        
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        {showGreeting ? <PinkGreetingBanner name={user?.name || "Juli"} /> : null}
        <main className="max-w-6xl mx-auto pt-16 pb-16 px-6">
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-red-600 font-semibold text-sm">
            {error}
          </div>
        </main>
        
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        {showGreeting ? <PinkGreetingBanner name={user?.name || "Juli"} /> : null}
        <main className="max-w-6xl mx-auto pt-10 pb-16">
          <EmptyShelf onAdd={() => navigate("/app/setup")} />
        </main>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blumi-soft-bg">
      <BlumiHeader />

      {showGreeting ? <PinkGreetingBanner name={user?.name || "Juli"} /> : null}

      <main className="max-w-6xl mx-auto pt-10 pb-16 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">Mi Biblioteca</h1>
          <p className="mt-2 text-slate-500 text-base">Busca en tu biblioteca, filtra y abre detalles.</p>
        </div>

        <GoalProgressCard
          completedCount={partitioned.completed.length}
          goalUnits={goalUnits}
          goalPeriod={goalPeriod}
          goalLoaded={goalLoaded}
        />

        <div className="bg-white/60 border border-white rounded-[18px] soft-shadow p-4 mb-10 flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en mi biblioteca..."
              className="w-full h-12 rounded-full bg-white border border-blumi-accent/60 px-6 pr-12 outline-none text-slate-700 placeholder:text-slate-400 font-semibold"
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blumi-pink" />
          </div>
          <button
            type="button"
            className="w-12 h-12 rounded-full border border-blumi-accent/60 bg-white flex items-center justify-center text-blumi-pink hover:bg-blumi-soft-bg transition-colors cursor-pointer"
            aria-label="Filtrar"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-black text-slate-800 mb-4">Completados</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {pagedCompleted.map((b) => (
              <div
                key={`c-${b.id}`}
                onClick={() => setDetailsFor({ ...b, status: "COMPLETED" })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailsFor({ ...b, status: "COMPLETED" });
                  }
                }}
              className="text-left group rounded-[22px] bg-white soft-shadow border border-blumi-accent/50 hover:border-blumi-pink/50 transition-all px-6 py-6 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-blumi-light-pink/40 border border-blumi-accent overflow-hidden flex items-center justify-center shrink-0">
                    {(() => {
                      const Icon = bookIconFor(b);
                      return <Icon className="w-9 h-9 text-blumi-dark-pink" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 text-lg leading-tight line-clamp-2">{b.title}</div>
                    <div className="text-sm font-semibold text-blumi-pink mt-1 line-clamp-1">{b.author}</div>
                    <div className="mt-3 text-xs font-black tracking-widest text-slate-400">COMPLETADO</div>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border-2 border-blumi-light-pink text-blumi-purple font-bold hover:bg-blumi-soft-bg transition-colors cursor-pointer disabled:opacity-50"
              onClick={() => setPageCompleted((p) => Math.max(1, p - 1))}
              disabled={pageCompletedSafe <= 1}
            >
              Anterior
            </button>
            <div className="text-sm font-bold text-slate-600">
              Página {pageCompletedSafe} de {totalPagesCompleted}
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border-2 border-blumi-light-pink text-blumi-purple font-bold hover:bg-blumi-soft-bg transition-colors cursor-pointer disabled:opacity-50"
              onClick={() => setPageCompleted((p) => Math.min(totalPagesCompleted, p + 1))}
              disabled={pageCompletedSafe >= totalPagesCompleted}
            >
              Siguiente
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-800 mb-4">Activos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {pagedActive.map((b) => (
              <div
                key={`a-${b.id}`}
                onClick={() => setDetailsFor({ ...b, status: "ACTIVE" })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailsFor({ ...b, status: "ACTIVE" });
                  }
                }}
                className="text-left group rounded-[22px] bg-white soft-shadow border border-blumi-accent/50 hover:border-blumi-pink/50 transition-all px-6 py-6 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-blumi-light-pink/40 border border-blumi-accent overflow-hidden flex items-center justify-center shrink-0">
                    {(() => {
                      const Icon = bookIconFor(b);
                      return <Icon className="w-9 h-9 text-blumi-dark-pink" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 text-lg leading-tight line-clamp-2">{b.title}</div>
                    <div className="text-sm font-semibold text-blumi-pink mt-1 line-clamp-1">{b.author}</div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black tracking-widest text-slate-400">PROGRESO</div>
                        <div className="text-sm font-black text-slate-700">{b.progress_percent}%</div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-blumi-light-pink/60 overflow-hidden">
                        <div className="h-full bg-blumi-pink rounded-full" style={{ width: `${Math.max(0, Math.min(100, b.progress_percent))}%` }} />
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border-2 border-blumi-light-pink text-blumi-purple font-bold hover:bg-blumi-soft-bg transition-colors cursor-pointer disabled:opacity-50"
              onClick={() => setPageActive((p) => Math.max(1, p - 1))}
              disabled={pageActiveSafe <= 1}
            >
              Anterior
            </button>
            <div className="text-sm font-bold text-slate-600">
              Página {pageActiveSafe} de {totalPagesActive}
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border-2 border-blumi-light-pink text-blumi-purple font-bold hover:bg-blumi-soft-bg transition-colors cursor-pointer disabled:opacity-50"
              onClick={() => setPageActive((p) => Math.min(totalPagesActive, p + 1))}
              disabled={pageActiveSafe >= totalPagesActive}
            >
              Siguiente
            </button>
          </div>
        </section>

        <div className="mt-14 flex justify-center">
          <button
            type="button"
            className="w-full max-w-lg bg-blumi-pink text-white font-black text-lg rounded-[32px] py-6 shadow-lg shadow-blumi-pink/30 hover:bg-blumi-dark-pink transition-all flex items-center justify-center gap-3 cursor-pointer"
            onClick={() => navigate("/app/setup")}
          >
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/20 border border-white/20">
              <Plus className="w-5 h-5" />
            </span>
            Añadir nuevo libro
          </button>
        </div>
      </main>

      {detailsFor ? (
        <DetailsModal
          book={detailsFor}
          onClose={() => setDetailsFor(null)}
          onRequestDelete={({ id, title }) => {
            setDetailsFor(null);
            setConfirmDelete({ id, title });
          }}
        />
      ) : null}

      {confirmDelete ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-[26px] bg-white border-2 border-blumi-light-pink p-6 soft-shadow">
            <div className="text-xl font-black text-slate-800">¿Eliminar este libro?</div>
            <p className="mt-2 text-sm text-slate-600">
              “{confirmDelete.title}” se borrará de tu biblioteca junto con su progreso y todos los registros de lectura.
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border-2 border-blumi-light-pink text-slate-700 font-bold hover:bg-blumi-soft-bg cursor-pointer"
                onClick={() => setConfirmDelete(null)}
                disabled={isDeleting}
              >
                Mantener libro
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 cursor-pointer disabled:opacity-60"
                onClick={async () => {
                  if (!confirmDelete) return;
                  setIsDeleting(true);
                  try {
                    await deleteBook(confirmDelete.id);
                    setBooks((prev) => prev.filter((bk) => bk.id !== confirmDelete.id));
                    setConfirmDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

