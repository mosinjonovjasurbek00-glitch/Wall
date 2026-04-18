import React, { useState } from 'react';
import { auth, db, loginWithGoogle } from '../firebase';
import { signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { Phone, Lock, User, Loader2, X, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const AuthModal = ({ onSuccess, onClose }: AuthModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Xatolik: Ushbu domen ruxsat etilganlar ro'yxatida yo'q. Firebase Console-ga kiring va "${window.location.hostname}" domenini qo'shing.`);
      } else {
        setError("Google orqali kirishda xatolik. Iltimos, yana bir bor urinib ko'ring.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass w-full max-w-sm p-10 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">
            Animem<span className="text-indigo-500">.uz</span>
          </h2>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.3em] font-black">Xush kelibsiz</p>
        </div>

        <div className="flex flex-col items-center gap-8 py-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-16 glass rounded-2xl flex items-center justify-center gap-4 bg-white/5 border-white/10 hover:bg-white hover:text-black transition-all group shadow-xl hover:shadow-white/20 active:scale-95 px-6"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </div>
            <span className="text-xs font-black uppercase tracking-widest transition-colors">Google orqali kirish</span>
          </button>

          {error && <p className="text-red-400 text-[10px] text-center font-black italic uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20 w-full">{error}</p>}
          
          {loading && (
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
