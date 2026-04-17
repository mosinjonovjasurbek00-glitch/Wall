import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const TELEGRAM_GATEWAY_TOKEN = process.env.TELEGRAM_GATEWAY_API_KEY || "AAGLOAAA8LUpoOALxkhqzB3NTQ8JPdXNShGuw9ZR6g-J4Q";

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

  // Telegram Gateway: Send Verification Message
  app.post("/api/telegram/send-otp", async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Phone number required" });

    try {
      console.log("Sending OTP to:", phoneNumber);
      const response = await axios.post(
        "https://gatewayapi.telegram.org/sendVerificationMessage",
        {
          phone_number: phoneNumber,
          code_length: 6,
          ttl: 300 // 5 minutes
        },
        {
          headers: {
            "Authorization": `Bearer ${TELEGRAM_GATEWAY_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
      console.log("Telegram Send Response:", response.data);
      res.json(response.data);
    } catch (error: any) {
      console.error("Telegram Send OTP error details:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to send OTP" });
    }
  });

  // Telegram Gateway: Check Verification Code
  app.post("/api/telegram/verify-otp", async (req, res) => {
    const { phoneNumber, requestId, code } = req.body;
    if (!phoneNumber || !requestId || !code) return res.status(400).json({ error: "Missing parameters" });

    try {
      console.log("Verifying OTP:", { phoneNumber, requestId, code });
      const response = await axios.post(
        "https://gatewayapi.telegram.org/checkVerificationStatus",
        {
          phone_number: phoneNumber,
          request_id: requestId,
          code: code
        },
        {
          headers: {
            "Authorization": `Bearer ${TELEGRAM_GATEWAY_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
      console.log("Telegram Verify Response:", response.data);
      res.json(response.data);
    } catch (error: any) {
      console.error("Telegram Verify OTP error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to verify OTP" });
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
