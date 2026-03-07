import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, MapPin, Plus, Trash2, X, Plane, Hotel, Navigation, Loader2, Car, Shield, ShieldCheck, ArrowRight, ArrowLeftRight, CreditCard, Info } from "lucide-react";
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
  boardingPassUrl?: string | null;
  identityDocUrl?: string | null;
}

interface Stay {
  id: string;
  name: string;
  address: string | null;
  checkIn: string | null;
  checkOut: string | null;
}

interface CarRental {
  id: string;
  company: string;
  model: string | null;
  pickupLocation: string | null;
  pickupTime: string | null;
  dropoffLocation: string | null;
  dropoffTime: string | null;
  confirmationCode: string | null;
}

interface Insurance {
  id: string;
  provider: string;
  policyNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  contactInfo: string | null;
}

interface ItineraryViewProps {
  groupId: string;
  initialData?: {
    itinerary?: ItineraryItem[];
    flights?: Flight[];
    stays?: Stay[];
    carRentals?: CarRental[];
    insurances?: Insurance[];
  };
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({ groupId, initialData }) => {
  const [days, setDays] = useState<GroupedDay[]>(initialData ? groupItemsByDate(initialData.itinerary) : []);
  const [flights, setFlights] = useState<Flight[]>(initialData?.flights || []);
  const [stays, setStays] = useState<Stay[]>(initialData?.stays || []);
  const [carRentals, setCarRentals] = useState<CarRental[]>(initialData?.carRentals || []);
  const [insurances, setInsurances] = useState<Insurance[]>(initialData?.insurances || []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [activeSection, setActiveSection] = useState<"days" | "logistics">("days");
  const [logisticsTab, setLogisticsTab] = useState<"all" | "flights" | "stays" | "rentals" | "insurances">("all");

  // Modals
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [isAddFlightModalOpen, setIsAddFlightModalOpen] = useState(false);
  const [isAddStayModalOpen, setIsAddStayModalOpen] = useState(false);
  const [isAddRentalModalOpen, setIsAddRentalModalOpen] = useState(false);
  const [isAddInsuranceModalOpen, setIsAddInsuranceModalOpen] = useState(false);
  const [isBoardingPassModalOpen, setIsBoardingPassModalOpen] = useState(false);
  const [viewingBoardingPassUrl, setViewingBoardingPassUrl] = useState<string | null>(null);
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
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [rNumber, setRNumber] = useState("");
  const [rAirline, setRAirline] = useState("");
  const [rDepTime, setRDepTime] = useState("");
  const [rArrTime, setRArrTime] = useState("");
  const [fBoardingPassUrl, setFBoardingPassUrl] = useState("");
  const [rBoardingPassUrl, setRBoardingPassUrl] = useState("");
  const [fIdentityDocUrl, setFIdentityDocUrl] = useState("");
  const [rIdentityDocUrl, setRIdentityDocUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiFetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Erro no upload");
    }

    const data = await res.json();
    return data.url;
  };

  // Stay form
  const [sName, setSName] = useState("");
  const [sAddress, setSAddress] = useState("");
  const [sCheckIn, setSCheckIn] = useState("");
  const [sCheckOut, setSCheckOut] = useState("");

  // Car Rental form
  const [crCompany, setCrCompany] = useState("");
  const [crModel, setCrModel] = useState("");
  const [crPickupLoc, setCrPickupLoc] = useState("");
  const [crPickupTime, setCrPickupTime] = useState("");
  const [crDropoffLoc, setCrDropoffLoc] = useState("");
  const [crDropoffTime, setCrDropoffTime] = useState("");
  const [crCode, setCrCode] = useState("");

  // Insurance form
  const [insProvider, setInsProvider] = useState("");
  const [insPolicy, setInsPolicy] = useState("");
  const [insStart, setInsStart] = useState("");
  const [insEnd, setInsEnd] = useState("");
  const [insContact, setInsContact] = useState("");

  useEffect(() => {
    if (initialData) {
      setDays(groupItemsByDate(initialData.itinerary || []));
      setFlights(initialData.flights || []);
      setStays(initialData.stays || []);
      setCarRentals(initialData.carRentals || []);
      setInsurances(initialData.insurances || []);
      setIsLoading(false);
      return;
    }
    fetchAll();
  }, [groupId, initialData]);

  function groupItemsByDate(items: ItineraryItem[]): GroupedDay[] {
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
  }

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [itinRes, flightsRes, staysRes, rentalsRes, insRes] = await Promise.all([
        apiFetch(`/api/groups/${groupId}/itinerary`),
        apiFetch(`/api/groups/${groupId}/flights`),
        apiFetch(`/api/groups/${groupId}/stays`),
        apiFetch(`/api/groups/${groupId}/rentals`),
        apiFetch(`/api/groups/${groupId}/insurances`),
      ]);
      if (itinRes.ok) {
        const items: ItineraryItem[] = await itinRes.json();
        setDays(groupItemsByDate(items));
      }
      if (flightsRes.ok) setFlights(await flightsRes.json());
      if (staysRes.ok) setStays(await staysRes.json());
      if (rentalsRes.ok) setCarRentals(await rentalsRes.json());
      if (insRes.ok) setInsurances(await insRes.json());
    } finally {
      setIsLoading(false);
    }
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
      const payload: any = {
        number: fNumber, airline: fAirline, departureTime: fDepTime, arrivalTime: fArrTime, origin: fOrigin, destination: fDest,
        isRoundTrip,
        boardingPassUrl: fBoardingPassUrl,
        rBoardingPassUrl: rBoardingPassUrl,
        identityDocUrl: fIdentityDocUrl,
        rIdentityDocUrl: rIdentityDocUrl
      };

      if (isRoundTrip) {
        payload.returnFlight = {
          number: rNumber,
          airline: rAirline,
          departureTime: rDepTime,
          arrivalTime: rArrTime,
          origin: fDest, // Inverte
          destination: fOrigin
        };
      }

      const res = await apiFetch(`/api/groups/${groupId}/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newFlights = await res.json();
        setFlights((prev) => [...prev, ...(Array.isArray(newFlights) ? newFlights : [newFlights])]);
        setIsAddFlightModalOpen(false);
        setFNumber(""); setFAirline(""); setFDepTime(""); setFArrTime(""); setFOrigin(""); setFDest("");
        setIsRoundTrip(false); setRNumber(""); setRAirline(""); setRDepTime(""); setRArrTime("");
        setFBoardingPassUrl(""); setRBoardingPassUrl(""); setFIdentityDocUrl(""); setRIdentityDocUrl("");
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

  const handleAddRental = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/groups/${groupId}/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: crCompany, model: crModel, pickupLocation: crPickupLoc, pickupTime: crPickupTime, dropoffLocation: crDropoffLoc, dropoffTime: crDropoffTime, confirmationCode: crCode }),
      });
      if (res.ok) {
        const rental = await res.json();
        setCarRentals((prev) => [...prev, rental]);
        setIsAddRentalModalOpen(false);
        setCrCompany(""); setCrModel(""); setCrPickupLoc(""); setCrPickupTime(""); setCrDropoffLoc(""); setCrDropoffTime(""); setCrCode("");
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteRental = async (id: string) => {
    try {
      await apiFetch(`/api/rentals/${id}`, { method: "DELETE" });
      setCarRentals((prev) => prev.filter((r) => r.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleAddInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/groups/${groupId}/insurances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: insProvider, policyNumber: insPolicy, startDate: insStart, endDate: insEnd, contactInfo: insContact }),
      });
      if (res.ok) {
        const ins = await res.json();
        setInsurances((prev) => [...prev, ins]);
        setIsAddInsuranceModalOpen(false);
        setInsProvider(""); setInsPolicy(""); setInsStart(""); setInsEnd(""); setInsContact("");
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteInsurance = async (id: string) => {
    try {
      await apiFetch(`/api/insurances/${id}`, { method: "DELETE" });
      setInsurances((prev) => prev.filter((i) => i.id !== id));
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
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="font-medium text-gray-500 dark:text-gray-400">Carregando roteiro e logística...</p>
      </div>
    );
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
        <div className="space-y-6">
          {/* Logistics Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: "all", label: "Tudo", icon: Navigation },
              { id: "flights", label: "Voos", icon: Plane },
              { id: "stays", label: "Hospedagem", icon: Hotel },
              { id: "rentals", label: "Aluguel", icon: Car },
              { id: "insurances", label: "Seguro", icon: ShieldCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLogisticsTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border",
                  logisticsTab === tab.id
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-indigo-200"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Flights Section */}
            {(logisticsTab === "all" || logisticsTab === "flights") && (
              <section className="col-span-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Plane className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Voos</h3>
                  <button onClick={() => setIsAddFlightModalOpen(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {flights.map((flight) => (
                    <motion.div layout key={flight.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-colors">
                      <button onClick={() => handleDeleteFlight(flight.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg flex items-center gap-2">
                          <Plane className="w-3 h-3" /> {flight.airline} • {flight.number}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{flight.departureTime ? new Date(flight.departureTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
                          <div className="flex flex-col">
                            <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{flight.origin}</p>
                            <p className="text-[10px] text-gray-400">{flight.departureTime ? new Date(flight.departureTime).toLocaleDateString("pt-BR") : ""}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center px-4">
                          <Plane className="w-4 h-4 text-gray-300 dark:text-gray-700 rotate-90" />
                          <div className="h-px w-12 bg-gray-100 dark:bg-gray-800 my-2"></div>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
                          <div className="flex flex-col">
                            <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{flight.destination}</p>
                            <p className="text-[10px] text-gray-400">{flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleDateString("pt-BR") : ""}</p>
                          </div>
                        </div>
                      </div>
                      {(flight.boardingPassUrl || flight.identityDocUrl) && (
                        <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex flex-col gap-2">
                          {flight.boardingPassUrl && (
                            <button
                              onClick={() => {
                                setViewingBoardingPassUrl(flight.boardingPassUrl!);
                                setIsBoardingPassModalOpen(true);
                              }}
                              className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-2 border border-emerald-100/50 dark:border-emerald-900/10"
                            >
                              <ShieldCheck className="w-4 h-4" /> Ver Cartão de Embarque
                            </button>
                          )}
                          {flight.identityDocUrl && (
                            <button
                              onClick={() => {
                                setViewingBoardingPassUrl(flight.identityDocUrl!);
                                setIsBoardingPassModalOpen(true);
                              }}
                              className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-center gap-2 border border-indigo-100/50 dark:border-indigo-900/10"
                            >
                              <CreditCard className="w-4 h-4" /> Ver Identidade (CNH/RG)
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {flights.length === 0 && logisticsTab === "flights" && (
                    <div className="col-span-full py-12 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                      <Plane className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 italic">Nenhum voo cadastrado.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Stays Section */}
            {(logisticsTab === "all" || logisticsTab === "stays") && (
              <section className="col-span-full space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Hotel className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Hospedagem</h3>
                  <button onClick={() => setIsAddStayModalOpen(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stays.map((stay) => (
                    <motion.div layout key={stay.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-colors">
                      <button onClick={() => handleDeleteStay(stay.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                          <Hotel className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{stay.name}</h4>
                          {stay.address && <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {stay.address}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Check-in</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{stay.checkIn ? new Date(stay.checkIn).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Check-out</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{stay.checkOut ? new Date(stay.checkOut).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {stays.length === 0 && logisticsTab === "stays" && (
                    <div className="col-span-full py-12 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                      <Hotel className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 italic">Nenhuma hospedagem cadastrada.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Car Rentals Section */}
            {(logisticsTab === "all" || logisticsTab === "rentals") && (
              <section className="col-span-full space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Car className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Aluguel de Carros</h3>
                  <button onClick={() => setIsAddRentalModalOpen(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {carRentals.map((rental) => (
                    <motion.div layout key={rental.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-colors">
                      <button onClick={() => handleDeleteRental(rental.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                          <Car className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{rental.company}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rental.model || "Modelo não informado"}</p>
                          {rental.confirmationCode && (
                            <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-400 rounded-md">
                              <CreditCard className="w-3 h-3" /> {rental.confirmationCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Retirada</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{rental.pickupTime ? new Date(rental.pickupTime).toLocaleDateString("pt-BR") : "—"}</p>
                          <p className="text-[10px] text-gray-500 truncate">{rental.pickupLocation}</p>
                        </div>
                        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Devolução</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{rental.dropoffTime ? new Date(rental.dropoffTime).toLocaleDateString("pt-BR") : "—"}</p>
                          <p className="text-[10px] text-gray-500 truncate">{rental.dropoffLocation}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {carRentals.length === 0 && logisticsTab === "rentals" && (
                    <div className="col-span-full py-12 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                      <Car className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 italic">Nenhum aluguel cadastrado.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Insurance Section */}
            {(logisticsTab === "all" || logisticsTab === "insurances") && (
              <section className="col-span-full space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Seguro Viagem</h3>
                  <button onClick={() => setIsAddInsuranceModalOpen(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insurances.map((ins) => (
                    <motion.div layout key={ins.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-colors">
                      <button onClick={() => handleDeleteInsurance(ins.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{ins.provider}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Apólice: {ins.policyNumber || "Não informada"}</p>
                          {ins.contactInfo && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                              <Info className="w-3.5 h-3.5" /> Emergência: {ins.contactInfo}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Início</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{ins.startDate ? new Date(ins.startDate).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fim</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{ins.endDate ? new Date(ins.endDate).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {insurances.length === 0 && logisticsTab === "insurances" && (
                    <div className="col-span-full py-12 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                      <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 italic">Nenhum seguro cadastrado.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
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
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl p-8 transition-colors max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <Plane className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Voo</h2>
                </div>
                <button onClick={() => setIsAddFlightModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleAddFlight} className="space-y-6">
                <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Voo de Ida
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cia Aérea</label><input type="text" value={fAirline} onChange={(e) => setFAirline(e.target.value)} placeholder="GOL, LATAM..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº Voo</label><input type="text" value={fNumber} onChange={(e) => setFNumber(e.target.value)} placeholder="G3 1234" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Origem</label><input type="text" value={fOrigin} onChange={(e) => setFOrigin(e.target.value)} placeholder="GRU" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Destino</label><input type="text" value={fDest} onChange={(e) => setFDest(e.target.value)} placeholder="FLN" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Partida</label><input type="datetime-local" value={fDepTime} onChange={(e) => setFDepTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chegada</label><input type="datetime-local" value={fArrTime} onChange={(e) => setFArrTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cartão de Embarque</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploading(true);
                            try {
                              const url = await handleFileUpload(file);
                              setFBoardingPassUrl(url);
                            } catch (err: any) {
                              alert("Erro no upload: " + err.message);
                            } finally {
                              setIsUploading(false);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-[10px] text-gray-500 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        disabled={isUploading}
                      />
                      {fBoardingPassUrl && <p className="text-[9px] text-emerald-600 mt-0.5 flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> OK</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Identidade (CNH/RG)</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploading(true);
                            try {
                              const url = await handleFileUpload(file);
                              setFIdentityDocUrl(url);
                            } catch (err: any) {
                              alert("Erro no upload: " + err.message);
                            } finally {
                              setIsUploading(false);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-[10px] text-gray-500 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        disabled={isUploading}
                      />
                      {fIdentityDocUrl && <p className="text-[9px] text-emerald-600 mt-0.5 flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> OK</p>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg transition-colors", isRoundTrip ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-400")}>
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Voo de volta</p>
                      <p className="text-[10px] text-gray-500">Cadastrar retorno simultaneamente</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRoundTrip(!isRoundTrip)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors",
                      isRoundTrip ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                    )}
                  >
                    <motion.div
                      animate={{ x: isRoundTrip ? 26 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {isRoundTrip && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 rotate-180" /> Voo de Volta
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cia Aérea</label><input type="text" value={rAirline} onChange={(e) => setRAirline(e.target.value)} placeholder="GOL, LATAM..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº Voo</label><input type="text" value={rNumber} onChange={(e) => setRNumber(e.target.value)} placeholder="G3 5678" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 opacity-70">
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Origem</label><input type="text" value={fDest} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 outline-none text-sm font-bold cursor-not-allowed" /></div>
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Destino</label><input type="text" value={fOrigin} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 outline-none text-sm font-bold cursor-not-allowed" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Partida (Retorno)</label><input type="datetime-local" value={rDepTime} onChange={(e) => setRDepTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs" /></div>
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chegada (Retorno)</label><input type="datetime-local" value={rArrTime} onChange={(e) => setRArrTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cartão de Volta</label>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIsUploading(true);
                                try {
                                  const url = await handleFileUpload(file);
                                  setRBoardingPassUrl(url);
                                } catch (err: any) {
                                  alert("Erro no upload: " + err.message);
                                } finally {
                                  setIsUploading(false);
                                }
                              }
                            }}
                            className="w-full px-3 py-2 text-[10px] text-gray-500 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            disabled={isUploading}
                          />
                          {rBoardingPassUrl && <p className="text-[9px] text-emerald-600 mt-0.5 flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> OK</p>}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Identidade Volta</label>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIsUploading(true);
                                try {
                                  const url = await handleFileUpload(file);
                                  setRIdentityDocUrl(url);
                                } catch (err: any) {
                                  alert("Erro no upload: " + err.message);
                                } finally {
                                  setIsUploading(false);
                                }
                              }
                            }}
                            className="w-full px-3 py-2 text-[10px] text-gray-500 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            disabled={isUploading}
                          />
                          {rIdentityDocUrl && <p className="text-[9px] text-emerald-600 mt-0.5 flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> OK</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all mt-4 flex items-center justify-center gap-2"
                >
                  <Plane className="w-5 h-5" /> {isUploading ? "Enviando arquivo..." : `Salvar ${isRoundTrip ? "Voos" : "Voo"}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddStayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddStayModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <Hotel className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Estadia</h2>
                </div>
                <button onClick={() => setIsAddStayModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddStay} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Hotel/Airbnb</label><input type="text" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Hotel Paradiso" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" required /></div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Endereço</label><input type="text" value={sAddress} onChange={(e) => setSAddress(e.target.value)} placeholder="Rua das Flores, 123" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Check-in</label><input type="date" value={sCheckIn} onChange={(e) => setSCheckIn(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Check-out</label><input type="date" value={sCheckOut} onChange={(e) => setSCheckOut(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all" /></div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4">Salvar Hospedagem</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddRentalModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddRentalModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Aluguel de Carro</h2>
                </div>
                <button onClick={() => setIsAddRentalModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddRental} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Locadora</label><input type="text" value={crCompany} onChange={(e) => setCrCompany(e.target.value)} placeholder="Hertz, Avis..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" required /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Modelo</label><input type="text" value={crModel} onChange={(e) => setCrModel(e.target.value)} placeholder="SUV, Sedã..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                </div>
                <div className="space-y-4 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Local Retirada</label><input type="text" value={crPickupLoc} onChange={(e) => setCrPickupLoc(e.target.value)} placeholder="Aeroporto" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data/Hora</label><input type="datetime-local" value={crPickupTime} onChange={(e) => setCrPickupTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-[10px]" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Local Devolução</label><input type="text" value={crDropoffLoc} onChange={(e) => setCrDropoffLoc(e.target.value)} placeholder="Centro" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data/Hora</label><input type="datetime-local" value={crDropoffTime} onChange={(e) => setCrDropoffTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-[10px]" /></div>
                  </div>
                </div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cód. Confirmação</label><input type="text" value={crCode} onChange={(e) => setCrCode(e.target.value)} placeholder="ABC123DEF" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm uppercase font-mono" /></div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4">Salvar Aluguel</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddInsuranceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddInsuranceModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Seguro Viagem</h2>
                </div>
                <button onClick={() => setIsAddInsuranceModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddInsurance} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Seguradora / Provedor</label><input type="text" value={insProvider} onChange={(e) => setInsProvider(e.target.value)} placeholder="Assist Card, Allianz..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" required /></div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Número da Apólice</label><input type="text" value={insPolicy} onChange={(e) => setInsPolicy(e.target.value)} placeholder="123456789" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Início Cobertura</label><input type="date" value={insStart} onChange={(e) => setInsStart(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fim Cobertura</label><input type="date" value={insEnd} onChange={(e) => setInsEnd(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs" /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contato de Emergência</label><input type="text" value={insContact} onChange={(e) => setInsContact(e.target.value)} placeholder="+55 (11) 0800..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4">Salvar Seguro</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Boarding Pass Viewer Modal */}
        <AnimatePresence>
          {isBoardingPassModalOpen && viewingBoardingPassUrl && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBoardingPassModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white dark:bg-gray-900 w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden shadow-2xl transition-colors flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                    <ShieldCheck className="w-5 h-5" /> Cartão de Embarque
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={viewingBoardingPassUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors">
                      <ArrowRight className="w-5 h-5 -rotate-45" />
                    </a>
                    <button onClick={() => setIsBoardingPassModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-950 overflow-hidden relative">
                  {viewingBoardingPassUrl.toLowerCase().includes(".pdf") ? (
                    <iframe src={viewingBoardingPassUrl} className="w-full h-full border-none" title="Boarding Pass PDF" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4 md:p-12">
                      <img src={viewingBoardingPassUrl} alt="Boarding Pass" className="max-w-full max-h-full object-contain rounded-xl shadow-lg ring-1 ring-black/5" />
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 text-center shrink-0">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Visualização Segura • goTrip</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
};
