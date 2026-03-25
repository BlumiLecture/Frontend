import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Library, PenLine, Users } from "lucide-react";

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 hover:scale-105 transition-transform">
      <div className="w-20 h-20 bg-blumi-light-pink rounded-3xl flex items-center justify-center text-4xl mb-6 border-2 border-blumi-accent">
        {icon}
      </div>
      <h3 className="font-display text-xl font-bold text-pink-700 mb-3">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blumi-accent">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blumi-dark-pink rounded-full flex items-center justify-center text-white text-2xl">
              📖
            </div>
            <span className="font-display text-2xl font-bold text-blumi-dark-pink tracking-tight">BlumiLecture</span>
          </div>
          <nav className="hidden md:flex gap-8 font-medium text-pink-600">
            <a href="#" className="hover:text-blumi-dark-pink transition-colors">Inicio</a>
            <a href="#how-it-works" className="hover:text-blumi-dark-pink transition-colors">Cómo funciona</a>
            <a href="#" className="hover:text-blumi-dark-pink transition-colors">Comunidad</a>
          </nav>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-5 py-2 rounded-full text-blumi-dark-pink font-semibold border-2 border-blumi-dark-pink hover:bg-blumi-dark-pink hover:text-white transition-all duration-300"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 rounded-full bg-blumi-dark-pink text-white font-semibold hover:bg-pink-500 soft-shadow transition-all duration-300"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 bg-blumi-pink-light/30">
        <div className="absolute top-0 right-0 -mr-20 mt-10 w-64 h-64 bg-blumi-pink opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 mb-10 w-80 h-80 bg-blumi-accent opacity-30 rounded-full blur-3xl"></div>
        <div className="container mx-auto px-8 max-w-6xl flex flex-col md:flex-row items-center md:justify-between gap-10 relative z-10">
          <div className="w-full md:w-1/2 text-center md:text-left mb-12 md:mb-0">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-blumi-dark-pink leading-tight mb-6">
              Lee más libros, <br />
              <span className="text-pink-400">crea más magia.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-lg mx-auto md:mx-0">
              Descubre un espacio dulce y acogedor diseñado para amantes de la lectura. Registra tus avances, encuentra nuevos títulos y comparte tu pasión con BlumiLecture.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/register"
                className="px-8 py-4 bg-blumi-dark-pink text-white rounded-2xl font-bold text-lg hover:scale-105 transition-transform soft-shadow inline-block text-center"
              >
                ¡Empezar a leer!
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-4 bg-white text-blumi-dark-pink border-2 border-blumi-accent rounded-2xl font-bold text-lg hover:bg-blumi-accent/20 transition-all inline-block text-center"
              >
                Saber más
              </a>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-center md:justify-end items-center">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3W_-PzcI5pyHE6cuY9Z1XiFK1SuUISRk2I9Bk2viZ0f_V_2Y33Z3035iostNjdJcVkoHNMahk2fqA0gQZRfaSmK9fG6pHy9EOa6b61gFAAlJk2jNJ_Uvjeqd5lbMZfLuqL8SepsnPGpcfmfOHYO5Zv7SkBUuU9MHtY9Vl1A9uZVLcSUKO8vC4g5orj7gEucVa99ulGdWn58KVAcYQlCrrPxOyErS1sEkf5PYM8gvIlk7hAUsuAHm9vclSGWGerzP_o8_wFN0Zc2M"
                alt="Cute book illustration"
                className="w-full h-full object-contain animate-floating"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-blumi-dark-pink mb-4">¿Cómo funciona BlumiLecture?</h2>
            <div className="w-24 h-1 bg-blumi-accent mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard
              icon={<Library className="w-10 h-10 text-pink-500" />}
              title="Organiza tu Biblioteca"
              desc="Añade los libros que quieres leer, los que estás leyendo y tus favoritos de siempre."
            />
            <FeatureCard
              icon={<PenLine className="w-10 h-10 text-pink-500" />}
              title="Registra tu Progreso"
              desc="Lleva un diario de lectura, anota tus frases favoritas y ponle estrellitas a cada capítulo."
            />
            <FeatureCard
              icon={<Users className="w-10 h-10 text-pink-500" />}
              title="Únete a la Comunidad"
              desc="Comparte tus reseñas con otras Blumis y descubre recomendaciones personalizadas."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-blumi-accent py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blumi-dark-pink rounded-full flex items-center justify-center text-white text-lg">📖</div>
              <span className="font-display text-xl font-bold text-blumi-dark-pink">BlumiLecture</span>
            </div>
            <div className="flex gap-6 text-pink-400">
              <a href="#" className="hover:text-blumi-dark-pink transition-colors">Términos</a>
              <a href="#" className="hover:text-blumi-dark-pink transition-colors">Privacidad</a>
              <a href="#" className="hover:text-blumi-dark-pink transition-colors">Contacto</a>
            </div>
            <p className="text-gray-400 text-sm">© 2023 BlumiLecture. Hecho con 💖 para lectoras.</p>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}

