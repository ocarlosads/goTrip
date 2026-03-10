import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, MapPin, Plus, Trash2, X, Plane, Hotel, Navigation, Loader2, Car, Shield, ShieldCheck, ArrowRight, ArrowLeftRight, CreditCard, Info, Pencil, Search, Users, UserPlus } from "lucide-react";
import { cn } from "../../lib/utils";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

interface Flight {
  id: string;
  groupId: string;
  creatorId: string;
  number: string | null;
  airline: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  origin: string | null;
  destination: string | null;
  createdAt: string;
  passengers: FlightPassenger[];
}

interface FlightPassenger {
  id: string;
  flightId: string;
  userId: string;
  boardingPassUrl: string | null;
  identityDocUrl: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Stay {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  googlePlaceId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  bookingVoucherUrl: string | null;
  members: StayMember[];
}

interface StayMember {
  id: string;
  stayId: string;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
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
  members: CarRentalMember[];
}

interface CarRentalMember {
  id: string;
  carRentalId: string;
  userId: string;
  bookingVoucherUrl: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
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
  currentUserId: string;
  userIdentityDoc?: string | null;
  initialData?: {
    flights?: Flight[];
    stays?: Stay[];
    carRentals?: CarRental[];
    insurances?: Insurance[];
    members?: any[];
  };
}

export const LogisticsView: React.FC<ItineraryViewProps> = ({ groupId, currentUserId, userIdentityDoc, initialData }) => {
  const [flights, setFlights] = useState<Flight[]>(initialData?.flights || []);
  const [stays, setStays] = useState<Stay[]>(initialData?.stays || []);
  const [carRentals, setCarRentals] = useState<CarRental[]>(initialData?.carRentals || []);
  const [insurances, setInsurances] = useState<Insurance[]>(initialData?.insurances || []);
  const [members, setMembers] = useState<any[]>(initialData?.members || []);
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(!initialData);
  const [logisticsTab, setLogisticsTab] = useState<"all" | "flights" | "stays" | "rentals" | "insurances">("all");

  // Modals
  const [isAddFlightModalOpen, setIsAddFlightModalOpen] = useState(false);
  const [isAddStayModalOpen, setIsAddStayModalOpen] = useState(false);
  const [isAddRentalModalOpen, setIsAddRentalModalOpen] = useState(false);
  const [isAddInsuranceModalOpen, setIsAddInsuranceModalOpen] = useState(false);
  const [isBoardingPassModalOpen, setIsBoardingPassModalOpen] = useState(false);
  const [viewingBoardingPassUrl, setViewingBoardingPassUrl] = useState<string | null>(null);
  const [isShareFlightModalOpen, setIsShareFlightModalOpen] = useState(false);
  const [sharingFlightId, setSharingFlightId] = useState<string | null>(null);
  const [sharingMemberBP, setSharingMemberBP] = useState<string>("");
  const [isShareStayModalOpen, setIsShareStayModalOpen] = useState(false);
  const [sharingStayId, setSharingStayId] = useState<string | null>(null);
  const [sharingStayVoucher, setSharingStayVoucher] = useState<string>("");
  const [isShareRentalModalOpen, setIsShareRentalModalOpen] = useState(false);
  const [sharingRentalId, setSharingRentalId] = useState<string | null>(null);
  const [sharingRentalVoucher, setSharingRentalVoucher] = useState<string>("");
  const [sharingUserId, setSharingUserId] = useState<string>("");
  const [crIsDriver, setCrIsDriver] = useState(false);

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
  const [sLat, setSLat] = useState<number | null>(null);
  const [sLng, setSLng] = useState<number | null>(null);
  const [sPlaceId, setSPlaceId] = useState<string | null>(null);
  const [sCheckIn, setSCheckIn] = useState("");
  const [sCheckOut, setSCheckOut] = useState("");
  const [sVoucherUrl, setSVoucherUrl] = useState("");
  const [sIsUploading, setSIsUploading] = useState(false);

  // Car Rental form
  const [crCompany, setCrCompany] = useState("");
  const [crModel, setCrModel] = useState("");
  const [crPickupLoc, setCrPickupLoc] = useState("");
  const [crPickupTime, setCrPickupTime] = useState("");
  const [crDropoffLoc, setCrDropoffLoc] = useState("");
  const [crDropoffTime, setCrDropoffTime] = useState("");
  const [crCode, setCrCode] = useState("");
  const [crVoucherUrl, setCrVoucherUrl] = useState("");
  const [crIsUploading, setCrIsUploading] = useState(false);

  // Insurance form
  const [insProvider, setInsProvider] = useState("");
  const [insPolicy, setInsPolicy] = useState("");
  const [insStart, setInsStart] = useState("");
  const [insEnd, setInsEnd] = useState("");
  const [insContact, setInsContact] = useState("");

  // Edit states
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editingStayId, setEditingStayId] = useState<string | null>(null);
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null);
  const [editingInsuranceId, setEditingInsuranceId] = useState<string | null>(null);

  // -- Date formatters for inputs --
  const formatDateInput = (dateStr?: string | Date | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateTimeInput = (dateStr?: string | Date | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const fetchAll = async () => {
    try {
      const res = await apiFetch(`/api/groups/${groupId}/data`);
      if (res.ok) {
        const data = await res.json();
        setFlights(data.flights);
        setStays(data.stays);
        setCarRentals(data.carRentals);
        setInsurances(data.insurances);
        setMembers(data.members);
      }
    } catch (err) {
      console.error("Failed to fetch all data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFlights(initialData.flights || []);
      setStays(initialData.stays || []);
      setCarRentals(initialData.carRentals || []);
      setInsurances(initialData.insurances || []);
      setIsLoading(false);
      return;
    }
    fetchAll();
  }, [groupId, initialData]);

  const handleShareFlight = async (userId: string) => {
    if (!sharingFlightId) return;
    try {
      const res = await apiFetch(`/api/flights/${sharingFlightId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, boardingPassUrl: sharingMemberBP }),
      });
      if (res.ok) {
        await fetchAll();
        setIsShareFlightModalOpen(false);
        setSharingMemberBP("");
      }
    } catch (err) { console.error(err); }
  };

  const handleShareStay = async (userId: string) => {
    if (!sharingStayId) return;
    try {
      const res = await apiFetch(`/api/stays/${sharingStayId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await fetchAll();
        setIsShareStayModalOpen(false);
      }
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
        identityDocUrl: fIdentityDocUrl
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

      const res = await apiFetch(editingFlightId ? `/api/flights/${editingFlightId}` : `/api/groups/${groupId}/flights`, {
        method: editingFlightId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (editingFlightId) {
          const updated = await res.json();
          setFlights((prev) => prev.map(f => f.id === editingFlightId ? updated : f));
        } else {
          const newFlights = await res.json();
          setFlights((prev) => [...prev, ...(Array.isArray(newFlights) ? newFlights : [newFlights])]);
        }
        setIsAddFlightModalOpen(false);
        setEditingFlightId(null);
        setFNumber(""); setFAirline(""); setFDepTime(""); setFArrTime(""); setFOrigin(""); setFDest("");
        setIsRoundTrip(false); setRNumber(""); setRAirline(""); setRDepTime(""); setRArrTime("");
        setFBoardingPassUrl(""); setRBoardingPassUrl(""); setFIdentityDocUrl("");
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
    if (!sName) return;
    try {
      const res = await apiFetch(editingStayId ? `/api/stays/${editingStayId}` : `/api/groups/${groupId}/stays`, {
        method: editingStayId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sName,
          address: sAddress,
          checkIn: sCheckIn || null,
          checkOut: sCheckOut || null,
          bookingVoucherUrl: sVoucherUrl
        }),
      });
      if (res.ok) {


        await fetchAll();
        setIsAddStayModalOpen(false);
        setEditingStayId(null);
        setSName(""); setSAddress(""); setSCheckIn(""); setSCheckOut(""); setSLat(null); setSLng(null); setSPlaceId(null);
        setSVoucherUrl("");
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
    if (!crCompany) return;
    try {
      const res = await apiFetch(editingRentalId ? `/api/rentals/${editingRentalId}` : `/api/groups/${groupId}/rentals`, {
        method: editingRentalId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: crCompany,
          model: crModel,
          pickupLocation: crPickupLoc,
          pickupTime: crPickupTime,
          dropoffLocation: crDropoffLoc,
          dropoffTime: crDropoffTime,
          confirmationCode: crCode,
          bookingVoucherUrl: crVoucherUrl
        }),
      });
      if (res.ok) {
        const createdRental = await res.json();

        // Link creator as driver if it's a new rental and no members yet
        if (!editingRentalId) {
          await apiFetch(`/api/rentals/${createdRental.id}/share`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, isDriver: true }),
          });
        }

        await fetchAll();
        setIsAddRentalModalOpen(false);
        setEditingRentalId(null);
        setCrCompany(""); setCrModel(""); setCrPickupLoc(""); setCrPickupTime(""); setCrDropoffLoc(""); setCrDropoffTime(""); setCrCode("");
        setCrVoucherUrl("");
      }
    } catch (err) { console.error(err); }
  };

  const handleShareRental = async (userId: string) => {
    if (!sharingRentalId) return;
    try {
      const res = await apiFetch(`/api/rentals/${sharingRentalId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isDriver: crIsDriver }),
      });
      if (res.ok) {
        await fetchAll();
        setIsShareRentalModalOpen(false);
        setSharingRentalId(null);
        setCrIsDriver(false);
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
      const res = await apiFetch(editingInsuranceId ? `/api/insurances/${editingInsuranceId}` : `/api/groups/${groupId}/insurances`, {
        method: editingInsuranceId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: insProvider, policyNumber: insPolicy, startDate: insStart, endDate: insEnd, contactInfo: insContact }),
      });
      if (res.ok) {
        const ins = await res.json();
        if (editingInsuranceId) {
          setInsurances((prev) => prev.map(i => i.id === editingInsuranceId ? ins : i));
        } else {
          setInsurances((prev) => [...prev, ins]);
        }
        setIsAddInsuranceModalOpen(false);
        setEditingInsuranceId(null);
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Logística</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie seus voos, hospedagens e transportes.</p>
        </div>
      </div>

      <div className="space-y-6">
        {userIdentityDoc ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Meus Documentos Pessoais</h3>
                  <p className="text-xs text-indigo-100 italic">Somente você pode ver este card</p>
                </div>
              </div>
              <div className="flex border-t border-white/10 pt-4 mt-2">
                <button
                  onClick={() => {
                    setViewingBoardingPassUrl(userIdentityDoc);
                    setIsBoardingPassModalOpen(true);
                  }}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all active:scale-95 shadow-lg"
                >
                  <Info className="w-4 h-4" /> Visualizar meu RG/CNH
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 dark:bg-amber-900/10 rounded-[32px] p-6 border border-dashed border-amber-200 dark:border-amber-900/20 relative overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 dark:text-amber-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Identidade Pendente</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Sua CNH ou RG ainda não foi cadastrada. Isso é importante para sua logística de viagem.
                </p>
                <div className="mt-4 p-3 bg-white/50 dark:bg-gray-900/50 rounded-2xl border border-amber-100 dark:border-amber-900/10 flex items-center gap-3">
                  <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Cadastre no menu: <span className="text-gray-900 dark:text-white ml-1 underline decoration-indigo-300">Configurações</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          setSharingFlightId(flight.id);
                          setIsShareFlightModalOpen(true);
                        }}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                        title="Compartilhar"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFlightId(flight.id);
                          setFNumber(flight.number || "");
                          setFAirline(flight.airline || "");
                          setFDepTime(flight.departureTime ? new Date(flight.departureTime).toISOString().split('T')[0] : "");
                          setFArrTime(flight.arrivalTime ? new Date(flight.arrivalTime).toISOString().split('T')[0] : "");
                          setFOrigin(flight.origin || "");
                          setFDest(flight.destination || "");
                          const myP = flight.passengers.find(p => p.userId === currentUserId);
                          setFBoardingPassUrl(myP?.boardingPassUrl || "");
                          setFIdentityDocUrl(myP?.identityDocUrl || "");
                          setIsRoundTrip(false);
                          setIsAddFlightModalOpen(true);
                        }}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFlight(flight.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
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
                    {flight.passengers.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex flex-col gap-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Cartões de Embarque (Passageiros):</p>
                        {[...flight.passengers].sort((a, b) => a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : 0).map(p => (
                          <div key={p.id} className={cn(
                            "p-3 rounded-2xl border transition-all",
                            p.userId === currentUserId
                              ? "bg-indigo-50/30 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/30 shadow-sm"
                              : "bg-transparent border-transparent"
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                                p.userId === currentUserId
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                              )}>
                                {p.user?.name?.charAt(0) || p.user?.email.charAt(0)}
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold transition-colors",
                                p.userId === currentUserId ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500"
                              )}>
                                {p.userId === currentUserId ? "Meu Cartão de Embarque (Você)" : (p.user?.name || p.user?.email)}
                              </span>
                              {p.userId === currentUserId && (
                                <div className="ml-auto px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded text-[8px] font-bold uppercase tracking-tighter">
                                  Principal
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {p.boardingPassUrl ? (
                                <button
                                  onClick={() => {
                                    setViewingBoardingPassUrl(p.boardingPassUrl!);
                                    setIsBoardingPassModalOpen(true);
                                  }}
                                  className={cn(
                                    "py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border col-span-2",
                                    p.userId === currentUserId
                                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/10 active:scale-95"
                                      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/30"
                                  )}
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" /> Cartão
                                </button>
                              ) : (
                                <div className="py-1 col-span-2">
                                  <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5 px-1">
                                    <Plus className="w-2 h-2" /> Anexar Cartão
                                  </label>
                                  <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setIsUploading(true);
                                        try {
                                          const url = await handleFileUpload(file);
                                          const res = await apiFetch(`/api/flights/passengers/${p.id}`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ boardingPassUrl: url })
                                          });
                                          if (res.ok) {
                                            fetchAll();
                                            showToast("Cartão anexado!", "success");
                                          }
                                        } catch (err: any) {
                                          showToast("Erro no upload", "error");
                                        } finally {
                                          setIsUploading(false);
                                        }
                                      }
                                    }}
                                    className="w-full text-[9px] text-gray-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-xl file:border-0 file:text-[9px] file:font-bold file:bg-indigo-50 dark:file:bg-indigo-900/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 transition-all border border-gray-100 dark:border-gray-800 rounded-xl p-1 bg-white dark:bg-gray-900 shadow-sm"
                                    disabled={isUploading}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {flight.passengers.length > 1 && (
                      <div className="mt-4 pt-3 flex items-center gap-2 border-t border-gray-50 dark:border-gray-800/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Passageiros:</p>
                        <div className="flex -space-x-2">
                          {flight.passengers.map(p => (
                            <div key={p.id} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-bold text-gray-600 dark:text-gray-400" title={p.user?.name || p.user?.email}>
                              {p.user?.name?.charAt(0) || p.user?.email?.charAt(0)}
                            </div>
                          ))}
                        </div>
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
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          setEditingStayId(stay.id);
                          setSName(stay.name);
                          setSAddress(stay.address || "");
                          setSLat(stay.lat);
                          setSLng(stay.lng);
                          setSPlaceId(stay.googlePlaceId);
                          setSCheckIn(formatDateInput(stay.checkIn));
                          setSCheckOut(formatDateInput(stay.checkOut));
                          setSVoucherUrl(stay.bookingVoucherUrl || "");
                          setIsAddStayModalOpen(true);
                        }}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteStay(stay.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                        <Hotel className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{stay.name}</h4>
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

                    {/* Hóspedes Section */}
                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hóspedes</p>
                        <button
                          onClick={() => { setSharingStayId(stay.id); setIsShareStayModalOpen(true); }}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Vincular Membro
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(stay.members || []).map((m) => (
                          <div key={m.id} className="flex items-center gap-2 bg-gray-50/80 dark:bg-gray-800/50 p-1.5 pr-3 rounded-full border border-gray-100 dark:border-gray-800 group/member">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase border border-indigo-200 dark:border-indigo-800">
                              {m.user?.name?.[0] || m.user?.email?.[0] || "?"}
                            </div>
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">
                              {m.user?.id === currentUserId ? "Você" : (m.user?.name || m.user?.email.split('@')[0])}
                            </span>
                          </div>
                        ))}
                        {(stay.members || []).length === 0 && (
                          <p className="text-[10px] text-gray-400 italic py-1">Nenhum hóspede vinculado.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      {stay.bookingVoucherUrl ? (
                        <button
                          onClick={() => { setViewingBoardingPassUrl(stay.bookingVoucherUrl || ""); setIsBoardingPassModalOpen(true); }}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-sm font-bold">Ver Comprovante</span>
                        </button>
                      ) : (
                        <label className="w-full flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-dashed border-gray-200 dark:border-gray-700 cursor-pointer">
                          <Plus className="w-4 h-4" />
                          <span className="text-sm font-bold">Anexar Comprovante</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const url = await handleFileUpload(file);
                                  await apiFetch(`/api/stays/${stay.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      name: stay.name,
                                      address: stay.address,
                                      lat: stay.lat,
                                      lng: stay.lng,
                                      googlePlaceId: stay.googlePlaceId,
                                      checkIn: stay.checkIn,
                                      checkOut: stay.checkOut,
                                      bookingVoucherUrl: url
                                    }),
                                  });
                                  await fetchAll();
                                } catch (err) { console.error(err); }
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {stay.address && (
                      <div className="mt-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-200 dark:border-indigo-800"
                        >
                          <Navigation className="w-4 h-4 shrink-0" />
                          <span className="text-sm font-bold">Ver Localização</span>
                        </a>
                      </div>
                    )}
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
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          setEditingRentalId(rental.id);
                          setCrCompany(rental.company);
                          setCrModel(rental.model || "");
                          setCrPickupLoc(rental.pickupLocation || "");
                          setCrPickupTime(rental.pickupTime ? new Date(rental.pickupTime).toISOString().split('T')[0] : "");
                          setCrDropoffLoc(rental.dropoffLocation || "");
                          setCrDropoffTime(rental.dropoffTime ? new Date(rental.dropoffTime).toISOString().split('T')[0] : "");
                          setCrCode(rental.confirmationCode || "");
                          setCrVoucherUrl(rental.bookingVoucherUrl || "");
                          setIsAddRentalModalOpen(true);
                        }}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRental(rental.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <Car className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{rental.company}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rental.model || "Modelo não informado"}</p>

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

                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-3 h-3" /> Condutores / Membros
                        </h5>
                        <button
                          onClick={() => { setSharingRentalId(rental.id); setIsShareRentalModalOpen(true); }}
                          className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(rental.members || []).map((m) => (
                          <div
                            key={m.id}
                            className={cn(
                              "flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all",
                              m.isDriver
                                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400"
                                : "bg-gray-50/80 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase",
                              m.isDriver
                                ? "bg-amber-200 dark:bg-amber-800/50"
                                : "bg-indigo-100 dark:bg-indigo-900/40"
                            )}>
                              {m.user?.name?.[0] || m.user?.email?.[0] || "?"}
                            </div>
                            <span className="text-[10px] font-bold">
                              {m.isDriver && "🚗 "}{m.user?.id === currentUserId ? "Você" : (m.user?.name || m.user?.email.split('@')[0])}
                            </span>
                          </div>
                        ))}
                        {(rental.members || []).length === 0 && (
                          <p className="text-[10px] text-gray-400 italic py-1">Nenhum membro vinculado.</p>
                        )}
                      </div>
                    </div >

                    <div className="mt-4">
                      {rental.bookingVoucherUrl ? (
                        <button
                          onClick={() => { setViewingBoardingPassUrl(rental.bookingVoucherUrl || ""); setIsBoardingPassModalOpen(true); }}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-sm font-bold">Ver Comprovante</span>
                        </button>
                      ) : (
                        <label className="w-full flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-dashed border-gray-200 dark:border-gray-700 cursor-pointer">
                          <Plus className="w-4 h-4" />
                          <span className="text-sm font-bold">Anexar Comprovante</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const url = await handleFileUpload(file);
                                  await apiFetch(`/api/rentals/${rental.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      company: rental.company,
                                      model: rental.model,
                                      pickupLocation: rental.pickupLocation,
                                      pickupTime: rental.pickupTime,
                                      dropoffLocation: rental.dropoffLocation,
                                      dropoffTime: rental.dropoffTime,
                                      confirmationCode: rental.confirmationCode,
                                      bookingVoucherUrl: url
                                    }),
                                  });
                                  await fetchAll();
                                  showToast("Comprovante anexado!", "success");
                                } catch (err) {
                                  console.error(err);
                                  showToast("Erro ao anexar comprovante", "error");
                                }
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </motion.div >
                ))}
                {
                  carRentals.length === 0 && logisticsTab === "rentals" && (
                    <div className="col-span-full py-12 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                      <Car className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 italic">Nenhum aluguel cadastrado.</p>
                    </div>
                  )
                }
              </div >
            </section >
          )}

          {/* Insurance Section */}
          {
            (logisticsTab === "all" || logisticsTab === "insurances") && (
              <section className="col-span-full space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Seguro Viagem</h3>
                  <button onClick={() => setIsAddInsuranceModalOpen(true)} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insurances.map((ins) => (
                    <motion.div layout key={ins.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-colors">
                      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            setEditingInsuranceId(ins.id);
                            setInsProvider(ins.provider);
                            setInsPolicy(ins.policyNumber || "");
                            setInsStart(ins.startDate ? new Date(ins.startDate).toISOString().split('T')[0] : "");
                            setInsEnd(ins.endDate ? new Date(ins.endDate).toISOString().split('T')[0] : "");
                            setInsContact(ins.contactInfo || "");
                            setIsAddInsuranceModalOpen(true);
                          }}
                          className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteInsurance(ins.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
            )
          }
        </div >
      </div >

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddFlightModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddFlightModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 transition-colors max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <Plane className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingFlightId ? "Editar Voo" : "Adicionar Voo"}</h2>
                </div>
                <button onClick={() => { setIsAddFlightModalOpen(false); setEditingFlightId(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Partida</label><input type="date" value={fDepTime} onChange={(e) => setFDepTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm [color-scheme:light] dark:[color-scheme:dark]" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chegada</label><input type="date" value={fArrTime} onChange={(e) => setFArrTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm [color-scheme:light] dark:[color-scheme:dark]" /></div>
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
                  </div>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Partida (Retorno)</label><input type="date" value={rDepTime} onChange={(e) => setRDepTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm [color-scheme:light] dark:[color-scheme:dark]" /></div>
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chegada (Retorno)</label><input type="date" value={rArrTime} onChange={(e) => setRArrTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm [color-scheme:light] dark:[color-scheme:dark]" /></div>
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <Hotel className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingStayId ? "Editar Estadia" : "Adicionar Estadia"}</h2>
                </div>
                <button onClick={() => { setIsAddStayModalOpen(false); setEditingStayId(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddStay} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Hospedagem</label><input type="text" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Ex: Hotel Paradiso ou Airbnb" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" required /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Localização / Endereço</label><input type="text" value={sAddress} onChange={(e) => setSAddress(e.target.value)} placeholder="Rua, Cidade ou link do Google Maps" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Check-in</label><input type="date" value={sCheckIn} onChange={(e) => setSCheckIn(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm [color-scheme:light] dark:[color-scheme:dark]" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Check-out</label><input type="date" value={sCheckOut} onChange={(e) => setSCheckOut(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm [color-scheme:light] dark:[color-scheme:dark]" /></div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Comprovante de Reserva (Opcional)</label>
                  {sIsUploading ? (
                    <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Enviando...</p>
                    </div>
                  ) : sVoucherUrl ? (
                    <div className="w-full flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl relative group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Documento Anexado</p>
                          <a href={sVoucherUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Ouvir arquivo / Visualizar</a>
                        </div>
                      </div>
                      <label className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors shadow-sm text-xs font-bold text-gray-700 dark:text-gray-300">
                        Alterar
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSIsUploading(true);
                              try {
                                const url = await handleFileUpload(file);
                                setSVoucherUrl(url);
                                showToast("Comprovante anexado!", "success");
                              } catch (err: any) {
                                showToast(err.message, "error");
                              } finally {
                                setSIsUploading(false);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl cursor-pointer transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Plus className="w-6 h-6 text-gray-400 mb-1" />
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Anexar Comprovante</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSIsUploading(true);
                            try {
                              const url = await handleFileUpload(file);
                              setSVoucherUrl(url);
                              showToast("Comprovante anexado!", "success");
                            } catch (err: any) {
                              showToast(err.message, "error");
                            } finally {
                              setSIsUploading(false);
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={sIsUploading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4"
                >
                  {editingStayId ? "Atualizar Hospedagem" : "Salvar Hospedagem"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddRentalModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddRentalModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingRentalId ? "Editar Aluguel" : "Aluguel de Carro"}</h2>
                </div>
                <button onClick={() => { setIsAddRentalModalOpen(false); setEditingRentalId(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddRental} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Locadora</label><input type="text" value={crCompany} onChange={(e) => setCrCompany(e.target.value)} placeholder="Hertz, Avis..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" required /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Modelo</label><input type="text" value={crModel} onChange={(e) => setCrModel(e.target.value)} placeholder="SUV, Sedã..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                </div>
                <div className="space-y-4 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Local Retirada</label><input type="text" value={crPickupLoc} onChange={(e) => setCrPickupLoc(e.target.value)} placeholder="Aeroporto" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data/Hora</label><input type="date" value={crPickupTime} onChange={(e) => setCrPickupTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-[10px] [color-scheme:light] dark:[color-scheme:dark]" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Local Devolução</label><input type="text" value={crDropoffLoc} onChange={(e) => setCrDropoffLoc(e.target.value)} placeholder="Centro" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data/Hora</label><input type="date" value={crDropoffTime} onChange={(e) => setCrDropoffTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-[10px] [color-scheme:light] dark:[color-scheme:dark]" /></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cód. Confirmação</label>
                    <input type="text" value={crCode} onChange={(e) => setCrCode(e.target.value)} placeholder="ABC123DEF" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm uppercase font-mono" />
                  </div>
                  <div className="flex flex-col col-span-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Comprovante de Reserva</label>
                    {crIsUploading ? (
                      <div className="flex items-center justify-center h-12 w-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                      </div>
                    ) : crVoucherUrl ? (
                      <div className="flex items-center justify-between w-full h-12 px-3 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <a href={crVoucherUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">Ver</a>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors shadow-sm text-[10px] font-bold text-gray-700 dark:text-gray-300">
                            Trocar
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setCrIsUploading(true);
                                  try {
                                    const url = await handleFileUpload(file);
                                    setCrVoucherUrl(url);
                                    showToast("Comprovante anexado!", "success");
                                  } catch (err: any) {
                                    showToast(err.message, "error");
                                  } finally {
                                    setCrIsUploading(false);
                                  }
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setCrVoucherUrl("")}
                            className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-md hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 h-12 w-full border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-gray-700 rounded-xl cursor-pointer transition-all">
                        <Plus className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Anexar</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCrIsUploading(true);
                              try {
                                const url = await handleFileUpload(file);
                                setCrVoucherUrl(url);
                                showToast("Comprovante anexado!", "success");
                              } catch (err: any) {
                                showToast(err.message, "error");
                              } finally {
                                setCrIsUploading(false);
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-4">
                  {editingRentalId ? "Atualizar Aluguel" : "Salvar Aluguel"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddInsuranceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddInsuranceModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingInsuranceId ? "Editar Seguro" : "Seguro Viagem"}</h2>
                </div>
                <button onClick={() => { setIsAddInsuranceModalOpen(false); setEditingInsuranceId(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddInsurance} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Seguradora / Provedor</label><input type="text" value={insProvider} onChange={(e) => setInsProvider(e.target.value)} placeholder="Assist Card, Allianz..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" required /></div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Número da Apólice</label><input type="text" value={insPolicy} onChange={(e) => setInsPolicy(e.target.value)} placeholder="123456789" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Início Cobertura</label><input type="date" value={insStart} onChange={(e) => setInsStart(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs [color-scheme:light] dark:[color-scheme:dark]" /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fim Cobertura</label><input type="date" value={insEnd} onChange={(e) => setInsEnd(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-xs [color-scheme:light] dark:[color-scheme:dark]" /></div>
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
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-3xl overflow-hidden shadow-2xl transition-colors flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                    <ShieldCheck className="w-5 h-5" /> Documento / Cartão
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={viewingBoardingPassUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5 -rotate-45" /> Abrir Original
                    </a>
                    <button onClick={() => setIsBoardingPassModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-950 overflow-hidden relative">
                  {viewingBoardingPassUrl.toLowerCase().includes(".pdf") ? (
                    <div className="w-full h-full">
                      <iframe
                        src={`${viewingBoardingPassUrl}#view=FitH`}
                        className="w-full h-full border-none bg-gray-100 dark:bg-gray-950"
                        title="Document PDF"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img src={viewingBoardingPassUrl} alt="Document" className="max-w-full max-h-full object-contain rounded-xl shadow-lg ring-1 ring-black/5" />
                    </div>
                  )}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center shrink-0 flex items-center justify-center gap-4">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Visualização Segura • goTrip</p>
                  {viewingBoardingPassUrl.toLowerCase().includes(".pdf") && (
                    <p className="text-[9px] text-indigo-500/60 font-medium italic hidden md:block">* Use os controles do navegador para zoom ou download</p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>

      {/* Share Flight Modal */}
      <AnimatePresence>
        {isShareFlightModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareFlightModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compartilhar Voo</h2>
                <button
                  onClick={() => setIsShareFlightModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                <p className="text-sm text-gray-500 mb-4">Escolha os membros do grupo que também estarão neste voo:</p>
                {members.filter(m => m.id !== currentUserId).map(member => {
                  const flight = flights.find(f => f.id === sharingFlightId);
                  const isAlreadyPassenger = flight?.passengers.some(p => p.userId === member.id);

                  return (
                    <div key={member.id} className="space-y-2 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 transition-all hover:border-indigo-500 hover:shadow-lg dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold uppercase transition-colors">
                            {member.name?.charAt(0) || member.email?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{member.name || member.email}</p>
                            <p className="text-[10px] text-gray-500">{isAlreadyPassenger ? "Passageiro deste voo" : "Clique para compartilhar seu voo"}</p>
                          </div>
                        </div>
                        {!isAlreadyPassenger && (
                          <button
                            onClick={() => handleShareFlight(member.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-all shadow-md active:scale-95 disabled:bg-gray-400 group flex items-center gap-2 pr-3"
                            disabled={isUploading}
                          >
                            <Plus className="w-4 h-4" /> <span className="text-[10px] font-bold">Adicionar</span>
                          </button>
                        )}
                      </div>

                      {!isAlreadyPassenger && (
                        <div className="pt-2 border-t border-gray-50 dark:border-gray-700 mt-2">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                            <Plus className="w-2.5 h-2.5" /> Anexar Cartão desta pessoa (Opcional)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsUploading(true);
                                  try {
                                    const url = await handleFileUpload(file);
                                    setSharingMemberBP(url);
                                  } catch (err: any) {
                                    alert("Erro no upload: " + err.message);
                                  } finally {
                                    setIsUploading(false);
                                  }
                                }
                              }}
                              className="flex-1 text-[9px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[8px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-gray-100 dark:border-gray-700 rounded-lg p-1"
                              disabled={isUploading}
                            />
                            {sharingMemberBP && (
                              <div className="bg-emerald-100 p-1 rounded-lg text-emerald-600">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShareStayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsShareStayModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] shadow-2xl p-6 transition-colors overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <Hotel className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Vincular Hóspede</h3>
                </div>
                <button onClick={() => setIsShareStayModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="space-y-3 mt-4">
                <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl mb-4 border border-amber-100/50 dark:border-amber-900/30">
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                    Selecione um membro do grupo para vincular a esta hospedagem.
                  </p>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {members.map((member) => {
                    const isAlreadyMember = stays.find(s => s.id === sharingStayId)?.members.find((m: any) => m.userId === member.id);
                    return (
                      <button
                        key={member.id}
                        disabled={!!isAlreadyMember}
                        onClick={() => handleShareStay(member.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group/item",
                          isAlreadyMember
                            ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60 cursor-not-allowed"
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-700 hover:bg-amber-50/30 dark:hover:bg-amber-900/20 shadow-sm"
                        )}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                            {member.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{member.name}</p>
                            <p className="text-[10px] text-gray-400">{member.email}</p>
                          </div>
                        </div>
                        {isAlreadyMember ? (
                          <div className="bg-amber-100 dark:bg-amber-900/40 p-1.5 rounded-full">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                          </div>
                        ) : (
                          <Plus className="w-5 h-5 text-gray-300 group-hover/item:text-amber-500 transition-colors" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isShareRentalModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsShareRentalModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" /> Vincular Condutor
                </h3>
                <button onClick={() => setIsShareRentalModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-500 text-left">Selecione um membro do grupo para vincular a este aluguel de carro e, opcionalmente, anexe o comprovante dele.</p>
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Membro do Grupo</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm" onChange={(e) => setSharingUserId(e.target.value)} value={sharingUserId}>
                      <option value="">Selecionar membro...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name || m.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                    <div className="flex items-center h-5">
                      <input
                        id="isDriver"
                        type="checkbox"
                        checked={crIsDriver}
                        onChange={(e) => setCrIsDriver(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                    <label htmlFor="isDriver" className="flex flex-col cursor-pointer">
                      <span className="text-sm font-bold text-amber-900 dark:text-amber-400">Condutor Principal</span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-500">Este membro será o responsável por dirigir o veículo.</span>
                    </label>
                  </div>
                  <button onClick={() => handleShareRental(sharingUserId)} disabled={!sharingUserId || crIsUploading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                    {crIsUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    Vincular ao Carro
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};
