import React, { useState } from 'react';
import { auth, db, loginWithGoogle } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { Phone, Lock, User, Loader2, X, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const AuthModal = ({ onSuccess, onClose }: AuthModalProps) => {
  const [method, setMethod] = useState<'selection' | 'google' | 'telegram'>('selection');
  const [step, setStep] = useState<'phone' | 'otp' | 'username'>('phone');
  
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ADMIN_NUMBERS = ['+998901234567', '+998950752686'];

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/telegram/send-otp', { phoneNumber });
      console.log("OTP Send Response:", response.data);
      const rid = response.data.request_id || response.data.result?.request_id;
      
      if (rid) {
        setRequestId(rid);
        setStep('otp');
      } else {
        throw new Error("Request ID topilmadi. Telegram API xatosi.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "OTP yuborishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/telegram/verify-otp', {
        phoneNumber,
        requestId,
        code: otp
      });
      console.log("OTP Verify Response:", response.data);

      const status = response.data.status || response.data.result?.status;

      if (status === 'confirmed' || status === 'ok' || response.data.ok === true) {
        // Find existing user or register new
        const q = query(collection(db, 'users'), where('phoneNumber', '==', phoneNumber));
        const querySnapshot = await getDocs(q);

        try {
          // Attempt anonymous sign in
          await signInAnonymously(auth);
          
          if (!querySnapshot.empty) {
            onSuccess();
          } else {
            setStep('username');
          }
        } catch (authErr: any) {
          console.error("Auth Error:", authErr);
          if (authErr.code === 'auth/admin-restricted-operation') {
            setError("DIQQAT: Firebase Console'da 'Anonymous Authentication' o'chirilgan. Iltimos, Firebase Console -> Authentication -> Sign-in method bo'limidan 'Anonymous'ni yoqing.");
          } else {
            setError(`Kirishda xatolik: ${authErr.message}`);
          }
        }
      } else {
        setError("Kod noto'g'ri yoki muddati o'tgan");
      }
    } catch (err: any) {
      console.error("Verification failed:", err);
      setError("Verifikatsiya xatosi: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let user = auth.currentUser;
      
      if (!user) {
        const userCred = await signInAnonymously(auth);
        user = userCred.user;
      }
      
      const uid = user.uid;
      
      await setDoc(doc(db, 'users', uid), {
        uid,
        phoneNumber,
        username,
        role: ADMIN_NUMBERS.includes(phoneNumber) ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Profile Save Error details:", err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError("XATOLIK: Firebase Console'da 'Anonymous Authentication' yoqilmagan. Uni yoqish shart!");
      } else {
        setError(`Profilni saqlashda xatolik: ${err.message || "Noma'lum xato"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError("Google orqali kirishda xatolik. Iltimos, yangi tabda ochib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass w-full max-w-md p-10 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">
            Animem<span className="text-indigo-500">.uz</span>
          </h2>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.3em] font-black">Platformaga kirish</p>
        </div>

        <AnimatePresence mode="wait">
          {method === 'selection' && (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex justify-center gap-8 py-6"
            >
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-24 h-24 glass rounded-[2rem] flex items-center justify-center bg-white/5 border-white/10 hover:bg-white transition-all group shadow-2xl hover:shadow-white/20 active:scale-95"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  </div>
                </button>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">Google bilan</span>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => setMethod('telegram')}
                  className="w-24 h-24 glass rounded-[2rem] flex items-center justify-center bg-[#229ED9]/10 border-[#229ED9]/20 text-[#229ED9] hover:bg-[#229ED9] hover:text-white transition-all shadow-2xl hover:shadow-[#229ED9]/30 active:scale-95 group"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
                      <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.57.2l-8.54 7.702-.33 4.975c.488 0 .704-.223.978-.485l2.35-2.286 4.888 3.61c.901.497 1.547.241 1.772-.843l3.202-15.085c.329-1.32-.504-1.918-1.47-1.464z" />
                    </svg>
                  </div>
                </button>
                <span className="text-[11px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">Telegram bilan</span>
              </div>
            </motion.div>
          )}

          {method === 'telegram' && (
            <motion.div 
              key="telegram-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <form onSubmit={step === 'phone' ? handleSendOtp : step === 'otp' ? handleVerifyOtp : handleCompleteRegistration} className="space-y-6">
                <AnimatePresence mode="wait">
                  {step === 'phone' && (
                    <motion.div 
                      key="phone"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-2 underline underline-offset-4 decoration-indigo-500/50">Telefon raqam</label>
                      <div className="relative group">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input 
                          type="tel" 
                          className="glass-input w-full pl-16 rounded-2xl py-5" 
                          placeholder="+998950752686"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 'otp' && (
                    <motion.div 
                      key="otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-2">Tasdiqlash kodi</label>
                      <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input 
                          type="text" 
                          className="glass-input w-full pl-16 rounded-2xl py-5" 
                          placeholder="Telegram kodini yozing"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 'username' && (
                    <motion.div 
                      key="username"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-2">Foydalanuvchi nomi</label>
                      <div className="relative group">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input 
                          type="text" 
                          className="glass-input w-full pl-16 rounded-2xl py-5" 
                          placeholder="Nickname"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && <p className="text-red-400 text-[10px] text-center font-black italic uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}

                <div className="flex flex-col gap-3">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="glass-button-primary w-full py-5 flex items-center justify-center gap-3 text-[10px] font-black tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-500/20"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                      <span>{step === 'phone' ? 'KOD YUBORISH' : step === 'otp' ? 'TASDIQLASH' : 'KIRISH'}</span>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setMethod('selection'); setStep('phone'); setError(null); }}
                    className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors py-2"
                  >
                    ORQAGA QAYTISH
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && method === 'selection' && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={24} />
          </div>
        )}
      </motion.div>
    </div>
  );
};
