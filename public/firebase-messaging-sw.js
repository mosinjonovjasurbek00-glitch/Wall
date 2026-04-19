importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// These values are often filled in by the build process or manually.
// For the AI Studio environment, we can fetch them or assume they are available.
// However, the Service Worker needs the config to initialize.
// We will use a generic "fetch config" strategy or expect the user to update this.
// For now, we will leave placeholders that the user can fill, or better yet,
// we can try to use the ones from the app if we can inject them.

// NOTE TO USER: These values are automatically filled from your firebase-applet-config.json
const firebaseConfig = {
    projectId: "stone-dispatch-477517-k6",
    appId: "1:4531945421:web:d8e41083a284f8ba8e0e84",
    apiKey: "AIzaSyBPdy3VuZF_5whxL_drqqqtt8b5n5IUxbo",
    authDomain: "stone-dispatch-477517-k6.firebaseapp.com",
    storageBucket: "stone-dispatch-477517-k6.firebasestorage.app",
    messagingSenderId: "4531945421"
};

if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: payload.notification.image || '/icon.png', // Fallback icon
            data: payload.data
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}
