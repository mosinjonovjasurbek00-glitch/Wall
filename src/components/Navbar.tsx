import { auth, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogOut, LayoutDashboard, Film, Play, User, Globe } from 'lucide-react';
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
    <nav className="fixed top-0 left-0 right-0 z-[100] px-4 sm:px-6 py-4 sm:py-8 font-sans">
      <div className="max-w-7xl mx-auto glass rounded-full px-4 sm:px-10 py-2.5 sm:py-3.5 flex items-center justify-between border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div 
          className="flex items-center gap-3 sm:gap-4 cursor-pointer group"
          onClick={() => setView('gallery')}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)] group-hover:scale-110 transition-transform ring-4 ring-indigo-500/20 overflow-hidden">
            <img 
              src="https://img.freepik.com/premium-photo/cute-anime-boy-wallpaper_776894-110627.jpg?semt=ais_hybrid&w=740&q=80" 
              alt="Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg sm:text-2xl tracking-tighter italic leading-none">
              ANIMEM<span className="text-indigo-400">.UZ</span>
            </span>
            <span className="hidden sm:block text-[8px] font-black text-slate-500 tracking-[0.4em] uppercase mt-1">Database</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
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
