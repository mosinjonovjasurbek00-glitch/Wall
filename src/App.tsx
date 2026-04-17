import * as React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import Navbar from './components/Navbar';
import Gallery from './components/Gallery';
import AdminPanel from './components/AdminPanel';
import ContactForm from './components/ContactForm';
import { FallingLeaves } from './components/FallingLeaves';
import { Loader2, ShieldAlert, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [firestoreAdmin, setFirestoreAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [view, setView] = useState<'gallery' | 'admin'>('gallery');
  const [showContact, setShowContact] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // High-level data state to prevent disappearing images during login
  const [images, setImages] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Derive isAdmin from both Firestore role and hardcoded email for robustness
  const isAdmin = firestoreAdmin || (user?.email?.toLowerCase() === "mosinjonovjasurbek00@gmail.com");

  // Fetch data immediately
  useEffect(() => {
    const dbId = (db as any)._databaseId?.database || "(unknown)";
    console.log(`App: Initializing data fetch with DB ID: ${dbId}`);
    
    const imagesRef = collection(db, 'images');
    const qImages = query(imagesRef);
    
    // Increased safety timeout to 15s for slow cold starts or data syncing
    const timeoutId = setTimeout(() => {
      setDataLoading(prev => {
        if (prev) {
          console.warn("App: Data loading timed out (15s), likely slow connection or syncing issues.");
          return false;
        }
        return prev;
      });
    }, 15000);

    const unsubscribeImages = onSnapshot(qImages, (snapshot) => {
      console.log(`App: Images snapshot received. Docs: ${snapshot.docs.length}, PendingWrites: ${snapshot.metadata.hasPendingWrites}`);
      
      if (snapshot.docs.length === 0 && !snapshot.metadata.fromCache) {
        console.log("App: Database is empty (fully synced).");
      }

      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually in memory to ensure new uploads with null timestamps appear at top
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeB - timeA;
      });
      setImages(docs);
      setDataLoading(false);
      setFetchError(null);
      clearTimeout(timeoutId);
    }, (error) => {
      console.error("App: Images fetch error:", error);
      setFetchError(error.message || "Failed to load images");
      setDataLoading(false);
      clearTimeout(timeoutId);
    });

    const qAds = query(collection(db, 'ads'));
    const unsubscribeAds = onSnapshot(qAds, (snapshot) => {
      setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("App: Ads fetch error:", error);
    });

    return () => {
      unsubscribeImages();
      unsubscribeAds();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    async function syncUserRole() {
      if (user) {
        const isDefaultAdmin = user.email.toLowerCase() === "mosinjonovjasurbek00@gmail.com";
        // No need to setCheckingRole(true) here as we already derived isAdmin
        
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const currentRole = userDoc.data().role;
            if (isDefaultAdmin && currentRole !== 'admin') {
              await setDoc(userDocRef, { ...userDoc.data(), role: 'admin' }, { merge: true });
              setFirestoreAdmin(true);
            } else {
              setFirestoreAdmin(currentRole === 'admin');
            }
          } else {
            const role = isDefaultAdmin ? 'admin' : 'user';
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              role: role
            });
            setFirestoreAdmin(isDefaultAdmin);
          }
        } catch (error) {
          console.error("Role sync error:", error);
        }
      } else {
        setFirestoreAdmin(false);
        setView('gallery');
      }
    }

    syncUserRole();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={24} />
        </div>
        <p className="text-slate-400 font-medium animate-pulse">Initializing Lumina...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none z-0" style={{ animationDelay: '2s' }} />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-600/5 rounded-full blur-[100px] animate-pulse pointer-events-none z-0" style={{ animationDelay: '4s' }} />

      <div className="relative z-10">
        <FallingLeaves />
        <Navbar 
          isAdmin={isAdmin} 
          view={view} 
          setView={setView} 
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        <AnimatePresence>
          {fetchError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-6 right-6 z-40 bg-red-500/20 backdrop-blur-md border border-red-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">Connection Error: {fetchError}</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <main>
        {view === 'gallery' ? (
          <Gallery 
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            images={images}
            ads={ads}
            loading={dataLoading}
          />
        ) : isAdmin ? (
          <AdminPanel />
        ) : (
          <div className="pt-40 flex flex-col items-center justify-center px-6">
            <div className="glass p-12 rounded-3xl text-center max-w-md">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="text-red-400 w-10 h-10" />
              </div>
              <h2 className="text-3xl font-display font-bold mb-4">Access Denied</h2>
              <p className="text-slate-400 mb-8">
                You don't have administrative privileges to access this area. 
                Please return to the gallery.
              </p>
              <button 
                onClick={() => setView('gallery')}
                className="glass-button-primary w-full"
              >
                Back to Gallery
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 bg-slate-700 rounded-lg" />
            <span className="font-display font-bold">Lumina Gallery</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 Lumina Glass Gallery. All rights reserved.
          </p>
          <div className="flex gap-6 text-slate-500 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <button 
              onClick={() => setShowContact(true)}
              className="hover:text-white transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </footer>

      <ContactForm isOpen={showContact} onClose={() => setShowContact(false)} />
    </div>
  </div>
  );
}
