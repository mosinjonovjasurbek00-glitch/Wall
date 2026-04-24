import React, { useState, useEffect } from 'react';
import Hls from 'hls.js';
import { db, auth, loginWithGoogle } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp, where, increment, getDocs, addDoc, limit } from 'firebase/firestore';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Monitor, Settings, Star, Calendar, Clock, Search, Eye, X as CloseIcon, Loader2, Heart, Film, Sparkles, ChevronRight, Activity, TrendingUp, Check, ArrowLeft, MessageSquare, Send, User, Trash2, Filter, ChevronDown, RotateCcw, XCircle, Share2, Copy, Home, LayoutGrid, Bookmark, LogOut, Plus } from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [duration, setDuration] = useState(0);

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
    <div className="relative w-full h-full bg-black flex items-center justify-center group overflow-hidden">
      <video 
        ref={videoRef}
        className="w-full h-full object-contain outline-none focus:outline-none" 
        key={resolvedSrc || src}
        playsInline 
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (typeof setCurrentTime === 'function') setCurrentTime(video.currentTime);
          setCurrentTimeState(video.currentTime);
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
      
      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between z-[200]">
        <button className="text-white hover:text-[var(--accent)] transition-colors" onClick={() => {
          if (videoRef.current?.paused) { videoRef.current?.play(); }
          else { videoRef.current?.pause(); }
        }}>
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <div className="flex items-center gap-4 text-white text-xs font-bold">
           <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
           <div className="w-32 h-1 bg-white/20 rounded-full cursor-pointer" onClick={(e) => {
             const rect = e.currentTarget.getBoundingClientRect();
             const percent = (e.clientX - rect.left) / rect.width;
             if (videoRef.current) videoRef.current.currentTime = percent * duration;
           }}>
             <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
           </div>
           <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>


      {/* Error Overlay */}
      <AnimatePresence>
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[150] p-6 text-center">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-2">Video format supported emas</h3>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-6 leading-relaxed">
                Bu video manzilini to'g'ridan-to'g'ri ochishda xatolik yuz berdi. Iltimos, boshqa epizodni kuring yoki sahifani yangilang.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.reload();
                  }}
                  className="w-full sm:w-auto px-10 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-600/20"
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
  showWatchlistOnly: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function AnimePortal({ 
  selectedCategory, 
  setSelectedCategory, 
  animeList, 
  loading, 
  language,
  showWatchlistOnly,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm
}: AnimePortalProps) {
  const t = useTranslation(language);
  const [user] = useAuthState(auth);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [selectedAnime, setSelectedAnime] = useState<AnimeDoc | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'player'>('details');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeDoc | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [forceLegacy, setForceLegacy] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
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

  let filteredAnime = animeList.filter(anime => {
    const matchesSearch = anime.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          anime.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || anime.category === selectedCategory;
    const matchesWatchlist = !showWatchlistOnly || watchlist.has(anime.id);
    const matchesYear = filterYear === 'All' || anime.year?.toString() === filterYear;
    
    // Support sidebar filtering
    let matchesTab = true;
    switch (activeTab) {
        case 'movies': matchesTab = anime.type === 'movie'; break;
        case 'series': matchesTab = anime.type === 'series'; break;
        case 'watchlist': matchesTab = watchlist.has(anime.id); break;
        case 'saved': matchesTab = watchlist.has(anime.id); break; 
        default: matchesTab = true; // 'gallery', 'schedule', 'genres' - show all (or implement specific logic later)
    }

    const matchesStatus = filterStatus === 'All' || (anime as any).status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesWatchlist && matchesYear && matchesStatus && matchesTab;
  });

  if (activeTab === 'news') {
    filteredAnime = filteredAnime.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  }

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
    }, (err) => {
      console.error("Comments fetch error:", err);
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
    } catch (err: any) {
      console.error("Comment error:", err);
      alert("Xatolik: " + err.message);
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
    <div className="flex flex-col min-w-0">
      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Middle Content */}
        <div className="flex-1 min-w-0 py-2 sm:py-6 pb-32">
          
          {/* Trending Hero Section */}
          {!loading && featuredAnime && activeTab === 'gallery' && (selectedCategory === 'All') && !searchTerm && !showWatchlistOnly && (
            <div className="mb-8 md:mb-12">
              <div className="relative aspect-[4/5] sm:aspect-[21/9] lg:aspect-[24/10] sm:rounded-[2.5rem] overflow-hidden group shadow-2xl bg-black -mx-4 sm:mx-0">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={featuredAnime.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={featuredAnime.posterUrl} 
                      className="w-full h-full object-cover object-top sm:object-center" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#050505] via-[#050505]/80 sm:from-black sm:via-black/80 to-transparent" />
                    
                    <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-4 sm:p-12 md:p-16 pt-8 pb-8 sm:pb-12">
                         <div className="flex-1 max-w-2xl w-full flex flex-col justify-end sm:justify-start">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6 leading-none line-clamp-2 sm:line-clamp-none flex-shrink-0">
                                {featuredAnime.title}
                                </h1>
                                
                                <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                                   <div className="flex items-center gap-1 sm:gap-2">
                                     <Star size={16} fill="#f59e0b" className="text-amber-500 w-4 h-4 sm:w-5 sm:h-5" />
                                     <span className="text-sm sm:text-base font-black">{featuredAnime.rating}</span>
                                   </div>
                                   <span className="text-sm sm:text-base font-bold text-slate-500">{featuredAnime.year}</span>
                                   <span className="text-sm sm:text-base font-bold text-red-500 uppercase">{featuredAnime.type || 'TV'}</span>
                                </div>
                                
                                <p className="text-slate-300 text-xs sm:text-sm md:text-base line-clamp-3 sm:line-clamp-4 font-medium opacity-80 leading-relaxed max-w-xl mb-6 sm:mb-8">
                                {featuredAnime.description}
                                </p>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                    <button 
                                    onClick={() => handleOpenAnime(featuredAnime, 'player')}
                                    className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl flex justify-center items-center gap-3 shadow-xl shadow-[var(--accent)]/20 transition-all font-black"
                                    >
                                    <Play size={18} fill="white" className="sm:w-[18px] sm:h-[18px]" /> {t('watchBtn' as any)}
                                    </button>
                                    <button 
                                    onClick={(e) => handleWatchlist(e, featuredAnime.id)}
                                    className={cn(
                                        "px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-white/10 text-white hover:bg-white/5 transition-all text-xs font-black flex items-center justify-center",
                                        watchlist.has(featuredAnime.id) && "bg-[var(--accent)]/20 border-[var(--accent)] text-red-500"
                                    )}
                                    >
                                    <Heart size={20} className={cn(watchlist.has(featuredAnime.id) && "fill-current text-red-500")} />
                                    <span className="ml-2">{t('save')}</span>
                                    </button>
                                </div>
                            </motion.div>
                         </div>
                         
                         {/* Poster Image on the Right */}
                         <div className="hidden md:block w-72 h-96 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative rotate-3 hover:rotate-0 transition-transform duration-500">
                            <img 
                                src={featuredAnime.posterUrl} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                            />
                         </div>
                     </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Filter/Search Results Grid */}
          {((selectedCategory !== 'All') || searchTerm || showWatchlistOnly || activeTab === 'anime' || activeTab === 'news') && (
            <div className="px-4">
               <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                  <div className="flex flex-col gap-2">
                     <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-4">
                        <Search className="text-red-500" size={32} />
                        {showWatchlistOnly ? t('saved') : 
                         searchTerm ? `"${searchTerm}"` : 
                         activeTab === 'news' ? t('news' as any) :
                         activeTab === 'anime' && selectedCategory === 'All' ? t('anime' as any) :
                         t((categoryKeys[selectedCategory] || selectedCategory) as any)}
                     </h2>
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Showing {filteredAnime.length} results</p>
                  </div>
                  
                  {/* Action Buttons for Filter View */}
                  {(selectedCategory !== 'All' || searchTerm) && (
                    <div className="flex items-center gap-3">
                       <button 
                         onClick={() => {
                          setSelectedCategory('All');
                          if (searchTerm) setSearchTerm('');
                         }}
                         className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2 group"
                       >
                          <XCircle size={16} className="group-hover:rotate-90 transition-transform" />
                          Clear Filter
                       </button>
                    </div>
                  )}
               </div>

               {filteredAnime.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
                    {filteredAnime.map(anime => (
                      <div 
                        key={anime.id}
                        onClick={() => handleOpenAnime(anime)}
                        className="group flex flex-col cursor-pointer"
                      >
                          <div className="relative aspect-[2/3] rounded-3xl overflow-hidden border border-white/5 group-hover:border-red-500/50 transition-all shadow-2xl bg-[#080808]">
                            <img src={anime.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                            
                            {/* Rating Overlay */}
                            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                               <Star size={10} fill="#f59e0b" className="text-amber-500" />
                               <span className="text-[11px] font-black tabular-nums">{anime.rating}</span>
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-red-600/60 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-6 duration-500">
                               <button className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/40 translate-y-4 group-hover:translate-y-0 transition-transform">
                                  {t('watch')}
                               </button>
                            </div>
                         </div>
                         <div className="mt-5 space-y-1 px-2">
                            <h3 className="text-sm font-black uppercase tracking-tight text-white group-hover:text-red-400 transition-colors line-clamp-1">{anime.title}</h3>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">{anime.year}</span>
                               <div className="w-1 h-1 bg-slate-700 rounded-full" />
                               <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{anime.type || 'TV'}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="py-40 flex flex-col items-center justify-center text-center space-y-8">
                    <div className="w-24 h-24 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-full flex items-center justify-center text-slate-700">
                       <Search size={40} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black uppercase tracking-tighter">No anime found</h3>
                       <p className="text-slate-500 font-medium max-w-xs">{t('noAnimeFound')}</p>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* Rail: Trending Now */}
          {(activeTab === 'gallery' && (selectedCategory === 'All') && !searchTerm && !showWatchlistOnly) && (
            <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                {t('trendingNow' as any)}
              </h2>
              <button onClick={() => { setActiveTab('anime'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-2 group">
                {t('seeAll' as any)}
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
              {animeList.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10).map((anime) => (
                <div 
                  key={`trending-${anime.id}`}
                  onClick={() => handleOpenAnime(anime)}
                  className="flex-shrink-0 w-44 sm:w-52 group cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-3xl overflow-hidden border border-white/5 group-hover:border-red-500/50 transition-all relative shadow-xl bg-slate-900">
                    <img src={anime.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {anime.rating >= 8.5 && (
                      <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase text-white shadow-lg">
                        POPULAR
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 font-bold text-sm uppercase tracking-tight text-white group-hover:text-red-400 transition-colors line-clamp-1">{anime.title}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{anime.year} • {anime.type}</p>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Rail: Popular This Week */}
          {(activeTab === 'gallery' && (selectedCategory === 'All') && !searchTerm && !showWatchlistOnly) && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                {t('popularThisWeek' as any)}
              </h2>
              <button onClick={() => { setActiveTab('anime'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-2 group">
                {t('seeAll' as any)}
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
              {animeList.filter(a => a.rating >= 8.5).slice(0, 10).map((anime, i) => (
                <div 
                  key={`popular-${anime.id}`}
                  onClick={() => handleOpenAnime(anime)}
                  className="flex-shrink-0 w-64 sm:w-72 group cursor-pointer h-32 flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-3xl p-3 transition-all"
                >
                  <div className="text-3xl font-black text-white/10 group-hover:text-red-500/20 italic tabular-nums w-10 shrink-0 text-center">
                    0{i+1}
                  </div>
                  <div className="w-20 h-full rounded-2xl overflow-hidden border border-white/5 shrink-0 bg-slate-900">
                    <img src={anime.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 text-[0]" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-xs uppercase tracking-tight text-white group-hover:text-red-400 transition-colors line-clamp-2">{anime.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Star size={10} fill="#f59e0b" className="text-amber-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">{anime.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Rail: Top Rating (moved to bottom) */}
          {activeTab === 'gallery' && (selectedCategory === 'All') && !searchTerm && !showWatchlistOnly && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                  {t('topRating' as any)}
                </h2>
                <button onClick={() => { setActiveTab('anime'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-2 group">
                  {t('seeAll' as any)}
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {animeList.sort((a,b) => b.rating - a.rating).slice(0, 5).map((anime, i) => (
                  <div 
                    key={`top-${anime.id}`}
                    onClick={() => handleOpenAnime(anime)}
                    className="flex flex-col group cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-3xl p-4 transition-all relative overflow-hidden"
                  >
                    <div className="absolute right-0 -bottom-6 text-8xl font-black text-white/5 group-hover:text-red-500/10 italic transition-colors pointer-events-none z-0">
                      {i+1}
                    </div>
                    <div className="flex items-center gap-4 relative z-10 w-full">
                      <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-white/5 group-hover:border-red-500/50 transition-colors bg-slate-900">
                        <img src={anime.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 text-[0]" referrerPolicy="no-referrer" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <h4 className="font-black text-xs uppercase tracking-tight text-white line-clamp-2 group-hover:text-red-400 transition-colors">{anime.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold">
                            <Star size={10} fill="currentColor" /> {anime.rating}
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{anime.year}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>      <AnimatePresence>
        {selectedAnime && (
           <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <div 
              className="absolute inset-0 z-0" 
              onClick={() => setSelectedAnime(null)} 
            />
            
            <div
              className="relative z-10 w-full h-full bg-[#0A0A0A] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            >
              <button 
                onClick={() => setSelectedAnime(null)} 
                className="absolute top-4 right-4 z-[210] p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors border border-white/10"
              >
                <XCircle size={24} />
              </button>

              <AnimatePresence mode="wait">
                {modalMode === 'details' ? (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10"
                  >
                    {/* Modal Content Structure */}
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Poster */}
                      <div className="shrink-0 w-full md:w-72 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                        <img src={selectedAnime.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={selectedAnime.title} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-6">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{selectedAnime.title}</h2>
                        
                        <div className="flex flex-wrap gap-3">
                            <span className="px-3 py-1 bg-red-600 rounded-lg text-xs font-bold uppercase">{selectedAnime.type || 'TV'}</span>
                            <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold uppercase">{selectedAnime.year}</span>
                        </div>

                        <div>
                            <p className={cn(
                                "text-slate-400 text-sm leading-relaxed",
                                !expandedDesc && "line-clamp-3"
                            )}>
                                {selectedAnime.description}
                            </p>
                            {selectedAnime.description && selectedAnime.description.length > 150 && (
                                <button 
                                    onClick={() => setExpandedDesc(!expandedDesc)}
                                    className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest mt-2"
                                >
                                    {expandedDesc ? "Kamroq o'qish" : "Ko'proq o'qish"}
                                </button>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setModalMode('player')}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-xl transition-colors"
                        >
                            {t('watch')}
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShareModalOpen(true)}
                                className="flex items-center justify-center gap-3 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors text-sm"
                            >
                                <Share2 size={18} />
                                Ulashish
                            </button>
                            <button
                                onClick={(e) => handleWatchlist(e, selectedAnime.id)}
                                className={cn(
                                    "flex items-center justify-center gap-3 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors text-sm",
                                    watchlist.has(selectedAnime.id) && "text-red-500"
                                )}
                            >
                                <Heart size={18} className={cn(watchlist.has(selectedAnime.id) && "fill-current text-red-500")} />
                                Saqlash
                            </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Comments Section */}
                    <section className="mt-12">
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                            {t('comments')} ({comments.length})
                         </h3>
                         
                         {user ? (
                            <form onSubmit={handlePostComment} className="relative mb-12 group">
                               <textarea 
                                 placeholder={t('leaveComment')} 
                                 className="w-full min-h-[120px] bg-white/[0.02] border border-white/5 rounded-3xl p-6 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white/[0.05] transition-all resize-none"
                                 value={newComment}
                                 onChange={e => setNewComment(e.target.value)}
                                 required
                               />
                               <button 
                                 disabled={submittingComment || !newComment.trim()}
                                 className="absolute bottom-4 right-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white p-3 rounded-2xl transition-all active:scale-95 shadow-xl shadow-red-600/30"
                               >
                                 {submittingComment ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                               </button>
                            </form>
                          ) : (
                            <div className="bg-red-500/5 border-2 border-dashed border-red-500/20 p-8 rounded-3xl flex items-center justify-between gap-6 mb-12">
                               <div className="flex items-center gap-4 text-red-400">
                                  <MessageSquare size={24} />
                                  <p className="text-sm font-black uppercase tracking-widest leading-none">{t('loginToComment')}</p>
                               </div>
                               <button 
                                 onClick={loginWithGoogle}
                                 className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95"
                               >
                                 Sign In with Google
                               </button>
                            </div>
                          )}
                          <div className="space-y-6">
                             {comments.length === 0 ? (
                                 <div className="text-center py-12 text-slate-500 uppercase tracking-widest font-black text-sm">
                                     Izohlar mavjud emas
                                 </div>
                             ) : (
                                 comments.map(comment => (
                                     <div key={comment.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex gap-4 transition-colors hover:bg-white/[0.04]">
                                         <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
                                             {comment.photoURL ? (
                                                 <img src={comment.photoURL} alt={comment.username} className="w-full h-full object-cover" />
                                             ) : (
                                                 <User size={20} className="text-white/50" />
                                             )}
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between mb-1">
                                                 <h4 className="font-bold text-white truncate text-sm">{comment.username}</h4>
                                                 {user && user.uid === comment.userId && (
                                                     <button 
                                                         onClick={() => handleDeleteComment(comment.id)}
                                                         className="text-slate-500 hover:text-red-500 transition-colors p-1"
                                                     >
                                                         <Trash2 size={16} />
                                                     </button>
                                                 )}
                                             </div>
                                             <p className="text-slate-400 text-sm break-words whitespace-pre-wrap">{comment.content}</p>
                                             <span className="text-[10px] text-slate-500 mt-3 block font-medium">
                                                 {comment.createdAt ? new Date(comment.createdAt.toMillis()).toLocaleDateString() : ''}
                                             </span>
                                         </div>
                                     </div>
                                 ))
                             )}
                          </div>
                    </section>
                  </motion.div>
                ) : (
                  <motion.div
                    key="player"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 flex flex-col overflow-hidden relative bg-black min-h-0"
                  >
                    {/* Player UI Overlay */}
                    <div className="absolute top-0 left-0 right-0 z-[110] p-6 sm:p-8 flex items-center justify-between bg-gradient-to-b from-black via-black/40 to-transparent pointer-events-none">
                       <div className="flex items-center gap-4 sm:gap-6 pointer-events-auto">
                          <button 
                            onClick={() => setModalMode('details')}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                          >
                            <ArrowLeft size={18} className="sm:w-6 sm:h-6" />
                          </button>
                          <div className="space-y-1">
                             <h3 className="text-white font-black text-lg sm:text-2xl tracking-tighter uppercase leading-none truncate max-w-[200px] sm:max-w-md">
                               {selectedAnime.title}
                             </h3>
                             <p className="text-red-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest">
                                {t('episode')} {currentEpisode?.episodeNumber || 1} • {currentEpisode?.title || ''}
                             </p>
                          </div>
                       </div>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
                       {/* Video Area */}
                       <div className="w-full lg:flex-1 relative group bg-[#000000] min-h-[250px] sm:min-h-[450px]">
                          {/* Video Loading State */}
                          {currentEpisode && videoLoading && (
                            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505] transition-opacity">
                               <div className="w-20 h-20 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin mb-8" />
                               <div className="flex flex-col items-center gap-2">
                                  <h4 className="text-xl font-black uppercase tracking-tighter">Preparing Stream</h4>
                                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing high quality data...</p>
                               </div>
                            </div>
                          )}

                          <div className="w-full h-full shadow-2xl relative">
                            {currentEpisode ? (
                              (() => {
                                let url = currentEpisode.videoUrl.trim();
                                if (url.startsWith('<iframe')) {
                                  const srcMatch = url.match(/src=["']([^"']+)["']/);
                                  if (srcMatch) url = srcMatch[1];
                                }
                                if (url.startsWith('//')) url = 'https:' + url;
                                
                                // Direct stream support for top platforms as per requirements
                                const proxyMap = {
                                  't.me/': '/api/telegram/stream',
                                  'telegram': '/api/telegram/stream',
                                  'vk.com/': '/api/vk/stream',
                                  'd.tube/': '/api/dtube/stream',
                                  'dtube.video': '/api/dtube/stream'
                                };

                                const proxyEntry = Object.entries(proxyMap).find(([key]) => url.includes(key));
                                if (proxyEntry) {
                                  const proxyUrl = `${proxyEntry[1]}?url=${encodeURIComponent(url)}`;
                                  return (
                                    <UniversalVideoPlayer 
                                      src={proxyUrl}
                                      videoRef={videoRef}
                                      setVideoLoading={setVideoLoading}
                                      setCurrentTime={setCurrentTime}
                                    />
                                  );
                                }

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
                              <div className="w-full h-full flex flex-col items-center justify-center gap-8 bg-black">
                                <div className="w-32 h-32 bg-red-500/10 rounded-full flex items-center justify-center animate-pulse border border-red-500/20">
                                  <Play size={48} className="text-red-500 ml-2" />
                                </div>
                                <h4 className="text-sm font-black uppercase tracking-[0.4em] text-slate-500">Pick an Episode to start</h4>
                              </div>
                            )}

                            {/* Skip Intro Overlay */}
                            <AnimatePresence>
                              {currentEpisode && 
                               Number(currentEpisode.openingEnd) > 0 &&
                               currentTime >= Number(currentEpisode.openingStart) && 
                               currentTime < Number(currentEpisode.openingEnd) && (
                                <motion.button
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  onClick={skipOpening}
                                  className="absolute bottom-32 right-12 z-[150] bg-red-600 hover:bg-red-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-600/40 border border-red-400 flex items-center gap-4 transition-all"
                                >
                                   <Sparkles size={20} />
                                   SKIP INTRO
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                       </div>

                       {/* Episode Selector Sidebar */}
                        <div className="w-full lg:w-[400px] flex-1 lg:h-full bg-[var(--bg-deep)] lg:border-l border-white/5 flex flex-col overflow-hidden relative z-[120] transition-all duration-500 min-h-0">
                           <div className="p-6 sm:p-8 border-b border-t lg:border-t-0 border-white/5 flex items-center justify-between bg-[var(--bg-deep)]/90 backdrop-blur-md shrink-0">
                              <h4 className="text-xl font-black uppercase tracking-tighter text-white">{t('episodes')}</h4>
                              <span className="text-[10px] font-black uppercase text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-lg border border-[var(--accent)]/20">{episodes.length} TOTAL</span>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0 touch-pan-y overscroll-contain">
                             {loadingEpisodes ? (
                               <div className="grid grid-cols-1 gap-4">
                                  {[1,2,3,4,5].map(i => (
                                    <div key={i} className="h-20 bg-white/[0.02] rounded-2xl animate-pulse" />
                                  ))}
                               </div>
                             ) : (
                               episodes.map((ep, idx) => (
                                 <button
                                   key={ep.id}
                                   onClick={() => handleEpisodeSelect(ep)}
                                   className={cn(
                                     "w-full group flex flex-col gap-3 p-5 rounded-2xl border transition-all text-left",
                                     currentEpisode?.id === ep.id 
                                       ? "bg-red-600/20 border-red-500/50 shadow-lg shadow-red-600/10" 
                                       : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20"
                                   )}
                                 >
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <span className={cn(
                                           "text-[10px] font-black tabular-nums w-6",
                                           currentEpisode?.id === ep.id ? "text-red-400" : "text-slate-600"
                                         )}>
                                           {idx < 9 ? `0${idx+1}` : idx+1}
                                         </span>
                                         <span className={cn(
                                           "text-sm font-black uppercase tracking-tight",
                                           currentEpisode?.id === ep.id ? "text-white" : "text-slate-300"
                                         )}>
                                           {ep.title || `Episode ${ep.episodeNumber}`}
                                         </span>
                                      </div>
                                      {currentEpisode?.id === ep.id && (
                                        <div className="flex gap-1">
                                           <div className="w-1 h-3 bg-red-500 animate-pulse rounded-full" />
                                           <div className="w-1 h-2 bg-red-500 animate-pulse delay-75 rounded-full" />
                                           <div className="w-1 h-4 bg-red-500 animate-pulse delay-150 rounded-full" />
                                        </div>
                                      )}
                                   </div>
                                   <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-9">
                                      <span>24 MIN</span>
                                      <span>•</span>
                                      <span>HD 1080P</span>
                                   </div>
                                 </button>
                               ))
                             )}
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShareModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShareModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
              >
                <XCircle size={22} />
              </button>
              
              <h3 className="text-xl font-bold text-white mb-6">Ulashish</h3>
              
              <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 mb-4 text-sm text-slate-300 font-mono break-all leading-relaxed">
                https://www.animem.uz/anime/{selectedAnime?.id || 'id'}
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://www.animem.uz/anime/${selectedAnime?.id || 'id'}`);
                  }}
                  className="w-full flex items-center gap-3 bg-[#2A2A2A] hover:bg-[#333333] text-white py-3.5 px-4 rounded-xl transition-colors text-sm font-medium"
                >
                  <Copy size={20} />
                  Havolani nusxalash
                </button>
                
                <a
                  href={`https://t.me/share/url?url=https://www.animem.uz/anime/${selectedAnime?.id || 'id'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 bg-[#1D4ED8] hover:bg-[#1e40af] text-white py-3.5 px-4 rounded-xl transition-colors text-sm font-medium"
                >
                  <Send size={20} />
                  Telegram orqali ulashish
                </a>
                
                <a
                  href={`https://api.whatsapp.com/send?text=https://www.animem.uz/anime/${selectedAnime?.id || 'id'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 bg-[#059669] hover:bg-[#047857] text-white py-3.5 px-4 rounded-xl transition-colors text-sm font-medium"
                >
                  <MessageSquare size={20} />
                  WhatsApp orqali ulashish
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
