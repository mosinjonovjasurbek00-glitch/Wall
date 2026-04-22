import React, { useState, useEffect } from 'react';
import Hls from 'hls.js';
import { db, auth, loginWithGoogle } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp, where, increment, getDocs, addDoc, limit } from 'firebase/firestore';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Monitor, Settings, Star, Calendar, Clock, Search, Eye, X as CloseIcon, Loader2, Heart, Film, Sparkles, ChevronRight, Activity, TrendingUp, Check, ArrowLeft, MessageSquare, Send, User, Trash2, Filter, ChevronDown, RotateCcw, XCircle, Share2, Copy } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CATEGORIES, categoryKeys } from '../constants';

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
  openingStart?: number;
  openingEnd?: number;
  createdAt: any;
}

interface CommentDoc {
  id: string;
  userId: string;
  username: string;
  photoURL?: string;
  avatarUrl?: string; // Support legacy
  content: string;
  createdAt: any;
}

const UniversalVideoPlayer = ({ src, videoRef, setVideoLoading, setCurrentTime }: any) => {
  const [loadError, setLoadError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const resolveSrc = async () => {
      if (!src) return;
      
      // If it's already a direct link or not our rumble proxy, use it
      if (!src.includes('/api/rumble/stream')) {
        setResolvedSrc(src);
        return;
      }

      setVideoLoading(true);
      setLoadError(false);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const fetchUrl = `${src}${src.includes('?') ? '&' : '?'}format=json`;
        const response = await fetch(fetchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        // Handle non-ok responses (like 404, 500)
        if (!response.ok) {
           const text = await response.text();
           console.error("[Player] Fetch failed status:", response.status, text.substring(0, 100));
           throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          if (data.url) {
            setResolvedSrc(data.url);
          } else {
            console.error("[Player] Source resolution failed (JSON data):", data.error);
            setLoadError(true);
            setVideoLoading(false);
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (isMounted) {
          console.error("[Player] Extraction fetch error:", err.message);
          setLoadError(true);
          setVideoLoading(false);
        }
      }
    };

    resolveSrc();
    return () => { isMounted = false; };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedSrc) return;

    setLoadError(false);
    // Loading starts
    setVideoLoading(true);

    let hls: any = null;

    const initVideo = () => {
      if (resolvedSrc.includes('.m3u8')) {
        if (Hls.isSupported()) {
          if (hls) hls.destroy();
          hls = new Hls();
          
          hls.on(Hls.Events.ERROR, function(event: any, data: any) {
            if (data.fatal) {
              console.error("[HLS] Fatal error:", data);
              setLoadError(true);
              setVideoLoading(false);
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  break;
              }
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setVideoLoading(false);
          });

          hls.loadSource(resolvedSrc);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = resolvedSrc;
        }
      } else {
        video.src = resolvedSrc;
      }
    };

    initVideo();

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, resolvedSrc, videoRef]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video 
        ref={videoRef}
        className="w-full h-full object-contain outline-none focus:outline-none" 
        key={resolvedSrc || src}
        controls
        playsInline 
        autoPlay
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (typeof setCurrentTime === 'function') setCurrentTime(video.currentTime);
        }}
        onCanPlay={() => setVideoLoading(false)}
        onLoadedData={() => setVideoLoading(false)}
        onWaiting={() => setVideoLoading(true)}
        onPlaying={() => setVideoLoading(false)}
        onError={() => {
          console.error("Video playback error for src:", resolvedSrc || src);
          setVideoLoading(false);
          setLoadError(true);
        }}
      />


      {/* Error Overlay */}
      <AnimatePresence>
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[150] p-6 text-center">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Video format supported emas</h3>
              <p className="text-white/60 text-sm mb-6">
                Bu video manzilini to'g'ridan-to'g'ri ochishda xatolik yuz berdi. Iltimos, boshqa epizodni kuring yoki sahifani yangilang.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.reload();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors shadow-lg"
                >
                  Sahifani yangilash
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { Language, useTranslation } from '../i18n';

interface AnimePortalProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  animeList: AnimeDoc[];
  loading: boolean;
  language: Language;
}

export default function AnimePortal({ selectedCategory, setSelectedCategory, animeList, loading, language }: AnimePortalProps) {
  const t = useTranslation(language);
  const [user] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [selectedAnime, setSelectedAnime] = useState<AnimeDoc | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'player'>('details');
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeDoc | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [forceLegacy, setForceLegacy] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const itemsPerPage = 12;

  // Global fallback timeout for stuck loading states
  useEffect(() => {
    let timeout: any;
    if (videoLoading) {
      timeout = setTimeout(() => {
        setVideoLoading(false);
        console.warn("[Player] Global loading timeout reached. Force clearing loading state.");
      }, 15000); // 15 seconds max global load time before giving up
    }
    return () => clearTimeout(timeout);
  }, [videoLoading]);

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
    
    const qHistory = query(
      collection(db, 'history'), 
      where('userId', '==', auth.currentUser.uid), 
      orderBy('updatedAt', 'desc'), 
      limit(10)
    );
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => { unsubscribe(); unsubHistory(); };
  }, [auth.currentUser]);

  useEffect(() => {
    if (!selectedAnime) return;
    setLoadingEpisodes(true);
    const q = query(collection(db, 'anime', selectedAnime.id, 'episodes'), orderBy('episodeNumber', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EpisodeDoc[];
      setEpisodes(docs);
      if (docs.length > 0 && !currentEpisode) {
        setVideoLoading(true);
        setCurrentEpisode(docs[0]);
      }
      setLoadingEpisodes(false);
    });
    return () => unsubscribe();
  }, [selectedAnime]);

  useEffect(() => {
    setForceLegacy(false);
  }, [selectedAnime?.id, currentEpisode?.id]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredAnime = animeList.filter(anime => {
    const matchesSearch = anime.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          anime.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || anime.category === selectedCategory;
    const matchesWatchlist = !showWatchlistOnly || watchlist.has(anime.id);
    const matchesYear = filterYear === 'All' || anime.year?.toString() === filterYear;
    const matchesType = filterType === 'All' || anime.type === filterType;
    // status checks for data presence since old docs might not have it
    const matchesStatus = filterStatus === 'All' || (anime as any).status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesWatchlist && matchesYear && matchesType && matchesStatus;
  });

  const availableYears = Array.from(new Set(animeList.map(a => a.year?.toString()).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  // Deep linking logic
  useEffect(() => {
    if (loading || animeList.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const animeId = params.get('anime');
    const epNum = params.get('episode');
    const catParam = params.get('category');

    if (catParam && CATEGORIES.includes(catParam)) {
      setSelectedCategory(catParam);
    }

    if (animeId) {
      const anime = animeList.find(a => a.id === animeId);
      if (anime) {
        setSelectedAnime(anime);
        setModalMode(epNum ? 'player' : 'details');
        
        // If episode number is provided, we wait for episodes to load then set it
        // but the episodes useEffect already handles selecting the first one.
        // We can let the episodes useEffect handle the specific episode once loaded.
      }
    }
  }, [loading, animeList.length]);

  // Handle specific episode from URL once loaded
  useEffect(() => {
    if (!selectedAnime || episodes.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const epNum = params.get('episode');
    if (epNum) {
      const ep = episodes.find(e => e.episodeNumber.toString() === epNum);
      if (ep) {
        setCurrentEpisode(ep);
      }
    }
  }, [selectedAnime, episodes]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAnime.length / itemsPerPage);
  const paginatedAnime = filteredAnime.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, showWatchlistOnly, filterYear, filterType, filterStatus]);

  useEffect(() => {
    if (!selectedAnime || modalMode !== 'details') {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, 'anime', selectedAnime.id, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommentDoc[]);
    });
    return () => unsubscribe();
  }, [selectedAnime, modalMode]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAnime || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      // Get the latest profile data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const customUsername = userDoc.exists() ? userDoc.data().username : null;
      const customPhotoURL = userDoc.exists() ? (userDoc.data().photoURL || userDoc.data().avatarUrl) : null;

      await addDoc(collection(db, 'anime', selectedAnime.id, 'comments'), {
        userId: user.uid,
        username: customUsername || user.displayName || user.email?.split('@')[0] || user.phoneNumber || 'Foydalanuvchi',
        photoURL: customPhotoURL || user.photoURL || '',
        content: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedAnime) return;
    try {
      await deleteDoc(doc(db, 'anime', selectedAnime.id, 'comments', commentId));
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

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

  const handleEpisodeSelect = async (ep: EpisodeDoc) => {
    if (currentEpisode?.id === ep.id) return;
    setVideoLoading(true);
    setCurrentEpisode(ep);
    setCurrentTime(0);
    
    if (auth.currentUser && selectedAnime) {
      const historyId = `${auth.currentUser.uid}_${selectedAnime.id}`;
      setDoc(doc(db, 'history', historyId), {
        userId: auth.currentUser.uid,
        animeId: selectedAnime.id,
        episodeId: ep.id,
        episodeNumber: ep.episodeNumber,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  };

  const handleOpenAnime = (anime: AnimeDoc, mode: 'details' | 'player' = 'details') => {
    setSelectedAnime(anime);
    setModalMode(mode);
    setCurrentEpisode(null);
    setEpisodes([]);
    setExpandedDesc(false);
    
    // URLni dinamik yangilash (DOMen/anime/ID)
    const newUrl = `${window.location.origin}/anime/${anime.id}`;
    window.history.pushState({ animeId: anime.id }, '', newUrl);

    if (mode === 'player') {
      setDoc(doc(db, 'anime', anime.id), { views: increment(1) }, { merge: true });
    }
  };

  const skipOpening = () => {
    if (videoRef.current && currentEpisode?.openingEnd) {
      videoRef.current.currentTime = currentEpisode.openingEnd;
      setCurrentTime(currentEpisode.openingEnd);
    }
  };

  const historyAnime = history.map(h => {
    const anime = animeList.find(a => a.id === h.animeId);
    if (!anime) return null;
    return { ...anime, lastEpisode: h.episodeNumber };
  }).filter(Boolean) as any[];

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      {/* ... Hero Section remains mostly the same, but we update the button ... */}
      {!loading && featuredAnime && (selectedCategory === 'All') && !searchTerm && !showWatchlistOnly && (
        <div className="px-4 sm:px-6 lg:px-12 pt-6 sm:pt-10 pb-4">
          <div className="relative min-h-[480px] h-[70vh] md:h-[50vh] w-full rounded-[2rem] sm:rounded-[3rem] overflow-hidden bg-[#0A0A0A] border border-white/[0.03] shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div 
                key={featuredAnime.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 flex flex-col md:flex-row items-center justify-center md:justify-between px-6 sm:px-12 md:px-20 py-8 md:py-4 gap-6 md:gap-6"
              >
                {/* Visual Background Element (Subtle) */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-red-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                {/* Left Side: Content */}
                <div className="flex-1 z-10 space-y-1 sm:space-y-1.5 md:space-y-2 text-center md:text-left">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tighter leading-none mb-1 uppercase text-white">
                      {featuredAnime.title}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-1 sm:gap-2 mb-1 md:mb-2">
                       <span className="bg-white/5 border border-white/10 px-3 sm:px-6 py-1 sm:py-2 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-red-400">
                          {t((categoryKeys[featuredAnime.category] || featuredAnime.category) as any)}
                       </span>
                       <span className="bg-white/5 border border-white/10 px-3 sm:px-6 py-1 sm:py-2 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {featuredAnime.type === 'movie' ? t('movie') : t('serial')}
                       </span>
                       <span className="bg-white/5 border border-white/10 px-3 sm:px-6 py-1 sm:py-2 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {featuredAnime.year}
                       </span>
                    </div>

                    <p className="hidden md:block text-[10px] sm:text-xs text-slate-400 line-clamp-2 font-medium max-w-lg leading-relaxed mb-2 md:mb-4">
                      {featuredAnime.description}
                    </p>

                    <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4">
                      <button 
                         onClick={() => handleOpenAnime(featuredAnime, 'details')}
                         className="group relative flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-95 overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                         <Play size={14} fill="currentColor" className="relative z-10" /> 
                         <span className="relative z-10">{t('info')}</span>
                         {/* Glow effect */}
                         <div className="absolute inset-0 shadow-[0_0_30px_rgba(220,38,38,0.3)] rounded-2xl" />
                      </button>
                      
                      <button 
                        onClick={(e) => handleWatchlist(e, featuredAnime.id)}
                        className={cn(
                          "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all active:scale-95 group backdrop-blur-md",
                          watchlist.has(featuredAnime.id) ? "bg-pink-600 border-pink-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <Heart size={14} fill={watchlist.has(featuredAnime.id) ? "currentColor" : "none"} className={cn(watchlist.has(featuredAnime.id) ? "text-white" : "text-white/40 group-hover:text-white")} />
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* Right Side: Poster Image */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="h-[180px] sm:h-[220px] md:h-full aspect-[2/3] z-10 flex-shrink-0 flex items-center"
                >
                  <div className="h-full rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/5 group-hover:border-red-500/30 transition-colors">
                    <img 
                      src={featuredAnime.posterUrl} 
                      alt={featuredAnime.title}
                      className="h-full w-auto object-cover group-hover:scale-105 transition-transform duration-700" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Redesigned Pagination Indicators */}
            {bannerAnime.length > 1 && (
              <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center gap-2">
                {bannerAnime.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIndex(i)}
                    className={cn(
                      "transition-all duration-300 rounded-full",
                      i === bannerIndex 
                        ? "w-8 h-1.5 bg-red-500" 
                        : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Grid Content */}
      <div id="anime-grid" className={cn("px-6 sm:px-12 lg:px-24 py-12 relative z-10", (!featuredAnime || selectedCategory !== 'All' || searchTerm || showWatchlistOnly) && "pt-12 sm:pt-20")}>
        
        {/* Categories Bar */}
        <div id="categories-section" className="mb-12 overflow-x-auto no-scrollbar pb-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 sm:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                  selectedCategory === cat 
                    ? "bg-red-600 border-red-500 text-white shadow-xl shadow-red-600/20" 
                    : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-white"
                )}
              >
                {t((categoryKeys[cat] || cat) as any)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div className="space-y-3 sm:space-y-4">
             <div className="flex items-center gap-3 text-red-400">
               <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg overflow-hidden border border-red-500/20">
                 <img 
                   src="https://i.pinimg.com/736x/17/c6/88/17c688c6242fe4c3293be182924e73a3.jpg" 
                   alt="Icon" 
                   className="w-full h-full object-cover"
                   referrerPolicy="no-referrer"
                 />
               </div>
               <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Animem Uz Platformasi</span>
             </div>
             <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">
               {showWatchlistOnly ? t('watchlist') : searchTerm ? t('results') : selectedCategory !== 'All' ? t((categoryKeys[selectedCategory] || selectedCategory) as any) : t('newAnime')}
             </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-400 transition-colors" size={18} />
              <input 
                id="search-input"
                type="text" 
                placeholder={t('search')} 
                className="bg-white/5 border border-white/10 rounded-full pl-14 pr-6 py-3.5 text-sm focus:outline-none focus:border-red-500/50 w-full md:w-64 lg:w-80 transition-all font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-3.5 sm:p-4 rounded-full border transition-all flex items-center justify-center shrink-0",
                showFilters || filterYear !== 'All' || filterType !== 'All' || filterStatus !== 'All' 
                  ? "bg-red-600 border-red-500 shadow-xl" 
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
              title={t('filterTitle')}
            >
              <Filter size={20} className={cn((filterYear !== 'All' || filterType !== 'All' || filterStatus !== 'All') && "text-white")} />
            </button>

            <button 
              onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
              className={cn(
                "p-3.5 sm:p-4 rounded-full border transition-all flex items-center justify-center shrink-0",
                showWatchlistOnly ? "bg-red-600 border-red-500 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <Heart size={20} fill={showWatchlistOnly ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 48 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-xl flex flex-wrap items-end gap-6 sm:gap-10">
                {/* Year Filter */}
                <div className="flex-1 min-w-[140px] space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                    <Calendar size={12} className="text-red-400" />
                    {t('yearLabel')}
                  </label>
                  <div className="relative group">
                    <select 
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="appearance-none w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none focus:border-red-500/50 transition-all pr-12 cursor-pointer hover:bg-white/10"
                    >
                      <option value="All" className="bg-[#0A0A0A]">{t('allYears')}</option>
                      {availableYears.map(y => (
                        <option key={y} value={y} className="bg-[#0A0A0A]">{y}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-red-400" />
                  </div>
                </div>

                {/* Type Filter */}
                <div className="flex-1 min-w-[140px] space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                    <Film size={12} className="text-red-400" />
                    {t('typeLabel')}
                  </label>
                  <div className="relative group">
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="appearance-none w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none focus:border-red-500/50 transition-all pr-12 cursor-pointer hover:bg-white/10"
                    >
                      <option value="All" className="bg-[#0A0A0A]">{t('all')}</option>
                      <option value="movie" className="bg-[#0A0A0A]">{t('movie')}</option>
                      <option value="series" className="bg-[#0A0A0A]">{t('serial')}</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-red-400" />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex-1 min-w-[140px] space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                    <Activity size={12} className="text-red-400" />
                    {t('status')}
                  </label>
                  <div className="relative group">
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none focus:border-red-500/50 transition-all pr-12 cursor-pointer hover:bg-white/10"
                    >
                      <option value="All" className="bg-[#0A0A0A]">{t('all')}</option>
                      <option value="ongoing" className="bg-[#0A0A0A]">{t('ongoing')}</option>
                      <option value="finished" className="bg-[#0A0A0A]">{t('finished')}</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-red-400" />
                  </div>
                </div>

                {/* Reset Button */}
                <div className="flex-shrink-0">
                  <button 
                    onClick={() => {
                      setFilterYear('All');
                      setFilterType('All');
                      setFilterStatus('All');
                      setSelectedCategory('All');
                      setSearchTerm('');
                    }}
                    className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-6 py-3.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 group shadow-lg hover:shadow-red-500/10"
                  >
                    <RotateCcw size={16} className="group-hover:-rotate-45 transition-transform" />
                    {t('clearFilters')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Watching Section */}
        <AnimatePresence>
          {auth.currentUser && historyAnime.length > 0 && !searchTerm && selectedCategory === 'All' && filterYear === 'All' && filterType === 'All' && filterStatus === 'All' && !showWatchlistOnly && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-16 sm:mb-20"
            >
              <div className="flex items-center gap-4 mb-8 sm:mb-10">
                <div className="flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-4 py-2 rounded-full">
                  <Clock size={16} className="text-red-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">{t('continueWatching')}</span>
                </div>
              </div>
              
              <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6 sm:mx-0 sm:px-0">
                {historyAnime.map((anime) => (
                  <motion.div 
                    key={`history-${anime.id}`}
                    whileHover={{ scale: 1.02 }}
                    className="flex-shrink-0 w-[240px] sm:w-[320px] group cursor-pointer"
                    onClick={() => handleOpenAnime(anime, 'player')}
                  >
                    <div className="relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 shadow-2xl transition-all group-hover:border-red-500/50">
                      <img 
                        src={anime.posterUrl} 
                        alt={anime.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-black text-xs sm:text-sm uppercase tracking-tight text-white truncate">{anime.title}</h4>
                          <p className="text-[9px] sm:text-[10px] font-black text-red-400 uppercase tracking-widest mt-1">
                            {anime.lastEpisode}-{t('episodeShort')}
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-110 transition-transform">
                          <Play size={18} fill="currentColor" />
                        </div>
                      </div>
                      
                      {/* Progress line (visual only) */}
                      <div className="absolute bottom-0 left-0 h-1 bg-red-500 w-2/3" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map(n => <div key={n} className="aspect-[2/3] bg-white/5 rounded-2xl sm:rounded-3xl animate-pulse" />)}
          </div>
        ) : filteredAnime.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-8">
              {paginatedAnime.map((anime, i) => (
                <motion.div
                  key={anime.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 6) * 0.1 }}
                  className="group relative cursor-pointer"
                  onClick={() => handleOpenAnime(anime)}
                >
                  <div className="aspect-[2/3] rounded-2xl sm:rounded-[3rem] overflow-hidden relative glass border-white/5 group-hover:border-red-500/50 transition-all duration-500 shadow-2xl">
                    <img src={anime.posterUrl} alt={anime.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Hover Overlay - Simplified as info is now below */}
                    <div className="absolute inset-0 bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center p-6">
                      <div className="scale-75 group-hover:scale-100 transition-transform duration-500 h-16 w-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                         <Play size={24} fill="white" className="ml-1 text-white" />
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col gap-2">
                      <span className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest border border-white/10 text-white">
                        {anime.type === 'movie' ? t('movies') : t('series')}
                      </span>
                    </div>

                    <button 
                      onClick={(e) => handleWatchlist(e, anime.id)}
                      className={cn(
                        "absolute top-3 right-3 sm:top-5 sm:right-5 p-2 sm:p-2.5 rounded-xl backdrop-blur-md border transition-all",
                        watchlist.has(anime.id) ? "bg-pink-600 border-pink-500 text-white opacity-100 shadow-lg shadow-pink-600/30" : "bg-black/60 border-white/10 text-white opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Heart size={14} className="sm:w-[16px] sm:h-[16px]" fill={watchlist.has(anime.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  
                  {/* Unified Title & View Count (Always Visible) */}
                  <div className="mt-4 px-2">
                     <h3 className="font-black text-xs sm:text-[13px] uppercase tracking-tight truncate text-white group-hover:text-red-400 transition-colors leading-tight">{anime.title}</h3>
                     <div className="flex items-center justify-between mt-2">
                       <div className="flex items-center gap-3">
                         <span className="text-[9px] text-slate-600 font-black tracking-widest">{anime.year}</span>
                         <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-black">
                            <Star size={12} fill="currentColor" /> {anime.rating}
                         </div>
                       </div>
                       <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">
                          <Eye size={12} className="text-red-500/50" />
                          <span>{anime.views || 0}</span>
                       </div>
                     </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination UI - Based on User's Image */}
            {totalPages > 1 && (
              <div className="mt-20 flex justify-center items-center gap-2 sm:gap-4 pb-10">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:pointer-events-none group"
                >
                  <ArrowLeft size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                </button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNumber = idx + 1;
                  // Only show current page, plus/minus 2 pages
                  if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={cn(
                          "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl text-sm font-black transition-all border",
                          currentPage === pageNumber 
                            ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-600/30" 
                            : "bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                    return <span key={pageNumber} className="text-slate-700 font-bold px-1 sm:px-2">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:pointer-events-none group"
                >
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 sm:py-24 text-center glass rounded-3xl mx-4 sm:mx-0">
             <Film size={50} className="mx-auto text-slate-800 mb-6 sm:w-[60px] sm:h-[60px]" />
             <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter mb-2">Hech narsa topilmadi</h3>
             <p className="text-slate-500 uppercase tracking-widest text-[9px] sm:text-[10px]">Qidiruv shartlarini o'zgartirib ko'ring</p>
          </div>
        )}
      </div>

      {/* Unified Detail & Player Modal */}
      <AnimatePresence>
        {selectedAnime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4"
          >
            <div 
              className="absolute inset-0 bg-black/95 shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" 
              onClick={() => setSelectedAnime(null)} 
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                "relative max-w-7xl w-full h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-[4rem] overflow-hidden border-0 sm:border border-white/5 flex flex-col shadow-[0_50px_200px_rgba(0,0,0,0.9)] bg-[#050505] transition-all duration-500",
                modalMode === 'details' ? "sm:max-w-5xl" : "sm:max-w-[1400px]"
              )}
            >
               {/* Breadcrumbs */}
               <div className="flex items-center gap-2 px-8 sm:px-12 pt-8 sm:pt-10 overflow-x-auto no-scrollbar whitespace-nowrap">
                  <button 
                    onClick={() => setSelectedAnime(null)}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors"
                  >
                    {t('home')}
                  </button>
                  <ChevronRight size={10} className="text-slate-700 shrink-0" />
                  <button 
                    onClick={() => setModalMode('details')}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                      modalMode === 'details' ? "text-red-400" : "text-slate-500 hover:text-white"
                    )}
                  >
                    {selectedAnime.title}
                  </button>
                  {modalMode === 'player' && currentEpisode && (
                    <>
                      <ChevronRight size={10} className="text-slate-700 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                        {currentEpisode.episodeNumber}-{t('episode')}
                      </span>
                    </>
                  )}
               </div>

              <button 
                onClick={() => setSelectedAnime(null)} 
                className="absolute top-6 right-6 z-[300] p-3 text-white/40 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full border border-white/5 flex items-center justify-center active:scale-90"
              >
                <CloseIcon size={24} />
              </button>

              <AnimatePresence mode="wait">
                {modalMode === 'details' ? (
                  <motion.div 
                    key={`details-${selectedAnime.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col md:flex-row p-6 sm:p-12 md:p-20 gap-10 md:gap-16 items-center md:items-start relative overflow-y-auto custom-scrollbar"
                  >
                    {/* Background atmosphere for details */}
                    <div className="absolute top-0 right-0 w-full h-full bg-red-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                    {/* Left: Poster and Buttons */}
                    <div className="w-full sm:w-[280px] md:w-[320px] flex-shrink-0 z-10 space-y-4">
                       <div className="aspect-[2/3] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
                          <img src={selectedAnime.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       </div>
                       
                       <div className="space-y-3">
                          <button 
                            onClick={(e) => handleWatchlist(e, selectedAnime.id)}
                            className={cn(
                              "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95",
                              watchlist.has(selectedAnime.id) 
                                ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20" 
                                : "bg-red-600 text-white shadow-lg shadow-red-600/20"
                            )}
                          >
                             <Heart size={16} fill={watchlist.has(selectedAnime.id) ? "currentColor" : "none"} />
                             {watchlist.has(selectedAnime.id) ? t('savedBtn') : t('save')}
                          </button>
                          
                          <button 
                            onClick={() => setIsShareModalOpen(true)}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
                          >
                             <Share2 size={16} />
                             {t('share')}
                          </button>
                          
                          <button 
                            onClick={() => {
                              setModalMode('player');
                              setDoc(doc(db, 'anime', selectedAnime.id), { views: increment(1) }, { merge: true });
                            }}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
                          >
                             <Play size={16} fill="white" />
                             {t('watch')}
                          </button>
                       </div>

                       {/* Recommended Anime Section */}
                       <div className="hidden lg:block pt-8 border-t border-white/5">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{t('recently')}</h4>
                          <div className="grid grid-cols-2 gap-3">
                             {animeList.filter(a => a.id !== selectedAnime.id).slice(0, 4).map(recommend => (
                               <button 
                                 key={recommend.id}
                                 onClick={() => handleOpenAnime(recommend)}
                                 className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 hover:border-red-500/50 transition-all"
                               >
                                  <img src={recommend.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 z-10 space-y-8 text-center md:text-left pt-4">
                       <div>
                         <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6 leading-tight">
                           {selectedAnime.title}
                         </h2>
                         
                         <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-8">
                            <span className="bg-red-600 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white">TV</span>
                            <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">{t('completed')}</span>
                            <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">{selectedAnime.year}</span>
                            <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                               <Eye size={12} className="text-red-400" /> {selectedAnime.views || 0}
                            </div>
                            <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                               <Star size={12} fill="currentColor" /> {selectedAnime.rating}
                            </div>
                         </div>
                       </div>

                       <div className="space-y-4">
                          <p className={cn("text-slate-400 text-sm sm:text-base font-medium leading-relaxed transition-all", expandedDesc ? "" : "line-clamp-3")}>
                            {selectedAnime.description}
                          </p>
                          {selectedAnime.description && selectedAnime.description.length > 150 && (
                            <button 
                              onClick={() => setExpandedDesc(!expandedDesc)}
                              className="text-red-400 font-black text-[10px] uppercase tracking-widest hover:text-red-300 transition-colors"
                            >
                              {expandedDesc ? t('readLess') : t('readMore')}
                            </button>
                          )}
                       </div>

                       {/* Comments Section */}
                       <div className="pt-10 border-t border-white/5 space-y-8 text-left">
                          <div className="flex items-center gap-3">
                             <MessageSquare size={20} className="text-red-500" />
                             <h3 className="text-xl font-black uppercase tracking-tighter">{t('comments')} ({comments.length})</h3>
                          </div>

                          {user ? (
                            <form onSubmit={handlePostComment} className="relative">
                               <textarea 
                                 placeholder={t('leaveComment')} 
                                 className="glass-input w-full min-h-[100px] py-4 pr-16 bg-white/[0.02] text-left"
                                 value={newComment}
                                 onChange={e => setNewComment(e.target.value)}
                                 required
                               />
                               <button 
                                 disabled={submittingComment || !newComment.trim()}
                                 className="absolute bottom-4 right-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-600/30"
                               >
                                 {submittingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                               </button>
                            </form>
                          ) : (
                            <div className="glass p-6 rounded-2xl flex items-center justify-between gap-4 border-dashed border-white/10">
                               <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">{t('loginToComment')}</p>
                               <button 
                                 onClick={loginWithGoogle}
                                 className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                               >
                                 {t('login')}
                               </button>
                            </div>
                          )}

                          <div className="space-y-4">
                             {comments.map(comment => (
                               <div key={comment.id} className="glass p-5 rounded-2xl relative group">
                                  <div className="flex justify-between items-start mb-2">
                                     <div className="flex items-center gap-3">
                                        {comment.avatarUrl ? (
                                          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                                             <img src={comment.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          </div>
                                        ) : (
                                          <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center border border-white/10 shrink-0">
                                             <User size={14} className="text-red-500" />
                                          </div>
                                        )}
                                        <span className="text-[10px] font-black uppercase text-red-400 tracking-widest">{comment.username}</span>
                                     </div>
                                     {(user?.uid === comment.userId || user?.uid === 'mosinjonovjasurbek00@gmail.com') && (
                                       <button 
                                         onClick={() => handleDeleteComment(comment.id)}
                                         className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-500 transition-all"
                                       >
                                         <Trash2 size={14} />
                                       </button>
                                     )}
                                  </div>
                                  <p className="text-xs text-slate-300 font-medium leading-relaxed pl-11">{comment.content}</p>
                               </div>
                             ))}
                             {comments.length === 0 && (
                               <p className="text-center py-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic">{t('noComments')}</p>
                             )}
                          </div>
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={`player-${selectedAnime.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col lg:flex-row overflow-hidden relative"
                  >
                    {/* Back to Details Button */}
                    <button 
                      onClick={() => setModalMode('details')}
                      className="absolute top-6 left-6 z-[300] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-xl border border-white/5"
                    >
                      <ArrowLeft size={16} /> {t('info')}
                    </button>

                    {/* Left Side: Player & Info */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-10 pt-20 sm:pt-24 space-y-6">
                      
                      {/* Simplified Dubbing Selection */}
                      <div className="flex items-center justify-between pr-4">
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">DUBLYAJ:</span>
                            <div className="flex gap-2">
                               <button className="bg-red-600 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-red-600/30 text-white">
                                  <Check size={12} /> 日本語
                               </button>
                            </div>
                         </div>

                         {/* Next Episode Button */}
                         {currentEpisode && episodes.some(e => e.episodeNumber > currentEpisode.episodeNumber) && (
                           <button 
                             onClick={() => {
                               const next = episodes.find(e => e.episodeNumber > currentEpisode.episodeNumber);
                               if (next) {
                                  setVideoLoading(true);
                                  setCurrentEpisode(next);
                               }
                             }}
                             className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl transition-all active:scale-95"
                           >
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-red-400 transition-colors">Keyingi qism</span>
                             <ChevronRight size={16} className="text-red-500" />
                           </button>
                         )}
                      </div>

                      {/* Video Player Area */}
                      <div className="aspect-video bg-black rounded-2xl sm:rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/5 group">
                        {/* Video Loading State */}
                        {currentEpisode && videoLoading && (
                          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
                            <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white animate-pulse mb-6">Yuklanmoqda...</p>
                          </div>
                        )}
                        
                        {/* Anime Title Overlay */}
                        <div className="absolute top-6 left-6 z-20 pointer-events-none">
                          <h3 className="text-white/80 font-black text-xs sm:text-sm uppercase tracking-widest drop-shadow-lg">
                            {selectedAnime.title}
                          </h3>
                        </div>

                        {currentEpisode ? (
                           (() => {
                             let url = currentEpisode.videoUrl.trim();
                             if (url.startsWith('<iframe')) {
                               const srcMatch = url.match(/src=["']([^"']+)["']/);
                               if (srcMatch) url = srcMatch[1];
                             }
                             if (url.startsWith('//')) url = 'https:' + url;
                             
                             // Handle Telegram URLs explicitly via our streaming API proxy
                             if (url.includes('t.me/') && !forceLegacy) {
                               const proxyUrl = `/api/telegram/stream?url=${encodeURIComponent(url)}`;
                               return (
                                 <UniversalVideoPlayer 
                                   src={proxyUrl}
                                   videoRef={videoRef}
                                   setVideoLoading={setVideoLoading}
                                   setCurrentTime={setCurrentTime}
                                 />
                               );
                             }

                              // Handle Telegram URLs using our fast streaming proxy
                              if (url.includes('t.me/') || url.includes('telegram')) {
                                  const proxyUrl = `/api/telegram/stream?url=${encodeURIComponent(url)}`;
                                  return (
                                    <UniversalVideoPlayer 
                                      src={proxyUrl}
                                      videoRef={videoRef}
                                      setVideoLoading={setVideoLoading}
                                      setCurrentTime={setCurrentTime}
                                    />
                                  );
                              }

                              // Handle VK URLs using our fast streaming proxy
                              if (url.includes('vk.com/')) {
                                  const proxyUrl = `/api/vk/stream?url=${encodeURIComponent(url)}`;
                                  return (
                                    <UniversalVideoPlayer 
                                      src={proxyUrl}
                                      videoRef={videoRef}
                                      setVideoLoading={setVideoLoading}
                                      setCurrentTime={setCurrentTime}
                                    />
                                  );
                              }
                              
                              // Dailymotion and others are removed to ensure only fast streaming is used, no iframe fallback.

                              const isDirectVideo = (url.toLowerCase().match(/\.(mp4|mkv|webm|mov|avi|m3u8)$/) || url.includes('stream') || url.includes('/file/')) && !forceLegacy;

                             if (isDirectVideo) {
                               return (
                                 <UniversalVideoPlayer 
                                   src={url}
                                   videoRef={videoRef}
                                   setVideoLoading={setVideoLoading}
                                   setCurrentTime={setCurrentTime}
                                 />
                               );
                             }
                             
                             let embedUrl = url;
                             if (url.includes('youtube.com') || url.includes('youtu.be')) {
                               embedUrl = url.replace('watch?v=', 'embed/');
                             } else if (url.includes('ok.ru/video/')) {
                               embedUrl = url.replace('ok.ru/video/', 'ok.ru/videoembed/');
                             }

                             return (
                               <iframe 
                                 key={embedUrl}
                                 src={embedUrl} 
                                 className="w-full h-full border-none" 
                                 allowFullScreen 
                                 allow="autoplay; encrypted-media" 
                                 onLoad={() => setVideoLoading(false)}
                               />
                             );
                           })()
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-red-950/20 to-black p-6 text-center">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-600/20 rounded-full flex items-center justify-center animate-pulse">
                              <Play size={32} className="sm:w-10 sm:h-10 text-red-500 ml-1.5 sm:ml-2" />
                            </div>
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{t('selectEpisodeFirst')}</p>
                          </div>
                        )}

                        {/* Skip Opening Button */}
                        <AnimatePresence>
                          {currentEpisode && 
                           (currentEpisode.openingStart !== undefined && currentEpisode.openingStart !== null) && 
                           (currentEpisode.openingEnd !== undefined && currentEpisode.openingEnd !== null) && 
                           Number(currentEpisode.openingEnd) > 0 &&
                           currentTime >= Number(currentEpisode.openingStart) && 
                           currentTime < Number(currentEpisode.openingEnd) && (
                            <motion.button
                              key="skip-opening-btn"
                              initial={{ opacity: 0, scale: 0.8, x: 20 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.8, x: 20 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                skipOpening();
                              }}
                              className="absolute bottom-16 right-8 z-[999] bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_10px_40px_rgba(220,38,38,0.4)] border border-red-400 flex items-center gap-3 active:scale-90 transition-all cursor-pointer"
                            >
                               <Sparkles size={16} className="text-white" />
                               Openingdan o'tish
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Right Side: Episode List (Sidebar) */}
                    <div className="w-full lg:w-[26rem] bg-white/[0.01] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-[40vh] lg:h-auto">
                      <div className="px-8 pt-8 pb-4">
                         <h3 className="text-2xl font-black uppercase tracking-tighter">{t('episodes')}</h3>
                      </div>
                                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                        {loadingEpisodes ? (
                          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-red-500" /></div>
                        ) : (
                          episodes.map(ep => (
                            <button
                              key={ep.id}
                              onClick={() => handleEpisodeSelect(ep)}
                              className={cn(
                                "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4",
                                currentEpisode?.id === ep.id 
                                  ? "bg-red-600/10 border-red-600/40 shadow-lg" 
                                  : "bg-white/5 border-white/5 hover:bg-white/10"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                                currentEpisode?.id === ep.id ? "bg-red-600 text-white" : "bg-white/10 text-slate-400"
                              )}>
                                {ep.episodeNumber}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className={cn("font-black text-[12px] uppercase truncate", currentEpisode?.id === ep.id ? "text-red-400" : "text-white")}>
                                  {ep.title || `${ep.episodeNumber}-qism`}
                                 </h4>
                                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">TV</p>
                              </div>
                              {currentEpisode?.id === ep.id && <Activity size={12} className="text-red-500 animate-pulse" />}
                            </button>
                          ))
                        )}
                        {episodes.length === 0 && !loadingEpisodes && (
                           <p className="text-center py-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic">{t('noEpisodes')}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        url={window.location.href} 
        title={selectedAnime?.title || ''} 
        t={t} 
      />

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-10 right-10 z-[150] w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.3)] active:scale-95 transition-all border border-red-400 group"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronRight size={28} className="-rotate-90 group-hover:scale-110 transition-transform" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
