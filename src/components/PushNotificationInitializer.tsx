import { useEffect } from 'react';
import { messaging, db, auth } from '../firebase';
import { getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || "BJEAsk4diK_oVV3ywRdD3LrhLf2V11nGu5iVoCdRCt7aYmzuRjAcDlmENuULnLTzrZlbYNO53KoZaeS3VCftvSU";

export default function PushNotificationInitializer() {
  useEffect(() => {
    // Try to initialize notifications after a short delay
    // This gives the user some time to interact with the page (optional but better for browsers)
    const timer = setTimeout(() => {
      initializeNotifications();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const registerToken = async () => {
    try {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await setDoc(doc(db, 'fcm_tokens', token), {
          token,
          userId: auth.currentUser?.uid || 'anonymous',
          updatedAt: serverTimestamp()
        });
        console.log("Push notifications registered successfully.");
      }
    } catch (err) {
      console.error("Push token registration failed:", err);
    }
  };

  const initializeNotifications = async () => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await registerToken();
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    } else if (Notification.permission === 'granted') {
      await registerToken();
    }
  };

  return null; // This component has no UI
}
