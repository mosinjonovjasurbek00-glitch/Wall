import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, where, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Plus, Trash2, Image as ImageIcon, Check, X, AlertCircle, Loader2, Upload, Link as LinkIcon, MessageSquare, Mail, Calendar, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CATEGORIES } from '../constants';

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

interface ImageDoc {
  id: string;
  url: string;
  name: string;
  description?: string;
  category: string;
  resolution?: string;
  isPremium: boolean;
  deviceType?: 'pc' | 'phone';
  createdAt: any;
}

interface AdDoc {
  id: string;
  name: string;
  url: string;
  link: string;
  type: 'image' | 'video';
  position: 'top' | 'middle' | 'bottom' | 'modal';
  createdAt: any;
}

interface AdminUser {
  id: string;
  uid: string;
  email: string;
  role: 'admin' | 'user';
}

interface MessageDoc {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: any;
  status: 'new' | 'read';
}

export default function AdminPanel() {
  const [images, setImages] = useState<ImageDoc[]>([]);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'messages' | 'ads' | 'admins'>('library');
  const [ads, setAds] = useState<AdDoc[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adFileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'url' | 'file'>('file');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Abstract');
  const [resolution, setResolution] = useState('4K');
  const [isPremium, setIsPremium] = useState(false);
  const [deviceType, setDeviceType] = useState<'pc' | 'phone'>('phone');

  // Ad Form State
  const [adName, setAdName] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adFile, setAdFile] = useState<File | null>(null);
  const [adType, setAdType] = useState<'image' | 'video'>('image');
  const [adPosition, setAdPosition] = useState<'top' | 'middle' | 'bottom' | 'modal'>('top');

  // Admin Management State
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const resolutions = ['HD', 'Full HD', '2K', '4K', '5K', '8K'];

  useEffect(() => {
    const q = query(collection(db, 'images'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ImageDoc[];
      setImages(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'images');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageDoc[];
      setMessages(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdDoc[];
      setAds(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'ads');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminUser[];
      setAdminUsers(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (uploadType === 'file' && !file) {
      setError("Please select an image file.");
      return;
    }
    if (uploadType === 'url' && !url) {
      setError("Please enter an image URL.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);

    try {
      let finalUrl = url;

      if (uploadType === 'file' && file) {
        if (file.size > 20 * 1024 * 1024) {
          throw new Error("File size too large. Maximum 20MB allowed.");
        }

        const storageRef = ref(storage, `wallpapers/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        finalUrl = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error("Upload timed out (120s). Please check your internet connection."));
          }, 120000); // 120 seconds timeout

          console.log("Attaching state_changed listener for image upload...");
          uploadTask.on('state_changed', {
            next: (snapshot) => {
              const progress = snapshot.totalBytes > 0 
                ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 
                : 0;
              setUploadProgress(progress);
              console.log(`Image upload progress update: ${progress.toFixed(2)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes})`);
            },
            error: (error) => {
              clearTimeout(timeout);
              console.error("Storage upload error:", error);
              reject(error);
            },
            complete: () => {
              clearTimeout(timeout);
              console.log("Image storage upload complete, getting URL...");
              getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
            }
          });
        });
      }

      const imageData = {
        name,
        url: finalUrl,
        description,
        category,
        resolution,
        isPremium,
        deviceType,
        likesCount: 0,
        createdAt: serverTimestamp(),
        authorUid: auth.currentUser.uid
      };
      
      console.log("Attempting to upload image:", imageData);
      try {
        await addDoc(collection(db, 'images'), imageData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'images');
      }

      setName('');
      setUrl('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setDescription('');
      setCategory('Abstract');
      setResolution('4K');
      setIsPremium(false);
      setDeviceType('phone');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Upload error:", err);
      let msg = "Failed to upload image.";
      if (err.code === 'storage/unauthorized') {
        msg = "Storage permission denied. Please check your Firebase Storage rules.";
      } else if (err.message?.includes('permission-denied')) {
        msg = "Firestore permission denied. You are not an admin or your email does not match.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'images', id));
      setSuccess(true);
      setError(null);
      setDeletingId(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Delete error:", err);
      setError("Error deleting image: " + (err.message || "Unknown error"));
      setDeletingId(null);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (err: any) {
      console.error("Delete message error:", err);
    }
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("You must be signed in to create ads.");
      return;
    }
    if (!adFile) {
      setError("Please select an image or video file for the advertisement.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      if (adFile.size > 50 * 1024 * 1024) {
        throw new Error("Ad file too large. Maximum 50MB allowed.");
      }

      // Pre-check admin status if possible (optional but good for UX)
      console.log("Starting ad upload:", adFile.name, adFile.size);
      const storageRef = ref(storage, `ads/${Date.now()}_${adFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, adFile);

      const finalUrl = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error("Ad upload timed out after 300s");
          uploadTask.cancel();
          reject(new Error("Upload timed out. 50MB files can take time depending on your internet speed. Please try a smaller file or a faster connection."));
        }, 300000); // 300 seconds timeout for 50MB

        console.log("Attaching state_changed listener for ad upload...");
        uploadTask.on('state_changed', {
          next: (snapshot) => {
            const progress = snapshot.totalBytes > 0 
              ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 
              : 0;
            setUploadProgress(progress);
            console.log(`Ad upload progress update: ${progress.toFixed(2)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes})`);
          },
          error: (error) => {
            clearTimeout(timeout);
            console.error("Ad storage upload error details:", error);
            if (error.code === 'storage/unauthorized') {
              reject(new Error("Storage permission denied. You might not have admin rights to upload files."));
            } else {
              reject(error);
            }
          },
          complete: () => {
            clearTimeout(timeout);
            console.log("Ad storage upload complete, getting URL...");
            getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
          }
        });
      });

      console.log("Ad URL obtained:", finalUrl);
      try {
        await addDoc(collection(db, 'ads'), {
          name: adName || 'Untitled Ad',
          url: finalUrl,
          link: adLink || '#',
          type: adType,
          position: adPosition,
          createdAt: serverTimestamp()
        });
        console.log("Ad document successfully added to Firestore");
      } catch (err) {
        console.error("Firestore addDoc error for ads:", err);
        handleFirestoreError(err, OperationType.CREATE, 'ads');
      }

      setAdName('');
      setAdLink('');
      setAdFile(null);
      if (adFileInputRef.current) adFileInputRef.current.value = '';
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Ad upload process failed:", err);
      setError(err.message || "Failed to upload advertisement. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteAd = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ads', id));
    } catch (err: any) {
      console.error("Delete ad error:", err);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    setSubmitting(true);
    setError(null);

    try {
      // Find user by email
      const q = query(collection(db, 'users'), where('email', '==', newAdminEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("User not found. They must sign in at least once.");
      } else {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
        setNewAdminEmail('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add admin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (uid: string) => {
    if (uid === auth.currentUser?.uid) {
      setError("You cannot remove yourself as admin.");
      return;
    }

    try {
      const q = query(collection(db, 'users'), where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        await updateDoc(doc(db, 'users', querySnapshot.docs[0].id), { role: 'user' });
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove admin.");
    }
  };

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      {/* Admin Tabs */}
      <div className="flex flex-wrap glass p-1 rounded-2xl mb-10 w-fit mx-auto gap-1">
        <button
          onClick={() => setActiveTab('library')}
          className={cn(
            "px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
            activeTab === 'library' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"
          )}
        >
          <ImageIcon size={18} />
          Library
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={cn(
            "px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
            activeTab === 'ads' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"
          )}
        >
          <Plus size={18} />
          Ads
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={cn(
            "px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all relative",
            activeTab === 'messages' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"
          )}
        >
          <MessageSquare size={18} />
          Messages
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-slate-900">
              {messages.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={cn(
            "px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
            activeTab === 'admins' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"
          )}
        >
          <UserIcon size={18} />
          Admins
        </button>
      </div>

      {activeTab === 'library' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Upload Form */}
        <div className="lg:col-span-1">
          <div className="glass rounded-3xl p-8 sticky top-32">
            <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
              <Plus className="text-indigo-400" />
              Add New Image
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex glass p-1 rounded-xl mb-2">
                <button
                  type="button"
                  onClick={() => setUploadType('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${uploadType === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Upload size={16} />
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${uploadType === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <LinkIcon size={16} />
                  URL
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Wallpaper Name</label>
                <input 
                  type="text" 
                  required 
                  className="glass-input w-full" 
                  placeholder="e.g. Neon City"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {uploadType === 'file' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Select Image File</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="glass border-dashed border-2 border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="text-slate-400 group-hover:text-indigo-400" size={24} />
                    </div>
                    <p className="text-sm text-slate-400">
                      {file ? file.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">PNG, JPG, WEBP up to 10MB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Image URL</label>
                  <input 
                    type="url" 
                    required 
                    className="glass-input w-full" 
                    placeholder="https://images.unsplash.com/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                  <select 
                    className="glass-input w-full appearance-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.filter(cat => cat !== 'All').map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Device Type</label>
                  <select 
                    className="glass-input w-full appearance-none"
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value as 'pc' | 'phone')}
                  >
                    <option value="pc" className="bg-slate-900">Other / PC</option>
                    <option value="phone" className="bg-slate-900">Phone / iPhone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Resolution</label>
                  <select 
                    className="glass-input w-full appearance-none"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    {resolutions.map(res => (
                      <option key={res} value={res} className="bg-slate-900">{res}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                <textarea 
                  className="glass-input w-full h-24 resize-none" 
                  placeholder="Brief description of the image..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPremium(!isPremium)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isPremium ? 'bg-indigo-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPremium ? 'left-7' : 'left-1'}`} />
                </button>
                <span className="text-sm font-medium">Premium Asset</span>
              </div>

              <AnimatePresence>
                {uploadProgress !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{uploadProgress > 0 ? 'Uploading...' : 'Starting...'}</span>
                      <span>{uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : '0%'}</span>
                    </div>
                    <div className="h-1.5 glass rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.1 }}
                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      />
                    </div>
                  </div>
                )}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm flex items-center gap-2"
                  >
                    <Check size={16} />
                    Image uploaded successfully!
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" 
                disabled={submitting}
                className="glass-button-primary w-full flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                {submitting ? 'Uploading...' : 'Publish Image'}
              </button>
            </form>
          </div>
        </div>

        {/* Management List */}
        <div className="lg:col-span-2">
          <div className="glass rounded-3xl p-8">
            <h2 className="text-2xl font-display font-bold mb-6">Manage Library</h2>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-24 glass rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : images.length > 0 ? (
              <div className="space-y-4">
                {images.map((img) => (
                  <motion.div 
                    key={img.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass rounded-2xl p-4 flex items-center gap-4 group"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                      <img 
                        src={img.url} 
                        alt={img.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold truncate">{img.name}</h3>
                        {img.isPremium && (
                          <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 font-bold uppercase">Premium</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{img.url}</p>
                    </div>

                    <button 
                      onClick={() => handleDelete(img.id)}
                      className={cn(
                        "p-3 rounded-xl transition-all flex items-center gap-2",
                        deletingId === img.id 
                          ? "bg-red-500 text-white opacity-100" 
                          : "text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {deletingId === img.id ? (
                        <span className="text-xs font-bold uppercase px-1">Delete?</span>
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <ImageIcon className="mx-auto text-slate-700 mb-4" size={48} />
                <p className="text-slate-400">Your library is empty. Start by adding an image!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : activeTab === 'ads' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1">
            <div className="glass rounded-3xl p-8 sticky top-32">
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
                <Plus className="text-indigo-400" />
                New Advertisement
              </h2>

              <form onSubmit={handleAdSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Ad Name</label>
                  <input 
                    type="text" 
                    required 
                    className="glass-input w-full" 
                    placeholder="e.g. Summer Sale"
                    value={adName}
                    onChange={(e) => setAdName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Target Link</label>
                  <input 
                    type="url" 
                    required 
                    className="glass-input w-full" 
                    placeholder="https://example.com"
                    value={adLink}
                    onChange={(e) => setAdLink(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Media File</label>
                  <div 
                    onClick={() => adFileInputRef.current?.click()}
                    className="glass border-dashed border-2 border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-500/50 transition-colors group"
                  >
                    <input 
                      type="file" 
                      ref={adFileInputRef}
                      className="hidden" 
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setAdFile(file);
                        if (file?.type.startsWith('video/')) setAdType('video');
                        else setAdType('image');
                      }}
                    />
                    <Upload className="text-slate-400 group-hover:text-indigo-400 mx-auto mb-2" size={24} />
                    <p className="text-xs text-slate-400">
                      {adFile ? adFile.name : "Upload Image or Video"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Position</label>
                  <select 
                    className="glass-input w-full appearance-none"
                    value={adPosition}
                    onChange={(e) => setAdPosition(e.target.value as any)}
                  >
                    <option value="top" className="bg-slate-900">Top Banner</option>
                    <option value="middle" className="bg-slate-900">Between Images</option>
                    <option value="bottom" className="bg-slate-900">Bottom Banner</option>
                    <option value="modal" className="bg-slate-900">Modal (Before View)</option>
                  </select>
                </div>

                {uploadProgress !== null && (
                  <div className="h-1.5 glass rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="glass-button-primary w-full flex items-center justify-center gap-2 relative overflow-hidden"
                >
                  {submitting && uploadProgress !== null && (
                    <div 
                      className="absolute inset-0 bg-indigo-500/20 transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {uploadProgress !== null ? (
                          uploadProgress > 0 ? `Uploading ${Math.round(uploadProgress)}%` : 'Starting...'
                        ) : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Create Ad
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="glass rounded-3xl p-8">
              <h2 className="text-2xl font-display font-bold mb-6">Active Ads</h2>
              <div className="space-y-4">
                {ads.map(ad => (
                  <div key={ad.id} className="glass rounded-2xl p-4 flex items-center gap-4 group">
                    <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                      {ad.type === 'video' ? (
                        <video src={ad.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={ad.url} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{ad.name}</h3>
                      <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">{ad.position}</p>
                      <p className="text-[10px] text-slate-500 truncate">{ad.link}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'admins' ? (
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="glass rounded-3xl p-8">
            <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
              <UserIcon className="text-indigo-400" />
              Add Administrator
            </h2>
            <form onSubmit={handleAddAdmin} className="flex gap-4">
              <input 
                type="email" 
                required 
                placeholder="User Email" 
                className="glass-input flex-1"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
              <button type="submit" disabled={submitting} className="glass-button-primary px-6">
                Add
              </button>
            </form>
          </div>

          <div className="glass rounded-3xl p-8">
            <h2 className="text-2xl font-display font-bold mb-6">Current Admins</h2>
            <div className="space-y-4">
              {adminUsers.map(admin => (
                <div key={admin.id} className="glass rounded-2xl p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center">
                      <UserIcon size={20} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-bold">{admin.email}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">ID: {admin.uid}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveAdmin(admin.uid)}
                    className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove Admin"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-3xl p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <MessageSquare className="text-indigo-400" />
              Incoming Messages
            </h2>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Total: {messages.length}
            </span>
          </div>

          {messages.length > 0 ? (
            <div className="space-y-6">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserIcon size={16} className="text-indigo-400" />
                        <h3 className="font-bold text-lg">{msg.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Mail size={14} />
                        <a href={`mailto:${msg.email}`} className="hover:text-indigo-400 transition-colors">{msg.email}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <Calendar size={14} />
                        {msg.createdAt?.toDate().toLocaleDateString()}
                      </div>
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-slate-300 text-sm leading-relaxed border border-white/5">
                    {msg.message}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-slate-700" size={32} />
              </div>
              <p className="text-slate-400">No messages yet. They will appear here when users contact you.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
