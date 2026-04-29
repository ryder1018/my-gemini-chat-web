# My Gemini Chat Web v2

一個以 Homework 01 為基礎升級的個人 AI Chatbot 專案。  
本版本加入長期記憶、多模態圖片輸入、模型自動路由、工具呼叫，以及 `One-click Summary` 摘要功能，並保留啟動導覽頁 + 聊天頁的雙階段體驗。

## v2 功能總覽

- `Long-term Memory`
  後端提供記憶儲存、讀取、刪除，並在聊天時自動注入最近的記憶內容。
- `Multimodal`
  支援上傳圖片、拖放圖片、貼上剪貼簿圖片，讓使用者可直接對圖片提問。
- `Auto Routing Between Models`
  根據訊息長度、複雜度與是否有圖片，自動在不同 Gemini 模型之間做選擇。
- `Tool Use / MCP-style Tools`
  透過 Gemini function calling 呼叫本地工具，例如時間查詢、數學計算、記憶管理與模擬搜尋。
- `Any Other Useful Function: One-click Summary`
  一鍵將目前對話整理為目標、重點、決策、待解問題與下一步。
- `Prompt DNA Console`
  透過滑桿調整 AI 的嚴謹度、創造度、同理度與精簡度。
- `Conversation Time Capsule`
  將對話快照儲存到瀏覽器本地端，之後可載入或刪除。
- `Conversation Export`
  將對話匯出成 Markdown。
- `Model Fallback / Retry`
  模型遇到 `503` / `429` 等可重試錯誤時，後端會自動重試並切換備援模型。

## 技術棧

- Frontend: HTML / CSS / Vanilla JavaScript
- Backend: Node.js + Express
- LLM SDK: `@google/genai`
- Environment: `dotenv`
- Storage:
  - Server-side memory: `data/memories.json`
  - Client-side snapshots/settings: `localStorage`

## 專案特色

- 沉浸式啟動頁（scroll 動畫、轉場、動態背景）
- ChatGPT 風格聊天介面
- 支援 Markdown 渲染
- API key 僅保存在後端
- 有基礎錯誤處理、模型 fallback 與健康檢查

## 快速開始

### 1. 環境需求

- Node.js `18+`
- 建議使用 Node.js `20+`
- npm

專案內含 `.nvmrc`，若你使用 `nvm`，可直接：

```bash
source ~/.nvm/nvm.sh
nvm use
```

### 2. 安裝套件

```bash
npm install
```

### 3. 建立 `.env`

在專案根目錄建立 `.env`：

```env
GEMINI_API_KEY=your_gemini_api_key
# 或
GOOGLE_API_KEY=your_gemini_api_key
```

### 4. 啟動專案

```bash
npm start
```

開啟：

- `http://localhost:3000`

### 5. 開發模式

```bash
npm run dev
```

## 介面操作

1. 進入首頁後向下滾動，或按 `Skip Intro`
2. 按 `Enter Chat` 進入聊天介面
3. 左側面板可設定：
   - `Model`
   - `Tool Use / MCP`
   - `System Prompt`
   - `Prompt DNA Console`
   - `Long-term Memory`
   - `Conversation Time Capsule`
4. 右側聊天區可：
   - 輸入文字訊息
   - 上傳圖片 / 拖拉圖片 / 貼上圖片
   - 匯出對話
   - 清除對話
   - 一鍵產生摘要

快捷鍵：

- `Enter`: 送出訊息
- `Shift + Enter`: 換行

## Tool Use / MCP-style Tools

目前後端定義了 5 個 function calling 工具：

| Tool | 功能 |
| --- | --- |
| `get_current_datetime` | 取得目前日期與時間 |
| `calculate` | 安全數學運算 |
| `save_memory` | 儲存記憶 |
| `recall_memories` | 搜尋記憶 |
| `web_search` | 模擬網路搜尋 |

說明：

- 這部分屬於 `Tool Use` 與 `MCP-style tool architecture`
- `web_search` 目前是模擬結果，若要進一步升級，可接 Google Custom Search / SerpAPI / Bing Search
- 後端支援多輪工具呼叫迴圈，最多 5 輪

## API

### `GET /api/health`

檢查後端是否正常執行。

Response:

```json
{ "ok": true }
```

### `GET /api/models`

取得可用模型清單。

### `GET /api/memories`

取得目前所有 long-term memories。

### `POST /api/memories`

新增記憶。

Request body:

```json
{
  "content": "User prefers concise answers.",
  "category": "preference"
}
```

### `DELETE /api/memories/:id`

刪除指定記憶。

### `POST /api/chat`

主要聊天 API。

Request body:

```json
{
  "message": "Hello",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "model": "auto",
  "systemPrompt": "You are a helpful assistant.",
  "autoRoute": true,
  "enableTools": true,
  "imageData": {
    "base64": "...",
    "mimeType": "image/png"
  }
}
```

Response example:

```json
{
  "reply": "......",
  "model": "gemini-2.5-flash",
  "autoRouted": true,
  "fallbackFrom": null,
  "toolsUsed": ["calculate"],
  "elapsed": 1520
}
```

### `POST /api/summary`

針對目前對話產生 `One-click Summary`。

Request body:

```json
{
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "model": "auto",
  "systemPrompt": "請用繁體中文",
  "autoRoute": true
}
```

Response example:

```json
{
  "summary": "## 一鍵摘要\n- **目標**：...\n- **重點**：...",
  "model": "gemini-2.5-pro",
  "autoRouted": true,
  "fallbackFrom": null,
  "elapsed": 2100
}
```

## 專案結構

```text
.
├─ public/
│  ├─ index.html           # 前端畫面、樣式、動畫
│  └─ app.js               # 前端互動、聊天流程、摘要流程
├─ data/
│  └─ memories.json        # 長期記憶資料（執行後產生）
├─ scripts/
│  └─ check-node.cjs       # Node 版本檢查
├─ server.js               # Express API、Gemini 呼叫、工具與摘要邏輯
├─ .env                    # API key（不提交）
├─ .nvmrc
├─ package.json
└─ README.md
```

## 已實作對應作業項目

1. `Long-term memory`
2. `Multimodal`
3. `Auto routing between models`
4. `Tool use / MCP-style tools`
5. `Any other useful functions: One-click Summary`

## 安全與限制

- `.env` 已被 `.gitignore` 排除
- 前端不直接呼叫 Gemini API，避免金鑰外洩
- 歷史訊息預設只保留最近 20 則送給模型
- 部分模型可能因 quota / billing / temporary overload 回傳 `429` 或 `503`
- `web_search` 目前不是正式搜尋 API

## 常見問題

### Q1: 點送出後沒反應或出現 `Failed to fetch`

- 確認你是從 `npm start` 啟動，而不是直接開 `public/index.html`
- 確認你使用的是 Node.js `18+`
- 確認 `http://localhost:3000/api/health` 能正常回傳

### Q2: 出現模型 unavailable / quota exceeded

- 檢查 Google AI Studio 的 quota / billing
- 確認 API key 對應的 project 已啟用 billing
- 稍後再試，或切換模型

### Q3: 為什麼 Tool Use 有做，但不算真正外部 MCP server？

- 目前是 `Gemini function calling + server-side tool execution`
- 若課程要求的是嚴格的 MCP protocol server integration，還需再額外抽成獨立 MCP server

## 參考資源

- Gemini API Docs: <https://ai.google.dev/gemini-api/docs>
- Gemini API Pricing: <https://ai.google.dev/gemini-api/docs/pricing>
- Gemini API Rate Limits: <https://ai.google.dev/gemini-api/docs/rate-limits>
- JS GenAI SDK: <https://github.com/googleapis/js-genai>
