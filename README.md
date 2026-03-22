# My Gemini Chat Web

一個可直接對外展示的個人 AI 聊天網站。  
它包含「啟動導覽頁 + 聊天頁」兩段式體驗，並用後端安全串接 Gemini API。

## 專案特色

- 沉浸式啟動頁（scroll 動畫、動態數據、轉場進入聊天）
- ChatGPT 風格聊天介面
- 可自訂 `Model` 與 `System Prompt`
- `Prompt DNA Console`（滑桿調整回覆風格）
- `Conversation Time Capsule`（對話快照儲存/載入/刪除）
- API Key 僅在後端使用，不暴露在前端

## 使用技術

- Frontend: HTML / CSS / Vanilla JavaScript
- Backend: Node.js + Express
- LLM SDK: `@google/genai`
- Env 管理: `dotenv`

## 快速開始（給第一次執行的人）

### 1. 安裝需求

- Node.js `18+`（建議 `20+`）
- npm

### 2. 安裝套件

```bash
npm install
```

### 3. 建立環境變數

在專案根目錄建立 `.env`，填入任一種 key 名稱：

```env
GEMINI_API_KEY=your_gemini_api_key
# 或
GOOGLE_API_KEY=your_gemini_api_key
```

### 4. 啟動專案

```bash
npm run start
```

開啟瀏覽器：

- `http://localhost:3000`

## 介面操作說明

1. 先在啟動頁向下滾動，或按 `Skip Intro`。
2. 按 `Enter Chat` 進入聊天介面。
3. 左側可展開設定欄，調整 `Model`、`System Prompt` 與 `Prompt DNA`。
4. 右側輸入訊息後送出：
- `Enter`: 送出
- `Shift + Enter`: 換行
5. 可用 `Conversation Time Capsule` 儲存與恢復對話快照。

## API 介面

### `POST /api/chat`

Request body:

```json
{
  "message": "Hello",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "model": "gemini-2.5-flash",
  "systemPrompt": "You are a helpful assistant."
}
```

Response:

```json
{
  "reply": "......",
  "model": "gemini-2.5-flash"
}
```

### `GET /api/health`

用於檢查後端是否正常運行，成功時回傳：

```json
{ "ok": true }
```

## 專案結構

```text
.
├─ public/
│  ├─ index.html      # 前端畫面與樣式
│  └─ app.js          # 前端互動邏輯
├─ server.js          # Express API + Gemini 呼叫
├─ .env               # 本機環境變數（不提交）
├─ package.json
└─ README.md
```

## 安全說明

- `.env` 已被 `.gitignore` 排除，不會被提交。
- 前端不直接呼叫 Gemini API，改由後端轉發，避免金鑰外洩。

## 常見問題

### Q1: 啟動後沒有回覆？

- 確認 `.env` key 是否正確。
- 檢查 API key 是否有可用額度。
- 檢查後端 log 是否出現 4xx/5xx。

### Q2: Port 3000 被占用？

- 先關掉其他使用 `3000` 的程式，再重新執行 `npm run start`。

## 參考資源

- Gemini API Docs: https://ai.google.dev/gemini-api/docs
- JS GenAI SDK: https://github.com/googleapis/js-genai
