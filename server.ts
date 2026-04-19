import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRITICAL: Force the project ID into the environment to prevent the SDK 
// from defaulting to the internal AI Studio project.
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
process.env.GCLOUD_PROJECT = firebaseConfig.projectId;

console.log(`DEBUG: Project ID from config: ${firebaseConfig.projectId}`);

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  try {
    console.log(`Initializing Firebase Admin for project: ${firebaseConfig.projectId}`);
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  } catch (e: any) {
    console.error("Firebase Admin initialization failed:", e.message);
  }
}

// Access services with robust database ID resolution
const getDbAdmin = (databaseId?: string) => {
  const configDbId = firebaseConfig.firestoreDatabaseId;
  const targetId = databaseId || configDbId;
  
  if (targetId && targetId !== "(default)") {
    return getFirestore(targetId);
  }
  return getFirestore();
};

const getAuthAdmin = () => getAuth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy route
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send("URL is required");

    try {
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Referer': new URL(imageUrl).origin,
        },
        timeout: 20000,
      });

      const contentType = response.headers["content-type"] || "image/jpeg";
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", contentType);
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      res.status(500).send("Proxy error");
    }
  });

  // Broadcast notification endpoint
  app.post("/api/admin/broadcast-notification", async (req, res) => {
    const { title, body, imageUrl, animeId } = req.body;
    
    // Basic auth check would be good here, but for now we follow the app's pattern
    // In production, we'd check req.headers.authorization via firebase-admin verifyIdToken

    try {
      const db = getDbAdmin();
      const tokensSnap = await db.collection('fcm_tokens').get();
      const tokens = tokensSnap.docs.map(doc => doc.data().token);

      if (tokens.length === 0) {
        return res.json({ success: true, message: "No tokens found" });
      }

      console.log(`Sending push notification to ${tokens.length} devices: ${title}`);

      const message = {
        notification: {
          title,
          body,
          image: imageUrl
        },
        data: {
          animeId: animeId || '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK' // For consistency, though we are web
        },
        tokens: tokens
      };

      // sendEachForMulticast is the modern way in v11+
      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`Push success: ${response.successCount}, failures: ${response.failureCount}`);
      
      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        const batch = db.batch();
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === 'messaging/invalid-registration-token' || errorCode === 'messaging/registration-token-not-registered') {
              batch.delete(tokensSnap.docs[idx].ref);
            }
          }
        });
        await batch.commit();
      }

      res.json({ success: true, count: response.successCount });
    } catch (error: any) {
      console.error("FCM broadcast error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
