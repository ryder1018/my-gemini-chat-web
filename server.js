import dotenv from "dotenv";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const port = Number(process.env.PORT || 3000);

if (!apiKey) {
  console.warn("[warn] GEMINI_API_KEY or GOOGLE_API_KEY is missing in .env");
}

const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

function buildContents(history, userMessage) {
  const contents = normalizeHistory(history).map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  return contents;
}

function extractAssistantText(response) {
  if (typeof response?.text === "string" && response.text.trim().length > 0) {
    return response.text.trim();
  }

  const textChunks = [];

  if (Array.isArray(response?.candidates)) {
    for (const candidate of response.candidates) {
      if (!Array.isArray(candidate?.content?.parts)) {
        continue;
      }

      for (const part of candidate.content.parts) {
        if (typeof part?.text === "string") {
          textChunks.push(part.text);
        }
      }
    }
  }

  return textChunks.join("\n").trim();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  if (!client) {
    return res.status(500).json({ error: "Server API key is missing. Please check your .env file." });
  }

  const { message, history, systemPrompt, model } = req.body ?? {};

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message is required" });
  }

  const safeModel =
    typeof model === "string" && model.trim().length > 0 ? model.trim() : "gemini-2.5-flash";
  const safeSystemPrompt =
    typeof systemPrompt === "string" && systemPrompt.trim().length > 0
      ? systemPrompt.trim()
      : "";

  const payload = {
    model: safeModel,
    contents: buildContents(history, message.trim()),
  };

  if (safeSystemPrompt) {
    payload.config = {
      systemInstruction: safeSystemPrompt,
    };
  }

  try {
    const response = await client.models.generateContent(payload);

    const reply = extractAssistantText(response);

    if (!reply) {
      return res.status(502).json({ error: "Model returned no text output." });
    }

    return res.json({
      reply,
      model: safeModel,
    });
  } catch (error) {
    const rawStatus = Number(error?.status) || Number(error?.code);
    const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;

    return res.status(status).json({
      error: error?.message || "Chat request failed",
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
