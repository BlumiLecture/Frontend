import React from "react";
import { BlumiHeader } from "../app/BlumiHeader";
import { useAuth } from "../app/authContext";
import { PinkLoader } from "../app/PinkLoader";

export default function Favoritos() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-blumi-soft-bg">
        <BlumiHeader />
        <main className="max-w-6xl mx-auto pt-16 pb-16 px-6">
          <PinkLoader
            title="Cargando Favoritos…"
            subtitle={`Un momentico, ${user?.name || "lectora"} 💖`}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blumi-soft-bg">
      <BlumiHeader />
      <main className="max-w-6xl mx-auto pt-10 pb-16 px-6">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-black text-slate-800">Aún no tienes favoritos</h1>
          <p className="mt-3 text-slate-500 max-w-xl text-base leading-relaxed">
            Guarda tus libros favoritos para encontrarlos rápido cuando los necesites.
          </p>
        </div>
      </main>
    </div>
  );
}

