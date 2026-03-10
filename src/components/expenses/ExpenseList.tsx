import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, X, Users, ChevronDown, ChevronUp, Zap, Bell, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

interface Split {
  userId: string;
  userName: string;
  amount: number;
  isPaid: boolean;
  shares: number;
}

interface Payer {
  userId: string;
  userName: string;
  amount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  payers: Payer[];
  date: string;
  splits: Split[];
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface ExpenseListProps {
  groupType?: "solo" | "couple" | "group";
  groupId: string;
  currentUserId: string;
  initialData?: {
    expenses: Expense[];
    members: Member[];
  };
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ groupType = "group", groupId, currentUserId, initialData }) => {
  const [allMembers, setAllMembers] = useState<Member[]>(initialData?.members || []);
  const [expenses, setExpenses] = useState<Expense[]>(initialData?.expenses || []);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
      setAllMembers(initialData.members);
      setExpenses(initialData.expenses);
      setIsLoadingExpenses(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        const res = await apiFetch(`/api/groups/${groupId}/members`);
        if (res.ok) setAllMembers(await res.json());
      } catch (err) { console.error("Error fetching members:", err); }
    };

    const fetchExpenses = async () => {
      setIsLoadingExpenses(true);
      try {
        const res = await apiFetch(`/api/groups/${groupId}/expenses`);
        if (res.ok) {
          const data = await res.json();
          setExpenses(data);
        }
      } catch (err) {
        console.error("Error fetching expenses:", err);
      } finally {
        setIsLoadingExpenses(false);
      }
    };

    fetchMembers();
    fetchExpenses();
  }, [groupId, initialData]);

  const membersWithLabel = allMembers.map((m) => ({
    ...m,
    displayName: m.id === currentUserId ? `Você (${m.name})` : m.name,
  }));

  const activeMembers = membersWithLabel.length === 0
    ? [{ id: currentUserId, name: "Você", email: "", displayName: "Você" }]
    : groupType === "solo"
      ? membersWithLabel.filter((m) => m.id === currentUserId)
      : groupType === "couple"
        ? membersWithLabel.slice(0, 2)
        : membersWithLabel;

  const isSolo = groupType === "solo";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [shouldSplit, setShouldSplit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(
    activeMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.id === "me" ? "" : "0" }), {})
  );
  const [participantShares, setParticipantShares] = useState<Record<string, number>>(
    activeMembers.reduce((acc, m) => ({ ...acc, [m.id]: 1 }), {})
  );

  // Update form state when groupType changes
  useEffect(() => {
    resetForm();
  }, [groupType]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numTotalAmount = parseFloat(totalAmount);

    const payersList: Payer[] = activeMembers
      .map(m => ({
        userId: m.id,
        userName: m.name,
        amount: parseFloat(payerAmounts[m.id] || "0")
      }))
      .filter(p => p.amount > 0);

    const sumPayers = payersList.reduce((acc, p) => acc + p.amount, 0);

    // Se o usuário não definiu quem pagou mas definiu o total, assume que "Você" pagou tudo
    const finalPayers = payersList.length === 0 && numTotalAmount > 0
      ? [{ userId: "me", userName: "Você", amount: numTotalAmount }]
      : payersList;

    const finalTotalAmount = finalPayers.reduce((acc, p) => acc + p.amount, 0);

    const activeParticipants = activeMembers.filter(m => participantShares[m.id] > 0);
    const totalShares = activeParticipants.reduce((acc, m) => acc + participantShares[m.id], 0);

    const isCoupleTrackingOnly = groupType === "couple" && !shouldSplit;

    if (!description || finalTotalAmount <= 0 || (!isSolo && !isCoupleTrackingOnly && totalShares === 0)) return;

    const amountPerShare = finalTotalAmount / (totalShares || 1);

    const splits = (isSolo || isCoupleTrackingOnly)
      ? [{ userId: "me", amount: finalTotalAmount, shares: 1 }]
      : activeParticipants.map(m => ({
        userId: m.id,
        shares: participantShares[m.id],
        amount: amountPerShare * participantShares[m.id]
      }));

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount: finalTotalAmount, splits }),
      });

      if (res.ok) {
        const newExpense = await res.json();
        // Refresh expenses
        const refreshRes = await apiFetch(`/api/groups/${groupId}/expenses`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setExpenses(data);
        }
        setIsModalOpen(false);
        resetForm();
      }
    } catch (err) {
      console.error("Error saving expense:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setTotalAmount("");
    setShouldSplit(true);
    setPayerAmounts(activeMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.id === "me" ? "" : "0" }), {}));
    setParticipantShares(activeMembers.reduce((acc, m) => ({ ...acc, [m.id]: 1 }), {}));
  };

  const updateShares = (id: string, delta: number) => {
    setParticipantShares(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const totalSharesInForm = activeMembers.reduce((acc, m) => acc + participantShares[m.id], 0);

  const toggleSplitPaid = async (expenseId: string, userId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    const split = expense?.splits.find(s => s.userId === userId);
    if (!split) return;

    try {
      const res = await apiFetch(`/api/expenses/${expenseId}/splits/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !split.isPaid }),
      });

      if (res.ok) {
        setExpenses(prev => prev.map(exp => {
          if (exp.id === expenseId) {
            return {
              ...exp,
              splits: exp.splits.map(s => s.userId === userId ? { ...s, isPaid: !s.isPaid } : s)
            };
          }
          return exp;
        }));
      }
    } catch (err) {
      console.error("Error updating split:", err);
    }
  };

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const toReceive = expenses.reduce((acc, curr) => {
    const myPayment = curr.payers.find(p => p.userId === currentUserId)?.amount || 0;
    const mySplit = curr.splits.find(s => s.userId === currentUserId)?.amount || 0;
    if (myPayment > mySplit) {
      const unpaidOthers = curr.splits.filter(s => s.userId !== currentUserId && !s.isPaid).reduce((sum, s) => sum + s.amount, 0);
      return acc + Math.min(myPayment - mySplit, unpaidOthers);
    }
    return acc;
  }, 0);
  const toPay = expenses.reduce((acc, curr) => {
    const mySplit = curr.splits.find(s => s.userId === currentUserId);
    if (mySplit && !mySplit.isPaid) {
      const myPayment = curr.payers.find(p => p.userId === currentUserId)?.amount || 0;
      if (mySplit.amount > myPayment) {
        return acc + (mySplit.amount - myPayment);
      }
    }
    return acc;
  }, 0);

  // Calculate real balances and detailed debts between members
  const calculateDetailedDebts = () => {
    const balances: Record<string, number> = {};
    const matrix: Record<string, Record<string, number>> = {};

    activeMembers.forEach(m => {
      balances[m.id] = 0;
      matrix[m.id] = {};
      activeMembers.forEach(m2 => {
        if (m.id !== m2.id) matrix[m.id][m2.id] = 0;
      });
    });

    expenses.forEach(expense => {
      // Cada split não pago gera uma dívida proporcional aos pagadores
      expense.splits.forEach(split => {
        if (!split.isPaid) {
          const debtorId = split.userId;

          // A dívida é dividida entre os pagadores proporcionalmente ao que eles pagaram além da própria parte
          const creditors = expense.payers.filter(p => {
            const payerSplit = expense.splits.find(s => s.userId === p.userId)?.amount || 0;
            return p.amount > payerSplit;
          });

          const totalExtraPaid = creditors.reduce((sum, p) => {
            const payerSplit = expense.splits.find(s => s.userId === p.userId)?.amount || 0;
            return sum + (p.amount - payerSplit);
          }, 0);

          creditors.forEach(creditor => {
            const payerSplit = expense.splits.find(s => s.userId === creditor.userId)?.amount || 0;
            const extraPaid = creditor.amount - payerSplit;
            const portionOfDebt = (extraPaid / totalExtraPaid) * split.amount;

            if (debtorId !== creditor.userId) {
              balances[debtorId] -= portionOfDebt;
              balances[creditor.userId] += portionOfDebt;
              matrix[debtorId][creditor.userId] += portionOfDebt;
            }
          });
        }
      });
    });

    // Simplify the matrix: if A owes B 50 and B owes A 30, then A owes B 20.
    const finalDebts: { from: string; to: string; amount: number }[] = [];
    const processedPairs = new Set<string>();

    activeMembers.forEach(m1 => {
      activeMembers.forEach(m2 => {
        if (m1.id === m2.id) return;
        const pairId = [m1.id, m2.id].sort().join("-");
        if (processedPairs.has(pairId)) return;
        processedPairs.add(pairId);

        const m1OwesM2 = matrix[m1.id][m2.id] || 0;
        const m2OwesM1 = matrix[m2.id][m1.id] || 0;

        if (m1OwesM2 > m2OwesM1) {
          const net = m1OwesM2 - m2OwesM1;
          if (net > 0.01) finalDebts.push({ from: m1.name, to: m2.name, amount: net });
        } else if (m2OwesM1 > m1OwesM2) {
          const net = m2OwesM1 - m1OwesM2;
          if (net > 0.01) finalDebts.push({ from: m2.name, to: m1.name, amount: net });
        }
      });
    });

    return { finalDebts, balances };
  };

  const { finalDebts, balances } = calculateDetailedDebts();


  const handleNotify = async (from: string, to: string, amount: number) => {
    try {
      const response = await apiFetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT_REMINDER",
          payload: { from, to, amount }
        })
      });
      if (response.ok) {
        const { showToast } = useToast();
        showToast(`Notificação enviada para ${from}!`, "success");
      }
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
    }
  };

  if (isLoadingExpenses) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="font-medium text-gray-500 dark:text-gray-400">Carregando despesas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className={cn("grid grid-cols-1 gap-4", groupType !== "group" ? "md:grid-cols-1" : "md:grid-cols-3")}>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Gasto</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSpent)}</p>
        </div>
        {groupType === "group" && (
          <>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">A Receber</p>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(toReceive)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">A Pagar</p>
                <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(toPay)}</p>
            </div>
          </>
        )}
      </div>

      {/* Member Balances Summary */}
      {groupType === "group" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Saldos Individuais
            </h3>
            <div className="space-y-3">
              {activeMembers.map(member => {
                const balance = balances[member.id] || 0;
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-50 dark:border-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                        {member.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{member.name}</span>
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      balance > 0.01 ? "text-emerald-600 dark:text-emerald-400" : balance < -0.01 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                    )}>
                      {balance > 0.01 ? "+" : ""}{formatCurrency(balance)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-indigo-900 dark:bg-indigo-950 rounded-3xl p-6 text-white relative overflow-hidden flex flex-col transition-colors">
            <div className="relative z-10 flex-1">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Quem deve pra quem
              </h3>
              {finalDebts.length > 0 ? (
                <div className="space-y-3">
                  {finalDebts.map((t, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{t.from}</span>
                        <ArrowRight className="w-4 h-4 text-indigo-300" />
                        <span className="text-sm font-bold">{t.to}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-emerald-400">{formatCurrency(t.amount)}</span>
                        <button
                          onClick={() => handleNotify(t.from, t.to, t.amount)}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-indigo-200 hover:text-white"
                          title="Notificar Pagamento"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                  <CheckCircle2 className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">Tudo em dia! Ninguém deve nada.</p>
                </div>
              )}
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Despesas</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Despesa
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {expenses.map(expense => {
            const isExpanded = expandedExpense === expense.id;
            const allPaid = expense.splits.every(s => s.isPaid);

            return (
              <div key={expense.id} className="flex flex-col">
                <div
                  onClick={() => setExpandedExpense(isExpanded ? null : expense.id)}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      expense.payers.some(p => p.userId === currentUserId) ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    )}>
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{expense.description}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pago por <span className="font-semibold">
                          {expense.payers.length === 1
                            ? expense.payers[0].userName
                            : `${expense.payers.length} pessoas`}
                        </span> em {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(expense.amount)}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {allPaid ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                        )}
                        <span className={cn(
                          "text-[10px] font-bold uppercase",
                          allPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          {allPaid ? "Quitado" : "Pendente"}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-50 dark:border-gray-800"
                    >
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Payers Section */}
                          <div className={cn(groupType !== "group" && "md:col-span-2")}>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Quem pagou</p>
                            <div className="space-y-2">
                              {expense.payers.map(payer => (
                                <div key={payer.userId} className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                      {payer.userName[0]}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{payer.userName}</span>
                                  </div>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(payer.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Splits Section - Hide for solo/couple */}
                          {groupType === "group" && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Divisão e Status</p>
                              <div className="space-y-2">
                                {expense.splits.map(split => (
                                  <div key={split.userId} className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                        split.isPaid ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                                      )}>
                                        {split.userName[0]}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                          {split.userName} {split.shares > 1 && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 ml-1">{split.shares} cotas</span>}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(split.amount)}</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSplitPaid(expense.id, split.userId);
                                      }}
                                      className={cn(
                                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all",
                                        split.isPaid
                                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                                          : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400"
                                      )}
                                    >
                                      {split.isPaid ? "Pago" : "Marcar Pago"}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh] transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nova Despesa</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Jantar no Restaurante"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                    required
                  />
                </div>

                <div className="space-y-6">
                  {/* Total Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Total</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>


                  {!isSolo && groupType === "group" && (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Quem pagou?
                      </label>
                      <div className="space-y-2">
                        {activeMembers.map(member => (
                          <div key={member.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                              {member.name[0]}
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{member.name}</span>
                            <div className="relative w-32">
                              <span className="absolute left-3 top-2.5 text-xs text-gray-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={payerAmounts[member.id]}
                                onChange={(e) => setPayerAmounts(prev => ({ ...prev, [member.id]: e.target.value }))}
                                placeholder="0,00"
                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Dividir com quem?</span>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Cotas</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeMembers.map(member => (
                            <div
                              key={member.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                participantShares[member.id] > 0
                                  ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                                  : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                  participantShares[member.id] > 0 ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                                )}>
                                  {member.name[0]}
                                </div>
                                <span className="text-xs font-medium truncate max-w-[60px]">{member.name}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateShares(member.id, -1)}
                                  className="w-6 h-6 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white text-xs"
                                >
                                  -
                                </button>
                                <span className="w-3 text-center font-bold text-gray-900 dark:text-white text-xs">{participantShares[member.id]}</span>
                                <button
                                  type="button"
                                  onClick={() => updateShares(member.id, 1)}
                                  className="w-6 h-6 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {groupType === "group" && totalSharesInForm > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider">Total Calculado</p>
                      <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                        {formatCurrency(activeMembers.reduce((acc, m) => acc + parseFloat(payerAmounts[m.id] || "0"), 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider">Por cota</p>
                      <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                        {formatCurrency(activeMembers.reduce((acc, m) => acc + parseFloat(payerAmounts[m.id] || "0"), 0) / totalSharesInForm)}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Adicionar Despesa"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  );
}
