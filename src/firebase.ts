import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// User provided Firebase configuration
const firebaseConfigManual = {
  apiKey: "AIzaSyCnFetX9GW7iqnFuRl5cMQbyYGNmXuzaFI",
  authDomain: "gen-lang-client-0911911936.firebaseapp.com",
  projectId: "gen-lang-client-0911911936",
  storageBucket: "gen-lang-client-0911911936.firebasestorage.app",
  messagingSenderId: "235617616943",
  appId: "1:235617616943:web:df5c9565895d0783acf2da"
};

const firebaseParams = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigManual.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigManual.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigManual.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigManual.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigManual.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigManual.appId,
};

const app = initializeApp(firebaseParams);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection every time
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
