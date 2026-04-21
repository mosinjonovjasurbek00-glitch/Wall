import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rumbleStreamer } from '../../src/services/RumbleStreamer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("URL is required");

  try {
    const directUrl = await rumbleStreamer.getDirectUrl(url);
    if (directUrl) {
       res.redirect(directUrl);
    } else {
       res.status(404).send("Could not find direct video URL for this Rumble link");
    }
  } catch (error) {
    console.error("Rumble extractor error:", error);
    res.status(500).send("Rumble extractor error");
  }
}
