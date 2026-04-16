import * as React from 'react';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Navbar from './components/Navbar';
import Gallery from './components/Gallery';
import AdminPanel from './components/AdminPanel';
import ContactForm from './components/ContactForm';
import { FallingLeaves } from './components/FallingLeaves';
import { Loader2, ShieldAlert, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [view, setView] = useState<'gallery' | 'admin'>('gallery');
  const [showContact, setShowContact] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    async function checkUserRole() {
      if (user) {
        console.log("Logged in as:", user.email);
        setCheckingRole(true);
        try {
          const isDefaultAdmin = user.email === "mosinjonovjasurbek00@gmail.com";
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const currentRole = userDoc.data().role;
            // If the email matches admin but role is not admin, update it
            if (isDefaultAdmin && currentRole !== 'admin') {
              await setDoc(userDocRef, { ...userDoc.data(), role: 'admin' }, { merge: true });
              setIsAdmin(true);
            } else {
              setIsAdmin(currentRole === 'admin');
            }
          } else {
            // New user, check if they are the default admin
            const role = isDefaultAdmin ? 'admin' : 'user';
            
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              role: role
            });
            setIsAdmin(isDefaultAdmin);
          }
        } catch (error) {
          console.error("Role check error:", error);
        } finally {
          setCheckingRole(false);
        }
      } else {
        setIsAdmin(false);
        setCheckingRole(false);
        setView('gallery');
      }
    }

    checkUserRole();
  }, [user]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={24} />
        </div>
        <p className="text-slate-400 font-medium animate-pulse">Initializing Lumina...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none z-0" style={{ animationDelay: '2s' }} />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-600/5 rounded-full blur-[100px] animate-pulse pointer-events-none z-0" style={{ animationDelay: '4s' }} />

      <div className="relative z-10">
        <FallingLeaves />
        <Navbar 
          isAdmin={isAdmin} 
          view={view} 
          setView={setView} 
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        
        <main>
        {view === 'gallery' ? (
          <Gallery 
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        ) : isAdmin ? (
          <AdminPanel />
        ) : (
          <div className="pt-40 flex flex-col items-center justify-center px-6">
            <div className="glass p-12 rounded-3xl text-center max-w-md">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="text-red-400 w-10 h-10" />
              </div>
              <h2 className="text-3xl font-display font-bold mb-4">Access Denied</h2>
              <p className="text-slate-400 mb-8">
                You don't have administrative privileges to access this area. 
                Please return to the gallery.
              </p>
              <button 
                onClick={() => setView('gallery')}
                className="glass-button-primary w-full"
              >
                Back to Gallery
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 bg-slate-700 rounded-lg" />
            <span className="font-display font-bold">Lumina Gallery</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 Lumina Glass Gallery. All rights reserved.
          </p>
          <div className="flex gap-6 text-slate-500 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <button 
              onClick={() => setShowContact(true)}
              className="hover:text-white transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </footer>

      <ContactForm isOpen={showContact} onClose={() => setShowContact(false)} />
    </div>
  </div>
  );
}
