import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

console.log('Firebase attempting to initialize with Project ID:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with experimentalForceLongPolling to avoid WebSocket issues in sandboxed environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection every time
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const logout = () => signOut(auth);

export const syncUserToFirestore = async (user: any) => {
  if (!user) return;
  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, {
    uid: user.uid,
    email: user.email,
    username: user.displayName || user.email.split('@')[0],
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserToFirestore(result.user);
    return result;
};
