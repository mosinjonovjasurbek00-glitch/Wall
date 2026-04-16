import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, where } from 'firebase/firestore';
import { Download, ExternalLink, Lock, Search, Filter, Copy, Check as CheckIcon, Eye, X as CloseIcon, Loader2, Heart, AlertCircle, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { CATEGORIES } from '../constants';

interface ImageDoc {
  id: string;
  url: string;
  name: string;
  description?: string;
  category: string;
  resolution?: string;
  isPremium: boolean;
  deviceType?: 'pc' | 'phone';
  likesCount?: number;
  createdAt: any;
}

interface LikeDoc {
  id: string;
  userId: string;
  imageId: string;
}

interface AdDoc {
  id: string;
  url: string;
  name: string;
  link: string;
  type: 'image' | 'video';
  position: 'top' | 'middle' | 'bottom' | 'modal';
  createdAt: any;
}

interface GalleryProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export default function Gallery({ selectedCategory, setSelectedCategory }: GalleryProps) {
  const [images, setImages] = useState<ImageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'pc' | 'phone'>('pc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageDoc | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);
  const [ads, setAds] = useState<AdDoc[]>([]);
  const [showAdModal, setShowAdModal] = useState<AdDoc | null>(null);
  const [pendingPreview, setPendingPreview] = useState<ImageDoc | null>(null);
  const itemsPerPage = 9;

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'images'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ImageDoc[];
      setImages(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'images');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      setUserLikes(new Set());
      return;
    }

    const q = query(collection(db, 'likes'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const likedImageIds = new Set(snapshot.docs.map(doc => doc.data().imageId));
      setUserLikes(likedImageIds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'likes');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdDoc[];
      setAds(docs);
    });
    return () => unsubscribe();
  }, []);

  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         img.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || img.category === selectedCategory;
    const matchesDevice = img.deviceType === deviceFilter;
    const matchesFavorites = !showFavorites || userLikes.has(img.id);
    return matchesSearch && matchesCategory && matchesDevice && matchesFavorites;
  });

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const paginatedImages = filteredImages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deviceFilter, selectedCategory]);

  const handleDownload = async (url: string, name: string, id: string) => {
    try {
      setDownloadingId(id);
      
      // 1. Fetch the image through our proxy to bypass CORS
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error("Failed to fetch image through proxy");
      
      const blob = await response.blob();
      
      // 2. Load the blob into an Image object to convert it
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      // 3. Create a canvas to draw the image and export as PNG
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.drawImage(img, 0, 0);
      
      // 4. Convert canvas to PNG blob
      const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!pngBlob) throw new Error("Failed to create PNG blob");

      const pngUrl = URL.createObjectURL(pngBlob);
      const fileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      
      // 5. Trigger the download
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(objectUrl);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 100);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: try to download the original URL if conversion fails
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = `${name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLike = async (imageId: string) => {
    if (!auth.currentUser) {
      setShowAuthError(true);
      setTimeout(() => setShowAuthError(false), 3000);
      return;
    }

    const isLiked = userLikes.has(imageId);
    const likeId = `${auth.currentUser.uid}_${imageId}`;
    const batch = writeBatch(db);
    const imageRef = doc(db, 'images', imageId);
    const likeRef = doc(db, 'likes', likeId);

    try {
      if (isLiked) {
        // Unlike
        batch.delete(likeRef);
        batch.update(imageRef, {
          likesCount: (images.find(img => img.id === imageId)?.likesCount || 1) - 1
        });
      } else {
        // Like
        batch.set(likeRef, {
          userId: auth.currentUser.uid,
          imageId: imageId,
          createdAt: serverTimestamp()
        });
        batch.update(imageRef, {
          likesCount: (images.find(img => img.id === imageId)?.likesCount || 0) + 1
        });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'likes/images');
    }
  };

  const handlePreviewClick = (img: ImageDoc) => {
    const modalAd = ads.find(ad => ad.position === 'modal');
    if (modalAd) {
      setPendingPreview(img);
      setShowAdModal(modalAd);
    } else {
      setPreviewImage(img);
    }
  };

  const closeAdModal = () => {
    setShowAdModal(null);
    if (pendingPreview) {
      setPreviewImage(pendingPreview);
      setPendingPreview(null);
    }
  };

  return (
    <div 
      className="pt-32 pb-20 px-6 max-w-7xl mx-auto"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
            4K <span className="text-indigo-400">Wallpapers</span>
          </h1>
          <p className="text-slate-400 text-lg">High-quality backgrounds for your devices.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full lg:w-auto">
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search wallpapers..." 
              className="glass-input pl-12 w-full sm:w-64 lg:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex glass rounded-xl p-1 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={cn(
                "px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap",
                showFavorites ? "bg-pink-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <Heart size={16} fill={showFavorites ? "currentColor" : "none"} />
              <span className="hidden xs:inline">Favorites</span>
            </button>
            <div className="w-px bg-white/10 mx-1 my-1.5 shrink-0" />
            {(['pc', 'phone'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDeviceFilter(d)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium capitalize transition-all whitespace-nowrap",
                  deviceFilter === d ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                {d === 'phone' ? 'iPhone' : 'PC'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Ad Banner */}
      {ads.find(ad => ad.position === 'top') && (
        <div className="mb-12">
          {ads.filter(ad => ad.position === 'top').map(ad => (
            <a 
              key={ad.id} 
              href={ad.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block glass rounded-3xl overflow-hidden relative group aspect-[21/9] sm:aspect-[32/9]"
            >
              {ad.type === 'video' ? (
                <video src={ad.url} autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover" />
              ) : (
                <img src={ad.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="eager" />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10">
                ADVERTISEMENT
              </div>
            </a>
          ))}
        </div>
      )}

      {loading ? (
        <div className={cn(
          "grid gap-6",
          deviceFilter === 'phone' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className={cn("glass rounded-2xl animate-pulse", deviceFilter === 'phone' ? "aspect-[9/16]" : "aspect-video")} />
          ))}
        </div>
      ) : paginatedImages.length > 0 ? (
        <>
          <motion.div 
            layout
            className={cn(
              "grid gap-6",
              deviceFilter === 'phone' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}
          >
            <AnimatePresence mode="popLayout">
              {paginatedImages.flatMap((img, index) => {
                const items = [
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      "group relative glass rounded-2xl overflow-hidden glass-hover",
                      deviceFilter === 'phone' ? "aspect-[9/16]" : "aspect-video"
                    )}
                  >
                    <img 
                      src={img.url} 
                      alt={img.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                    
                    {/* Resolution Badge */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      {img.resolution && (
                        <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10">
                          {img.resolution}
                        </div>
                      )}
                      {img.isPremium && (
                        <div className="bg-amber-500/80 backdrop-blur-md text-black text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                          <Lock size={10} />
                          PREMIUM
                        </div>
                      )}
                    </div>

                    {/* Like Button (Visible on hover or if liked) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(img.id);
                      }}
                      className={cn(
                        "absolute top-4 right-4 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                        userLikes.has(img.id) 
                          ? "bg-pink-600 text-white shadow-lg shadow-pink-500/40" 
                          : "bg-black/40 text-white/70 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 hover:bg-black/60"
                      )}
                    >
                      <Heart size={20} fill={userLikes.has(img.id) ? "currentColor" : "none"} />
                    </button>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                      {/* Eye Icon Overlay */}
                      <div 
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                        onClick={() => handlePreviewClick(img)}
                      >
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 scale-50 group-hover:scale-100 transition-transform duration-300">
                          <Eye className="text-white" size={28} />
                        </div>
                      </div>

                      <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-300 relative z-10">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-display font-bold truncate pr-4">{img.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{img.category}</span>
                            {img.likesCount !== undefined && img.likesCount > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-pink-400 font-bold">
                                <Heart size={10} fill="currentColor" />
                                {img.likesCount}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => handleDownload(img.url, img.name, img.id)}
                            disabled={downloadingId === img.id}
                            className="flex-1 bg-white text-black hover:bg-indigo-400 transition-colors rounded-lg flex items-center justify-center gap-2 py-2 text-xs font-bold disabled:opacity-50"
                          >
                            {downloadingId === img.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Download size={14} />
                            )}
                            {downloadingId === img.id ? 'DOWNLOADING...' : 'DOWNLOAD'}
                          </button>
                          <button 
                            onClick={() => handleCopyUrl(img.url, img.id)}
                            className="bg-white/10 hover:bg-white/20 text-white transition-colors rounded-lg p-2"
                            title="Copy URL"
                          >
                            {copiedId === img.id ? <CheckIcon size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                          <a 
                            href={img.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white/10 hover:bg-white/20 text-white transition-colors rounded-lg p-2"
                            title="Open Original"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ];

                // Middle Ad Insertion (every 6 items)
                if ((index + 1) % 6 === 0 && ads.find(ad => ad.position === 'middle')) {
                  const middleAds = ads.filter(ad => ad.position === 'middle');
                  const ad = middleAds[Math.floor(((index + 1) / 6 - 1) % middleAds.length)];
                  items.push(
                    <motion.div
                      key={`ad-${img.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "glass rounded-2xl overflow-hidden relative group",
                        deviceFilter === 'phone' ? "aspect-[9/16]" : "aspect-video"
                      )}
                    >
                      <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                        {ad.type === 'video' ? (
                          <video src={ad.url} autoPlay loop muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        ) : (
                          <img src={ad.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10">
                          ADVERTISEMENT
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white font-bold text-sm truncate">{ad.name}</p>
                        </div>
                      </a>
                    </motion.div>
                  );
                }

                return items;
              })}
            </AnimatePresence>
          </motion.div>

          {/* Pagination UI */}
          {totalPages > 1 && (
            <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl glass text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                &lsaquo; Previous
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Simple pagination logic to show current, first, last and neighbors
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-10 h-10 rounded-xl text-sm font-bold transition-all",
                        currentPage === pageNum 
                          ? "bg-[#a3ff00] text-black shadow-[0_0_20px_rgba(163,255,0,0.4)]"
                          : "glass text-slate-400 hover:text-white"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="text-slate-600">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl glass text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                Next &rsaquo;
              </button>
            </div>
          )}

          {/* Bottom Ad Banner */}
          {ads.find(ad => ad.position === 'bottom') && (
            <div className="mt-20">
              {ads.filter(ad => ad.position === 'bottom').map(ad => (
                <a 
                  key={ad.id} 
                  href={ad.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block glass rounded-3xl overflow-hidden relative group aspect-[21/9] sm:aspect-[32/9]"
                >
                  {ad.type === 'video' ? (
                    <video src={ad.url} autoPlay loop muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={ad.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10">
                    ADVERTISEMENT
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="glass rounded-3xl p-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="text-slate-600 w-10 h-10" />
          </div>
          <h3 className="text-2xl font-display font-bold mb-2">No images found</h3>
          <p className="text-slate-400">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Auth Error Notification */}
      <AnimatePresence>
        {showAuthError && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400/50"
          >
            <AlertCircle size={20} />
            <span className="font-medium">Please sign in to like images.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-[60] w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <div 
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
              onClick={() => setPreviewImage(null)}
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl w-full max-h-full flex flex-col items-center"
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 md:-right-12 p-2 text-white/50 hover:text-white transition-colors"
              >
                <CloseIcon size={32} />
              </button>

              <div className="glass rounded-3xl overflow-hidden w-full relative group">
                <img 
                  src={previewImage.url} 
                  alt={previewImage.name}
                  className="w-full h-auto max-h-[80vh] object-contain mx-auto"
                  referrerPolicy="no-referrer"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
                
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-display font-bold text-white">{previewImage.name}</h2>
                        <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                          {previewImage.category}
                        </span>
                        <button
                          onClick={() => handleLike(previewImage.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                            userLikes.has(previewImage.id)
                              ? "bg-pink-600 text-white shadow-lg shadow-pink-500/40"
                              : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10"
                          )}
                        >
                          <Heart size={20} fill={userLikes.has(previewImage.id) ? "currentColor" : "none"} />
                          <span className="font-bold">{previewImage.likesCount || 0}</span>
                        </button>
                      </div>
                      <p className="text-slate-300 max-w-2xl">{previewImage.description}</p>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleLike(previewImage.id)}
                        className={cn(
                          "glass-button px-4 py-3 flex items-center gap-2 transition-all",
                          userLikes.has(previewImage.id) ? "bg-pink-600 text-white" : "bg-white/10 text-white"
                        )}
                      >
                        <Heart size={20} fill={userLikes.has(previewImage.id) ? "currentColor" : "none"} />
                        {previewImage.likesCount || 0}
                      </button>
                      <button 
                        onClick={() => handleDownload(previewImage.url, previewImage.name, previewImage.id)}
                        disabled={downloadingId === previewImage.id}
                        className="glass-button-primary px-8 py-3 flex items-center gap-2 disabled:opacity-50"
                      >
                        {downloadingId === previewImage.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Download size={20} />
                        )}
                        {downloadingId === previewImage.id ? 'Downloading...' : `Download ${previewImage.resolution}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Modal */}
      <AnimatePresence>
        {showAdModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full glass rounded-3xl overflow-hidden"
            >
              <button 
                onClick={closeAdModal}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all"
              >
                <CloseIcon size={24} />
              </button>
              <a href={showAdModal.link} target="_blank" rel="noopener noreferrer" className="block">
                {showAdModal.type === 'video' ? (
                  <video src={showAdModal.url} autoPlay loop muted playsInline className="w-full aspect-square object-cover" />
                ) : (
                  <img src={showAdModal.url} className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
                )}
                <div className="p-6 text-center">
                  <h3 className="text-xl font-display font-bold mb-2">{showAdModal.name}</h3>
                  <p className="text-slate-400 text-sm mb-6">Check out this special offer before viewing the wallpaper!</p>
                  <div className="glass-button-primary w-full py-3">
                    Learn More
                  </div>
                </div>
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  );
}
