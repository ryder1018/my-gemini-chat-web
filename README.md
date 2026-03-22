# My ChatGPT Web (Gemini Edition)

這是一個使用你自己的 Gemini API key 的聊天網頁，前端透過後端 API 轉發請求到 Gemini 模型，避免在瀏覽器暴露金鑰。

## 功能

- 聊天介面（類 ChatGPT）
- 後端呼叫 Gemini API（`@google/genai`）
- 支援自訂 `model`
- 支援自訂 `system prompt`
- `Prompt DNA Console`：用滑桿調整嚴謹度/創造度/同理度/精簡度，按「確定 DNA」套用回覆風格
- 保留本次對話歷史（前端記憶，送到後端）
- 一鍵清除對話
- `Conversation Time Capsule`：可將目前對話存成快照、後續一鍵載入與刪除
- 基本錯誤處理

## 專案結構

```text
hw1/
├─ public/
│  ├─ index.html      # 前端 UI
│  └─ app.js          # 前端聊天邏輯
├─ server.js          # Express 後端 + Gemini API 呼叫
├─ .env               # 你的 API key
├─ package.json
└─ README.md
```

## 使用方式

### 1. 安裝套件

```bash
npm install
```

### 2. 確認 `.env`

此專案支援以下任一變數名稱：

```env
GEMINI_API_KEY=your_api_key
# 或
GOOGLE_API_KEY=your_api_key
```

### 3. 啟動伺服器

```bash
npm run start
```

成功後打開：

- `http://localhost:3000`

### 4. 開始聊天

- 左側可設定 `Model`（預設 `gemini-2.5-flash`）
- 左側可設定 `System Prompt`
- 左側 `Prompt DNA Console` 調完滑桿後按 `確定 DNA`，會有套用特效並更新回覆風格
- 左側 `Conversation Time Capsule` 可儲存/載入對話快照
- 右側輸入訊息後按送出
- `Enter` 送出，`Shift + Enter` 換行

## API 路由

- `POST /api/chat`
  - request:
    - `message: string`
    - `history: Array<{ role: "user" | "assistant", content: string }>`
    - `model?: string`
    - `systemPrompt?: string`
  - response:
    - `reply: string`
    - `model: string`

- `GET /api/health`
  - 回傳服務狀態

## 後端實作重點

- 從 `.env` 讀取 Gemini key（`GEMINI_API_KEY` / `GOOGLE_API_KEY`）
- 將前端歷史紀錄轉成 Gemini `contents` 格式：
  - `user` -> `user`
  - `assistant` -> `model`
- 使用 `config.systemInstruction` 套用 system prompt
- 用 `ai.models.generateContent(...)` 取得回覆

## 為什麼要後端轉發

因為 API key 不能放在前端程式碼。若直接在瀏覽器呼叫 Gemini API，key 會被任何人看到並濫用。

## 這次完成的實作紀錄

1. 建立聊天網站的前後端架構（Express + 原生前端）。
2. 完成聊天 UI、對話歷史、送出/清除、錯誤提示。
3. 將 OpenAI 版本遷移為 Gemini 版本：
   - 將 SDK 改為 `@google/genai`
   - 後端改用 Gemini `generateContent`
   - `.env` 改讀 `GEMINI_API_KEY` / `GOOGLE_API_KEY`
   - 預設模型改為 `gemini-2.5-flash`
4. 更新 README，記錄安裝、設定與遷移內容。

## 參考文件

- Gemini API (Google AI for Developers): https://ai.google.dev/gemini-api/docs
- Google Gen AI SDK (JS): https://github.com/googleapis/js-genai
- API Key Safety（伺服器端保護金鑰）: https://ai.google.dev/gemini-api/docs/api-key
