import React, { useState } from 'react';
import { XCircle, Copy, Send, MessageSquare } from 'lucide-react';

export const ShareModal = ({ isOpen, onClose, url, title, t }: { isOpen: boolean, onClose: () => void, url: string, title: string, t: any }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  const shareText = `${title} - ${t('info')}`;
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{t('share')}</h3>
          <button onClick={onClose}><XCircle size={24} /></button>
        </div>
        <div className="bg-black p-4 rounded-2xl mb-6 text-sm break-all font-mono text-slate-400">
           {url}
        </div>
        <div className="space-y-3">
          <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
             <Copy size={20} /> {copied ? t('copied') : t('copyLink')}
          </button>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-all">
             <Send size={20} /> {t('shareTelegram')}
          </a>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 p-3 bg-green-600 hover:bg-green-700 rounded-xl text-white transition-all">
             <MessageSquare size={20} /> {t('shareWhatsApp')}
          </a>
        </div>
      </div>
    </div>
  );
};
