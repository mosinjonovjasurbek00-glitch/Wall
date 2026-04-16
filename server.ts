import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy route to handle CORS-free downloads
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;

    if (!imageUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': new URL(imageUrl).origin,
        },
        timeout: 20000,
      });

      const contentType = response.headers["content-type"] || "image/jpeg";
      
      // Set CORS headers so the browser can read the data
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", contentType);
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).send("Proxy error");
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
