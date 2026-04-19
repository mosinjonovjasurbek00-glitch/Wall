import React, { useState } from 'react';
import { auth, db, loginWithGoogle, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, syncUserToFirestore, signInWithCustomToken } from '../firebase';
import { Mail, Lock, User, Loader2, X, ArrowLeft, ShieldCheck, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface AuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'verify';

export const AuthModal = ({ onSuccess, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [mathQuest, setMathQuest] = useState({ q: '', a: 0 });
  const [userAnswer, setUserAnswer] = useState('');

  const generateCaptcha = React.useCallback(() => {
    const ops = ['+', '-', '*', '/'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1, n2, ans, q;

    if (op === '+') {
      n1 = Math.floor(Math.random() * 80) + 11;
      n2 = Math.floor(Math.random() * 80) + 11;
      ans = n1 + n2;
      q = `${n1} + ${n2} = ?`;
    } else if (op === '-') {
      n1 = Math.floor(Math.random() * 80) + 20;
      n2 = Math.floor(Math.random() * (n1 - 5)) + 5;
      ans = n1 - n2;
      q = `${n1} - ${n2} = ?`;
    } else if (op === '*') {
      n1 = Math.floor(Math.random() * 10) + 3;
      n2 = Math.floor(Math.random() * 10) + 3;
      ans = n1 * n2;
      q = `${n1} × ${n2} = ?`;
    } else { // Division
      ans = Math.floor(Math.random() * 10) + 2;
      n2 = Math.floor(Math.random() * 8) + 2;
      n1 = ans * n2;
      q = `${n1} ÷ ${n2} = ?`;
    }

    setMathQuest({ q, a: ans });
    setUserAnswer('');
  }, []);

  React.useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha, mode]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError("Google orqali kirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (parseInt(userAnswer) !== mathQuest.a) {
        setError("Matematik javob noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
        generateCaptcha();
        setLoading(false);
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUserToFirestore(result.user);
      onSuccess();
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message?.includes('Could not reach Cloud Firestore backend') || err.code === 'unavailable') {
        setError(
          <div className="text-center space-y-2">
            <p>Ma'lumotlar bazasiga ulanib bo'lmadi.</p>
            <p className="text-[10px] opacity-70">Firestore ulanishi (offline). Iltimos, internetingizni tekshiring yoki birozdan so'ng qayta urinib ko'ring.</p>
          </div>
        );
        return;
      }
      const errMsg = err.response?.data?.error || err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Email yoki parol noto'g'ri.");
      } else {
        setError(errMsg || "Kirishda xatolik yuz berdi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Parollar mos kelmadi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (parseInt(userAnswer) !== mathQuest.a) {
        setError("Matematik javob noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
        generateCaptcha();
        setLoading(false);
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      
      try {
        await sendEmailVerification(result.user);
      } catch (vErr) {
        console.warn("Verification email send failed:", vErr);
      }

      await syncUserToFirestore(result.user);
      onSuccess();
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Ushbu email bilan allaqachon ro'yxatdan o'tilgan.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Tizimda xatolik yuz berdi. Email/Password yoqilmagan bo'lishi mumkin.");
      } else {
        setError("Ro'yxatdan o'tishda xatolik yuz berdi.");
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
        className="glass w-full max-w-sm rounded-[2.5rem] relative overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)] flex flex-col max-h-[90vh]"
      >
        {/* Header Actions */}
        <div className="flex items-center justify-between p-6 pb-0 relative z-10">
          {mode !== 'login' ? (
            <button 
              onClick={() => setMode('login')} 
              className="p-2 -ml-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full"
              title="Ortga qaytish"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-9" /> // Spacer
          )}
          
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full"
            title="Yopish"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-8 pt-4 sm:p-10 sm:pt-4 custom-scrollbar">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
                 <h2 className="text-2xl font-black uppercase tracking-tighter italic">
                   Animem<span className="text-indigo-500">.uz</span>
                 </h2>
            </div>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-black">
              {mode === 'login' ? 'Tizimga Kirish' : 
               mode === 'register' ? "Ro'yxatdan O'tish" : 
               'Emailni Tasdiqlash'}
            </p>
          </div>

        <AnimatePresence mode="wait">
          {mode === 'verify' ? (
            <motion.div 
              key="verify-state"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck size={40} className="text-indigo-500" />
              </div>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                Emailingizga tasdiqlash linki yuborildi. Iltimos, pochtangizni tekshiring va linkni bosing, so'ngra login qiling.
              </p>
              <button 
                onClick={() => setMode('login')}
                className="glass-button w-full py-4 text-[10px] flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> LOGIN SAHIFASIGA QAYTISH
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              className="space-y-6"
            >
              <form onSubmit={mode === 'login' ? handleEmailLogin : handleRegister} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="To'liq Ismingiz" 
                      className="glass-input w-full pl-12 h-14"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="email" 
                    placeholder="Email Manzilingiz" 
                    className="glass-input w-full pl-12 h-14"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="password" 
                    placeholder="Parol" 
                    className="glass-input w-full pl-12 h-14"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="password" 
                      placeholder="Parolni Tasdiqlang" 
                      className="glass-input w-full pl-12 h-14"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Bot tekshiruvi:</span>
                    <button 
                      type="button" 
                      onClick={generateCaptcha} 
                      className="text-indigo-500 hover:rotate-180 transition-transform duration-500"
                      title="Yangilash"
                    >
                      <RefreshCcw size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-center font-mono text-lg font-black tracking-tighter text-indigo-400">
                      {mathQuest.q}
                    </div>
                    <input 
                      type="number"
                      placeholder="Javob"
                      className="w-24 glass-input text-center h-12 text-sm font-black"
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="glass-button-primary w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (mode === 'login' ? 'KIRISH' : "RO'YXATDAN O'TISH")}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest"><span className="bg-[#080808] px-4 text-slate-600">Yoki boshqa usul</span></div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={handleGoogleLogin}
                  className="glass h-14 rounded-2xl flex items-center justify-center hover:bg-white hover:text-black transition-all active:scale-95 border-white/5 gap-3"
                  title="Google orqali kirish"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">Google orqali davom etish</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button 
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {mode === 'login' ? "Akkauntingiz yo'qmi? Ro'yxatdan o'ting" : "Akkauntingiz bormi? Kirish"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-[9px] font-black uppercase tracking-widest text-center mx-8 mb-8"
          >
            {error}
          </motion.div>
        )}
      </div>
    </motion.div>
  </div>
  );
};
