import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThumbsUp, ThumbsDown, Calendar, MapPin, Plus, Loader2, X, Image as ImageIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface Destination {
  id: string;
  name: string;
  description: string;
  image: string;
  votes: number;
  userVote: number; // 1, -1, or 0
}

export const TripView: React.FC = () => {
  const [destinations, setDestinations] = useState<Destination[]>([
    {
      id: "1",
      name: "Praia do Campeche",
      description: "Melhor praia para surf e relaxar.",
      image: "https://picsum.photos/seed/campeche/600/300",
      votes: 12,
      userVote: 1
    },
    {
      id: "2",
      name: "Ilha do Mel",
      description: "Lugar paradisíaco sem carros.",
      image: "https://picsum.photos/seed/ilhadomel/600/300",
      votes: 8,
      userVote: 0
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");

  const handleVote = (id: string, value: number) => {
    setDestinations(prev => prev.map(dest => {
      if (dest.id === id) {
        const newVote = dest.userVote === value ? 0 : value;
        const diff = newVote - dest.userVote;
        return { ...dest, userVote: newVote, votes: dest.votes + diff };
      }
      return dest;
    }));
  };

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDesc) return;

    const newDest: Destination = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      description: newDesc,
      image: newImage || `https://picsum.photos/seed/${newName}/600/300`,
      votes: 1,
      userVote: 1
    };

    setDestinations([newDest, ...destinations]);
    setIsModalOpen(false);
    setNewName("");
    setNewDesc("");
    setNewImage("");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Votação de Destinos</h2>
          <p className="text-gray-500 dark:text-gray-400">Sugira lugares e vote nos seus favoritos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Sugerir Lugar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {[...destinations].sort((a, b) => b.votes - a.votes).map((dest, index) => (
          <motion.div 
            key={dest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row shadow-sm transition-colors"
          >
            <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
              <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{dest.name}</h3>
                  {index === 0 && dest.votes > 0 && (
                    <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Mais Votado
                    </span>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{dest.description}</p>
              </div>

              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleVote(dest.id, 1)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all",
                      dest.userVote === 1 
                        ? "bg-indigo-600 border-indigo-600 text-white" 
                        : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-200 dark:hover:border-indigo-800"
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-bold">{dest.votes}</span>
                  </button>
                  <button 
                    onClick={() => handleVote(dest.id, -1)}
                    className={cn(
                      "p-2 rounded-xl border transition-all",
                      dest.userVote === -1 
                        ? "bg-red-500 border-red-500 text-white" 
                        : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-red-200 dark:hover:border-red-800"
                    )}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    +5
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Suggest Place Modal */}
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
              className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sugerir Destino</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleAddDestination} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Lugar</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Praia do Rosa" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Por que este lugar é legal?" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL da Imagem (opcional)</label>
                  <div className="relative">
                    <input 
                      type="url" 
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      placeholder="https://..." 
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                    />
                    <ImageIcon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
                >
                  Enviar Sugestão
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
