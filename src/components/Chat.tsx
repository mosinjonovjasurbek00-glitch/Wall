import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { Send, Smile, Image as ImageIcon, X, ShieldCheck, MessageSquare, Trash2, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  photoURL?: string;
  content: string;
  type: 'text' | 'sticker';
  role: 'admin' | 'user';
  createdAt: any;
}

const STICKERS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZTViZTRiZTViZTRiZTViZTRiZTViZTRiZTViZTRiZTViZTRiZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/vYguXJRRH1K72vU49O/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZTViZTRiZTViZTRiZTViZTRiZTViZTRiZTViZTRiZTViZTRiZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L3X6P8P9vP9P9P9P9P9P9P9P/giphy.gif",
  "https://user-images.githubusercontent.com/14011726/94132137-7d4fc100-fe7c-11ea-8512-69f90cb65e48.gif",
  "https://i.pinimg.com/originals/e5/93/ab/e593ab0589d5f1b3e593ab0589d5f1b3.gif",
  "https://i.pinimg.com/originals/bf/ec/f3/bfecf301cc9a9cc18ca3f24bf711a3d8.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/5GovlLsSaTyvEHD0W/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/13gvXfEVPEpY6A/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/uA8W2fBYT_fS8/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/D8BfInYy0B12U/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/X7OOnF962Xm7e/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/12p7LzCidC7u1O/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKLv5W3zXlJjSJG/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKMGfN5XUo1XF5e/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKv86U3W9C_F9Lq/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lTfuxN7L3hYvXa/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lU3u7zX1lTeyxG/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/26BRv0ThflsHCqLxS/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKDkDbIDJieKbVm/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKPNpL6vUnf_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41m3WInDvx9e5R6g/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKD0E0xWvNbUnle/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFs_na_S7J2F9Y_fS8/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lYm3N7l1fK0zK0/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lYm3N7l1fK0zK0/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKD0E0xWvNbUnle/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lXm6O7R9P_W_6w/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKR7G1P5a_N_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKPNpL6vUnf_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKPBfV6YvP_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKDkDbIDJieKbVm/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41m1WInDvx9e5R6g/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKD0E0xWvNbUnle/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFs_na_S7J2F9Y_fS8/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lYm3N7l1fK0zK0/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lXm6O7R9P_W_6w/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKR7G1P5a_N_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKPNpL6vUnf_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKPBfV6YvP_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKDkDbIDJieKbVm/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41m1WInDvx9e5R6g/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKD0E0xWvNbUnle/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFs_na_S7J2F9Y_fS8/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lYm3N7l1fK0zK0/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFs_na_S7J2F9Y_fS8/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKD0E0xWvNbUnle/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41lXm6O7R9P_W_6w/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKR7G1P5a_N_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKPNpL6vUnf_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKPBfV6YvP_9mM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKDkDbIDJieKbVm/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdidmN2ZWp2ZzVqbmVpY3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4Y3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l41m1WInDvx9e5R6g/giphy.gif"
];

const EMOJIS = [
  "😀", "😂", "🥰", "😎", "🤔", "😅", "🔥", "✨", "🙌", "👍", 
  "❤️", "💔", "💀", "🎉", "👀", "👋", "😭", "😤", "😡", "😱"
];

export default function Chat() {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPicker, setShowPicker] = useState<'none' | 'emojis' | 'stickers'>('none');
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("Current User:", user?.email);
    console.log("Is Admin:", isAdminUser);
  }, [user, isAdminUser]);

  useEffect(() => {
    const q = query(
      collection(db, 'chat_messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs.reverse());
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const isAdmin = user.email?.toLowerCase() === "mosinjonovjasurbek00@gmail.com";
      setIsAdminUser(isAdmin);
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string, type: 'text' | 'sticker' = 'text') => {
    if (!user || !content.trim()) return;

    try {
      await addDoc(collection(db, 'chat_messages'), {
        userId: user.uid,
        username: user.displayName || 'Foydalanuvchi',
        photoURL: user.photoURL || '',
        content: content.trim(),
        type,
        role: isAdminUser ? 'admin' : 'user',
        createdAt: serverTimestamp()
      });
      setNewMessage('');
      setShowPicker('none');
    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log("Attempting to delete message:", messageId);
      await deleteDoc(doc(db, 'chat_messages', messageId));
      setDeletingId(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Xabarni ochirishda xatolik yuz berdi: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleClearChat = async () => {
    if (!isAdminUser) return;
    
    try {
      console.log("Attempting to clear all messages");
      const q = query(collection(db, 'chat_messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      setShowConfirmClear(false);
      console.log("Chat cleared successfully");
    } catch (err) {
      console.error("Clear chat error:", err);
      alert("Chatni tozalashda xatolik yuz berdi");
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto bg-[#050505] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <MessageSquare className="text-red-500" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-white">Hamjamiyat Chat</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Jonli muloqot</span>
            </div>
          </div>
        </div>

        {isAdminUser && (
          <div className="relative">
            <button 
              onClick={() => setShowConfirmClear(!showConfirmClear)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-xl transition-all group"
            >
              <Eraser className="text-red-500 group-active:rotate-12 transition-transform" size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Tozalash</span>
            </button>
            
            <AnimatePresence>
              {showConfirmClear && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute top-full right-0 mt-2 p-4 bg-[#0a0a0a] border border-red-500/20 rounded-2xl shadow-2xl z-[100] w-64"
                >
                  <p className="text-[11px] font-bold text-red-100 mb-3 text-center">Barcha xabarlar ochiriladi. Ishonchingiz komilmi?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleClearChat}
                      className="flex-1 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-700"
                    >
                      Ha, ochirish
                    </button>
                    <button 
                      onClick={() => setShowConfirmClear(false)}
                      className="flex-1 py-2 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white/10"
                    >
                      Yoq
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={cn(
              "flex items-start gap-3",
              msg.userId === user?.uid ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 bg-[#111] shadow-xl">
              <img src={msg.photoURL || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            
            <div className={cn(
              "flex flex-col max-w-[80%] group",
              msg.userId === user?.uid ? "items-end" : "items-start"
            )}>
              <div className="flex flex-col gap-0.5 mb-1.5">
                {msg.role === 'admin' && (
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500 text-left mb-0.5">
                    Admin
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    msg.role === 'admin' ? "text-red-500" : "text-slate-500"
                  )}>
                    {msg.username}
                  </span>
                  {msg.role === 'admin' && (
                    <ShieldCheck size={12} className="text-red-500" />
                  )}
                </div>
              </div>

              <div className="relative">
                <div className={cn(
                  "p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-lg",
                  msg.type === 'sticker' ? "bg-transparent p-0 shadow-none" : 
                  msg.role === 'admin' ? "bg-red-950/30 border border-red-500/20 text-red-50" :
                  msg.userId === user?.uid ? "bg-red-600 text-white rounded-tr-none" : "bg-[#111] border border-white/5 text-slate-200 rounded-tl-none"
                )}>
                  {msg.type === 'sticker' ? (
                    <img src={msg.content} alt="sticker" className="w-32 h-32 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    msg.content
                  )}
                </div>
                
                {(msg.userId === user?.uid || isAdminUser) && (
                  <div className="absolute -top-4 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {deletingId === msg.id ? (
                      <div className="flex items-center gap-1 bg-black/90 border border-red-500/30 rounded-lg p-1 animate-in slide-in-from-right-2">
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase rounded"
                        >
                          Ha
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-0.5 bg-white/10 text-white text-[9px] font-black uppercase rounded"
                        >
                          Yoq
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeletingId(msg.id)}
                        className="p-1.5 bg-black/80 border border-white/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <span className="text-[8px] font-bold text-slate-600 uppercase mt-1.5 tracking-tighter">
                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 sm:p-6 bg-white/[0.01] border-t border-white/5 relative backdrop-blur-xl">
        {!user ? (
          <div className="flex items-center justify-center p-4 bg-red-600/10 rounded-2xl border border-red-600/20">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Xabar yozish uchun tizimga kiring</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setShowPicker(prev => prev === 'emojis' ? 'none' : 'emojis')}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  showPicker === 'emojis' ? "bg-red-600/20 text-red-500" : "bg-white/5 text-slate-400 hover:text-white"
                )}
              >
                <Smile size={20} />
              </button>
              <button 
                onClick={() => setShowPicker(prev => prev === 'stickers' ? 'none' : 'stickers')}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  showPicker === 'stickers' ? "bg-red-600/20 text-red-500" : "bg-white/5 text-slate-400 hover:text-white"
                )}
              >
                <ImageIcon size={20} />
              </button>
            </div>
            
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Xabar yozing..."
                className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-medium focus:outline-none focus:bg-white/10 transition-all text-white pr-12"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(newMessage)}
              />
              <button 
                onClick={() => handleSendMessage(newMessage)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center hover:bg-red-500 transition-all shadow-lg"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Picker */}
        <AnimatePresence>
          {showPicker !== 'none' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-6 right-6 mb-4 p-5 bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  {showPicker === 'stickers' ? 'Stikerlar' : 'Emoji'}
                </span>
                <button onClick={() => setShowPicker('none')}>
                  <X size={14} className="text-slate-500 hover:text-white" />
                </button>
              </div>

              {showPicker === 'stickers' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto no-scrollbar pb-2">
                  {STICKERS.map((sticker, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSendMessage(sticker, 'sticker')}
                      className="aspect-square rounded-2xl bg-white/5 hover:bg-white/10 p-2 transition-all group overflow-hidden"
                    >
                      <img src={sticker} alt="sticker" className="w-full h-full object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-56 overflow-y-auto no-scrollbar pb-2">
                  {EMOJIS.map((emoji, idx) => (
                    <button 
                      key={idx}
                      onClick={() => addEmoji(emoji)}
                      className="text-2xl aspect-square flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
