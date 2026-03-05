import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plane, Mail, ArrowRight, Loader2, Lock, User, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { apiFetch } from "../../lib/api";

interface LoginFormProps {
  onLogin: (email: string, token: string, userId?: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const GOOGLE_CLIENT_ID = "923509761070-56p6i5iju5ofefm4q7ieokor78luchm5.apps.googleusercontent.com";

  useEffect(() => {
    /* global google */
    const initializeGoogle = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", width: "100%", text: "continue_with", shape: "pill" }
        );
      }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [mode]); // Re-inicializar se mudar de modo para garantir o botão

  const handleGoogleCallback = async (response: any) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (res.ok) {
        const data = await res.json();
        onLogin(data.user.email, data.token, data.user.id);
      } else {
        const data = await res.json();
        setError(data.details ? `Falha Google: ${data.details}` : data.error || "Falha ao entrar com Google.");
      }
    } catch (err: any) {
      setError(`Erro de conexão: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === "register" && !name) return;

    setIsLoading(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (res.ok) {
        if (mode === "register") {
          setMode("verify");
        } else {
          onLogin(email, data.token, data.user?.id);
        }
      } else {
        if (data.needsVerification) {
          setMode("verify");
          setError("Por favor, verifique seu e-mail.");
        } else {
          setError(data.details ? `${data.error}: ${data.details}` : data.error || "Erro ao processar solicitação");
        }
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return;

    setIsLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: verificationCode }),
      });

      const data = await res.json();
      if (res.ok) {
        onLogin(email, data.token, data.user?.id);
      } else {
        setError(data.error || "Código inválido");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
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
          <h1 className="text-2xl font-bold ml-3 text-gray-900 dark:text-white">goTrip</h1>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === "login" ? "Bem-vindo de volta" : mode === "register" ? "Criar sua conta" : "Verifique seu e-mail"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {mode === "verify"
              ? `Enviamos um código de 6 dígitos para ${email}`
              : "Organize suas viagens em grupo sem o caos do WhatsApp."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm mb-6"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {mode === "verify" ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Verificação</label>
              <div className="relative">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center tracking-[1em] font-mono text-xl"
                  required
                />
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2 shadow-lg shadow-indigo-100 dark:shadow-none"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar E-mail"}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Voltar para cadastro
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                <div className="relative">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
              <div className="relative">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2 shadow-lg shadow-indigo-100 dark:shadow-none"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? "Entrar" : "Criar Conta"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {mode === "login" ? "Não tem uma conta? Cadastre-se" : "Já tem uma conta? Faça login"}
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium text-[10px]">Ou</span>
              </div>
            </div>

            <div id="googleBtn" className="w-full flex justify-center"></div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  );
};
