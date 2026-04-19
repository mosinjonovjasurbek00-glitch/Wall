import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithCustomToken } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, onMessage } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

console.log('Firebase attempting to initialize with Project ID:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with experimentalForceLongPolling to avoid WebSocket issues in sandboxed environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const googleProvider = new GoogleAuthProvider();

// Listener for foreground notifications
onMessage(messaging, (payload) => {
  console.log('Foreground message received:', payload);
});

// Service Worker Registration for FCM
export const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(err => {
                    console.error('Service Worker registration failed:', err);
                });
        });
    }
};

// Force account selection every time
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const logout = () => signOut(auth);

export { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithCustomToken };

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

// Test connection on boot as recommended
async function testConnection() {
  try {
    console.log('Testing Firestore connection to database:', firebaseConfig.firestoreDatabaseId || "(default)");
    // Attempting a simple read to check connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
    console.log('Firebase connection successful');
  } catch (error: any) {
    if (error.code === 'unavailable') {
      console.error("Firestore is unavailable [code=unavailable].");
      console.warn("Possible causes: 1) Internet connection issue, 2) Firestore database not initialized in Firebase console, 3) Incorrect Database ID.");
      console.info("Using Database ID:", firebaseConfig.firestoreDatabaseId || "(default)");
    } else if (error.code === 'permission-denied') {
      console.warn("Firestore connection check failed with Permission Denied. This is expected if security rules are tight, but suggests the database IS reachable.");
    } else {
      console.error("Firebase connection test failed:", error.message, error.code);
    }
  }
}
testConnection();
