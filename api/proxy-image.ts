import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(response.data));
  } catch (error: any) {
    console.error("Proxy error:", error.message);
    res.status(500).send("Proxy error");
  }
}
