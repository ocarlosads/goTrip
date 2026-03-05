import React from "react";
import { motion } from "motion/react";
import { Check, Zap, Shield, Star } from "lucide-react";
import { cn } from "../../lib/utils";

export const PricingPage: React.FC = () => {
  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      description: "Para grupos pequenos se organizarem.",
      features: ["1 grupo ativo", "Até 8 pessoas por grupo", "Votação de destinos", "Divisão de custos básica"],
      buttonText: "Plano Atual",
      current: true
    },
    {
      name: "Pro Mensal",
      price: "R$ 19",
      period: "/mês",
      description: "Para quem viaja com frequência.",
      features: ["Grupos ilimitados", "Membros ilimitados", "Exportar relatórios PDF", "Notificações prioritárias", "Suporte 24h"],
      buttonText: "Fazer Upgrade",
      highlight: true
    },
    {
      name: "Pro Anual",
      price: "R$ 159",
      period: "/ano",
      description: "Economize 30% no plano anual.",
      features: ["Tudo do plano Pro", "Acesso antecipado a novas funções", "Badge exclusiva no perfil", "Sem taxas de processamento"],
      buttonText: "Assinar Anual",
      badge: "Melhor Valor"
    }
  ];

  return (
    <div className="py-10">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Escolha o plano ideal para seu grupo</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto">
          Comece grátis e faça o upgrade quando precisar de mais flexibilidade para suas aventuras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <motion.div 
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative bg-white dark:bg-gray-900 rounded-3xl p-8 border shadow-sm flex flex-col transition-colors",
              plan.highlight 
                ? "border-indigo-600 ring-4 ring-indigo-50 dark:ring-indigo-900/20" 
                : "border-gray-100 dark:border-gray-800"
            )}
          >
            {plan.badge && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {plan.badge}
              </span>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1 text-gray-900 dark:text-white">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-gray-500 dark:text-gray-400 font-medium">{plan.period}</span>}
              </div>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-1 rounded-full mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <button className={cn(
              "w-full py-4 rounded-xl font-bold transition-all",
              plan.current 
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default" 
                : plan.highlight 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none" 
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            )}>
              {plan.buttonText}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 transition-colors">
        <div className="flex items-center gap-6">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm transition-colors">
            <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">Pagamento Seguro</h4>
            <p className="text-indigo-700 dark:text-indigo-300 text-sm">Processado via Stripe com suporte a Pix e Cartão.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <img src="https://stripe.com/favicon.ico" alt="Stripe" className="h-6 opacity-50 grayscale" referrerPolicy="no-referrer" />
          <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-800"></div>
          <span className="text-indigo-400 dark:text-indigo-500 font-bold tracking-widest text-xs uppercase">AbacatePay</span>
        </div>
      </div>
    </div>
  );
};
