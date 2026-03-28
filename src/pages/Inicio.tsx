import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Flower2, Library, Filter, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BlumiHeader } from "../app/BlumiHeader";
import { getCachedInProgressBooks, getInProgressBooks, type InProgressBook } from "../api/services/library";
import { useAuth } from "../app/authContext";
import { PinkLoader } from "../app/PinkLoader";

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
            Que lindo verte, <span className="text-blumi-dark-pink">{name || "Bella"}</span>!{" "}
            <span className="text-blumi-pink">✨</span>
          </div>
          <div className="mt-2 text-sm md:text-base font-bold text-blumi-dark-pink/90">
            ¡Qué alegría verte de nuevo! <span className="text-blumi-pink">🌸</span>
          </div>
        </div>
        <div className="absolute right-6 top-5 text-blumi-light-pink/80">
          <div className="text-xl">✦</div>
          <div className="text-sm -mt-1 ml-3">✦</div>
        </div>
      </div>
    </div>
  );
}

export default function Inicio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialCached = getCachedInProgressBooks();
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<InProgressBook[]>(initialCached?.books || []);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successType, setSuccessType] = useState<"login" | "register" | "goal" | null>(null);

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
        // Revalidación silenciosa para evitar pantallas en blanco al navegar entre vistas.
        void getInProgressBooks({ forceRefresh: true })
          .then((fresh) => {
            if (!mounted) return;
            setBooks(fresh.books);
          })
          .catch(() => {
            // Ignoramos errores de refresh silencioso si ya hay datos mostrados.
          });
      } catch (e: any) {
        if (!mounted) return;
        setError("No se pudo cargar tu lectura. Revisa la conexión e intenta de nuevo.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  // Mostrar modal de bienvenida cuando venimos de login/registro/meta
  useEffect(() => {
    const type = window.localStorage.getItem("blumiShowSuccessModalType");
    if (type === "login" || type === "register" || type === "goal") {
      setShowSuccessModal(true);
      setSuccessType(type as any);
      const t = window.setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessType(null);
        window.localStorage.removeItem("blumiShowSuccessModalType");
      }, 1400);
      return () => window.clearTimeout(t);
    }
  }, []);

  const filteredBooks = useMemo(() => {
    const inProgressOnly = books.filter((b) => (b.progress_percent ?? 0) < 100);
    const q = query.trim().toLowerCase();
    if (!q) return inProgressOnly;
    return inProgressOnly.filter((b) => (b.title + " " + b.author).toLowerCase().includes(q));
  }, [books, query]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const pagedBooks = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, pageSafe]);

  const bookIconFor = (book: InProgressBook) => {
    if (book.unit_type === "PAGES") return BookOpen;
    if (book.unit_type === "CHAPTERS") return Library;
    return Flower2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        <PinkGreetingBanner name={user?.name || "Juli"} />
        <main className="max-w-6xl mx-auto pt-16 pb-16 px-6">
          <PinkLoader title="Cargando tu lectura…" subtitle="Estamos preparando tus avances." />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        <PinkGreetingBanner name={user?.name || "Juli"} />
        <main className="max-w-6xl mx-auto pt-16 pb-16 px-6">
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-red-600 font-semibold text-sm">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blumi-soft-bg">
      <BlumiHeader />
      <PinkGreetingBanner name={user?.name || "Juli"} />
      <main className="max-w-6xl mx-auto pt-10 pb-16 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">Mi lectura</h1>
          <p className="mt-2 text-slate-500 text-base">
            {loading ? "Cargando tu lectura..." : `Tienes ${filteredBooks.length} libros en curso este mes.`}
          </p>
        </div>

        <div className="bg-white/60 border border-white rounded-[18px] soft-shadow p-4 mb-10 flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en mi lectura..."
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pagedBooks.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/app/check/${b.id}`)}
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-black text-slate-800 text-lg leading-tight line-clamp-2">{b.title}</div>
                  </div>
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
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-xl border-2 border-blumi-light-pink text-blumi-purple font-bold hover:bg-blumi-soft-bg transition-colors cursor-pointer disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
          >
            Anterior
          </button>
          <div className="text-sm font-bold text-slate-600">
            Página {pageSafe} de {totalPages}
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl border-2 border-blumi-light-pink text-blumi-purple font-bold hover:bg-blumi-soft-bg transition-colors cursor-pointer disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
          >
            Siguiente
          </button>
        </div>

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
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl border-4 border-blumi-light-pink p-8 shadow-2xl max-w-sm w-full text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-blumi-pink/10 border border-blumi-pink/30 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-blumi-pink" />
            </div>
            <h3 className="text-2xl font-black text-blumi-dark-pink">
              {successType === "goal" ? "¡Objetivo guardado!" : "¡Listo!"}
            </h3>
            <p className="mt-2 text-sm text-slate-600 font-semibold">
              {successType === "goal"
                ? "Ahora añade tus libros para empezar tu aventura."
                : "Bienvenida de nuevo a tu lectura."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

