import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Request, Response } from "express";

import bigInt from "big-integer";

export class TelegramStreamer {
  public client: TelegramClient | null = null;
  private apiId: number;
  private apiHash: string;
  private botToken: string;
  private isConnecting: boolean = false;

  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID || "36366791");
    this.apiHash = process.env.TELEGRAM_API_HASH || "e494913ccca499ce817eba1c660b0982";
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  }

  async init() {
    console.log("[Telegram Streamer] Init chaqirildi...");
    if (!this.apiId || !this.apiHash || !this.botToken) {
      console.warn("[Telegram Streamer] Kalitlar to'liq emas. Bot token kerak.");
      return false;
    }
    if (this.client || this.isConnecting) return true;

    this.isConnecting = true;
    const stringSession = new StringSession("");
    this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    try {
      console.log("[Telegram Streamer] Telegramga ulanilmoqda...");
      await this.client.start({
        botAuthToken: this.botToken,
      });
      console.log("[Telegram Streamer] Muvaffaqiyatli ulandi!");
      this.isConnecting = false;
      return true;
    } catch (err: any) {
      console.error("[Telegram Streamer] Ulanishda xato:", err.message);
      this.client = null;
      this.isConnecting = false;
      return false;
    }
  }

  async handleStream(req: Request, res: Response) {
    if (!this.client) {
      const initialized = await this.init();
      if (!initialized || !this.client) {
         return res.status(503).send("Telegram Streaming Client ishlamayapti (Token kiritilmagan bo'lishi mumkin).");
      }
    }

    const videoUrl = req.query.url as string;
    if (!videoUrl) return res.status(400).send("No url query parameter");

    try {
      const match = videoUrl.match(/t\.me\/(?:c\/)?([a-zA-Z0-9_-]+)\/(\d+)/);
      if (!match) return res.status(400).send("Invalid Telegram URL.");

      let channelName: string | number = match[1];
      const messageId = parseInt(match[2]);

      // Handle private channels (t.me/c/12345/1)
      if (!isNaN(Number(channelName))) {
         // This is a private channel id
         channelName = Number("-100" + channelName);
      }

      const messages = await this.client.getMessages(channelName, { ids: [messageId] });
      if (!messages || messages.length === 0 || !messages[0]) {
        return res.status(404).send("Message not found or accessible. Bot kanalda admin emasmi?");
      }

      const media = messages[0].media;
      if (!media) {
        return res.status(404).send("Mediya topilmadi.");
      }

      // @ts-ignore
      const document = media.document || media.photo; 
      if (!document) {
        return res.status(404).send("Not a document/video.");
      }

      const size = document.size ? Number(document.size) : 0;
      const range = req.headers.range;

      if (!range) {
        res.setHeader("Content-Length", size);
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        
        // Return only a 200 header and first chunk if no range requested 
        // to prevent Vercel memory crash on whole download
        const iterator = this.client.iterDownload({
          file: media,
          offset: bigInt(0),
          limit: 1024 * 1024 * 2, // 2MB
          requestSize: 512 * 1024,
        });
        
        for await (const chunk of iterator) {
          if (res.closed) break;
          res.write(chunk);
        }
        res.end();
        return;
      }

      // Range parsing
      const positions = range.replace(/bytes=/, "").split("-");
      const start = parseInt(positions[0], 10);
      const end = positions[1] && positions[1] !== "" ? parseInt(positions[1], 10) : size - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      });

      console.log(`[Telegram Stream] Yuklanyapti: ${start} - ${end}`);
      
      try {
        const iterator = this.client.iterDownload({
          file: media,
          offset: bigInt(start),
          limit: chunksize,
          requestSize: 512 * 1024, // 512 KB chunk requests to Telegram
        });

        for await (const chunk of iterator) {
          if (res.closed) break;
          res.write(chunk);
        }
        res.end();
      } catch (streamErr: any) {
        console.error("IterDownload xatosi:", streamErr.message);
        if (!res.closed) res.end();
      }

    } catch (err: any) {
      console.error("[Telegram Streamer] Umumiy xato:", err.message);
      if (!res.headersSent) {
          res.status(500).send("Stream xatosi");
      } else {
          res.end();
      }
    }
  }
}

export const tgStreamer = new TelegramStreamer();
