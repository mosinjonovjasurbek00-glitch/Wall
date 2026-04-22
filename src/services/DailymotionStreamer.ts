import axios from "axios";

export const dailymotionStreamer = {
  async getDirectUrl(dmUrl: string): Promise<string | null> {
    try {
      const match = dmUrl.match(/dailymotion\.com\/(?:video|hub)\/([a-zA-Z0-9]+)/);
      if (!match) return null;
      
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
