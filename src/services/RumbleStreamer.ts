import axios from "axios";

export const rumbleStreamer = {
  async getDirectUrl(rumbleUrl: string): Promise<string | null> {
    try {
      // 1. Normalize URL to embed format
      let embedUrl = rumbleUrl;
      if (rumbleUrl.includes('rumble.com/') && !rumbleUrl.includes('/embed/')) {
         const match = rumbleUrl.match(/rumble\.com\/(v[a-zA-Z0-9]+)/);
         if (match) {
            embedUrl = `https://rumble.com/embed/${match[1]}/`;
            // Preserve query params if any
            const urlObj = new URL(rumbleUrl);
            if (urlObj.search) embedUrl += urlObj.search;
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

      // Method 0: Prioritize HLS / auto streams (highest quality, contains audio)
      // Look for "hls":{"url":"..."} or "auto":{"url":"..."}
      const hlsMatch = html.match(/"(hls|auto)"\s*:\s*{\s*"url"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
      if (hlsMatch) {
         finalUrl = hlsMatch[2].replace(/\\/g, '');
      }

      // Method 1: application/ld+json
      if (!finalUrl) {
        const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (ldMatch) {
          try {
            const json = JSON.parse(ldMatch[1]);
            const dataArray = Array.isArray(json) ? json : [json];
            for (const data of dataArray) {
               if (data.contentUrl) {
                 finalUrl = data.contentUrl;
                 break;
               }
            }
          } catch (e) {
            console.warn("[Rumble] LD+JSON parse failed");
          }
        }
      }

      if (!finalUrl) {
        // Method 2: serialized logic search
        const serializedMatch = html.match(/"?u"?:\s*"([^"]+\.(?:mp4|m3u8|webm)(?:\?[^"]*)?)"/);
        if (serializedMatch) {
           finalUrl = serializedMatch[1].replace(/\\/g, '');
        }
      }

      if (!finalUrl) {
        // Method 3: Look for resolution based sources (nested JSON structure)
        // Matches: "480": {"url": "https://..."} or 480: {url: "https://..."}
        const resolutionMatch = html.match(/"\d+":\s*{\s*"url":\s*"([^"]+\.(?:mp4|m3u8|webm)(?:\?[^"]*)?)"/);
        if (resolutionMatch) finalUrl = resolutionMatch[1].replace(/\\/g, '');
      }

      if (!finalUrl) {
        // Method 4: Scan for any large JSON blocks and look for video URLs inside
        const jsonBlocks = html.match(/\{[\s\S]*?\}/g);
        if (jsonBlocks) {
          for (const block of jsonBlocks) {
             if (block.length < 50) continue; // Skip small blocks
             const urlInBlock = block.match(/"url":\s*"([^"]+\.(?:mp4|m3u8|webm)[^"]*)"/);
             if (urlInBlock) {
                finalUrl = urlInBlock[1].replace(/\\/g, '');
                break;
             }
          }
        }
      }

      if (!finalUrl) {
        // Method 5: Look for Rumble's specific keys in scripts
        // u usually points to the mp4/m3u8
        const rumbleU = html.match(/"u":\s*"([^"]+\.(?:mp4|m3u8|webm)[^"]*)"/);
        if (rumbleU) finalUrl = rumbleU[1].replace(/\\/g, '');
        
        if (!finalUrl) {
           const rumbleV = html.match(/"v":\s*"([^"]+\.(?:mp4|m3u8|webm)[^"]*)"/);
           if (rumbleV) finalUrl = rumbleV[1].replace(/\\/g, '');
        }
      }

      if (!finalUrl) {
        // Method 6: Generic search for video sources in scripts (more inclusive)
        const genericMatch = html.match(/https?:\/\/[a-zA-Z0-9.\-_/%]+\.(?:mp4|m3u8|webm)(?:\?[a-zA-Z0-9.=&_%-]*)?/);
        if (genericMatch) finalUrl = genericMatch[0];
      }

      if (finalUrl) {
         // Cleanup: handle escaped characters and HTML entities
         finalUrl = finalUrl.replace(/\\/g, '').replace(/&amp;/g, '&');
         
         // Ensure URL is absolute
         if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;
         
         console.log(`[Rumble] Successfully extracted URL: ${finalUrl.substring(0, 70)}...`);
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
