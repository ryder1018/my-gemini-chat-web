import dotenv from "dotenv";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
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

app.use(express.json({ limit: "12mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ------------------------------------------------------------------ */
/*  Long-term Memory                                                  */
/* ------------------------------------------------------------------ */
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memories.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadMemories() {
  ensureDataDir();
  if (!fs.existsSync(MEMORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveMemoriesToFile(memories) {
  ensureDataDir();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

function searchMemories(query) {
  const memories = loadMemories();
  if (!query) return memories.slice(-20);
  const q = query.toLowerCase();
  return memories
    .filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q),
    )
    .slice(-10);
}

/* ------------------------------------------------------------------ */
/*  Available Models & Auto-routing                                   */
/* ------------------------------------------------------------------ */
const AVAILABLE_MODELS = [
  { id: "auto", name: "Auto (Smart Routing)", tier: "auto", description: "Automatically selects the best model" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "fast", description: "Fastest responses" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "balanced", description: "Balanced speed & quality" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "advanced", description: "Best quality & reasoning" },
];

const MODEL_FALLBACKS = {
  "gemini-2.5-flash": ["gemini-2.0-flash", "gemini-2.5-pro"],
  "gemini-2.5-pro": ["gemini-2.5-flash", "gemini-2.0-flash"],
  "gemini-2.0-flash": ["gemini-2.5-flash", "gemini-2.5-pro"],
};

function autoSelectModel(message, hasImage, historyLength) {
  const msg = message.toLowerCase();
  const len = message.length;

  const complexPatterns = [
    /\b(implement|algorithm|optimize|debug|refactor|architect|design.?pattern)\b/,
    /\b(explain.*in.?detail|analyze|compare.*contrast|evaluate|critique|prove)\b/,
    /\b(write.*code|function|class|api|database|sql|schema|migration)\b/,
    /\b(proof|theorem|derive|mathematical|integral|differential)\b/,
    /\b(essay|report|article|paper|research)\b/i,
    /```/,
  ];

  const simplePatterns = [
    /^(hi|hello|hey|你好|哈囉|嗨)/,
    /\b(thank|ok|yes|no|sure|好的?|謝謝|對|是的)\b/,
  ];

  const isComplex = complexPatterns.some((p) => p.test(msg)) || len > 800;
  const isSimple =
    simplePatterns.some((p) => p.test(msg)) && len < 80 && !hasImage;

  if (isSimple && historyLength < 6) return "gemini-2.5-flash";
  if (isComplex) return "gemini-2.5-pro";
  return "gemini-2.5-flash";
}

/* ------------------------------------------------------------------ */
/*  Tool Use / MCP-style Function Declarations                        */
/* ------------------------------------------------------------------ */
const toolDeclarations = [
  {
    name: "get_current_datetime",
    description:
      "Get the current date, time, day of week, and timezone. Use when the user asks about current time, today's date, or any time-related question.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "calculate",
    description:
      "Perform mathematical calculations. Supports basic arithmetic, percentages, powers, and standard math operations.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            "Math expression to evaluate, e.g. '2 + 3 * 4', '(100 - 20) / 4', 'Math.sqrt(144)'",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "save_memory",
    description:
      "Save important information to long-term memory so it persists across conversations. Use when the user says 'remember this', shares personal preferences, important facts, or asks you to keep something in mind.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The information to save",
        },
        category: {
          type: "string",
          enum: ["preference", "fact", "task", "note"],
          description: "Category of this memory",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall_memories",
    description:
      "Search long-term memory for previously saved information. Use when the user asks 'do you remember', references past context, or when retrieving saved preferences/facts would be helpful.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for in memory",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for current information, recent events, or facts not in training data. Use when the user asks about news, current events, live data, or when you need up-to-date information.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
      },
      required: ["query"],
    },
  },
];

function safeCalculate(expression) {
  const sanitized = expression.trim();
  if (/[;{}[\]\\'"$`]/.test(sanitized)) {
    throw new Error("Invalid characters in expression");
  }
  const result = new Function(
    `"use strict"; return (${sanitized.replace(/\b(?!Math\b)[a-zA-Z_]\w*/g, (m) => {
      if (m === "Math" || m === "E" || m === "PI") return m;
      if (["sqrt", "pow", "abs", "ceil", "floor", "log", "log2", "log10", "round", "min", "max", "sin", "cos", "tan", "atan", "atan2", "random", "trunc", "sign", "cbrt", "hypot", "exp"].includes(m)) return m;
      if (m === "e" || m === "Infinity" || m === "NaN") return m;
      throw new Error(`Disallowed identifier: ${m}`);
    })})`,
  )();
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Result is not a finite number");
  }
  return result;
}

function executeTool(name, args) {
  switch (name) {
    case "get_current_datetime":
      return {
        datetime: new Date().toISOString(),
        formatted: new Date().toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          weekday: "long",
        }),
        timezone: "Asia/Taipei",
      };

    case "calculate":
      try {
        const result = safeCalculate(args.expression || "");
        return { expression: args.expression, result };
      } catch (e) {
        return { error: e.message, expression: args.expression };
      }

    case "save_memory": {
      const memories = loadMemories();
      const entry = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        content: String(args.content || "").slice(0, 1000),
        category: args.category || "note",
        createdAt: new Date().toISOString(),
      };
      memories.push(entry);
      saveMemoriesToFile(memories);
      return { saved: true, id: entry.id };
    }

    case "recall_memories": {
      const results = searchMemories(args.query || "");
      return {
        query: args.query,
        count: results.length,
        memories: results.map((m) => ({
          content: m.content,
          category: m.category,
          createdAt: m.createdAt,
        })),
      };
    }

    case "web_search":
      return {
        query: args.query,
        note: "Web search is a demonstration. Connect a real search API (Google Custom Search, Bing, SerpAPI) for live results.",
        results: [
          {
            title: `Results for: ${args.query}`,
            snippet:
              "This is a simulated search result. In production, this tool would return real web search results.",
          },
        ],
      };

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.trim() }));
}

function normalizeSystemPrompt(systemPrompt) {
  return typeof systemPrompt === "string" && systemPrompt.trim().length > 0
    ? systemPrompt.trim()
    : "";
}

function selectModel({ message, history, model, autoRoute, hasImage }) {
  let selectedModel;
  let wasAutoRouted = false;

  if (autoRoute || model === "auto") {
    selectedModel = autoSelectModel(
      String(message || ""),
      !!hasImage,
      Array.isArray(history) ? history.length : 0,
    );
    wasAutoRouted = true;
  } else {
    selectedModel =
      typeof model === "string" && model.trim().length > 0
        ? model.trim()
        : "gemini-2.5-flash";
  }

  return { selectedModel, wasAutoRouted };
}

function buildMemoryBlock() {
  const memories = loadMemories();
  if (memories.length === 0) return "";

  const recent = memories.slice(-15);
  return (
    "\n\n[Long-term Memory — The following are facts/preferences the user previously asked you to remember]\n" +
    recent.map((m) => `- [${m.category}] ${m.content} (${m.createdAt})`).join("\n")
  );
}

function buildHistoryTranscript(history) {
  return normalizeHistory(history)
    .map((item, index) => {
      const label = item.role === "user" ? "User" : "Assistant";
      return `${index + 1}. ${label}: ${item.content}`;
    })
    .join("\n");
}

function buildSummaryPrompt(history) {
  const transcript = buildHistoryTranscript(history);
  return [
    "請總結下面的對話。",
    "請用繁體中文回覆，並嚴格使用以下 Markdown 結構。",
    "標題必須完全寫成：`## 一鍵摘要`",
    "- **目標**：",
    "- **重點**：",
    "- **決策**：",
    "- **待解決問題**：",
    "- **下一步**：",
    "內容要精簡、具體，且只能根據對話內容總結。",
    "如果某一欄沒有資訊，請寫 `None`。",
    "",
    "[Conversation Transcript]",
    transcript,
  ].join("\n");
}

function buildContents(history, userMessage, imageData) {
  const contents = normalizeHistory(history).map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));

  const userParts = [{ text: userMessage }];

  if (imageData && imageData.base64 && imageData.mimeType) {
    userParts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    });
  }

  contents.push({ role: "user", parts: userParts });
  return contents;
}

function buildToolSettings(message, options = {}) {
  const { forceSpecificTool = true } = options;
  const text = String(message || "").trim().toLowerCase();
  const hasMathPattern =
    /[\d)\]]\s*[-+*/%^]\s*[\d(\[]/.test(text) ||
    /\b(math|calculate|calculation|equation)\b/.test(text) ||
    /幫我算|計算|多少/.test(text);
  const wantsTime =
    /\b(time|date|day|timezone|clock|local time|current time)\b/.test(text) ||
    /現在幾點|幾點了|現在時間|目前時間|日期|今天幾號|星期幾|時區|電腦時間/.test(text);
  const wantsSaveMemory =
    /\bremember this|save this|memorize\b/.test(text) ||
    /記住這個|記住這件事|幫我記住|記下來/.test(text);
  const wantsRecallMemory =
    /\bdo you remember|recall|what do you know about\b/.test(text) ||
    /你記得|回想|回憶|我之前說/.test(text);
  const wantsWebSearch =
    /\b(search|look up|latest|news|current events)\b/.test(text) ||
    /搜尋|查一下|最新|新聞|近況/.test(text);

  let allowedFunctionNames = null;

  if (forceSpecificTool && wantsTime) {
    allowedFunctionNames = ["get_current_datetime"];
  } else if (forceSpecificTool && hasMathPattern) {
    allowedFunctionNames = ["calculate"];
  } else if (forceSpecificTool && wantsSaveMemory) {
    allowedFunctionNames = ["save_memory"];
  } else if (forceSpecificTool && wantsRecallMemory) {
    allowedFunctionNames = ["recall_memories"];
  } else if (forceSpecificTool && wantsWebSearch) {
    allowedFunctionNames = ["web_search"];
  }

  return {
    tools: [{ functionDeclarations: toolDeclarations }],
    toolConfig: {
      functionCallingConfig: allowedFunctionNames
        ? {
            mode: "ANY",
            allowedFunctionNames,
          }
        : {
            mode: "AUTO",
          },
    },
  };
}

function attachToolSettings(target, message, enableTools, options = {}) {
  if (enableTools === false) return;

  const toolSettings = buildToolSettings(message, options);
  target.config = {
    ...(target.config || {}),
    tools: toolSettings.tools,
    toolConfig: toolSettings.toolConfig,
  };
}

function extractAssistantText(response) {
  if (
    response &&
    typeof response.text === "string" &&
    response.text.trim().length > 0
  ) {
    return response.text.trim();
  }
  const chunks = [];
  if (response && Array.isArray(response.candidates)) {
    for (const c of response.candidates) {
      if (!c || !c.content || !Array.isArray(c.content.parts)) continue;
      for (const p of c.content.parts) {
        if (p && typeof p.text === "string") chunks.push(p.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonSafely(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractProviderError(error) {
  const rawMessage =
    error && typeof error.message === "string" ? error.message : "";
  const parsed = parseJsonSafely(rawMessage);
  const nestedError =
    parsed && parsed.error && typeof parsed.error === "object"
      ? parsed.error
      : null;

  return {
    rawMessage,
    status:
      Number(error && error.status) ||
      Number(error && error.code) ||
      Number(nestedError && nestedError.code) ||
      0,
    providerStatus:
      typeof (nestedError && nestedError.status) === "string"
        ? nestedError.status
        : "",
    message:
      typeof (nestedError && nestedError.message) === "string"
        ? nestedError.message
        : rawMessage || "Chat request failed",
  };
}

function isRetryableProviderError(details) {
  return (
    details.status === 429 ||
    details.status === 500 ||
    details.status === 503 ||
    details.providerStatus === "RESOURCE_EXHAUSTED" ||
    details.providerStatus === "UNAVAILABLE"
  );
}

function getFallbackModels(model) {
  return Array.isArray(MODEL_FALLBACKS[model]) ? MODEL_FALLBACKS[model] : [];
}

function buildUserFacingModelError(requestedModel, details) {
  const modelName = requestedModel || "目前模型";

  if (
    details.status === 429 ||
    details.providerStatus === "RESOURCE_EXHAUSTED"
  ) {
    return `${modelName} 目前無法使用，可能是 API 配額已達上限，或你的方案暫時不支援這個模型。請稍後再試，或檢查 Google AI Studio 的 quota / billing。`;
  }

  if (
    details.status === 503 ||
    details.providerStatus === "UNAVAILABLE"
  ) {
    return `${modelName} 目前流量過高，請稍後再試，或切換到 Auto / Gemini 2.0 Flash。`;
  }

  return details.message || "Chat request failed";
}

async function generateContentWithFallback(payload, requestedModel) {
  const modelsToTry = [requestedModel, ...getFallbackModels(requestedModel)];
  const triedModels = [];
  let lastDetails = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          ...payload,
          model: modelName,
        });

        return {
          response,
          model: modelName,
          fallbackFrom: modelName !== requestedModel ? requestedModel : null,
        };
      } catch (error) {
        const details = extractProviderError(error);
        lastDetails = details;
        triedModels.push({
          model: modelName,
          attempt,
          status: details.status,
          providerStatus: details.providerStatus,
        });

        if (!isRetryableProviderError(details)) {
          const fatalError = new Error(details.message || "Chat request failed");
          fatalError.status = details.status || 500;
          fatalError.userMessage = buildUserFacingModelError(
            modelName,
            details,
          );
          fatalError.details = details.rawMessage;
          throw fatalError;
        }

        if (attempt < 2) {
          await sleep(450 * attempt);
          continue;
        }
      }
    }
  }

  const fallbackError = new Error(
    buildUserFacingModelError(requestedModel, lastDetails || {}),
  );
  fallbackError.status = (lastDetails && lastDetails.status) || 503;
  fallbackError.userMessage = buildUserFacingModelError(
    requestedModel,
    lastDetails || {},
  );
  fallbackError.details = lastDetails && lastDetails.rawMessage;
  fallbackError.triedModels = triedModels;
  throw fallbackError;
}

/* ------------------------------------------------------------------ */
/*  API Routes                                                        */
/* ------------------------------------------------------------------ */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/models", (_req, res) => {
  res.json({ models: AVAILABLE_MODELS });
});

/* ---- Memory CRUD ---- */
app.get("/api/memories", (_req, res) => {
  res.json({ memories: loadMemories() });
});

app.post("/api/memories", (req, res) => {
  const body = req && req.body ? req.body : {};
  const { content, category } = body;
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "content is required" });
  }
  const memories = loadMemories();
  const entry = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    content: content.trim().slice(0, 1000),
    category: category || "note",
    createdAt: new Date().toISOString(),
  };
  memories.push(entry);
  saveMemoriesToFile(memories);
  res.json({ memory: entry });
});

app.delete("/api/memories/:id", (req, res) => {
  const memories = loadMemories();
  const filtered = memories.filter((m) => m.id !== req.params.id);
  if (filtered.length === memories.length) {
    return res.status(404).json({ error: "Memory not found" });
  }
  saveMemoriesToFile(filtered);
  res.json({ deleted: true });
});

/* ---- Enhanced Chat ---- */
app.post("/api/chat", async (req, res) => {
  if (!client) {
    return res
      .status(500)
      .json({ error: "Server API key is missing. Check .env file." });
  }

  const body = req && req.body ? req.body : {};
  const {
    message,
    history,
    systemPrompt,
    model,
    imageData,
    autoRoute,
    enableTools,
  } = body;

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message is required" });
  }

  const { selectedModel, wasAutoRouted } = selectModel({
    message,
    history,
    model,
    autoRoute,
    hasImage: !!imageData,
  });

  /* System prompt + memory context */
  const baseSP = normalizeSystemPrompt(systemPrompt);
  const memoryBlock = buildMemoryBlock();
  const fullSystemPrompt = [baseSP, memoryBlock].filter(Boolean).join("\n");

  /* Build request */
  const contents = buildContents(history, message.trim(), imageData);

  const payload = { model: selectedModel, contents };

  if (fullSystemPrompt) {
    payload.config = { systemInstruction: fullSystemPrompt };
  }

  const toolsUsed = [];
  attachToolSettings(payload, message, enableTools, { forceSpecificTool: true });

  try {
    const startTime = Date.now();
    let generation = await generateContentWithFallback(payload, selectedModel);
    let response = generation.response;
    let actualModel = generation.model;
    const fallbackFrom = generation.fallbackFrom;
    let iterations = 0;

    /* Function-calling loop */
    while (iterations < 5) {
      const candidate =
        response && Array.isArray(response.candidates)
          ? response.candidates[0]
          : null;
      if (!candidate || !candidate.content || !candidate.content.parts) break;

      const calls = candidate.content.parts.filter((p) => p.functionCall);
      if (calls.length === 0) break;

      const fnResponses = [];
      for (const part of calls) {
        const { name, args } = part.functionCall;
        toolsUsed.push(name);
        const result = executeTool(name, args || {});
        fnResponses.push({ functionResponse: { name, response: result } });
      }

      contents.push({ role: "model", parts: candidate.content.parts });
      contents.push({ role: "user", parts: fnResponses });

      const followUp = { model: selectedModel, contents };
      if (fullSystemPrompt) {
        followUp.config = { systemInstruction: fullSystemPrompt };
      }
      attachToolSettings(followUp, message, enableTools, { forceSpecificTool: false });

      generation = await generateContentWithFallback(followUp, actualModel);
      response = generation.response;
      actualModel = generation.model;
      iterations++;
    }

    const reply = extractAssistantText(response);
    const elapsed = Date.now() - startTime;

    if (!reply) {
      return res.status(502).json({ error: "Model returned no text output." });
    }

    return res.json({
      reply,
      model: actualModel,
      autoRouted: wasAutoRouted,
      fallbackFrom,
      toolsUsed: [...new Set(toolsUsed)],
      elapsed,
    });
  } catch (error) {
    const rawStatus =
      Number(error && error.status) || Number(error && error.code);
    const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
    return res
      .status(status)
      .json({
        error:
          (error && error.userMessage) ||
          (error && error.message) ||
          "Chat request failed",
        details: (error && error.details) || "",
        triedModels: (error && error.triedModels) || [],
      });
  }
});

app.post("/api/summary", async (req, res) => {
  if (!client) {
    return res
      .status(500)
      .json({ error: "Server API key is missing. Check .env file." });
  }

  const body = req && req.body ? req.body : {};
  const { history, systemPrompt, model, autoRoute } = body;
  const safeHistory = normalizeHistory(history);

  if (safeHistory.length === 0) {
    return res.status(400).json({ error: "history is required" });
  }

  const summaryPrompt = buildSummaryPrompt(safeHistory);
  const { selectedModel, wasAutoRouted } = selectModel({
    message: summaryPrompt,
    history: safeHistory,
    model,
    autoRoute,
    hasImage: false,
  });

  const baseSP = normalizeSystemPrompt(systemPrompt);
  const fullSystemPrompt = [
    baseSP,
    "You are generating a one-click summary for the user. Focus on accuracy and clarity. Do not invent details.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const startTime = Date.now();
    const generation = await generateContentWithFallback(
      {
        contents: [
          {
            role: "user",
            parts: [{ text: summaryPrompt }],
          },
        ],
        config: fullSystemPrompt
          ? { systemInstruction: fullSystemPrompt }
          : undefined,
      },
      selectedModel,
    );

    const summary = extractAssistantText(generation.response);
    const elapsed = Date.now() - startTime;

    if (!summary) {
      return res.status(502).json({ error: "Model returned no summary." });
    }

    return res.json({
      summary,
      model: generation.model,
      autoRouted: wasAutoRouted,
      fallbackFrom: generation.fallbackFrom,
      elapsed,
    });
  } catch (error) {
    const rawStatus =
      Number(error && error.status) || Number(error && error.code);
    const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
    return res.status(status).json({
      error:
        (error && error.userMessage) ||
        (error && error.message) ||
        "Summary request failed",
      details: (error && error.details) || "",
      triedModels: (error && error.triedModels) || [],
    });
  }
});

/* SPA fallback */
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
