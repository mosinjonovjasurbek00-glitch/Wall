import React, { useState, useRef } from 'react';
import { auth, db, loginWithGoogle, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, syncUserToFirestore, signInWithCustomToken } from '../firebase';
import { Mail, Lock, User, Loader2, X, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LdkE74sAAAAAB09k01o5LfHBKobDQ2JQ9AwVNPt";

interface AuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'verify';

export const AuthModal = ({ onSuccess, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

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
    if (!captchaToken) {
      setError("Iltimos, reCaptcha-ni tasdiqlang.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Verify captcha on server first
      const verifyRes = await axios.post('/api/verify-captcha', { token: captchaToken });
      if (!verifyRes.data.success) {
        throw new Error("Captcha tasdiqlanmadi.");
      }

      // 2. Proceed with login
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUserToFirestore(result.user);
      onSuccess();
    } catch (err: any) {
      console.error("Login error:", err);
      // Reset captcha on error
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      
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
    if (!captchaToken) {
      setError("Iltimos, reCaptcha-ni tasdiqlang.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Verify captcha on server first
      const verifyRes = await axios.post('/api/verify-captcha', { token: captchaToken });
      if (!verifyRes.data.success) {
        throw new Error("Captcha tasdiqlanmadi.");
      }

      // 2. Proceed with registration
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
      // Reset captcha on error
      recaptchaRef.current?.reset();
      setCaptchaToken(null);

      const errMsg = err.response?.data?.error || err.message;
      if (err.code === 'auth/email-already-in-use') {
        setError("Ushbu email bilan allaqachon ro'yxatdan o'tilgan.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Tizimda xatolik yuz berdi. Email/Password yoqilmagan bo'lishi mumkin.");
      } else {
        setError(errMsg || "Ro'yxatdan o'tishda xatolik yuz berdi.");
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
        className="glass w-full max-w-sm p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
               <h2 className="text-3xl font-black uppercase tracking-tighter italic">
                 Animem<span className="text-indigo-500">.uz</span>
               </h2>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black">
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

                <div className="flex justify-center py-2">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={onCaptchaChange}
                    theme="dark"
                  />
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
            className="mt-6 text-red-500 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-[9px] font-black uppercase tracking-widest text-center"
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
