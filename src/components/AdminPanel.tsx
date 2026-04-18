import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp, where, updateDoc, getDocs, orderBy, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Plus, Trash2, Film, Check, X, AlertCircle, Loader2, Upload, Link as LinkIcon, MessageSquare, Star, Clock, Play, List, ChevronRight, ArrowLeft } from 'lucide-react';
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

export default function AdminPanel() {
  const [animeList, setAnimeList] = useState<AnimeDoc[]>([]);
  const [activeTab, setActiveTab] = useState<'anime' | 'episodes' | 'messages'>('anime');
  const [selectedAnimeForEpisodes, setSelectedAnimeForEpisodes] = useState<AnimeDoc | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Anime Form State
  const [title, setTitle] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Action');
  const [rating, setRating] = useState(8.5);
  const [year, setYear] = useState(new Date().getFullYear());
  const [contentType, setContentType] = useState<'movie' | 'series'>('series');
  const [isBanner, setIsBanner] = useState(false);

  // Episode Form State
  const [epNumber, setEpNumber] = useState(1);
  const [epTitle, setEpTitle] = useState('');
  const [epVideoUrl, setEpVideoUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'anime'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnimeDoc[];
      setAnimeList(docs.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedAnimeForEpisodes) {
      setEpisodes([]);
      return;
    }
    const q = query(
      collection(db, 'anime', selectedAnimeForEpisodes.id, 'episodes'),
      orderBy('episodeNumber', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEpisodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EpisodeDoc[]);
    });
    return () => unsubscribe();
  }, [selectedAnimeForEpisodes]);

  const handlePosterUpload = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `posters/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        reject,
        () => getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject)
      );
    });
  };

  const handleAnimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let finalPosterUrl = posterUrl;
      if (posterFile) finalPosterUrl = await handlePosterUpload(posterFile);
      if (!finalPosterUrl) throw new Error("Poster required.");

      await addDoc(collection(db, 'anime'), {
        title, posterUrl: finalPosterUrl, description, category, rating, year,
        type: contentType, views: 0, createdAt: serverTimestamp(),
        authorUid: auth.currentUser?.uid,
        isBanner
      });

      setTitle(''); setPosterUrl(''); setPosterFile(null); setDescription('');
      setCategory('Action'); setRating(8.5); setYear(new Date().getFullYear());
      setIsBanner(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Xatolik");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimeForEpisodes) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'anime', selectedAnimeForEpisodes.id, 'episodes'), {
        animeId: selectedAnimeForEpisodes.id,
        episodeNumber: epNumber,
        title: epTitle,
        videoUrl: epVideoUrl,
        createdAt: serverTimestamp()
      });
      setEpNumber(prev => prev + 1);
      setEpTitle('');
      setEpVideoUrl('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError("Epizodni qo'shishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnime = async (id: string) => {
    if (window.confirm("Animenı o'chirishni tasdiqlaysizmi? Barcha epizodlar ham o'chiriladi!")) {
      try {
        setSubmitting(true);
        // Delete episodes subcollection first
        const episodesRef = collection(db, 'anime', id, 'episodes');
        const episodesSnap = await getDocs(episodesRef);
        
        const batch = writeBatch(db);
        episodesSnap.forEach((episodeDoc) => {
          batch.delete(episodeDoc.ref);
        });
        
        // Delete the main anime doc
        batch.delete(doc(db, 'anime', id));
        
        await batch.commit();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        console.error("Delete error:", err);
        setError("O'chirishda xatolik yuz berdi: " + (err.message || 'Unknown error'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!selectedAnimeForEpisodes) return;
    if (window.confirm("Epizodni o'chirishni tasdiqlaysizmi?")) {
      try {
        setSubmitting(true);
        await deleteDoc(doc(db, 'anime', selectedAnimeForEpisodes.id, 'episodes', id));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        console.error("Episode delete error:", err);
        setError("Epizodni o'chirishda xatolik: " + (err.message || 'Unknown error'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto font-sans relative z-10">
      {/* Feedback Messages */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl border border-red-500/20"
          >
            <AlertCircle size={20} />
            <span className="text-xs font-black uppercase tracking-widest">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:bg-white/10 p-1 rounded-full"><X size={16} /></button>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl border border-indigo-500/20"
          >
            <Check size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Amal muvaffaqiyatli bajarildi</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex glass p-1 rounded-2xl mb-10 w-fit mx-auto gap-1">
        <button
          onClick={() => { setActiveTab('anime'); setSelectedAnimeForEpisodes(null); }}
          className={cn(
            "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all",
            activeTab === 'anime' ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" : "text-slate-400 hover:text-white"
          )}
        >
          <Film size={16} /> Anime
        </button>
        <button
          onClick={() => setActiveTab('episodes')}
          className={cn(
            "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all",
            activeTab === 'episodes' ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" : "text-slate-400 hover:text-white"
          )}
        >
          <List size={16} /> Epizodlar
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'anime' && (
          <motion.div 
            key="anime-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-10"
          >
            <div className="lg:col-span-1">
              <div className="glass rounded-3xl p-8 sticky top-32">
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Yangi Anime</h2>
                <form onSubmit={handleAnimeSubmit} className="space-y-4">
                  <input type="text" placeholder="Anime Sarlavhasi" className="glass-input w-full" value={title} onChange={e => setTitle(e.target.value)} required />
                  <textarea placeholder="Tavsif" className="glass-input w-full h-24" value={description} onChange={e => setDescription(e.target.value)} />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Poster</label>
                    <div className="flex gap-2">
                       <input type="file" onChange={e => setPosterFile(e.target.files?.[0] || null)} className="text-[10px] flex-1" />
                    </div>
                    <input type="text" placeholder="yoki Poster URL" className="glass-input w-full" value={posterUrl} onChange={e => setPosterUrl(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <select className="glass-input" value={category} onChange={e => setCategory(e.target.value)}>
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                    </select>
                    <select className="glass-input" value={contentType} onChange={e => setContentType(e.target.value as any)}>
                      <option value="series" className="bg-slate-900">Serial</option>
                      <option value="movie" className="bg-slate-900">Film</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.1" placeholder="Reyting" className="glass-input" value={rating} onChange={e => setRating(Number(e.target.value))} />
                    <input type="number" placeholder="Yil" className="glass-input" value={year} onChange={e => setYear(Number(e.target.value))} />
                  </div>

                  <div className="flex items-center gap-3 p-4 glass rounded-2xl cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsBanner(!isBanner)}>
                     <div className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", isBanner ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/30" : "border-white/10")}>
                        {isBanner && <Check size={14} className="text-white" />}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bannerga qo'yish</span>
                  </div>

                  {uploadProgress !== null && (
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="bg-indigo-500 h-full" />
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="glass-button-primary w-full py-4 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
                    SAQLASH
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="glass rounded-3xl p-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Anime Ro'yxati</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {animeList.map(anime => (
                    <div key={anime.id} className="glass rounded-2xl p-3 flex gap-4 items-center group relative overflow-hidden">
                      <img src={anime.posterUrl} className="w-16 h-24 object-cover rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-sm uppercase truncate">{anime.title}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black">{anime.category} • {anime.year}</p>
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={() => { setSelectedAnimeForEpisodes(anime); setActiveTab('episodes'); }}
                            className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            Epizodlar
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteAnime(anime.id)} 
                        disabled={submitting}
                        className="p-2 text-white/30 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'episodes' && (
          <motion.div 
            key="episodes-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {selectedAnimeForEpisodes ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1">
                  <div className="glass rounded-3xl p-8 sticky top-32">
                    <button 
                      onClick={() => setSelectedAnimeForEpisodes(null)}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white mb-6"
                    >
                      <ArrowLeft size={14} /> ORQAGA
                    </button>
                    <h2 className="text-xl font-black uppercase tracking-tighter mb-2">{selectedAnimeForEpisodes.title}</h2>
                    <p className="text-[10px] text-indigo-400 font-black mb-6 uppercase">YANGI EPIZOD QO'SHISH</p>
                    
                    <form onSubmit={handleEpisodeSubmit} className="space-y-4">
                      <input type="number" placeholder="Epizod Raqami" className="glass-input w-full" value={epNumber} onChange={e => setEpNumber(Number(e.target.value))} required />
                      <input type="text" placeholder="Epizod Sarlavhasi (Ixtiyoriy)" className="glass-input w-full" value={epTitle} onChange={e => setEpTitle(e.target.value)} />
                      <input type="text" placeholder="Video URL" className="glass-input w-full" value={epVideoUrl} onChange={e => setEpVideoUrl(e.target.value)} required />
                      
                      <button type="submit" disabled={submitting} className="glass-button-primary w-full py-4 flex items-center justify-center gap-2">
                        {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
                        QO'SHISH
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="glass rounded-3xl p-8">
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Epizodlar</h2>
                    <div className="space-y-3">
                      {episodes.map(ep => (
                        <div key={ep.id} className="glass rounded-2xl p-4 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-indigo-400">
                              {ep.episodeNumber}
                            </div>
                            <div>
                              <h4 className="font-black text-xs uppercase">{ep.title || `Epizod ${ep.episodeNumber}`}</h4>
                              <p className="text-[8px] text-slate-500 uppercase tracking-widest truncate max-w-xs">{ep.videoUrl}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteEpisode(ep.id)} 
                            disabled={submitting}
                            className="p-2 text-white/20 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                        </div>
                      ))}
                      {episodes.length === 0 && (
                        <div className="text-center py-10 text-slate-600 font-black uppercase tracking-widest text-xs italic">
                          Hali Epizodlar Yo'q
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-3xl p-12 text-center">
                <h3 className="text-xl font-black tracking-tighter text-slate-500 uppercase mb-4">Oldin Animeni Tanlang</h3>
                <button 
                   onClick={() => setActiveTab('anime')}
                   className="glass-button-primary px-10 py-3"
                >
                  ANIME RO'YXATIGA O'TISH
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
