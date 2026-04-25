import axios from "axios";

export const dailymotionStreamer = {
  async getDirectUrl(dmUrl: string): Promise<string | null> {
    try {
      // Handle standard URLs: dailymotion.com/video/ID
      let match = dmUrl.match(/dailymotion\.com\/(?:video|hub)\/([a-zA-Z0-9]+)/);
      
      // Handle embed/player URLs: dailymotion.com/embed/video/ID or geo.dailymotion.com/player.html?video=ID
      if (!match) {
        match = dmUrl.match(/dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/);
      }
      if (!match) {
        match = dmUrl.match(/geo\.dailymotion\.com\/player\.html\?video=([a-zA-Z0-9]+)/);
      }
      // Handle short URLs
      if (!match) {
        match = dmUrl.match(/dai\.ly\/([a-zA-Z0-9]+)/);
      }
      
      if (!match) {
        console.warn("[Dailymotion] Could not extract ID from URL:", dmUrl);
        return null;
      }
      
      const videoId = match[1];
      const apiUrl = `https://www.dailymotion.com/player/metadata/video/${videoId}`;
      
      const response = await axios.get(apiUrl);
      const qualities = response.data.qualities;
      
      // Get highest quality available
      const bestQuality = qualities['1080'] || qualities['720'] || qualities['480'] || Object.values(qualities)[0];
      if (bestQuality && Array.isArray(bestQuality) && bestQuality[0].url) {
        return bestQuality[0].url;
      }
      
      return null;
    } catch (error) {
      console.error("[Dailymotion] Error extracting video URL:", error);
      return null;
    }
  }
};
