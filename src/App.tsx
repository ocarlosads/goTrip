import React, { useState, useEffect } from "react";
import { LoginForm } from "./components/auth/LoginForm";
import { TripView } from "./components/trips/TripView";
import { ExpenseList } from "./components/expenses/ExpenseList";
import { ItineraryView } from "./components/itinerary/ItineraryView";
import { Loader2, Plus, Users, MapPin, Wallet, Settings, LogOut, Menu, X, ArrowLeft, Shield, TrendingUp, UserPlus, DollarSign, Calendar, Moon, Sun, Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency } from "./lib/utils";
import { apiFetch, setAuthToken, removeAuthToken } from "./lib/api";
import { ToastProvider, useToast } from "./context/ToastContext";

interface User {
  email: string;
  id?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  type: "solo" | "couple" | "group";
  image?: string;
  inviteCode: string;
  memberCount: number;
  nextTripDate?: string;
  userBalance: number;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("groups");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const isAdmin = user?.email === "admin@checktrip.com.br";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = async (email: string, token: string, userId?: string) => {
    setAuthToken(token);
    if (userId) {
      setUser({ email, id: userId });
    } else {
      // Fetch user ID from /api/auth/me
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) { const d = await res.json(); setUser(d.user); }
        else setUser({ email });
      } catch { setUser({ email }); }
    }
  };

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    removeAuthToken();
    setUser(null);
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center transition-colors space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Carregando goTrip...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <ToastProvider>
      <AppContent
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        isAdmin={isAdmin}
      />
    </ToastProvider>
  );
}

function AppContent({
  user, activeTab, setActiveTab, selectedGroup, setSelectedGroup,
  isMobileMenuOpen, setIsMobileMenuOpen, isDarkMode, setIsDarkMode,
  toggleDarkMode, handleLogout, isAdmin
}: any) {
  const { showToast } = useToast();

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 flex flex-col md:flex-row transition-colors duration-300">
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 sticky top-0 h-screen transition-colors">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Plus className="text-white w-5 h-5 rotate-45" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">goTrip</span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem
            icon={<Users className="w-5 h-5" />}
            label="Meus Grupos"
            active={activeTab === "groups"}
            onClick={() => { setActiveTab("groups"); setSelectedGroup(null); }}
          />
          <NavItem
            icon={<MapPin className="w-5 h-5" />}
            label="Destinos"
            active={activeTab === "destinations"}
            onClick={() => setActiveTab("destinations")}
          />
          <NavItem
            icon={<Wallet className="w-5 h-5" />}
            label="Finanças"
            active={activeTab === "finance"}
            onClick={() => setActiveTab("finance")}
          />
          <NavItem
            icon={<Settings className="w-5 h-5" />}
            label="Configurações"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
          {isAdmin && (
            <NavItem
              icon={<Shield className="w-5 h-5" />}
              label="Painel Admin"
              active={activeTab === "admin"}
              onClick={() => setActiveTab("admin")}
            />
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full px-2 py-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-[60] transition-colors safe-top">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
            <Plus className="text-white w-4 h-4 rotate-45" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white tracking-tight">goTrip</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-900 dark:text-white">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed inset-0 top-[65px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-[55] p-6 flex flex-col transition-colors"
          >
            <nav className="space-y-4">
              <NavItem
                icon={<Users className="w-5 h-5" />}
                label="Meus Grupos"
                active={activeTab === "groups"}
                onClick={() => { setActiveTab("groups"); setSelectedGroup(null); setIsMobileMenuOpen(false); }}
              />
              <NavItem
                icon={<MapPin className="w-5 h-5" />}
                label="Destinos"
                active={activeTab === "destinations"}
                onClick={() => { setActiveTab("destinations"); setIsMobileMenuOpen(false); }}
              />
              <NavItem
                icon={<Wallet className="w-5 h-5" />}
                label="Finanças"
                active={activeTab === "finance"}
                onClick={() => { setActiveTab("finance"); setIsMobileMenuOpen(false); }}
              />
              <NavItem
                icon={<Settings className="w-5 h-5" />}
                label="Configurações"
                active={activeTab === "settings"}
                onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
              />
            </nav>
            <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 dark:text-red-400 w-full py-3 font-medium"
              >
                <LogOut className="w-5 h-5" /> Sair da conta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {activeTab === "groups" && !selectedGroup && (
            <DashboardView onSelectGroup={setSelectedGroup} user={user} />
          )}

          {selectedGroup && (
            <GroupDetailView
              group={selectedGroup}
              user={user}
              onBack={() => setSelectedGroup(null)}
              onLeave={(id) => { setSelectedGroup(null); }}
            />
          )}

          {activeTab === "admin" && isAdmin && <AdminDashboardView />}

          {activeTab === "settings" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie suas preferências e conta.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Preferências de Tema
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Escolha entre o modo claro ou escuro para a interface do aplicativo.</p>

                  <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit transition-colors">
                    <button
                      onClick={() => setIsDarkMode(false)}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        !isDarkMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <Sun className="w-4 h-4" /> Claro
                    </button>
                    <button
                      onClick={() => setIsDarkMode(true)}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        isDarkMode ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                      )}
                    >
                      <Moon className="w-4 h-4" /> Escuro
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Notificações
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Gerencie como você deseja receber alertas sobre suas viagens.</p>
                  <button className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">Configurar alertas e-mail</button>
                </div>
              </div>
            </div>
          )}

          {activeTab !== "groups" && activeTab !== "pricing" && activeTab !== "admin" && activeTab !== "settings" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <Settings className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Em desenvolvimento</h3>
              <p className="text-gray-500 mt-2 max-w-xs">Esta funcionalidade estará disponível em breve no goTrip.</p>
            </div>
          )}
        </div>
      </main>
    </div >
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active
          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DashboardView({ onSelectGroup, user }: { onSelectGroup: (g: Group) => void, user: User | null }) {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Auto-join from URL (?join=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code && user) {
      setJoinId(code.toUpperCase());
      setIsJoinModalOpen(true);
    }
  }, [user]);

  // Load groups from API
  useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }

    const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch("/api/groups");
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as "solo" | "couple" | "group";
    const image = formData.get('image') as string;

    try {
      const res = await apiFetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, type, image }),
      });

      if (res.ok) {
        const newGroup = await res.json();
        setGroups([newGroup, ...groups]);
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const handleJoinGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinId) return;

    setIsJoining(true);
    try {
      const res = await apiFetch(`/api/groups/join/${joinId}`, {
        method: "POST"
      });

      if (res.ok) {
        const data = await res.json();
        const listRes = await apiFetch("/api/groups");
        if (listRes.ok) {
          const groupsData = await listRes.json();
          setGroups(groupsData);
        }

        setIsJoinModalOpen(false);
        setJoinId("");

        // Limpar URL param
        const url = new URL(window.location.href);
        url.searchParams.delete('join');
        window.history.replaceState({}, '', url);

        showToast(`Você entrou no grupo ${data.group.name}!`, "success");
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Grupo não encontrado ou código inválido.", "error");
      }
    } catch (err) {
      console.error("Error joining group:", err);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Carregando suas viagens...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-900 p-10 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-xl max-w-2xl w-full transition-colors"
        >
          <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-200 dark:shadow-none">
            <Plus className="text-white w-10 h-10 rotate-45" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Bem-vindo ao goTrip</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-10 max-w-md mx-auto">
            Sua jornada começa aqui. Crie um novo planejamento ou entre em um grupo existente usando um ID.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex flex-col items-center gap-2"
            >
              <Plus className="w-6 h-6" />
              <span>Criar Nova Viagem</span>
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 text-gray-900 dark:text-white font-bold py-5 rounded-2xl transition-all flex flex-col items-center gap-2"
            >
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Entrar com ID</span>
            </button>
          </div>
        </motion.div>

        {/* Modals will be rendered below */}
        <CreateGroupModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateGroup} />
        <JoinGroupModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onJoin={handleJoinGroup} joinId={joinId} setJoinId={setJoinId} isJoining={isJoining} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Minhas Viagens</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Você tem {groups.length} planejamentos ativos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
          >
            <Users className="w-5 h-5" /> Entrar com ID
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" /> Nova Viagem
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <GroupCard key={group.id} group={group} onClick={() => onSelectGroup(group)} />
        ))}
      </div>

      <CreateGroupModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateGroup} />
      <JoinGroupModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onJoin={handleJoinGroup} joinId={joinId} setJoinId={setJoinId} isJoining={isJoining} />
    </div>
  );
}

function CreateGroupModal({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl p-8 transition-colors"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Criar nova viagem</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form className="space-y-6" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Viagem</label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ex: Carnaval em Salvador"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Viagem</label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="cursor-pointer group">
                    <input type="radio" name="type" value="solo" className="peer hidden" defaultChecked />
                    <div className="p-3 text-center rounded-xl border-2 border-gray-100 dark:border-gray-800 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 dark:peer-checked:bg-indigo-900/20 transition-all">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Solo</p>
                    </div>
                  </label>
                  <label className="cursor-pointer group">
                    <input type="radio" name="type" value="couple" className="peer hidden" />
                    <div className="p-3 text-center rounded-xl border-2 border-gray-100 dark:border-gray-800 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 dark:peer-checked:bg-indigo-900/20 transition-all">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Casal</p>
                    </div>
                  </label>
                  <label className="cursor-pointer group">
                    <input type="radio" name="type" value="group" className="peer hidden" />
                    <div className="p-3 text-center rounded-xl border-2 border-gray-100 dark:border-gray-800 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 dark:peer-checked:bg-indigo-900/20 transition-all">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Grupo</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link da Imagem (opcional)</label>
                <input
                  name="image"
                  type="url"
                  placeholder="https://exemplo.com/imagem.png"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                <textarea
                  name="description"
                  placeholder="Conte um pouco sobre os planos..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-colors"
                />
              </div>

              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all">
                Criar Viagem
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function JoinGroupModal({ isOpen, onClose, onJoin, joinId, setJoinId, isJoining }: { isOpen: boolean, onClose: () => void, onJoin: (e: React.FormEvent) => void, joinId: string, setJoinId: (v: string) => void, isJoining: boolean }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl p-8 transition-colors"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Entrar em Viagem</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form className="space-y-6" onSubmit={onJoin}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID da Viagem</label>
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC-123"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono text-xl tracking-widest transition-colors"
                  required
                />
              </div>

              <button
                disabled={isJoining}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar na Viagem"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function GroupCard({ group, onClick }: { group: Group, onClick: () => void, key?: string }) {
  const typeLabels = {
    solo: "Solo",
    couple: "Casal",
    group: "Grupo"
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden group cursor-pointer transition-colors"
    >
      <div className="h-40 overflow-hidden relative">
        <img
          src={group.image}
          alt={group.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
          {typeLabels[group.type]}
        </div>
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {group.memberCount} {group.memberCount === 1 ? 'membro' : 'membros'}
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{group.name}</h3>
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{group.inviteCode}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-4">{group.description}</p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Seu Saldo</span>
            <span className={cn(
              "text-sm font-bold",
              group.userBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            )}>
              {group.userBalance >= 0 ? "+" : ""}{formatCurrency(group.userBalance)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Próxima Data</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {group.nextTripDate ? new Date(group.nextTripDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : "A definir"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminDashboardView() {
  const stats = [
    { label: "Total de Usuários", value: "1,284", icon: <UserPlus className="w-5 h-5" />, color: "bg-blue-500" },
    { label: "Grupos Ativos", value: "452", icon: <Users className="w-5 h-5" />, color: "bg-indigo-500" },
    { label: "Viagens Realizadas", value: "892", icon: <MapPin className="w-5 h-5" />, color: "bg-emerald-500" },
    { label: "Check-ins Hoje", value: "48", icon: <Calendar className="w-5 h-5" />, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral da plataforma goTrip.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4", stat.color)}>
              {stat.icon}
            </div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">Últimos Usuários Registrados</h3>
          <button className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">Ver todos</button>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {[
            { name: "Carlos Oliveira", email: "carlos@gmail.com", date: "Hoje" },
            { name: "Mariana Costa", email: "mari@outlook.com", date: "Ontem" },
            { name: "Roberto Santos", email: "beto@uol.com.br", date: "2 dias atrás" },
          ].map((u, i) => (
            <div key={i} className="p-4 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                  {u.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 dark:text-gray-500">{u.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupDetailView({ group, onBack, onLeave, user }: { group: Group, onBack: () => void, onLeave: (id: string) => void, user: User | null }) {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState("destinations");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Edit Image State
  const [isEditImageModalOpen, setIsEditImageModalOpen] = useState(false);
  const [newImageLink, setNewImageLink] = useState(group.image);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [currentGroupImage, setCurrentGroupImage] = useState(group.image);

  // Pre-fetch all group data
  useEffect(() => {
    const fetchGroupData = async () => {
      setIsLoadingInitial(true);
      try {
        const res = await apiFetch(`/api/groups/${group.id}/data`);
        if (res.ok) {
          const data = await res.json();
          setGroupData(data);
        }
      } catch (err) {
        console.error("Error pre-fetching group data:", err);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    fetchGroupData();
  }, [group.id]);

  const copyId = () => {
    navigator.clipboard.writeText(group.inviteCode);
    showToast("Código do grupo copiado!", "success");
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await apiFetch(`/api/groups/${group.id}/leave`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLeaving(false);
      setIsLeaveModalOpen(false);
      onLeave(group.id);
    }
  };

  const handleUpdateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingImage(true);
    try {
      const res = await apiFetch(`/api/groups/${group.id}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: newImageLink }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentGroupImage(updated.image);
        setIsEditImageModalOpen(false);
      }
    } catch (err) {
      console.error("Erro ao atualizar imagem:", err);
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Viagens
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-900/30"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair da Viagem
          </button>
          <button
            onClick={copyId}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Código: {group.inviteCode} <Plus className="w-3 h-3 rotate-45" />
          </button>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeaveModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl p-8 transition-colors text-center"
            >
              <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sair da Viagem?</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Você perderá o acesso a este planejamento. Para voltar, precisará do ID novamente.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-100 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLeaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sim, Sair da Viagem"}
                </button>
                <button
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Members List Pop-up */}
      <AnimatePresence>
        {isMembersModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMembersModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden transition-colors flex flex-col"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Participantes</h2>
                </div>
                <button
                  onClick={() => setIsMembersModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="overflow-y-auto no-scrollbar pr-1 flex-1">
                <MembersView groupId={group.id} initialData={groupData?.members} />
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 shrink-0 text-center">
                <p className="text-xs text-gray-400">Total de participantes: {group.memberCount}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl overflow-hidden shadow-md shrink-0">
            <img src={currentGroupImage} alt={group.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-col mb-1">
              <span className="w-fit bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                {group.type === "solo" ? "Solo" : group.type === "couple" ? "Casal" : "Grupo"}
              </span>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">{group.name}</h1>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> {group.memberCount} membros
              </button>
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Ativo
              </span>
            </div>
          </div>
        </div>

        <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveSubTab("destinations")}
            className={cn(
              "px-5 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap",
              activeSubTab === "destinations" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            Destinos
          </button>
          <button
            onClick={() => setActiveSubTab("itinerary")}
            className={cn(
              "px-5 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap",
              activeSubTab === "itinerary" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            Roteiro
          </button>
          <button
            onClick={() => setActiveSubTab("expenses")}
            className={cn(
              "px-5 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap",
              activeSubTab === "expenses" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            Custos
          </button>
        </div>
      </div>

      <div className="pt-4">
        {isLoadingInitial ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="font-medium text-gray-500 dark:text-gray-400">Preparando sua viagem...</p>
          </div>
        ) : (
          <>
            {activeSubTab === "destinations" && <TripView groupId={group.id} initialData={groupData?.destinations} />}
            {activeSubTab === "itinerary" && <ItineraryView groupId={group.id} initialData={{ itinerary: groupData?.itinerary, flights: groupData?.flights, stays: groupData?.stays }} />}
            {activeSubTab === "expenses" && <ExpenseList groupType={group.type} groupId={group.id} currentUserId={user?.id || ""} initialData={{ expenses: groupData?.expenses, members: groupData?.members }} />}
          </>
        )}
      </div>
    </div>
  );
}

function MembersView({ groupId, initialData }: { groupId: string, initialData?: any[] }) {
  const [members, setMembers] = useState<any[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
      setMembers(initialData);
      setIsLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch(`/api/groups/${groupId}/members`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
        }
      } catch (err) {
        console.error("Error fetching members:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMembers();
  }, [groupId, initialData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="font-medium text-gray-500 dark:text-gray-400">Carregando membros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Membros do Grupo</h2>
          <p className="text-gray-500 dark:text-gray-400">Veja quem está participando desta viagem.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map(member => (
          <div key={member.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-lg uppercase">
                {member.name[0]}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{member.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
              </div>
            </div>
            {member.role === 'OWNER' && (
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Admin
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
