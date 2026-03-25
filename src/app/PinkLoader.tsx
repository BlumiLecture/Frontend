import React from "react";

export function PinkLoader({
  title = "Cargando…",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-xl mx-auto rounded-[28px] bg-white/70 border-2 border-blumi-light-pink soft-shadow p-10 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blumi-light-pink/60 rounded-full blur-2xl" />
      <div className="absolute -bottom-14 -left-14 w-44 h-44 bg-blumi-accent/40 rounded-full blur-2xl" />

      <div className="relative flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blumi-pink/10 border border-blumi-pink/30 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-blumi-pink animate-spin" />
        </div>
        <div>
          <div className="text-2xl font-black text-blumi-dark-pink">{title}</div>
          {subtitle ? (
            <div className="mt-2 text-sm text-slate-500 font-semibold">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

