import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rumbleStreamer } from '../../src/services/RumbleStreamer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;
  const format = req.query.format as string;
  if (!url) return res.status(400).send("URL is required");

  try {
    const directUrl = await rumbleStreamer.getDirectUrl(url);
    if (directUrl) {
       if (format === 'json') {
         return res.json({ url: directUrl });
       }
       res.redirect(directUrl);
    } else {
       if (format === 'json') {
         return res.json({ error: "Could not find direct video URL" });
       }
       res.status(404).send("Could not find direct video URL for this Rumble link");
    }
  } catch (error) {
    if (format === 'json') {
       return res.json({ error: "Rumble extractor error" });
    }
    console.error("Rumble extractor error:", error);
    res.status(500).send("Rumble extractor error");
  }
}
