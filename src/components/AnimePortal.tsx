import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, where, increment, getDocs } from 'firebase/firestore';
import { Play, Star, Calendar, Clock, Search, Eye, X as CloseIcon, Loader2, Heart, Film, Sparkles, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CATEGORIES } from '../constants';

interface AnimeDoc {
  id: string;
  title: string;
  posterUrl: string;
  description: string;
  category: string;
  rating: number;
  year: number;
  type: 'movie' | 'series';
  views: number;
  createdAt: any;
}

interface EpisodeDoc {
  id: string;
  animeId: string;
  episodeNumber: number;
  title?: string;
  videoUrl: string;
  createdAt: any;
}

interface AnimePortalProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  animeList: AnimeDoc[];
  loading: boolean;
}

export default function AnimePortal({ selectedCategory, setSelectedCategory, animeList, loading }: AnimePortalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [selectedAnime, setSelectedAnime] = useState<AnimeDoc | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeDoc | null>(null);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const featuredAnime = animeList.find(a => a.rating >= 9) || animeList[0];

  useEffect(() => {
    if (!auth.currentUser) {
      setWatchlist(new Set());
      return;
    }
    const q = query(collection(db, 'watchlist'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWatchlist(new Set(snapshot.docs.map(doc => doc.data().animeId)));
    });
    return () => unsubscribe();
  }, [auth.currentUser]);

  useEffect(() => {
    if (!selectedAnime) return;
    setLoadingEpisodes(true);
    const q = query(collection(db, 'anime', selectedAnime.id, 'episodes'), orderBy('episodeNumber', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EpisodeDoc[];
      setEpisodes(docs);
      if (docs.length > 0 && !currentEpisode) {
        setCurrentEpisode(docs[0]);
      }
      setLoadingEpisodes(false);
    });
    return () => unsubscribe();
  }, [selectedAnime]);

  const filteredAnime = animeList.filter(anime => {
    const matchesSearch = anime.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          anime.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || anime.category === selectedCategory;
    const matchesWatchlist = !showWatchlistOnly || watchlist.has(anime.id);
    return matchesSearch && matchesCategory && matchesWatchlist;
  });

  const handleWatchlist = async (e: React.MouseEvent, animeId: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    const isSaved = watchlist.has(animeId);
    const id = `${auth.currentUser.uid}_${animeId}`;
    if (isSaved) {
      await deleteDoc(doc(db, 'watchlist', id));
    } else {
      await setDoc(doc(db, 'watchlist', id), {
        userId: auth.currentUser.uid,
        animeId: animeId,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleOpenAnime = (anime: AnimeDoc) => {
    setSelectedAnime(anime);
    setCurrentEpisode(null);
    setEpisodes([]);
    setDoc(doc(db, 'anime', anime.id), { views: increment(1) }, { merge: true });
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      {/* Cinematic Hero */}
      {!loading && featuredAnime && !selectedCategory && !searchTerm && !showWatchlistOnly && (
        <div className="relative h-[90vh] w-full overflow-hidden">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img src={featuredAnime.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent" />
          </motion.div>

          <div className="absolute inset-0 flex items-center px-12 lg:px-24">
            <div className="max-w-3xl space-y-8">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(79,70,229,0.4)]">Top Rated</span>
                  <div className="flex items-center gap-1 text-amber-400 font-black">
                    <Star size={16} fill="currentColor" /> {featuredAnime.rating}
                  </div>
                </div>
                <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-none mb-6 italic uppercase">
                  {featuredAnime.title}
                </h1>
                <p className="text-xl text-slate-300 line-clamp-3 font-medium max-w-xl leading-relaxed">
                  {featuredAnime.description}
                </p>
                
                <div className="flex items-center gap-6 mt-10">
                  <button 
                    onClick={() => handleOpenAnime(featuredAnime)}
                    className="bg-white text-black px-12 py-5 rounded-full font-black text-sm uppercase tracking-widest hover:bg-indigo-400 transition-all flex items-center gap-3 active:scale-95"
                  >
                    <Play size={20} fill="currentColor" /> HOZIR KO'RISH
                  </button>
                  <button 
                    onClick={(e) => handleWatchlist(e, featuredAnime.id)}
                    className={cn(
                      "p-5 rounded-full border transition-all active:scale-95",
                      watchlist.has(featuredAnime.id) ? "bg-indigo-600 border-indigo-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <Heart size={24} fill={watchlist.has(featuredAnime.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className={cn("px-12 lg:px-24 py-20 relative z-10", (!featuredAnime || selectedCategory !== 'All' || searchTerm || showWatchlistOnly) && "pt-40")}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
          <div className="space-y-4">
             <div className="flex items-center gap-3 text-indigo-400">
               <Activity size={20} />
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Animem.uz Platformasi</span>
             </div>
             <h2 className="text-5xl font-black uppercase tracking-tighter">
               {showWatchlistOnly ? 'Watchlist' : searchTerm ? `Natijalar: ${searchTerm}` : selectedCategory !== 'All' ? selectedCategory : 'Yangi Anime'}
             </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Anime qidirish..." 
                className="bg-white/5 border border-white/10 rounded-full pl-14 pr-8 py-4 text-sm focus:outline-none focus:border-indigo-500/50 w-72 transition-all font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
              className={cn(
                "p-4 rounded-full border transition-all",
                showWatchlistOnly ? "bg-indigo-600 border-indigo-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <Heart size={20} fill={showWatchlistOnly ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {[1, 2, 3, 4, 5, 6].map(n => <div key={n} className="aspect-[2/3] bg-white/5 rounded-3xl animate-pulse" />)}
          </div>
        ) : filteredAnime.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {filteredAnime.map((anime, i) => (
              <motion.div
                key={anime.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 6) * 0.1 }}
                className="group relative cursor-pointer"
                onClick={() => handleOpenAnime(anime)}
              >
                <div className="aspect-[2/3] rounded-3xl overflow-hidden relative glass border-white/5 group-hover:border-indigo-500/50 transition-all duration-500">
                  <img src={anime.posterUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-indigo-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <h3 className="font-black text-sm uppercase tracking-tighter mb-2 leading-tight">{anime.title}</h3>
                      <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <span>{anime.year}</span>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star size={10} fill="currentColor" /> {anime.rating}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">
                      {anime.type === 'movie' ? 'Film' : 'Serial'}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => handleWatchlist(e, anime.id)}
                    className={cn(
                      "absolute top-4 right-4 p-2 rounded-xl backdrop-blur-md border transition-all opacity-0 group-hover:opacity-100",
                      watchlist.has(anime.id) ? "bg-pink-600 border-pink-500 text-white" : "bg-black/40 border-white/10 text-white"
                    )}
                  >
                    <Heart size={14} fill={watchlist.has(anime.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center glass rounded-3xl">
             <Film size={60} className="mx-auto text-slate-800 mb-6" />
             <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Hech narsa topilmadi</h3>
             <p className="text-slate-500 uppercase tracking-widest text-[10px]">Qidiruv shartlarini o'zgartirib ko'ring</p>
          </div>
        )}
      </div>

      {/* Episode / Player Modal */}
      <AnimatePresence>
        {selectedAnime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10"
          >
            <div className="absolute inset-0 bg-black/98 backdrop-blur-xl" onClick={() => setSelectedAnime(null)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative max-w-7xl w-full h-[90vh] glass rounded-[2rem] overflow-hidden border border-white/10 flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              <button 
                onClick={() => setSelectedAnime(null)} 
                className="absolute top-8 right-8 z-[130] p-3 text-white/40 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full"
              >
                <CloseIcon size={24} />
              </button>

              <div className="flex-1 bg-black relative min-h-[40vh] lg:min-h-0">
                {currentEpisode ? (
                   <iframe 
                     src={currentEpisode.videoUrl.includes('youtube.com') || currentEpisode.videoUrl.includes('youtu.be') ? currentEpisode.videoUrl.replace('watch?v=', 'embed/') : currentEpisode.videoUrl} 
                     className="w-full h-full border-none"
                     allowFullScreen
                     allow="autoplay; encrypted-media"
                   />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                    <Play size={80} className="text-slate-800" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Epizod tanlang</p>
                  </div>
                )}
              </div>

              <div className="w-full lg:w-[28rem] p-10 bg-black/50 overflow-y-auto custom-scrollbar border-l border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-indigo-600 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none">{selectedAnime.category}</span>
                  <div className="flex items-center gap-1 text-amber-400 font-black text-xs">
                    <Star size={14} fill="currentColor" /> {selectedAnime.rating}
                  </div>
                </div>

                <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 leading-none">{selectedAnime.title}</h2>
                <div className="flex gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">
                  <span>{selectedAnime.year}</span>
                  <span>•</span>
                  <span>{selectedAnime.type === 'movie' ? 'Film' : 'Serial'}</span>
                </div>

                <p className="text-slate-300 text-sm font-medium leading-relaxed mb-10 line-clamp-6">
                  {selectedAnime.description}
                </p>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Epizodlar</h4>
                    <span className="text-[10px] font-black text-slate-600">{episodes.length} qism</span>
                  </div>

                  {loadingEpisodes ? (
                    <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-700" /></div>
                  ) : (
                    <div className="grid grid-cols-5 gap-3">
                      {episodes.map(ep => (
                        <button
                          key={ep.id}
                          onClick={() => setCurrentEpisode(ep)}
                          className={cn(
                            "aspect-square rounded-xl flex items-center justify-center font-black text-xs transition-all border",
                            currentEpisode?.id === ep.id 
                              ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {ep.episodeNumber}
                        </button>
                      ))}
                    </div>
                  )}

                  <button 
                    onClick={(e) => handleWatchlist(e, selectedAnime.id)}
                    className={cn(
                      "w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border flex items-center justify-center gap-3 mt-10 transition-all",
                      watchlist.has(selectedAnime.id) ? "bg-indigo-600 border-indigo-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <Heart size={16} fill={watchlist.has(selectedAnime.id) ? "currentColor" : "none"} />
                    {watchlist.has(selectedAnime.id) ? "Watchlistdan o'chirish" : "Watchlistga qo'shish"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
