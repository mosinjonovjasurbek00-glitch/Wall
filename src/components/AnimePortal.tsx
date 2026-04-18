import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, where, increment, getDocs } from 'firebase/firestore';
import { Play, Star, Calendar, Clock, Search, Eye, X as CloseIcon, Loader2, Heart, Film, Sparkles, ChevronRight, Activity, TrendingUp, Check, ArrowLeft } from 'lucide-react';
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
  isBanner?: boolean;
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
  const [bannerIndex, setBannerIndex] = useState(0);

  const bannerAnime = animeList.filter(a => a.isBanner);
  const featuredAnime = bannerAnime.length > 0 ? bannerAnime[bannerIndex] : (animeList.find(a => a.rating >= 9) || animeList[0]);

  useEffect(() => {
    if (bannerAnime.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % bannerAnime.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [bannerAnime.length]);

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
        <div className="px-4 sm:px-6 lg:px-12 pt-6 sm:pt-10 pb-4">
          <div className="relative h-[60vh] sm:h-[65vh] md:h-[75vh] w-full rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden group">
            <AnimatePresence mode="wait">
              <motion.div 
                key={featuredAnime.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                {/* Background Blur Image */}
                <div className="absolute inset-0">
                   <img src={featuredAnime.posterUrl} className="w-full h-full object-cover blur-3xl opacity-20 scale-110" referrerPolicy="no-referrer" />
                   <div className="absolute inset-0 bg-[#020202]/40" />
                </div>
                
                {/* Main Content Area */}
                <div className="absolute inset-0 flex flex-col lg:flex-row items-center justify-between px-6 sm:px-8 md:px-20 py-8 sm:py-12 gap-6 sm:gap-12">
                  <div className="flex-1 space-y-4 sm:space-y-6 md:space-y-8 z-10 max-w-2xl text-center lg:text-left">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <span className="bg-indigo-600/20 border border-indigo-500/40 px-3 sm:px-5 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-indigo-400">
                          {featuredAnime.category}
                        </span>
                        <span className="bg-white/5 border border-white/10 px-3 sm:px-5 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-400">
                          {featuredAnime.year}
                        </span>
                         <span className="bg-white/5 border border-white/10 px-3 sm:px-5 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-indigo-300">
                          {featuredAnime.type === 'movie' ? 'Film' : 'Serial'}
                        </span>
                      </div>
                      
                      <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] mb-4 sm:mb-6 uppercase">
                        {featuredAnime.title}
                      </h1>
                      
                      <p className="text-xs sm:text-sm md:text-base text-slate-300 line-clamp-2 sm:line-clamp-3 md:line-clamp-4 font-medium max-w-xl leading-relaxed mx-auto lg:mx-0">
                        {featuredAnime.description}
                      </p>
                      
                      <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-6 mt-6 sm:mt-10">
                        <button 
                          onClick={() => handleOpenAnime(featuredAnime)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 sm:px-10 md:px-14 py-3 sm:py-4 md:py-5 rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 active:scale-95 shadow-lg shadow-indigo-600/20"
                        >
                          <Play size={16} sm:size={20} fill="currentColor" /> TOMOSHA
                        </button>
                        <button 
                          onClick={(e) => handleWatchlist(e, featuredAnime.id)}
                          className={cn(
                            "p-3 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl border transition-all active:scale-95 group",
                            watchlist.has(featuredAnime.id) ? "bg-pink-600 border-pink-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <Heart size={16} sm:size={20} fill={watchlist.has(featuredAnime.id) ? "currentColor" : "none"} className={cn(watchlist.has(featuredAnime.id) ? "text-white" : "text-white/40 group-hover:text-white")} />
                        </button>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, x: 30 }} 
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    className="hidden lg:block w-[30%] aspect-[2/3] z-10"
                  >
                    <div className="w-full h-full rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10">
                      <img src={featuredAnime.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Pagination Indicators */}
            {bannerAnime.length > 1 && (
              <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center gap-2">
                {bannerAnime.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIndex(i)}
                    className={cn(
                      "h-1 transition-all rounded-full",
                      i === bannerIndex ? "w-10 bg-indigo-500" : "w-2 bg-white/20 hover:bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
            
            {/* Background Texture Overlay */}
            <div className="absolute inset-0 bg-[#020202]/10 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className={cn("px-6 sm:px-12 lg:px-24 py-12 relative z-10", (!featuredAnime || selectedCategory !== 'All' || searchTerm || showWatchlistOnly) && "pt-12 sm:pt-20")}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div className="space-y-3 sm:space-y-4">
             <div className="flex items-center gap-3 text-indigo-400">
               <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg overflow-hidden border border-indigo-500/20">
                 <img 
                   src="https://img.freepik.com/premium-photo/cute-anime-boy-wallpaper_776894-110627.jpg?semt=ais_hybrid&w=740&q=80" 
                   alt="Icon" 
                   className="w-full h-full object-cover"
                   referrerPolicy="no-referrer"
                 />
               </div>
               <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Animem.uz Platformasi</span>
             </div>
             <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">
               {showWatchlistOnly ? 'Watchlist' : searchTerm ? `Natijalar` : selectedCategory !== 'All' ? selectedCategory : 'Yangi Anime'}
             </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Qidiruv..." 
                className="bg-white/5 border border-white/10 rounded-full pl-14 pr-6 py-3.5 text-sm focus:outline-none focus:border-indigo-500/50 w-full md:w-64 lg:w-80 transition-all font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
              className={cn(
                "p-3.5 sm:p-4 rounded-full border transition-all flex items-center justify-center shrink-0",
                showWatchlistOnly ? "bg-indigo-600 border-indigo-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <Heart size={20} fill={showWatchlistOnly ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map(n => <div key={n} className="aspect-[2/3] bg-white/5 rounded-2xl sm:rounded-3xl animate-pulse" />)}
          </div>
        ) : filteredAnime.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-8">
            {filteredAnime.map((anime, i) => (
              <motion.div
                key={anime.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 6) * 0.1 }}
                className="group relative cursor-pointer"
                onClick={() => handleOpenAnime(anime)}
              >
                <div className="aspect-[2/3] rounded-2xl sm:rounded-3xl overflow-hidden relative glass border-white/5 group-hover:border-indigo-500/50 transition-all duration-500">
                  <img src={anime.posterUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-indigo-900/40 to-transparent opacity-0 sm:group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 sm:p-6">
                    <div className="translate-y-4 sm:group-hover:translate-y-0 transition-transform duration-500">
                      <h3 className="font-black text-xs sm:text-sm uppercase tracking-tighter mb-1.5 sm:mb-2 leading-tight">{anime.title}</h3>
                      <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <span>{anime.year}</span>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star size={10} fill="currentColor" /> {anime.rating}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-2">
                    <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-widest border border-white/10">
                      {anime.type === 'movie' ? 'Film' : 'Serial'}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => handleWatchlist(e, anime.id)}
                    className={cn(
                      "absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md border transition-all",
                      watchlist.has(anime.id) ? "bg-pink-600 border-pink-500 text-white opacity-100" : "bg-black/40 border-white/10 text-white opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Heart size={12} className="sm:w-[14px] sm:h-[14px]" fill={watchlist.has(anime.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                {/* Mobile Title View */}
                <div className="mt-3 sm:hidden px-1">
                   <h3 className="font-bold text-[10px] uppercase truncate text-slate-200">{anime.title}</h3>
                   <div className="flex items-center gap-2 mt-0.5">
                     <span className="text-[8px] text-slate-500 font-bold">{anime.year}</span>
                     <div className="flex items-center gap-0.5 text-amber-500 text-[8px] font-bold">
                        <Star size={8} fill="currentColor" /> {anime.rating}
                     </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 sm:py-24 text-center glass rounded-3xl mx-4 sm:mx-0">
             <Film size={50} className="mx-auto text-slate-800 mb-6 sm:w-[60px] sm:h-[60px]" />
             <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter mb-2">Hech narsa topilmadi</h3>
             <p className="text-slate-500 uppercase tracking-widest text-[9px] sm:text-[10px]">Qidiruv shartlarini o'zgartirib ko'ring</p>
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
            className="fixed inset-0 z-[120] flex items-center justify-center sm:p-4 md:p-10"
          >
            <div className="absolute inset-0 bg-black/98 backdrop-blur-xl" onClick={() => setSelectedAnime(null)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative max-w-7xl w-full h-full sm:h-[90vh] rounded-none sm:rounded-[3rem] overflow-hidden border-0 sm:border border-white/10 flex flex-col shadow-none sm:shadow-[0_0_150px_rgba(0,0,0,1)] bg-[#050505]"
            >
              {/* Header / Breadcrumbs */}
              <div className="px-6 sm:px-10 py-4 sm:py-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md sticky top-0 z-[140]">
                <div className="flex items-center gap-3 sm:gap-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 overflow-hidden">
                   <button 
                    onClick={() => setSelectedAnime(null)} 
                    className="flex items-center gap-2 text-white hover:text-indigo-400 transition-all bg-white/5 hover:bg-white/10 px-3 sm:px-4 py-2 sm:py-2 rounded-xl border border-white/5 whitespace-nowrap"
                   >
                     <ArrowLeft size={16} /> ORQAGA
                   </button>
                   <div className="hidden sm:block h-4 w-[1px] bg-white/10 mx-2" />
                   <button onClick={() => setSelectedAnime(null)} className="hidden md:block hover:text-white transition-colors">BOSH SAHIFA</button>
                   <ChevronRight size={14} className="hidden md:block text-slate-800" />
                   <span className="text-slate-300 truncate max-w-[100px] sm:max-w-[150px]">{selectedAnime.title}</span>
                   <ChevronRight size={14} className="text-slate-800" />
                   <span className="text-indigo-400 whitespace-nowrap">{currentEpisode ? `${currentEpisode.episodeNumber}-QISM` : 'TANLASH'}</span>
                </div>
                <button 
                  onClick={() => setSelectedAnime(null)} 
                  className="p-2 text-white/40 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full shrink-0 ml-4"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Side: Player & Info */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-10 space-y-6 sm:space-y-8 pb-32 lg:pb-10">
                  
                  {/* Dubbing Selection */}
                  <div className="glass rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Dublyaj:</span>
                     <div className="flex gap-2">
                        <button className="flex-1 sm:flex-none justify-center bg-indigo-600 px-5 py-2.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                           <Check size={12} /> O'ZBEKCHA
                        </button>
                        <button className="flex-1 sm:flex-none justify-center bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full text-[10px] font-black uppercase text-slate-400 transition-all border border-white/5">
                           YAPONCHA
                        </button>
                     </div>
                  </div>

                  {/* Video Player Area */}
                  <div className="aspect-video bg-black rounded-2xl sm:rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/5 group">
                    {currentEpisode ? (
                       (() => {
                         let url = currentEpisode.videoUrl.trim();
                         if (url.startsWith('<iframe')) {
                           const srcMatch = url.match(/src=["']([^"']+)["']/);
                           if (srcMatch) url = srcMatch[1];
                         }
                         if (url.startsWith('//')) url = 'https:' + url;
                         const isDirectVideo = url.toLowerCase().match(/\.(mp4|mkv|webm|mov|avi)$/) || url.includes('stream') || url.includes('/file/');

                         if (isDirectVideo) {
                           return <video controls className="w-full h-full object-contain" key={url} playsInline autoPlay><source src={url} type="video/mp4" /></video>;
                         }
                         
                         let embedUrl = url;
                         if (url.includes('youtube.com') || url.includes('youtu.be')) {
                           embedUrl = url.replace('watch?v=', 'embed/');
                         } else if (url.includes('ok.ru/video/')) {
                           embedUrl = url.replace('ok.ru/video/', 'ok.ru/videoembed/');
                         }

                         return <iframe src={embedUrl} className="w-full h-full border-none" allowFullScreen allow="autoplay; encrypted-media" />;
                       })()
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-950/20 to-black p-6 text-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-600/20 rounded-full flex items-center justify-center animate-pulse">
                          <Play size={32} className="sm:w-10 sm:h-10 text-indigo-500 ml-1.5 sm:ml-2" />
                        </div>
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Epizodni tanlang</p>
                      </div>
                    )}
                  </div>

                  {/* Anime Details */}
                  <div className="space-y-6">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-none">{selectedAnime.title}</h2>
                        <div className="flex">
                          <div className="bg-amber-400 px-4 sm:px-5 py-2 rounded-2xl text-black font-black text-[10px] sm:text-xs flex items-center gap-2">
                            <Star size={14} fill="currentColor" className="sm:w-4 sm:h-4" /> {selectedAnime.rating} (Reyting)
                          </div>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] items-center">
                       <span className="text-indigo-400">{selectedAnime.category}</span>
                       <span className="hidden sm:block w-1.5 h-1.5 bg-slate-800 rounded-full" />
                       <span>{selectedAnime.year} YIL</span>
                       <span className="hidden sm:block w-1.5 h-1.5 bg-slate-800 rounded-full" />
                       <span>{selectedAnime.type === 'movie' ? 'Film' : 'Serial'}</span>
                     </div>
                     <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-4xl">
                       {selectedAnime.description}
                     </p>
                  </div>
                </div>

                {/* Right Side: Episode List (Sidebar) */}
                <div className="w-full lg:w-[26rem] bg-black/40 backdrop-blur-3xl border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-[50vh] lg:h-auto">
                  <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between">
                     <h3 className="text-lg sm:text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                       <Sparkles className="text-indigo-500" size={18} sm:size={20} /> Qismlar
                     </h3>
                     <span className="text-[10px] font-black text-slate-600 sm:hidden uppercase tracking-widest">{episodes.length} TA</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                    {loadingEpisodes ? (
                      <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>
                    ) : (
                      episodes.map(ep => (
                        <button
                          key={ep.id}
                          onClick={() => setCurrentEpisode(ep)}
                          className={cn(
                            "w-full text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all flex items-center gap-3 sm:gap-4 group",
                            currentEpisode?.id === ep.id 
                              ? "bg-indigo-600/10 border-indigo-600/40 shadow-xl shadow-indigo-600/5" 
                              : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 transition-transform group-hover:scale-105",
                            currentEpisode?.id === ep.id ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-500"
                          )}>
                            {ep.episodeNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className={cn("font-black text-[11px] sm:text-[12px] uppercase truncate", currentEpisode?.id === ep.id ? "text-indigo-400" : "text-white")}>
                              {ep.title || `${ep.episodeNumber}-Qism`}
                             </h4>
                             <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Animem.uz Original (TV)</p>
                          </div>
                          {currentEpisode?.id === ep.id && <Activity size={12} className="text-indigo-500 animate-pulse sm:w-[14px] sm:h-[14px]" />}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="p-6 sm:p-8 border-t border-white/5 mt-auto">
                     <button 
                      onClick={(e) => handleWatchlist(e, selectedAnime.id)}
                      className={cn(
                        "w-full py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest border flex items-center justify-center gap-3 transition-all",
                        watchlist.has(selectedAnime.id) ? "bg-pink-600 border-pink-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <Heart size={16} sm:size={18} fill={watchlist.has(selectedAnime.id) ? "currentColor" : "none"} />
                      {watchlist.has(selectedAnime.id) ? "O'chirish" : "Saqlash"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
