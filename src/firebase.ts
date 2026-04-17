import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const getEnv = (key: string, fallback: string) => {
  const val = import.meta.env[key];
  return (val && val.trim() !== "") ? val : fallback;
};

const firebaseParams = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', firebaseConfig.apiKey),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId),
  appId: getEnv('VITE_FIREBASE_APP_ID', firebaseConfig.appId),
};

console.log('Firebase initialized with Project ID:', firebaseParams.projectId);

if (!firebaseParams.apiKey || firebaseParams.apiKey.includes('TODO')) {
  console.error('CRITICAL: Firebase API Key is missing or invalid!');
}

const app = initializeApp(firebaseParams);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection every time
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
