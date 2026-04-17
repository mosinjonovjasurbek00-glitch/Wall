import { auth, loginWithGoogle, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, LogOut, LayoutDashboard, Image as ImageIcon, User, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../constants';

interface NavbarProps {
  isAdmin: boolean;
  view: 'gallery' | 'admin';
  setView: (view: 'gallery' | 'admin') => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  imageCount: number;
}

export default function Navbar({ isAdmin, view, setView, selectedCategory, setSelectedCategory, imageCount }: NavbarProps) {
  const [user] = useAuthState(auth);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6">
      <div className="max-w-7xl mx-auto glass rounded-2xl px-6 py-2 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView('gallery')}
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform border border-white/10 flex-shrink-0">
            <span className="text-white font-black text-sm italic">4K</span>
          </div>
          <span className="font-display font-black text-xl sm:text-2xl tracking-tighter hidden xs:block">
            LUMINA<span className="text-indigo-400">WALLS</span>
          </span>
          <div className="hidden lg:flex flex-col ml-4 pl-4 border-l border-white/10">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Public Library</span>
            <span className="text-xs font-black text-emerald-400">{imageCount} Items Synced</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className={cn(
                "glass-button flex items-center gap-2 px-3 sm:px-4 py-2 transition-all border",
                isCategoryOpen 
                  ? "bg-indigo-600/20 border-indigo-500 text-white" 
                  : "bg-white/10 border-white/10 text-slate-200 hover:bg-white/20"
              )}
            >
              <span className="text-xs sm:text-sm font-medium">{selectedCategory === 'All' ? 'Categories' : selectedCategory}</span>
              {isCategoryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {isCategoryOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[60]" 
                    onClick={() => setIsCategoryOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed sm:absolute top-[100px] sm:top-full left-6 right-6 sm:left-auto sm:right-0 z-[70] bg-slate-950/95 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl border border-white/10 sm:w-[450px] max-h-[60vh] overflow-y-auto custom-scrollbar"
                  >
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-1">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsCategoryOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                            selectedCategory === cat 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                              : "text-slate-200 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span>{cat}</span>
                          <ChevronRight 
                            size={14} 
                            className={cn(
                              "transition-transform group-hover:translate-x-1",
                              selectedCategory === cat ? "text-white" : "text-slate-600"
                            )} 
                          />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <>
              {isAdmin && (
                <button
                  onClick={() => setView(view === 'gallery' ? 'admin' : 'gallery')}
                  className={cn(
                    "glass-button-secondary flex items-center gap-2",
                    view === 'admin' && "bg-indigo-600/20 border-indigo-500/50"
                  )}
                >
                  {view === 'gallery' ? (
                    <>
                      <LayoutDashboard size={18} />
                      <span className="hidden sm:inline">Admin Panel</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={18} />
                      <span className="hidden sm:inline">Gallery</span>
                    </>
                  )}
                </button>
              )}
              
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium">{user.displayName}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {isAdmin ? 'Administrator' : 'User'}
                  </span>
                </div>
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={20} />
                  </div>
                )}
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="glass-button-primary flex items-center gap-2"
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
