import React, { useState, useEffect } from 'react';
import { messaging, db, auth } from '../firebase';
import { getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Bell, BellOff, BellRing, Loader2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export default function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || "BJEAsk4diK_oVV3ywRdD3LrhLf2V11nGu5iVoCdRCt7aYmzuRjAcDlmENuULnLTzrZlbYNO53KoZaeS3VCftvSU";

  useEffect(() => {
    // If permission is already granted, we might want to refresh the token
    if (permission === 'granted') {
        registerToken();
    }
  }, []);

  const registerToken = async () => {
    try {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await setDoc(doc(db, 'fcm_tokens', token), {
          token,
          userId: auth.currentUser?.uid || 'anonymous',
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Token registration failed", err);
    }
  };

  const handleToggle = async () => {
    if (!('Notification' in window)) return;
    
    if (permission === 'granted') {
        // Already granted, maybe show a message or just refresh
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
        return;
    }

    setLoading(true);
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      
      if (status === 'granted') {
        await registerToken();
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error getting notification permission:', error);
      setStatus('error');
    } finally {
      setLoading(false);
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all relative",
          permission === 'granted' 
            ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
            : permission === 'denied'
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10",
          status === 'success' && "border-green-500/40 text-green-400",
          status === 'error' && "border-red-500/40 text-red-400"
        )}
      >
        {loading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : status === 'success' ? (
          <Check size={20} />
        ) : permission === 'granted' ? (
          <BellRing size={20} />
        ) : permission === 'denied' ? (
          <BellOff size={20} />
        ) : (
          <Bell size={20} />
        )}

        {permission === 'default' && (
          <span className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
        )}
      </button>
      
      {/* Tooltip with Instructions */}
      <div className="absolute top-full mt-3 right-0 scale-0 group-hover:scale-100 transition-all origin-top-right z-[110]">
        <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl min-w-[200px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-white mb-2">
              {permission === 'granted' ? "Bildirishnomalar Aktiv" : permission === 'denied' ? "Ruxsat Bloklangan" : "Bildirishnomalar"}
            </p>
            {permission === 'denied' ? (
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed lowercase">
                Brauzer sozlamalaridan (qulf belgisi 🔒) ruxsatni yoqing va saytni yangilang.
              </p>
            ) : (
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                Yangi animelar haqida xabardor bo'lish uchun qo'ng'iroqchani bosing.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
