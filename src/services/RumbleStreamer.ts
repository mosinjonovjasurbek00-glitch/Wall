import axios from "axios";

export const rumbleStreamer = {
  async getDirectUrl(rumbleUrl: string): Promise<string | null> {
    try {
      // 1. Normalize URL to embed format if it's a watch link
      let embedUrl = rumbleUrl;
      if (rumbleUrl.includes('rumble.com/') && !rumbleUrl.includes('/embed/')) {
         // This is harder because watch links need the specific embed ID which isn't always the slug
         // For now, assume users provide embed links or we handle simple conversions
         // Typical watch: https://rumble.com/v2l7u1q-zulmat-farzandi.html
         // Typical embed: https://rumble.com/embed/v2l7u1q/
         const match = rumbleUrl.match(/rumble\.com\/(v[a-zA-Z0-9]+)/);
         if (match) {
            embedUrl = `https://rumble.com/embed/${match[1]}/`;
         }
      }

      console.log(`[Rumble] Fetching direct URL for: ${embedUrl}`);

      const response = await axios.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Referer': 'https://rumble.com/'
        },
        timeout: 10000
      });

      const html = response.data;
      let finalUrl: string | null = null;

      // Method 1: application/ld+json
      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (ldMatch) {
        try {
          const json = JSON.parse(ldMatch[1]);
          const data = Array.isArray(json) ? json[0] : json;
          if (data.contentUrl) finalUrl = data.contentUrl;
        } catch (e) {
          console.warn("[Rumble] LD+JSON parse failed");
        }
      }

      if (!finalUrl) {
        // Method 2: Look for mp4 or m3u8 in the serialized config or scripts
        const videoMatch = html.match(/https?:\/\/[^"']+\.(?:mp4|m3u8)(?:\?[^"']*)?/);
        if (videoMatch) finalUrl = videoMatch[0];
      }

      if (!finalUrl) {
        // Method 3: Look for resolution based sources in Rumble's player init
        const sourceMatch = html.match(/"(?:mp4|m3u8)":\s*{\s*"[^"]+":\s*{\s*"url":\s*"([^"]+)"/);
        if (sourceMatch) finalUrl = sourceMatch[1].replace(/\\/g, '');
      }

      if (!finalUrl) {
        // Method 4: Generic search for video sources in scripts
        const genericMatch = html.match(/"url":\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"/);
        if (genericMatch) finalUrl = genericMatch[1].replace(/\\/g, '');
      }

      if (finalUrl) {
        console.log(`[Rumble] Successfully extracted URL: ${finalUrl.substring(0, 50)}...`);
        return finalUrl;
      }

      console.error("[Rumble] Could not find any video source in HTML");
      return null;
    } catch (error) {
      console.error("[Rumble] Error extracting video URL:", error);
      return null;
    }
  }
};
