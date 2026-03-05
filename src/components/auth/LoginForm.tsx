import React, { useState } from "react";
import { motion } from "motion/react";
import { Plane, Mail, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoginFormProps {
  onLogin: (email: string, token: string, userId?: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsSent(true);
        // Em um app real, esperaríamos o magic link.
        // Para o demo, vamos logar direto após 1.5s
        setTimeout(() => onLogin(email, data.token, data.user?.id), 1500);
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 p-8 transition-colors"
      >
        <div className="flex items-center justify-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-xl">
            <Plane className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold ml-3 text-gray-900 dark:text-white">CheckTrip</h1>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bem-vindo de volta</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Organize suas viagens em grupo sem o caos do WhatsApp.</p>
        </div>

        {isSent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-center"
          >
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="font-medium">Link enviado!</p>
            <p className="text-sm opacity-90">Verifique seu e-mail para entrar.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2",
                isLoading && "opacity-70 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar com E-mail <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Ou</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
              Continuar com Google
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  );
};
