import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactForm({ isOpen, onClose }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
        message,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error("Message send error:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg glass rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold">Contact Us</h2>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {success ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-green-400 w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                  <p className="text-slate-400">Thank you for reaching out. We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Your Name</label>
                    <input 
                      type="text" 
                      required 
                      className="glass-input w-full" 
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      className="glass-input w-full" 
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Message</label>
                    <textarea 
                      required 
                      className="glass-input w-full h-32 resize-none" 
                      placeholder="How can we help you?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="glass-button-primary w-full flex items-center justify-center gap-2 py-4"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    {submitting ? 'Sending...' : 'Send Message'}
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
