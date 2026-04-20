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
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg glass rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="p-8 sm:p-12">
              <div className="flex items-center justify-between mb-10">
                <div className="flex flex-col">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">{t('contactFormTitle')}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">{t('contactFormDesc')}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {success ? (
                <div className="py-16 text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-8"
                  >
                    <CheckCircle className="text-indigo-400 w-12 h-12" />
                  </motion.div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 italic">{t('messageSent')}</h3>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-widest leading-relaxed">{t('messageSentDesc')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">{t('yourName')}</label>
                      <input 
                        type="text" 
                        required 
                        className="glass-input w-full h-14" 
                        placeholder={t('namePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Email</label>
                      <input 
                        type="email" 
                        required 
                        className="glass-input w-full h-14" 
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">{t('telegramOrPhone')}</label>
                    <input 
                      type="text" 
                      required 
                      className="glass-input w-full h-14" 
                      placeholder={t('contactPlaceholder')}
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">{t('messageText')}</label>
                    <textarea 
                      required 
                      className="glass-input w-full h-40 resize-none py-5" 
                      placeholder={t('messagePlaceholder')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 p-4 rounded-2xl border border-red-500/20"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="glass-button-primary w-full flex items-center justify-center gap-4 py-6 shadow-2xl shadow-indigo-600/20 group"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{submitting ? t('sending') : t('send')}</span>
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
