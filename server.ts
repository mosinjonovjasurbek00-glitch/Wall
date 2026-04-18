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

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA"; // Test secret

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy route to handle CORS-free downloads
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

  // --- Authentication Routes ---
  
  // Verify Turnstile token
  app.post("/api/verify-turnstile", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "Token topilmadi" });

    try {
      const params = new URLSearchParams();
      params.append('secret', TURNSTILE_SECRET_KEY);
      params.append('response', token);

      const response = await axios.post(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        params.toString(),
        { 
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded" 
          } 
        }
      );

      if (response.data.success) {
        console.log("Turnstile Verified Successfully");
        res.json({ success: true });
      } else {
        console.error("Turnstile Verification Failed:", response.data);
        res.status(400).json({ 
          success: false, 
          error: "Turnstile tasdiqlashdan o'tmadi",
          codes: response.data['error-codes'] 
        });
      }
    } catch (error: any) {
      console.error("Turnstile API Error:", error.message);
      res.status(500).json({ success: false, error: "Serverda Turnstile tekshirishda xatolik yuz berdi" });
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
