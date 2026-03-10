import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, MapPin, Plus, Trash2, X, Plane, Hotel, Loader2, Camera, Car, Utensils, Ticket, Compass } from "lucide-react";
import { cn } from "../../lib/utils";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

interface ItineraryItem {
  id: string;
  title: string;
  time: string | null;
  location: string | null;
  date: string;
  type: string;
}

interface GroupedDay {
  dateKey: string;
  headerId?: string;
  title: string;
  activities: ItineraryItem[];
}

interface ItineraryViewProps {
  groupId: string;
  currentUserId: string;
  userIdentityDoc?: string;
  initialData?: {
    itinerary?: any[];
    members?: any[];
  };
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({ groupId, currentUserId, userIdentityDoc, initialData }) => {
  const [days, setDays] = useState<GroupedDay[]>(initialData?.itinerary ? groupItemsByDate(initialData.itinerary) : []);
  const [members, setMembers] = useState<any[]>(initialData?.members || []);
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(!initialData);

  // Modals
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Day form
  const [newDayDate, setNewDayDate] = useState("");
  const [newDayTitle, setNewDayTitle] = useState("");

  // Activity form
  const [newActivityTime, setNewActivityTime] = useState("");
  const [newActivityDesc, setNewActivityDesc] = useState("");
  const [newActivityLoc, setNewActivityLoc] = useState("");
  const [newActivityType, setNewActivityType] = useState("activity");

  const fetchAll = async () => {
    try {
      const res = await apiFetch(`/api/groups/${groupId}/data`);
      if (res.ok) {
        const data = await res.json();
        setDays(groupItemsByDate(data.itinerary));
        setMembers(data.members);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const hasMounted = useRef(false);

  useEffect(() => {
    if (initialData && !hasMounted.current) {
      setDays(groupItemsByDate(initialData.itinerary || []));
      setIsLoading(false);
      hasMounted.current = true;
      return;
    }
    if (!initialData) fetchAll();
  }, [groupId, initialData]);

  function groupItemsByDate(items: ItineraryItem[]): GroupedDay[] {
    const map: Record<string, GroupedDay> = {};
    for (const item of items) {
      const dateKey = typeof item.date === 'string' ? item.date.split("T")[0] : new Date(item.date).toISOString().split("T")[0];
      if (!map[dateKey]) {
        map[dateKey] = { dateKey, title: "", activities: [] };
      }
      if (item.type === "day_header") {
        map[dateKey].headerId = item.id;
        map[dateKey].title = item.title;
      } else {
        map[dateKey].activities.push(item);
      }
    }
    return Object.values(map).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayDate || !newDayTitle) return;
    try {
      const res = await apiFetch(`/api/groups/${groupId}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDayTitle, date: newDayDate, type: "day_header" }),
      });
      if (res.ok) {
        await fetchAll();
        setIsAddDayModalOpen(false);
        setNewDayDate(""); setNewDayTitle("");
        showToast("Dia adicionado!", "success");
      }
    } catch (err) { console.error(err); }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayKey || !newActivityTime || !newActivityDesc) return;
    try {
      const res = await apiFetch(`/api/groups/${groupId}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newActivityDesc, time: newActivityTime, location: newActivityLoc, date: selectedDayKey, type: newActivityType }),
      });
      if (res.ok) {
        await fetchAll();
        setIsAddActivityModalOpen(false);
        setNewActivityTime(""); setNewActivityDesc(""); setNewActivityLoc(""); setNewActivityType("activity");
        showToast("Atividade adicionada!", "success");
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteDay = async (day: GroupedDay) => {
    if (!confirm("Excluir este dia e todas as atividades?")) return;
    try {
      await apiFetch(`/api/groups/${groupId}/itinerary/day?date=${day.dateKey}`, { method: "DELETE" });
      setDays((prev) => prev.filter((d) => d.dateKey !== day.dateKey));
      showToast("Dia removido", "success");
    } catch (err) { console.error(err); }
  };

  const handleDeleteActivity = async (itemId: string) => {
    try {
      await apiFetch(`/api/itinerary/${itemId}`, { method: "DELETE" });
      setDays((prev) =>
        prev.map((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== itemId) }))
      );
      showToast("Atividade removida", "success");
    } catch (err) { console.error(err); }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "transport": return <Car className="w-3.5 h-3.5" />;
      case "stay": return <Hotel className="w-3.5 h-3.5" />;
      case "food": return <Utensils className="w-3.5 h-3.5" />;
      case "tour": return <Camera className="w-3.5 h-3.5" />;
      case "activity": return <Ticket className="w-3.5 h-3.5" />;
      default: return <Compass className="w-3.5 h-3.5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="font-medium text-gray-500 dark:text-gray-400">Carregando roteiro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Roteiro</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Planeje os detalhes de sua viagem dia após dia.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => setIsAddDayModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Adicionar Dia
          </button>
        </div>

        {days.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center transition-colors">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nenhum dia cadastrado</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6">Comece adicionando o primeiro dia da sua viagem.</p>
            <button onClick={() => setIsAddDayModalOpen(true)} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Adicionar primeiro dia</button>
          </div>
        ) : (
          <div className="space-y-8">
            {days.map((day, index) => {
              const isToday = new Date(day.dateKey).toLocaleDateString('pt-BR') === new Date().toLocaleDateString('pt-BR');

              return (
                <div key={day.dateKey} className="relative pl-8 md:pl-10">
                  {/* Timeline line */}
                  <div className={cn(
                    "absolute left-[11px] md:left-[13px] top-6 w-0.5 bg-gray-200 dark:bg-gray-800",
                    index === days.length - 1 ? "bottom-0" : "-bottom-8"
                  )}></div>

                  <div className={cn(
                    "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-4 rounded-3xl transition-colors border-2",
                    isToday ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-500/30" : "border-transparent"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "absolute left-0 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-950 z-10 shadow-sm",
                        isToday ? "bg-emerald-500 w-7 h-7 md:w-8 md:h-8 -ml-0.5" : "bg-indigo-600"
                      )}>
                        <Calendar className={cn(
                          "text-white",
                          isToday ? "w-3 h-3 md:w-3.5 md:h-3.5" : "w-2.5 h-2.5 md:w-3 md:h-3"
                        )} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {new Date(day.dateKey).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                          {isToday && <span className="text-[10px] uppercase font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm ml-2">Hoje</span>}
                        </h3>
                        {day.title && <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{day.title}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedDayKey(day.dateKey); setIsAddActivityModalOpen(true); }} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all">
                        <Plus className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteDay(day)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 pl-0">
                    {day.activities.map((activity) => (
                      <div key={activity.id} className="group relative pl-2 md:pl-4">
                        {/* Activity Dot linking to the absolute line of the day */}
                        <div className="absolute -left-[27px] md:-left-[23px] top-[1.3rem] w-3 h-3 bg-indigo-100 dark:bg-indigo-900/50 border-2 border-indigo-400 dark:border-indigo-500 rounded-full z-10"></div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/30">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-colors">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  {activity.time && <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{activity.time}</span>}
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{activity.title}</h4>
                                </div>
                                {activity.location && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <MapPin className="w-3 h-3" />
                                    <span>{activity.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteActivity(activity.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {day.activities.length === 0 && (
                      <div className="py-4 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-400 italic">Nenhuma atividade para este dia.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddDayModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddDayModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Adicionar Dia</h2>
                <button onClick={() => setIsAddDayModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddDay} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Data</label>
                  <input type="date" required value={newDayDate} onChange={e => setNewDayDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Título (Opcional)</label>
                  <input type="text" placeholder="Ex: Chegada em Paris" value={newDayTitle} onChange={e => setNewDayTitle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all">Adicionar Dia</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddActivityModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddActivityModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Adicionar Atividade</h2>
                <button onClick={() => setIsAddActivityModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Horário</label>
                    <input type="time" required value={newActivityTime} onChange={e => setNewActivityTime(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Tipo</label>
                    <select value={newActivityType} onChange={e => setNewActivityType(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none [color-scheme:light] dark:[color-scheme:dark]">
                      <option className="bg-white dark:bg-gray-900" value="activity">Atividade</option>
                      <option className="bg-white dark:bg-gray-900" value="transport">Transporte</option>
                      <option className="bg-white dark:bg-gray-900" value="stay">Hospedagem</option>
                      <option className="bg-white dark:bg-gray-900" value="food">Alimentação</option>
                      <option className="bg-white dark:bg-gray-900" value="tour">Passeio</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Descrição</label>
                  <input type="text" placeholder="O que você vai fazer?" required value={newActivityDesc} onChange={e => setNewActivityDesc(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Localização (Opcional)</label>
                  <input type="text" placeholder="Ex: Museu do Louvre" value={newActivityLoc} onChange={e => setNewActivityLoc(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all">Adicionar Atividade</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ItineraryView;
