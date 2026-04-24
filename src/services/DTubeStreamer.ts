import axios from "axios";

export const dtubeStreamer = {
  async getDirectUrl(dtubeUrl: string): Promise<string | null> {
    try {
      // DTube URL formats: 
      // https://d.tube/#!/v/username/hash
      // https://dtube.video/v/username/hash
      // https://d.tube/v/hash
      const hashMatch = dtubeUrl.match(/\/v\/[a-zA-Z0-9_-]+\/([a-zA-Z0-9]+)/) || 
                       dtubeUrl.match(/\/v\/([a-zA-Z0-9]{30,})/); // Direct hash if it's long enough
                       
      if (hashMatch) {
         const hash = hashMatch[1];
         // IPFS Gateway yordamida videoni direkt olish
         // d.tube uses specific IPFS gateways, we can try its official one or a public one
         return `https://ipfs.io/ipfs/${hash}`;
      }
      
      // Fallback for some dtube URLs that might be different
      if (dtubeUrl.includes('d.tube') && dtubeUrl.split('/').length >= 4) {
          const lastPart = dtubeUrl.split('/').pop();
          if (lastPart && lastPart.length > 30) return `https://ipfs.io/ipfs/${lastPart}`;
      }
      return null;
    } catch (error) {
      console.error("[DTube] Error extracting video URL:", error);
      return null;
    }
  }
};
