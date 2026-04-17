import { auth, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogOut, LayoutDashboard, Film, Play, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface NavbarProps {
  isAdmin: boolean;
  view: 'gallery' | 'admin';
  setView: (view: 'gallery' | 'admin') => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  imageCount: number;
  onLoginClick: () => void;
}

export default function Navbar({ isAdmin, view, setView, selectedCategory, setSelectedCategory, imageCount, onLoginClick }: NavbarProps) {
  const [user] = useAuthState(auth);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsername() {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        }
      }
    }
    fetchUsername();
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-8 font-sans">
      <div className="max-w-7xl mx-auto glass rounded-full px-10 py-3.5 flex items-center justify-between border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div 
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => setView('gallery')}
        >
          <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)] group-hover:scale-110 transition-transform ring-4 ring-indigo-500/20">
            <Play size={20} fill="white" className="ml-1" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tighter italic leading-none">
              ANIMEM<span className="text-indigo-400">.UZ</span>
            </span>
            <span className="text-[8px] font-black text-slate-500 tracking-[0.4em] uppercase mt-1">Database</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className={cn(
                "px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                isCategoryOpen 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              )}
            >
              <span>{selectedCategory === 'All' ? 'JANRLAR' : selectedCategory.toUpperCase()}</span>
            </button>

            <AnimatePresence>
              {isCategoryOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsCategoryOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute top-full right-0 mt-6 z-[70] bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] w-80 max-h-[70vh] overflow-y-auto custom-scrollbar"
                  >
                    <div className="grid grid-cols-1 gap-2">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 ml-2">Filtlash</p>
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsCategoryOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                            selectedCategory === cat 
                              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" 
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <button
                  onClick={() => setView(view === 'gallery' ? 'admin' : 'gallery')}
                  className={cn(
                    "w-12 h-12 rounded-full transition-all border flex items-center justify-center",
                    view === 'admin' ? "bg-indigo-600 border-indigo-500" : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                  title={view === 'gallery' ? 'Admin Panel' : 'Galereya'}
                >
                  {view === 'gallery' ? <LayoutDashboard size={20} /> : <Film size={20} />}
                </button>
              )}
              
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <div className="hidden lg:flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[120px]">@{username || 'User'}</span>
                   <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">{isAdmin ? 'Admin' : 'Member'}</span>
                </div>
                <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                   <User size={20} className="text-slate-400" />
                </div>
                <button 
                  onClick={logout}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white transition-all group"
                  title="Chiqish"
                >
                  <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="bg-white text-black px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-400 transition-all active:scale-95"
            >
              KIRISH
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
