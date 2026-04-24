import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Language, useTranslation } from '../i18n';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export default function ContactForm({ isOpen, onClose, language = 'uz' }: ContactFormProps) {
  const t = useTranslation(language);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'messages'), {
        name,
        email,
        contact,
        message,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setContact('');
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error("Message send error:", err);
      setError(t('errorMessageSend'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-[#0a0a0a]/90 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden shadow-red-900/20"
          >
            {/* Decorative background blur */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="p-8 sm:p-12 relative z-10">
              <div className="flex items-start justify-between mb-10">
                <div className="flex flex-col">
                  <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                    <span className="w-2 h-8 bg-red-600 rounded-full inline-block" />
                    {t('contactFormTitle')}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-3 ml-5">{t('contactFormDesc')}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-colors backdrop-blur-md"
                >
                  <X size={24} />
                </button>
              </div>

              {success ? (
                <div className="py-16 text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_50px_rgba(220,38,38,0.2)]"
                  >
                    <CheckCircle className="text-red-500 w-12 h-12" />
                  </motion.div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-white">{t('messageSent')}</h3>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-widest leading-relaxed max-w-sm mx-auto">{t('messageSentDesc')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('yourName')}</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-red-500 focus:bg-white/10 transition-all outline-none text-white font-medium placeholder:text-slate-600" 
                        placeholder={t('namePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Email</label>
                      <input 
                        type="email" 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-red-500 focus:bg-white/10 transition-all outline-none text-white font-medium placeholder:text-slate-600" 
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('telegramOrPhone')}</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm focus:border-red-500 focus:bg-white/10 transition-all outline-none text-white font-medium placeholder:text-slate-600" 
                      placeholder={t('contactPlaceholder')}
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('messageText')}</label>
                    <textarea 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl h-40 px-6 py-5 text-sm focus:border-red-500 focus:bg-white/10 transition-all outline-none text-white font-medium placeholder:text-slate-600 resize-none custom-scrollbar" 
                      placeholder={t('messagePlaceholder')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-400 text-xs font-bold uppercase tracking-widest bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {error}
                    </motion.div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-red-600 hover:bg-red-500 text-white rounded-2xl h-16 font-black text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none group mt-8"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <span className="mt-0.5">{t('send')}</span>
                        <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
