import * as React from 'react';
import { useState, useEffect } from 'react';
import { auth, db, syncUserToFirestore } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getRedirectResult } from 'firebase/auth';
import Navbar from './components/Navbar';
import AnimePortal from './components/AnimePortal';
import AdminPanel from './components/AdminPanel';
import ContactForm from './components/ContactForm';
import { Loader2, ShieldAlert, AlertCircle, Send, Globe, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FallingLeaves } from './components/FallingLeaves';
import { AuthModal } from './components/AuthModal';
import NotificationSystem from './components/NotificationSystem';
import PushNotificationInitializer from './components/PushNotificationInitializer';
import { Language, useTranslation } from './i18n';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'uz');
  const t = useTranslation(language);
  const [user, loading] = useAuthState(auth);
  const [firestoreAdmin, setFirestoreAdmin] = useState(false);
  const [view, setView] = useState<'gallery' | 'admin'>('gallery');
  const [showContact, setShowContact] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Check for redirect result on mount
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        await syncUserToFirestore(result.user);
      }
    }).catch((error) => {
      console.error("Redirect login error:", error);
    });
  }, []);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [animeList, setAnimeList] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isAdmin = firestoreAdmin || (user?.email?.toLowerCase() === "mosinjonovjasurbek00@gmail.com");

  useEffect(() => {
    const qAnime = query(collection(db, 'anime'));
    const unsubscribe = onSnapshot(qAnime, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnimeList(docs.sort((a: any, b: any) => {
        const getTs = (d: any) => typeof d?.toMillis === 'function' ? d.toMillis() : 0;
        return getTs(b.createdAt) - getTs(a.createdAt);
      }));
      setDataLoading(false);
    }, (error) => {
      setFetchError("Anime yuklashda xatolik");
      setDataLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function syncUserRole() {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setFirestoreAdmin(userDoc.data().role === 'admin');
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

  // Filter anime by selected language
  const filteredAnimeListByLang = animeList.filter(a => (a.language || 'uz') === language);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#020202]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }} 
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 bg-indigo-600 rounded-full overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.3)] border-2 border-indigo-500/20"
        >
          <img 
            src="https://img.freepik.com/premium-photo/cute-anime-boy-wallpaper_776894-110627.jpg?semt=ais_hybrid&w=740&q=80" 
            alt="Loading..."
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
          {t('loadingString')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      <FallingLeaves />

      <Navbar 
        isAdmin={isAdmin} 
        view={view} 
        setView={setView} 
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        imageCount={filteredAnimeListByLang.length}
        onLoginClick={() => setShowAuthModal(true)}
        language={language}
        setLanguage={setLanguage}
      />

      <AnimatePresence>
        {fetchError && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-6 right-6 z-[80] bg-red-500/20 backdrop-blur-md border border-red-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 text-red-400">
               <AlertCircle size={20} />
               <p className="text-xs font-black uppercase tracking-widest leading-none">{t('errorFetchAnime')}</p>
            </div>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">{t('retry')}</button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="relative pt-20 sm:pt-28">
      {view === 'gallery' ? (
        <AnimePortal 
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          animeList={filteredAnimeListByLang}
          loading={dataLoading}
          language={language}
        />
      ) : isAdmin ? (
        <AdminPanel language={language} setLanguage={setLanguage} />
      ) : (
        <div className="pt-40 flex flex-col items-center justify-center px-6">
          <div className="glass p-16 rounded-[2rem] text-center max-w-lg">
            <ShieldAlert className="text-red-500 w-20 h-20 mx-auto mb-8 animate-bounce" />
            <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase">{t('noAccess')}</h2>
            <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed uppercase tracking-widest">{t('noAccessDesc')}</p>
            <button onClick={() => setView('gallery')} className="glass-button-primary w-full py-5 text-xs">{t('backToHome')}</button>
          </div>
        </div>
      )}
      </main>

      <footer className="py-24 px-12 lg:px-24 border-t border-white/5 bg-black/50 backdrop-blur-2xl relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                <img 
                  src="https://img.freepik.com/premium-photo/cute-anime-boy-wallpaper_776894-110627.jpg?semt=ais_hybrid&w=740&q=80" 
                  alt="Footer Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-3xl font-black tracking-tighter italic uppercase">Animem<span className="text-indigo-500">.uz</span></span>
            </div>
            <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">{t('footerDesc')}</p>
          </div>
          <div className="flex items-center gap-6 sm:gap-12 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <a href="https://t.me/animem_uz1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/5 px-6 py-3 rounded-full hover:bg-indigo-600 hover:text-white transition-all border border-white/5">
              <Send size={16} /> TELEGRAM
            </a>
            <button onClick={() => setShowContact(true)} className="hover:text-white transition-colors uppercase">{t('contact')}</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-12 border-t border-white/5 text-center text-slate-800 text-[10px] font-black uppercase tracking-[0.4em]">
          {t('copyright')}
        </div>
      </footer>

      <ContactForm isOpen={showContact} onClose={() => setShowContact(false)} language={language} />
      
      {showAuthModal && (
        <AuthModal 
          onSuccess={() => setShowAuthModal(false)} 
          onClose={() => setShowAuthModal(false)} 
          language={language}
        />
      )}

      <NotificationSystem />
      <PushNotificationInitializer />
    </div>
  );
}
