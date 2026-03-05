import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, MapPin, Plus, Trash2, X, Plane, Hotel, Navigation, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { apiFetch } from "../../lib/api";

interface ItineraryItem {
  id: string;
  title: string;
  time: string | null;
  location: string | null;
  date: string;
  type: string; // day_header, transport, stay, food, activity, other
}

interface GroupedDay {
  dateKey: string;
  headerId?: string;
  title: string;
  activities: ItineraryItem[];
}

interface Flight {
  id: string;
  number: string | null;
  airline: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  origin: string | null;
  destination: string | null;
}

interface Stay {
  id: string;
  name: string;
  address: string | null;
  checkIn: string | null;
  checkOut: string | null;
}

interface ItineraryViewProps {
  groupId: string;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({ groupId }) => {
  const [days, setDays] = useState<GroupedDay[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"days" | "logistics">("days");

  // Modals
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [isAddFlightModalOpen, setIsAddFlightModalOpen] = useState(false);
  const [isAddStayModalOpen, setIsAddStayModalOpen] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Day form
  const [newDayDate, setNewDayDate] = useState("");
  const [newDayTitle, setNewDayTitle] = useState("");

  // Activity form
  const [newActivityTime, setNewActivityTime] = useState("");
  const [newActivityDesc, setNewActivityDesc] = useState("");
  const [newActivityLoc, setNewActivityLoc] = useState("");
  const [newActivityType, setNewActivityType] = useState("activity");

  // Flight form
  const [fNumber, setFNumber] = useState("");
  const [fAirline, setFAirline] = useState("");
  const [fDepTime, setFDepTime] = useState("");
  const [fArrTime, setFArrTime] = useState("");
  const [fOrigin, setFOrigin] = useState("");
  const [fDest, setFDest] = useState("");

  // Stay form
  const [sName, setSName] = useState("");
  const [sAddress, setSAddress] = useState("");
  const [sCheckIn, setSCheckIn] = useState("");
  const [sCheckOut, setSCheckOut] = useState("");

  useEffect(() => {
    fetchAll();
  }, [groupId]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [itinRes, flightsRes, staysRes] = await Promise.all([
        apiFetch(`/api/groups/${groupId}/itinerary`),
        apiFetch(`/api/groups/${groupId}/flights`),
        apiFetch(`/api/groups/${groupId}/stays`),
      ]);
      if (itinRes.ok) {
        const items: ItineraryItem[] = await itinRes.json();
        setDays(groupItemsByDate(items));
      }
      if (flightsRes.ok) setFlights(await flightsRes.json());
      if (staysRes.ok) setStays(await staysRes.json());
    } finally {
      setIsLoading(false);
    }
  };

  const groupItemsByDate = (items: ItineraryItem[]): GroupedDay[] => {
    const map: Record<string, GroupedDay> = {};
    for (const item of items) {
      const dateKey = item.date.split("T")[0];
      if (!map[dateKey]) {
        map[dateKey] = { dateKey, title: dateKey, activities: [] };
      }
      if (item.type === "day_header") {
        map[dateKey].headerId = item.id;
        map[dateKey].title = item.title;
      } else {
        map[dateKey].activities.push(item);
      }
    }
    return Object.values(map).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  };

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
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteDay = async (day: GroupedDay) => {
    try {
      await apiFetch(`/api/groups/${groupId}/itinerary/day?date=${day.dateKey}`, { method: "DELETE" });
      setDays((prev) => prev.filter((d) => d.dateKey !== day.dateKey));
    } catch (err) { console.error(err); }
  };

  const handleDeleteActivity = async (itemId: string) => {
    try {
      await apiFetch(`/api/itinerary/${itemId}`, { method: "DELETE" });
      setDays((prev) =>
        prev.map((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== itemId) }))
      );
    } catch (err) { console.error(err); }
  };

  const handleAddFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/groups/${groupId}/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: fNumber, airline: fAirline, departureTime: fDepTime, arrivalTime: fArrTime, origin: fOrigin, destination: fDest }),
      });
      if (res.ok) {
        const flight = await res.json();
        setFlights((prev) => [...prev, flight]);
        setIsAddFlightModalOpen(false);
        setFNumber(""); setFAirline(""); setFDepTime(""); setFArrTime(""); setFOrigin(""); setFDest("");
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteFlight = async (id: string) => {
    try {
      await apiFetch(`/api/flights/${id}`, { method: "DELETE" });
      setFlights((prev) => prev.filter((f) => f.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleAddStay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/groups/${groupId}/stays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sName, address: sAddress, checkIn: sCheckIn, checkOut: sCheckOut }),
      });
      if (res.ok) {
        const stay = await res.json();
        setStays((prev) => [...prev, stay]);
        setIsAddStayModalOpen(false);
        setSName(""); setSAddress(""); setSCheckIn(""); setSCheckOut("");
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteStay = async (id: string) => {
    try {
      await apiFetch(`/api/stays/${id}`, { method: "DELETE" });
      setStays((prev) => prev.filter((s) => s.id !== id));
    } catch (err) { console.error(err); }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "transport": return <Plane className="w-3.5 h-3.5" />;
      case "stay": return <Hotel className="w-3.5 h-3.5" />;
      case "food": return <span className="text-xs">🍽️</span>;
      default: return <MapPin className="w-3.5 h-3.5" />;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão da Viagem</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Roteiro, voos e hospedagem em um só lugar.</p>
        </div>
        <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm self-start transition-colors">
          <button onClick={() => setActiveSection("days")} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", activeSection === "days" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}>
            <Calendar className="w-3.5 h-3.5" /> Roteiro
          </button>
          <button onClick={() => setActiveSection("logistics")} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", activeSection === "logistics" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}>
            <Navigation className="w-3.5 h-3.5" /> Logística
          </button>
        </div>
      </div>

      {activeSection === "days" ? (
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
            <div className="space-y-6">
              {days.map((day, index) => (
                <motion.div key={day.dateKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                  <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                        <span className="text-[10px] font-bold uppercase leading-none">{new Date(day.dateKey + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(day.dateKey + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit" })}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{day.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(day.dateKey + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedDayKey(day.dateKey); setIsAddActivityModalOpen(true); }} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors"><Plus className="w-5 h-5" /></button>
                      <button onClick={() => handleDeleteDay(day)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>

                  <div className="p-6">
                    {day.activities.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-600 italic text-center py-4">Nenhuma atividade planejada.</p>
                    ) : (
                      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 dark:before:from-indigo-900/50 before:via-indigo-100 before:to-transparent">
                        {day.activities.map((activity) => (
                          <div key={activity.id} className="relative flex items-start gap-6 group">
                            <div className="absolute left-5 -translate-x-1/2 mt-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 bg-indigo-600 shadow-sm z-10"></div>
                            <div className="flex-1 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-4 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 hover:bg-white dark:hover:bg-gray-800 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                  {getActivityIcon(activity.type)}
                                  <span className="text-xs font-bold">{activity.time}</span>
                                </div>
                                <button onClick={() => handleDeleteActivity(activity.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-lg transition-all"><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <h4 className="font-bold text-gray-900 dark:text-white text-sm">{activity.title}</h4>
                              {activity.location && (
                                <div className="flex items-center gap-1.5 mt-2 text-gray-500 dark:text-gray-400">
                                  <MapPin className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">{activity.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Flights */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Plane className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Voos e Transportes</h3>
              <button onClick={() => setIsAddFlightModalOpen(true)} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar Voo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flights.map((flight) => (
                <div key={flight.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-colors">
                  <button onClick={() => handleDeleteFlight(flight.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">{flight.airline} • {flight.number}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{flight.departureTime ? new Date(flight.departureTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{flight.origin}</p>
                    </div>
                    <div className="flex flex-col items-center px-4">
                      <Plane className="w-4 h-4 text-gray-300 dark:text-gray-700 rotate-90" />
                      <div className="h-px w-12 bg-gray-100 dark:bg-gray-800 my-2"></div>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{flight.destination}</p>
                    </div>
                  </div>
                </div>
              ))}
              {flights.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-600 italic">Nenhum voo cadastrado.</p>}
            </div>
          </section>

          {/* Stays */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Hotel className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Hospedagem</h3>
              <button onClick={() => setIsAddStayModalOpen(true)} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar Estadia</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stays.map((stay) => (
                <div key={stay.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-colors">
                  <button onClick={() => handleDeleteStay(stay.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{stay.name}</h4>
                  {stay.address && <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-4"><MapPin className="w-4 h-4" /><span className="text-xs">{stay.address}</span></div>}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Check-in</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{stay.checkIn ? new Date(stay.checkIn).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Check-out</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{stay.checkOut ? new Date(stay.checkOut).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
              {stays.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-600 italic">Nenhuma hospedagem cadastrada.</p>}
            </div>
          </section>
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddDayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddDayModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors">
              <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Dia</h2><button onClick={() => setIsAddDayModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6 text-gray-400" /></button></div>
              <form onSubmit={handleAddDay} className="space-y-6">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label><input type="date" value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Dia</label><input type="text" value={newDayTitle} onChange={(e) => setNewDayTitle(e.target.value)} placeholder="Ex: Chegada e Check-in" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" required /></div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all">Confirmar Dia</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddActivityModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddActivityModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors">
              <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nova Atividade</h2><button onClick={() => setIsAddActivityModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6 text-gray-400" /></button></div>
              <form onSubmit={handleAddActivity} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário</label><input type="time" value={newActivityTime} onChange={(e) => setNewActivityTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select value={newActivityType} onChange={(e) => setNewActivityType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors">
                      <option value="activity">Atividade</option>
                      <option value="transport">Transporte</option>
                      <option value="stay">Hospedagem</option>
                      <option value="food">Alimentação</option>
                    </select>
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label><input type="text" value={newActivityDesc} onChange={(e) => setNewActivityDesc(e.target.value)} placeholder="Ex: Almoço no Centro Histórico" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local (opcional)</label><input type="text" value={newActivityLoc} onChange={(e) => setNewActivityLoc(e.target.value)} placeholder="Ex: Restaurante do Porto" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all">Adicionar ao Roteiro</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddFlightModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddFlightModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors">
              <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Voo</h2><button onClick={() => setIsAddFlightModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6 text-gray-400" /></button></div>
              <form onSubmit={handleAddFlight} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Cia Aérea</label><input type="text" value={fAirline} onChange={(e) => setFAirline(e.target.value)} placeholder="GOL, LATAM..." className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Nº Voo</label><input type="text" value={fNumber} onChange={(e) => setFNumber(e.target.value)} placeholder="G3 1234" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Origem</label><input type="text" value={fOrigin} onChange={(e) => setFOrigin(e.target.value)} placeholder="GRU" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Destino</label><input type="text" value={fDest} onChange={(e) => setFDest(e.target.value)} placeholder="FLN" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Partida</label><input type="datetime-local" value={fDepTime} onChange={(e) => setFDepTime(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Chegada</label><input type="datetime-local" value={fArrTime} onChange={(e) => setFArrTime(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4">Salvar Voo</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddStayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddStayModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors">
              <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Hospedagem</h2><button onClick={() => setIsAddStayModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6 text-gray-400" /></button></div>
              <form onSubmit={handleAddStay} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-400 uppercase">Nome do Hotel/Airbnb</label><input type="text" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Hotel Paradiso" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" required /></div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase">Endereço</label><input type="text" value={sAddress} onChange={(e) => setSAddress(e.target.value)} placeholder="Rua das Flores, 123" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Check-in</label><input type="date" value={sCheckIn} onChange={(e) => setSCheckIn(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase">Check-out</label><input type="date" value={sCheckOut} onChange={(e) => setSCheckOut(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors" /></div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4">Salvar Hospedagem</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
