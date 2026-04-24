import { auth, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogOut, LayoutDashboard, Film, Play, User, Globe, Bell, Search, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../constants';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import NotificationMenu from './NotificationMenu';
import ProfileModal from './ProfileModal';
import { Language, useTranslation } from '../i18n';

interface NavbarProps {
  isAdmin: boolean;
  view: 'gallery' | 'admin';
  setView: (view: 'gallery' | 'admin') => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  imageCount: number;
  onLoginClick: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ isAdmin, view, setView, selectedCategory, setSelectedCategory, imageCount, onLoginClick, language, setLanguage, searchTerm, setSearchTerm, activeTab, setActiveTab }: NavbarProps) {
  const [user] = useAuthState(auth);
  const t = useTranslation(language);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    if (user) {
      unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername(data.username);
          setAvatarUrl(data.avatarUrl || null);
        }
      });
    }
    return () => unsubscribe();
  }, [user]);

  const handleNavClick = (key: string) => {
    setView('gallery');
    
    if (key === 'home') {
      setActiveTab('gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (key === 'anime') {
      setActiveTab('anime');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (key === 'news') {
      setActiveTab('news');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setSearchTerm('');
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] h-16 sm:h-20 bg-[var(--bg-deep)]/80 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between font-sans border-b border-white/[0.05]">
        {/* Left: Logo */}
        <div 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0 flex-1 lg:flex-1"
          onClick={() => {
            setView('gallery');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSearchTerm('');
            setSelectedCategory('All');
          }}
        >
          <img src="https://i.pinimg.com/736x/17/c6/88/17c688c6242fe4c3293be182924e73a3.jpg" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-red-500/20 group-hover:border-red-500/50 transition-colors" />
          <span className="font-black text-lg sm:text-2xl tracking-tighter uppercase flex items-center text-white">
            ANIMEM<span className="text-[var(--accent)]">.UZ</span>
          </span>
        </div>

        {/* Center: Desktop Menu Items */}
        <div className="hidden lg:flex items-center justify-center gap-8">
          {['home', 'anime', 'news'].map((key) => (
            <button 
              key={key}
              onClick={() => handleNavClick(key)}
              className={cn(
                "nav-link",
                (key === 'home' && activeTab === 'gallery') && "text-[var(--accent)]",
                (key === 'anime' && activeTab === 'anime') && "text-[var(--accent)]",
                (key === 'news' && activeTab === 'news') && "text-[var(--accent)]"
              )}
            >
              {t(key as any)}
            </button>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-6 flex-1 justify-end">
          {/* Desktop Search Bar */}
          <div className="hidden xl:flex items-center relative group max-w-[280px] w-full">
            <input 
              type="text" 
              placeholder={language === 'uz' ? 'Qidiruv...' : 'Поиск...'}
              className="w-full h-10 bg-white/[0.03] border border-white/5 rounded-full pl-6 pr-12 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-4 text-slate-500">
              <Search size={14} />
            </div>
            <div className="absolute right-10 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-bold text-slate-500 pointer-events-none">
              Ctrl K
            </div>
          </div>

          {/* Mobile Search Toggle */}
          <button 
            className="xl:hidden w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-white/[0.06] transition-all"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search size={16} className={isSearchOpen ? "text-red-400" : "text-slate-400"} />
          </button>

          <NotificationMenu language={language} />

          {/* Auth/User */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                {isAdmin && (
                  <button
                    onClick={() => setView(view === 'gallery' ? 'admin' : 'gallery')}
                    className="hidden sm:flex w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] items-center justify-center transition-all"
                    title={view === 'gallery' ? t('adminPanel') : t('gallery')}
                  >
                    {view === 'gallery' ? <LayoutDashboard size={18} className="text-red-400" /> : <Film size={18} className="text-red-400" />}
                  </button>
                )}
                
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/5 bg-red-500/10 flex items-center justify-center shrink-0 overflow-hidden hover:border-red-500/50 transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={16} className="text-red-400" />
                  )}
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick}
                className="bg-red-600 hover:bg-red-500 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-600/20 flex items-center gap-2"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center">
                   <Play size={10} fill="white" className="ml-0.5" />
                </div>
                <span className="hidden sm:inline">{t('signIn' as any)}</span>
              </button>
            )}

            {/* Lang Switcher - Hide on very small screens, put in mobile menu */}
            <button 
              onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')}
              className="hidden sm:flex w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 items-center justify-center group hover:bg-white/[0.06] transition-all"
            >
              <Globe size={18} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-white/[0.06] transition-all"
            >
              {mobileMenuOpen ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Search Bar Dropdown */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-16 sm:top-20 left-0 right-0 z-[90] bg-[var(--bg-deep)] border-b border-white/5 xl:hidden overflow-hidden"
          >
            <div className="p-4 relative">
              <input 
                type="text" 
                placeholder={language === 'uz' ? 'Qidiruv...' : 'Поиск...'}
                className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-2xl pl-6 pr-12 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500">
                <Search size={18} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[80] bg-[var(--bg-deep)]/95 backdrop-blur-xl lg:hidden pt-24 sm:pt-28 pb-6 px-6 overflow-y-auto flex flex-col"
          >
            <div className="flex flex-col gap-6">
              {['home', 'anime', 'news'].map((key) => (
                <button 
                  key={key}
                  onClick={() => handleNavClick(key)}
                  className={cn(
                    "text-2xl font-black uppercase text-left transition-colors",
                    (key === 'home' && activeTab === 'gallery') ||
                    (key === 'anime' && activeTab === 'anime') ||
                    (key === 'news' && activeTab === 'news')
                      ? "text-red-500" 
                      : "text-white"
                  )}
                >
                  {t(key as any)}
                </button>
              ))}
              
              <div className="h-px w-full bg-white/10 my-4" />

              <button 
                onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')}
                className="flex items-center gap-4 text-xl font-black uppercase text-white"
              >
                <Globe size={24} className="text-slate-400" />
                {language === 'uz' ? 'Русский' : 'O\'zbek'}
              </button>

              {isAdmin && user && (
                <button
                  onClick={() => {
                    setView(view === 'gallery' ? 'admin' : 'gallery');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-4 text-xl font-black uppercase text-red-400 mt-4"
                >
                  {view === 'gallery' ? <LayoutDashboard size={24} /> : <Film size={24} />}
                  {view === 'gallery' ? t('adminPanel') : t('gallery')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && (
          <ProfileModal 
            isOpen={showProfileModal} 
            onClose={() => setShowProfileModal(false)}
            language={language}
          />
        )}
      </AnimatePresence>
    </>
  );
}

