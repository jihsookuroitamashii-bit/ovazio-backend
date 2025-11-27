// backend/server.js
// Express + discord.js minimal working example that exposes:
// GET /api/channel/:id/messages
// Requires env vars: DISCORD_BOT_TOKEN, CHANNELS_WHITELIST, FRONTEND_ORIGIN

import express from "express";
import cors from "cors";
import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3001;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Discord client (only message read intents)
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let ready = false;
client.once("ready", () => {
  console.log("Discord bot connected as", client.user?.tag);
  ready = true;
});

// Login - if token is missing this will throw and appear in logs
if (!process.env.DISCORD_BOT_TOKEN) {
  console.warn("DISCORD_BOT_TOKEN is not set — the bot will not connect until you set the variable.");
} else {
  client.login(process.env.DISCORD_BOT_TOKEN).catch((err) => {
    console.error("Failed to login Discord bot:", err?.message || err);
  });
}

// Root test endpoint
app.get("/", (req, res) => {
  res.send("Backend do Reino de Klintar ativo");
});

// API: get last messages from a channel
app.get("/api/channel/:id/messages", async (req, res) => {
  const channelId = req.params.id;

  // whitelist protection
  const whitelist = (process.env.CHANNELS_WHITELIST || "").split(",").map(s => s.trim()).filter(Boolean);
  if (whitelist.length && !whitelist.includes(channelId)) {
    return res.status(403).json({ error: "Canal não permitido (whitelist)" });
  }

  if (!ready) {
    return res.status(503).json({ error: "Bot do Discord não pronto" });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased?.()) {
      return res.status(404).json({ error: "Canal não encontrado ou não é textual" });
    }

    const fetched = await channel.messages.fetch({ limit: 50 });
    const messages = Array.from(fetched.values()).map(m => ({
      id: m.id,
      author: m.author?.username || "Unknown",
      content: m.content,
      timestamp: m.createdTimestamp,
    }));

    // order ascending (oldest first)
    messages.sort((a, b) => a.timestamp - b.timestamp);

    return res.json({ channelId, messages });
  } catch (err) {
    console.error("Erro ao buscar mensagens:", err?.message || err);
    return res.status(500).json({ error: "Erro interno ao buscar mensagens" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
