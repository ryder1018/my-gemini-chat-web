/* ================================================================== */
/*  Elements                                                          */
/* ================================================================== */
const elements = {
  experience: document.getElementById("experience"),
  chatShell: document.getElementById("chatShell"),
  finalEntryPanel: document.getElementById("finalEntryPanel"),
  chatWrap: document.getElementById("chatWrap"),
  chatControl: document.getElementById("chatControl"),
  chatControlBody: document.getElementById("chatControlBody"),
  controlToggleBtn: document.getElementById("controlToggleBtn"),
  controlToggleText: document.getElementById("controlToggleText"),
  enterChatBtn: document.getElementById("enterChatBtn"),
  enterNowBtn: document.getElementById("enterNowBtn"),
  scrollMeter: document.getElementById("scrollMeter"),
  metricsScene: document.getElementById("metricsScene"),
  metricNumbers: document.querySelectorAll(".metric-number"),
  parallaxLayers: document.querySelectorAll(".parallax-layer[data-depth]"),
  revealNodes: document.querySelectorAll(".reveal"),
  networkCanvas: document.getElementById("networkCanvas"),

  messages: document.getElementById("messages"),
  statusText: document.getElementById("statusText"),
  typing: document.getElementById("typing"),
  modelSelect: document.getElementById("modelSelect"),
  systemPromptInput: document.getElementById("systemPromptInput"),
  enableToolsToggle: document.getElementById("enableToolsToggle"),

  dnaPanel: document.getElementById("dnaPanel"),
  dnaApplyBtn: document.getElementById("dnaApplyBtn"),
  dnaProfileLabel: document.getElementById("dnaProfileLabel"),
  dnaEffectLabel: document.getElementById("dnaEffectLabel"),
  dnaRigor: document.getElementById("dnaRigor"),
  dnaRigorValue: document.getElementById("dnaRigorValue"),
  dnaCreativity: document.getElementById("dnaCreativity"),
  dnaCreativityValue: document.getElementById("dnaCreativityValue"),
  dnaEmpathy: document.getElementById("dnaEmpathy"),
  dnaEmpathyValue: document.getElementById("dnaEmpathyValue"),
  dnaBrevity: document.getElementById("dnaBrevity"),
  dnaBrevityValue: document.getElementById("dnaBrevityValue"),
  snapshotTitleInput: document.getElementById("snapshotTitleInput"),
  saveSnapshotBtn: document.getElementById("saveSnapshotBtn"),
  snapshotList: document.getElementById("snapshotList"),

  imageUploadBtn: document.getElementById("imageUploadBtn"),
  imageFileInput: document.getElementById("imageFileInput"),
  imagePreviewBar: document.getElementById("imagePreviewBar"),
  imagePreviewThumb: document.getElementById("imagePreviewThumb"),
  imagePreviewName: document.getElementById("imagePreviewName"),
  imagePreviewSize: document.getElementById("imagePreviewSize"),
  imageClearBtn: document.getElementById("imageClearBtn"),

  memoryInput: document.getElementById("memoryInput"),
  memoryAddBtn: document.getElementById("memoryAddBtn"),
  memoryCategorySelect: document.getElementById("memoryCategorySelect"),
  memoryList: document.getElementById("memoryList"),
  memoryCount: document.getElementById("memoryCount"),

  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  summaryBtn: document.getElementById("summaryBtn"),
  clearBtn: document.getElementById("clearBtn"),
  exportBtn: document.getElementById("exportBtn"),
};

/* ================================================================== */
/*  State                                                             */
/* ================================================================== */
const state = {
  history: [],
  snapshots: [],
  memories: [],
  dna: {
    rigor: 50,
    creativity: 50,
    empathy: 50,
    brevity: 50,
    profile: "Balanced Analyst",
    instruction: "",
  },
  selectedImage: null, // { base64, mimeType, name, size }
  pending: false,
  introActive: true,
  countersAnimated: false,
  introCleanups: [],
  disposeCanvas: null,
};

const STORAGE_KEYS = {
  model: "my-chatgpt-model",
  systemPrompt: "my-chatgpt-system-prompt",
  controlOpen: "my-chatgpt-control-open",
  dna: "my-chatgpt-dna",
  snapshots: "my-chatgpt-snapshots",
  enableTools: "my-chatgpt-enable-tools",
};

const WELCOME_TEXT =
  "你好！我是你的個人聊天機器人。\n\n" +
  "**支援功能：**\n" +
  "- **多模態 (Multimodal)** — 上傳圖片並對話\n" +
  "- **長期記憶 (Long-term Memory)** — 跨對話記住重要資訊\n" +
  "- **智慧路由 (Auto Routing)** — 自動選擇最佳模型\n" +
  "- **工具呼叫 (Tool Use / MCP)** — 計算、時間查詢、記憶管理\n" +
  "- **One-click Summary** — 一鍵整理對話目標、重點與下一步\n" +
  "- **Markdown 渲染** — 支援程式碼、表格、清單等格式\n\n" +
  "在左側面板設定模型與偏好，然後開始對話吧！";

const DNA_DEFAULT = { rigor: 50, creativity: 50, empathy: 50, brevity: 50 };

const DNA_FIELDS = [
  { key: "rigor", slider: "dnaRigor", value: "dnaRigorValue" },
  { key: "creativity", slider: "dnaCreativity", value: "dnaCreativityValue" },
  { key: "empathy", slider: "dnaEmpathy", value: "dnaEmpathyValue" },
  { key: "brevity", slider: "dnaBrevity", value: "dnaBrevityValue" },
];

const SUMMARY_BUTTON_SUCCESS_MS = 980;

/* ================================================================== */
/*  Markdown Rendering                                                */
/* ================================================================== */
function initMarked() {
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }
}

function renderMarkdown(text) {
  if (typeof marked !== "undefined" && marked.parse) {
    try {
      return marked.parse(text);
    } catch {
      return escapeHtml(text).replace(/\n/g, "<br>");
    }
  }
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ================================================================== */
/*  DNA System                                                        */
/* ================================================================== */
function parseSliderValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function getDnaValuesFromUI() {
  return {
    rigor: parseSliderValue(elements.dnaRigor?.value),
    creativity: parseSliderValue(elements.dnaCreativity?.value),
    empathy: parseSliderValue(elements.dnaEmpathy?.value),
    brevity: parseSliderValue(elements.dnaBrevity?.value),
  };
}

function setSliderFill(slider, value) {
  if (!slider) return;
  const percent = Math.max(0, Math.min(100, value));
  slider.style.background = `linear-gradient(90deg, rgba(59, 231, 255, 0.92) ${percent}%, rgba(255, 255, 255, 0.09) ${percent}%)`;
}

function syncDnaUI(values) {
  for (const field of DNA_FIELDS) {
    const slider = elements[field.slider];
    const valueNode = elements[field.value];
    const value = values[field.key];
    if (slider) {
      slider.value = String(value);
      setSliderFill(slider, value);
    }
    if (valueNode) {
      valueNode.textContent = String(value);
    }
  }
}

function deriveDnaProfile(values) {
  const { rigor, creativity, empathy, brevity } = values;
  if (
    Math.abs(rigor - 50) <= 4 &&
    Math.abs(creativity - 50) <= 4 &&
    Math.abs(empathy - 50) <= 4 &&
    Math.abs(brevity - 50) <= 4
  ) {
    return "Equilibrium Resonance";
  }
  if (rigor >= 80 && brevity >= 70 && creativity <= 45) return "Precision Architect";
  if (creativity >= 80 && empathy >= 65) return "Vision Storyteller";
  if (rigor >= 70 && creativity >= 70) return "Research Maverick";
  if (empathy >= 75 && brevity <= 45) return "Insight Coach";
  if (brevity >= 85 && rigor >= 60) return "Command-Line Mentor";
  return "Balanced Analyst";
}

function buildDnaInstruction(values, profile) {
  const rigorDir =
    values.rigor >= 70
      ? "prioritize correctness, structure and explicit assumptions"
      : values.rigor <= 30
        ? "allow exploratory leaps and lightweight structure"
        : "balance rigor with flexibility";
  const creativityDir =
    values.creativity >= 70
      ? "offer novel framing and inventive examples"
      : values.creativity <= 30
        ? "prefer conventional and reliable approaches"
        : "mix practical and creative responses";
  const empathyDir =
    values.empathy >= 70
      ? "use warm, supportive wording and user-centered explanations"
      : values.empathy <= 30
        ? "keep tone objective and strictly task-focused"
        : "keep tone neutral and clear";
  const brevityDir =
    values.brevity >= 70
      ? "answer concisely with compact bullet points"
      : values.brevity <= 30
        ? "allow fuller explanations with richer context"
        : "keep medium-length explanations";

  return [
    `Profile: ${profile}.`,
    `Rigor(${values.rigor}): ${rigorDir}.`,
    `Creativity(${values.creativity}): ${creativityDir}.`,
    `Empathy(${values.empathy}): ${empathyDir}.`,
    `Brevity(${values.brevity}): ${brevityDir}.`,
  ].join(" ");
}

function detectDnaEffect(values, profile) {
  if (profile === "Equilibrium Resonance") return { type: "equilibrium", label: "Equilibrium Lock" };
  if (values.rigor >= 95 || values.creativity >= 95 || values.empathy >= 95 || values.brevity >= 95)
    return { type: "overdrive", label: "Overdrive Trigger" };
  if (values.rigor <= 5 || values.creativity <= 5 || values.empathy <= 5 || values.brevity <= 5)
    return { type: "focus", label: "Focus Lock" };
  return { type: "", label: "DNA Synced" };
}

function persistDnaSettings() {
  localStorage.setItem(
    STORAGE_KEYS.dna,
    JSON.stringify({
      rigor: state.dna.rigor,
      creativity: state.dna.creativity,
      empathy: state.dna.empathy,
      brevity: state.dna.brevity,
      profile: state.dna.profile,
      instruction: state.dna.instruction,
    }),
  );
}

function updateDnaPreview() {
  const values = getDnaValuesFromUI();
  const profile = deriveDnaProfile(values);
  syncDnaUI(values);
  if (elements.dnaProfileLabel) elements.dnaProfileLabel.textContent = profile;
}

function applyDnaSettings(options = {}) {
  const { silent = false } = options;
  const values = getDnaValuesFromUI();
  const profile = deriveDnaProfile(values);
  const instruction = buildDnaInstruction(values, profile);
  state.dna = { ...values, profile, instruction };
  if (elements.dnaProfileLabel) elements.dnaProfileLabel.textContent = profile;
  persistDnaSettings();

  if (!silent) {
    const { type, label } = detectDnaEffect(values, profile);
    if (elements.dnaEffectLabel) elements.dnaEffectLabel.textContent = label;
    if (elements.dnaPanel) {
      elements.dnaPanel.classList.remove("is-apply", "effect-equilibrium", "effect-overdrive", "effect-focus");
      void elements.dnaPanel.offsetWidth;
      elements.dnaPanel.classList.add("is-apply");
      if (type) elements.dnaPanel.classList.add(`effect-${type}`);
      setTimeout(() => {
        elements.dnaPanel.classList.remove("is-apply", "effect-equilibrium", "effect-overdrive", "effect-focus");
      }, 820);
    }
    setStatus(`DNA 已套用：${profile}`);
  }
}

function loadDnaSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.dna);
  if (!raw) {
    syncDnaUI(DNA_DEFAULT);
    applyDnaSettings({ silent: true });
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    const values = {
      rigor: parseSliderValue(parsed?.rigor),
      creativity: parseSliderValue(parsed?.creativity),
      empathy: parseSliderValue(parsed?.empathy),
      brevity: parseSliderValue(parsed?.brevity),
    };
    syncDnaUI(values);
    applyDnaSettings({ silent: true });
  } catch {
    syncDnaUI(DNA_DEFAULT);
    applyDnaSettings({ silent: true });
  }
}

function composeSystemPrompt(basePrompt) {
  const blocks = [];
  if (basePrompt) blocks.push(basePrompt);
  if (state.dna?.instruction) blocks.push(`[Prompt DNA] ${state.dna.instruction}`);
  return blocks.join("\n\n");
}

/* ================================================================== */
/*  Image Upload (Multimodal)                                         */
/* ================================================================== */
function handleImageSelect(file) {
  if (!file) return;

  const maxSize = 8 * 1024 * 1024; // 8MB
  if (file.size > maxSize) {
    setStatus("圖片太大，最大 8MB");
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    setStatus("不支援此圖片格式");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(",")[1];
    state.selectedImage = {
      base64,
      mimeType: file.type,
      name: file.name,
      size: file.size,
      dataUrl: reader.result,
    };
    showImagePreview();
  };
  reader.readAsDataURL(file);
}

function showImagePreview() {
  if (!state.selectedImage) return;
  elements.imagePreviewBar.classList.add("active");
  elements.imagePreviewThumb.src = state.selectedImage.dataUrl;
  elements.imagePreviewName.textContent = state.selectedImage.name;
  const sizeKB = (state.selectedImage.size / 1024).toFixed(1);
  elements.imagePreviewSize.textContent = `${sizeKB} KB · ${state.selectedImage.mimeType}`;
}

function clearSelectedImage() {
  state.selectedImage = null;
  elements.imagePreviewBar.classList.remove("active");
  elements.imagePreviewThumb.src = "";
  elements.imagePreviewName.textContent = "";
  elements.imagePreviewSize.textContent = "";
  if (elements.imageFileInput) elements.imageFileInput.value = "";
}

/* ================================================================== */
/*  Long-term Memory                                                  */
/* ================================================================== */
async function fetchMemories() {
  try {
    const res = await fetch("/api/memories");
    const data = await res.json();
    state.memories = Array.isArray(data.memories) ? data.memories : [];
  } catch {
    state.memories = [];
  }
  renderMemoryList();
}

function renderMemoryList() {
  if (!elements.memoryList) return;
  elements.memoryList.innerHTML = "";

  if (elements.memoryCount) {
    elements.memoryCount.textContent = `${state.memories.length} items`;
  }

  if (!state.memories.length) {
    const empty = document.createElement("p");
    empty.className = "memory-empty";
    empty.textContent = "尚無記憶。AI 會自動記住重要資訊，你也可以手動新增。";
    elements.memoryList.appendChild(empty);
    return;
  }

  for (const mem of [...state.memories].reverse().slice(0, 30)) {
    const item = document.createElement("div");
    item.className = "memory-item";

    const head = document.createElement("div");
    head.className = "memory-item-head";

    const cat = document.createElement("span");
    cat.className = "memory-item-category";
    cat.textContent = mem.category || "note";

    const delBtn = document.createElement("button");
    delBtn.className = "memory-item-delete";
    delBtn.textContent = "x";
    delBtn.dataset.id = mem.id;

    head.appendChild(cat);
    head.appendChild(delBtn);

    const content = document.createElement("p");
    content.className = "memory-item-content";
    content.textContent = mem.content;

    const time = document.createElement("p");
    time.className = "memory-item-time";
    time.textContent = new Date(mem.createdAt).toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    item.appendChild(head);
    item.appendChild(content);
    item.appendChild(time);
    elements.memoryList.appendChild(item);
  }
}

async function addMemoryManual() {
  const content = elements.memoryInput?.value.trim();
  if (!content) return;

  const category = elements.memoryCategorySelect?.value || "note";

  try {
    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, category }),
    });
    if (res.ok) {
      elements.memoryInput.value = "";
      setStatus("記憶已儲存");
      await fetchMemories();
    }
  } catch (e) {
    setStatus(`記憶儲存失敗：${e.message}`);
  }
}

async function deleteMemory(id) {
  try {
    await fetch(`/api/memories/${id}`, { method: "DELETE" });
    await fetchMemories();
    setStatus("記憶已刪除");
  } catch {
    setStatus("刪除失敗");
  }
}

/* ================================================================== */
/*  Control Panel                                                     */
/* ================================================================== */
function setControlPanelOpen(isOpen, options = {}) {
  const { persist = true } = options;
  if (!elements.chatWrap || !elements.controlToggleBtn) return;

  elements.chatWrap.classList.toggle("control-open", isOpen);
  elements.controlToggleBtn.setAttribute("aria-expanded", String(isOpen));
  elements.controlToggleBtn.setAttribute("aria-label", isOpen ? "收起左側功能" : "展開左側功能");

  if (elements.chatControlBody) {
    elements.chatControlBody.inert = !isOpen;
    elements.chatControlBody.setAttribute("aria-hidden", String(!isOpen));
  }
  if (elements.controlToggleText) {
    elements.controlToggleText.textContent = isOpen ? "收合功能" : "展開功能";
  }
  if (persist) localStorage.setItem(STORAGE_KEYS.controlOpen, isOpen ? "1" : "0");
}

function toggleControlPanel() {
  const isOpen = elements.chatWrap?.classList.contains("control-open");
  setControlPanelOpen(!isOpen);
}

function restoreControlPanelState() {
  const saved = localStorage.getItem(STORAGE_KEYS.controlOpen);
  setControlPanelOpen(saved === "1", { persist: false });
}

/* ================================================================== */
/*  Status & Pending                                                  */
/* ================================================================== */
function setStatus(text) {
  if (elements.statusText) elements.statusText.textContent = text;
}

function setSummaryButtonVisual(stateName) {
  if (!elements.summaryBtn) return;
  elements.summaryBtn.classList.remove("is-processing", "is-success");
  elements.summaryBtn.removeAttribute("aria-busy");

  if (stateName === "processing") {
    elements.summaryBtn.classList.add("is-processing");
    elements.summaryBtn.setAttribute("aria-busy", "true");
    return;
  }

  if (stateName === "success") {
    elements.summaryBtn.classList.add("is-success");
    window.setTimeout(() => {
      elements.summaryBtn?.classList.remove("is-success");
    }, SUMMARY_BUTTON_SUCCESS_MS);
  }
}

function togglePending(pending) {
  state.pending = pending;
  if (elements.sendBtn) elements.sendBtn.disabled = pending;
  if (elements.summaryBtn) elements.summaryBtn.disabled = pending;
  if (elements.typing) elements.typing.classList.toggle("on", pending);
  setStatus(pending ? "Thinking..." : "Ready");
}

function scrollToBottom() {
  if (elements.messages) elements.messages.scrollTop = elements.messages.scrollHeight;
}

/* ================================================================== */
/*  Message Rendering                                                 */
/* ================================================================== */
function renderMessage(role, content, meta = {}) {
  const node = document.createElement("article");
  node.className = `message ${role}`;
  const isSummary = role === "assistant" && (meta.isSummary || isSummaryMessage({ role, content }));

  if (isSummary) {
    node.classList.add("summary-message");
  }

  // Image in user message
  if (meta.imageDataUrl && role === "user") {
    const img = document.createElement("img");
    img.className = "msg-image";
    img.src = meta.imageDataUrl;
    img.alt = "uploaded image";
    node.appendChild(img);
  }

  // Content (markdown for assistant, plain for user)
  if (isSummary) {
    const kicker = document.createElement("div");
    kicker.className = "summary-kicker";
    kicker.textContent = "One-click Summary";
    node.appendChild(kicker);
  }

  const contentDiv = document.createElement("div");
  contentDiv.className = "msg-content";
  if (role === "assistant") {
    contentDiv.innerHTML = renderMarkdown(content);
  } else {
    contentDiv.textContent = content;
  }
  node.appendChild(contentDiv);

  // Meta badges for assistant messages
  if (role === "assistant" && (meta.model || meta.toolsUsed?.length || meta.autoRouted || meta.elapsed)) {
    const metaBar = document.createElement("div");
    metaBar.className = "msg-meta";

    if (meta.model) {
      const badge = document.createElement("span");
      badge.className = "msg-badge msg-badge-model";
      badge.textContent = meta.model;
      metaBar.appendChild(badge);
    }

    if (meta.autoRouted) {
      const badge = document.createElement("span");
      badge.className = "msg-badge msg-badge-auto";
      badge.textContent = "auto-routed";
      metaBar.appendChild(badge);
    }

    if (meta.toolsUsed?.length) {
      for (const tool of meta.toolsUsed) {
        const badge = document.createElement("span");
        badge.className = "msg-badge msg-badge-tool";
        if (tool === "summary") badge.classList.add("msg-badge-summary");
        badge.textContent = tool;
        metaBar.appendChild(badge);
      }
    }

    if (meta.elapsed) {
      const badge = document.createElement("span");
      badge.className = "msg-badge msg-badge-time";
      badge.textContent = `${(meta.elapsed / 1000).toFixed(1)}s`;
      metaBar.appendChild(badge);
    }

    node.appendChild(metaBar);
  }

  elements.messages.appendChild(node);
  scrollToBottom();
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .map((item) => ({ role: item.role, content: item.content.trim() }));
}

function isSummaryMessage(item) {
  const content = item && typeof item.content === "string"
    ? item.content.trim()
    : "";
  return (
    item &&
    item.role === "assistant" &&
    (
      content.startsWith("## 一鍵摘要") ||
      content.startsWith("## 一鍵總結") ||
      content.startsWith("## One-click Summary")
    )
  );
}

function getModelHistory(history) {
  return sanitizeHistory(history).filter((item) => !isSummaryMessage(item));
}

function renderConversationHistory(history) {
  elements.messages.innerHTML = "";
  if (!history.length) {
    renderMessage("assistant", WELCOME_TEXT);
    return;
  }
  for (const item of history) {
    renderMessage(item.role, item.content);
  }
}

function resetConversation() {
  state.history = [];
  renderConversationHistory(state.history);
}

/* ================================================================== */
/*  Export Conversation                                                */
/* ================================================================== */
function exportConversation() {
  if (!state.history.length) {
    setStatus("沒有可匯出的對話");
    return;
  }

  const lines = [];
  lines.push(`# Chat Export — ${new Date().toLocaleString("zh-TW")}`);
  lines.push(`Model: ${elements.modelSelect?.value || "unknown"}`);
  lines.push("---\n");

  for (const msg of state.history) {
    const label = msg.role === "user" ? "User" : "Assistant";
    lines.push(`### ${label}\n${msg.content}\n`);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-export-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus("對話已匯出");
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    const message =
      typeof payload.error === "string" && payload.error.trim()
        ? payload.error.trim()
        : "Request failed";
    throw new Error(message);
  }

  return payload;
}

async function summarizeConversation() {
  if (state.pending) return;
  const safeHistory = getModelHistory(state.history);
  if (!safeHistory.length) {
    setStatus("沒有可摘要的對話");
    return;
  }

  const modelValue = elements.modelSelect?.value || "gemini-2.5-flash";
  const isAutoRoute = modelValue === "auto";
  const rawSystemPrompt = elements.systemPromptInput?.value.trim() || "";
  const systemPrompt = composeSystemPrompt(rawSystemPrompt);
  let finalStatus = "Ready";

  togglePending(true);
  setStatus("Summarizing...");
  setSummaryButtonVisual("processing");

  try {
    const payload = await postJson("/api/summary", {
      history: safeHistory,
      model: isAutoRoute ? "auto" : modelValue,
      systemPrompt,
      autoRoute: isAutoRoute,
    });

    const summary =
      typeof payload.summary === "string" ? payload.summary : "[No summary]";
    state.history.push({ role: "assistant", content: summary });

    renderMessage("assistant", summary, {
      model: payload.model,
      autoRouted: payload.autoRouted,
      toolsUsed: ["summary"],
      elapsed: payload.elapsed,
      isSummary: true,
    });

    finalStatus =
      payload.fallbackFrom && payload.model && payload.fallbackFrom !== payload.model
        ? `摘要完成，已自動改用 ${payload.model}`
        : "摘要完成";
    setSummaryButtonVisual("success");
  } catch (error) {
    renderMessage("assistant", `Error: ${error.message}`);
    finalStatus = "摘要失敗";
  } finally {
    togglePending(false);
    if (finalStatus !== "摘要完成" && !finalStatus.startsWith("摘要完成，")) {
      setSummaryButtonVisual("idle");
    }
    setStatus(finalStatus);
    elements.messageInput?.focus();
  }
}

/* ================================================================== */
/*  Snapshots                                                         */
/* ================================================================== */
function generateSnapshotId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSnapshotTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Invalid time";
  return date.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function persistSnapshots() {
  localStorage.setItem(STORAGE_KEYS.snapshots, JSON.stringify(state.snapshots));
}

function loadSnapshotsFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.snapshots);
  if (!raw) {
    state.snapshots = [];
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      state.snapshots = [];
      return;
    }
    state.snapshots = parsed
      .map((s) => ({
        id: typeof s.id === "string" ? s.id : generateSnapshotId(),
        title: typeof s.title === "string" && s.title.trim() ? s.title.trim() : "未命名快照",
        createdAt:
          typeof s.createdAt === "string" && s.createdAt.trim() ? s.createdAt : new Date().toISOString(),
        history: sanitizeHistory(s.history),
        model: typeof s.model === "string" ? s.model : "gemini-2.5-flash",
        systemPrompt: typeof s.systemPrompt === "string" ? s.systemPrompt : "",
      }))
      .filter((s) => s.history.length > 0)
      .slice(0, 20);
  } catch {
    state.snapshots = [];
  }
}

function renderSnapshotList() {
  if (!elements.snapshotList) return;
  elements.snapshotList.innerHTML = "";

  if (!state.snapshots.length) {
    const empty = document.createElement("p");
    empty.className = "snapshot-empty";
    empty.textContent = "尚未儲存任何快照。";
    elements.snapshotList.appendChild(empty);
    return;
  }

  for (const snapshot of state.snapshots) {
    const item = document.createElement("article");
    item.className = "snapshot-item";

    const head = document.createElement("div");
    head.className = "snapshot-head";

    const name = document.createElement("p");
    name.className = "snapshot-name";
    name.textContent = snapshot.title;

    const meta = document.createElement("p");
    meta.className = "snapshot-meta";
    meta.textContent = formatSnapshotTime(snapshot.createdAt);

    const actions = document.createElement("div");
    actions.className = "snapshot-actions";

    const loadBtn = document.createElement("button");
    loadBtn.className = "snapshot-action";
    loadBtn.type = "button";
    loadBtn.dataset.action = "load";
    loadBtn.dataset.id = snapshot.id;
    loadBtn.textContent = "載入";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "snapshot-action";
    deleteBtn.type = "button";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = snapshot.id;
    deleteBtn.textContent = "刪除";

    actions.appendChild(loadBtn);
    actions.appendChild(deleteBtn);
    head.appendChild(name);
    head.appendChild(meta);
    item.appendChild(head);
    item.appendChild(actions);
    elements.snapshotList.appendChild(item);
  }
}

function buildSnapshotTitle() {
  const manualTitle = elements.snapshotTitleInput?.value.trim();
  if (manualTitle) return manualTitle;
  const firstUser = state.history.find((item) => item.role === "user");
  if (firstUser) return firstUser.content.slice(0, 20);
  return `快照 ${new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`;
}

function saveCurrentSnapshot() {
  const safeHistory = sanitizeHistory(state.history);
  if (!safeHistory.length) {
    setStatus("沒有可儲存的對話");
    return;
  }
  const title = buildSnapshotTitle();
  const snapshot = {
    id: generateSnapshotId(),
    title,
    createdAt: new Date().toISOString(),
    history: safeHistory,
    model: elements.modelSelect?.value || "gemini-2.5-flash",
    systemPrompt: elements.systemPromptInput?.value || "",
  };
  state.snapshots = [snapshot, ...state.snapshots].slice(0, 20);
  persistSnapshots();
  renderSnapshotList();
  if (elements.snapshotTitleInput) elements.snapshotTitleInput.value = "";
  setStatus(`已儲存快照：${title}`);
}

function loadSnapshotById(snapshotId) {
  const snapshot = state.snapshots.find((item) => item.id === snapshotId);
  if (!snapshot) return;
  state.history = sanitizeHistory(snapshot.history);
  if (elements.modelSelect) elements.modelSelect.value = snapshot.model || "gemini-2.5-flash";
  if (elements.systemPromptInput) elements.systemPromptInput.value = snapshot.systemPrompt || "";
  localStorage.setItem(STORAGE_KEYS.model, elements.modelSelect?.value || "");
  localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPromptInput?.value || "");
  renderConversationHistory(state.history);
  setStatus(`已載入快照：${snapshot.title}`);
}

function deleteSnapshotById(snapshotId) {
  const target = state.snapshots.find((item) => item.id === snapshotId);
  state.snapshots = state.snapshots.filter((item) => item.id !== snapshotId);
  persistSnapshots();
  renderSnapshotList();
  if (target) setStatus(`已刪除快照：${target.title}`);
}

/* ================================================================== */
/*  Intro Experience                                                  */
/* ================================================================== */
function animateCounters() {
  if (state.countersAnimated) return;
  state.countersAnimated = true;
  const duration = 1200;

  for (const node of elements.metricNumbers) {
    const target = Number(node.dataset.target || 0);
    const suffix = node.dataset.suffix || "";
    const start = performance.now();

    const tick = (time) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = `${Math.round(target * eased).toLocaleString()}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

function registerIntroCleanup(fn) {
  state.introCleanups.push(fn);
}

function clearIntroEffects() {
  for (const fn of state.introCleanups) fn();
  state.introCleanups = [];
  if (typeof state.disposeCanvas === "function") {
    state.disposeCanvas();
    state.disposeCanvas = null;
  }
}

function setChatMode() {
  if (!state.introActive) return;
  state.introActive = false;
  if (elements.enterChatBtn) elements.enterChatBtn.disabled = true;
  if (elements.enterNowBtn) elements.enterNowBtn.disabled = true;

  clearIntroEffects();
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.body.classList.remove("mode-intro");
  document.body.classList.add("mode-chat");

  setTimeout(() => {
    if (elements.experience) elements.experience.hidden = true;
    elements.messageInput?.focus();
  }, 620);
}

function initNetworkCanvas() {
  const canvas = elements.networkCanvas;
  if (!canvas) return null;
  const context = canvas.getContext("2d");
  if (!context) return null;

  let rafId = 0;
  let width = 0;
  let height = 0;
  let points = [];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = { x: null, y: null };

  function resetPoints() {
    const count = window.innerWidth < 900 ? 34 : 58;
    points = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 1.6 + 0.6,
    }));
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    resetPoints();
  }

  function drawFrame() {
    context.clearRect(0, 0, width, height);
    for (const point of points) {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < -20 || point.x > width + 20) point.vx *= -1;
      if (point.y < -20 || point.y > height + 20) point.vy *= -1;
    }
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      context.beginPath();
      context.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      context.fillStyle = "rgba(138, 191, 255, 0.62)";
      context.fill();

      for (let j = i + 1; j < points.length; j += 1) {
        const b = points[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 140) {
          const alpha = (1 - distance / 140) * 0.28;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.strokeStyle = `rgba(59, 231, 255, ${alpha})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }

      if (pointer.x !== null && pointer.y !== null) {
        const pointerDist = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (pointerDist < 170) {
          const pointerAlpha = (1 - pointerDist / 170) * 0.34;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(pointer.x, pointer.y);
          context.strokeStyle = `rgba(63, 243, 203, ${pointerAlpha})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }
    }
  }

  function loop() {
    drawFrame();
    if (!prefersReducedMotion && state.introActive) rafId = requestAnimationFrame(loop);
  }

  function onPointerMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }
  function onPointerLeave() {
    pointer.x = null;
    pointer.y = null;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerleave", onPointerLeave);
  resize();
  loop();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerleave", onPointerLeave);
    context.clearRect(0, 0, width, height);
  };
}

function initIntroExperience() {
  if (!elements.experience) return;

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      }
    },
    { threshold: 0.2 },
  );

  for (const node of elements.revealNodes) revealObserver.observe(node);
  registerIntroCleanup(() => revealObserver.disconnect());

  if (elements.metricsScene) {
    const metricsObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animateCounters();
            metricsObserver.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    metricsObserver.observe(elements.metricsScene);
    registerIntroCleanup(() => metricsObserver.disconnect());
  }

  let scrollRaf = 0;
  const updateScrollEffects = () => {
    scrollRaf = 0;
    if (!state.introActive) return;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, window.scrollY / maxScroll);
    if (elements.scrollMeter) elements.scrollMeter.style.transform = `scaleX(${progress})`;
    for (const layer of elements.parallaxLayers) {
      const depth = Number(layer.dataset.depth || 0);
      layer.style.transform = `translate3d(0, ${window.scrollY * depth}px, 0)`;
    }
  };

  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(updateScrollEffects);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  registerIntroCleanup(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    }
  });
  updateScrollEffects();

  if (elements.enterChatBtn) {
    elements.enterChatBtn.addEventListener("click", setChatMode);
    registerIntroCleanup(() => elements.enterChatBtn.removeEventListener("click", setChatMode));
  }
  if (elements.enterNowBtn) {
    elements.enterNowBtn.addEventListener("click", setChatMode);
    registerIntroCleanup(() => elements.enterNowBtn.removeEventListener("click", setChatMode));
  }
  if (elements.finalEntryPanel) {
    const onFinalClick = (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("#enterChatBtn")) return;
      setChatMode();
    };
    elements.finalEntryPanel.addEventListener("click", onFinalClick);
    registerIntroCleanup(() => elements.finalEntryPanel?.removeEventListener("click", onFinalClick));
  }

  state.disposeCanvas = initNetworkCanvas();
}

/* ================================================================== */
/*  Send Message (Enhanced)                                           */
/* ================================================================== */
async function sendMessage() {
  if (state.pending) return;
  const text = elements.messageInput.value.trim();
  if (!text && !state.selectedImage) return;

  const modelValue = elements.modelSelect?.value || "gemini-2.5-flash";
  const isAutoRoute = modelValue === "auto";
  const rawSystemPrompt = elements.systemPromptInput?.value.trim() || "";
  const systemPrompt = composeSystemPrompt(rawSystemPrompt);
  const enableTools = elements.enableToolsToggle?.checked !== false;

  // Capture image before clearing
  const imageData = state.selectedImage
    ? { base64: state.selectedImage.base64, mimeType: state.selectedImage.mimeType }
    : null;
  const imageDataUrl = state.selectedImage?.dataUrl || null;

  const displayText = text || "(圖片)";
  let finalStatus = "Ready";
  elements.messageInput.value = "";
  renderMessage("user", displayText, { imageDataUrl });
  clearSelectedImage();
  togglePending(true);

  try {
    const body = {
      message: text || "請描述這張圖片",
      history: getModelHistory(state.history),
      model: isAutoRoute ? "auto" : modelValue,
      systemPrompt,
      autoRoute: isAutoRoute,
      enableTools,
    };

    if (imageData) body.imageData = imageData;

    const payload = await postJson("/api/chat", body);

    const reply = typeof payload.reply === "string" ? payload.reply : "[No text response]";

    state.history.push({ role: "user", content: displayText });
    state.history.push({ role: "assistant", content: reply });

    renderMessage("assistant", reply, {
      model: payload.model,
      autoRouted: payload.autoRouted,
      toolsUsed: payload.toolsUsed,
      elapsed: payload.elapsed,
    });

    if (payload.fallbackFrom && payload.model && payload.fallbackFrom !== payload.model) {
      finalStatus = `模型繁忙，已自動改用 ${payload.model}`;
    }

    // Refresh memories if tools were used (model may have saved memories)
    if (payload.toolsUsed?.includes("save_memory")) {
      await fetchMemories();
    }
  } catch (error) {
    renderMessage("assistant", `Error: ${error.message}`);
    finalStatus = "請求失敗";
  } finally {
    togglePending(false);
    setStatus(finalStatus);
    elements.messageInput?.focus();
  }
}

/* ================================================================== */
/*  Drag & Drop Support                                               */
/* ================================================================== */
function initDragDrop() {
  const dropZone = elements.messages;
  if (!dropZone) return;

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.outline = "2px dashed var(--cyan)";
    dropZone.style.outlineOffset = "-4px";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.outline = "";
    dropZone.style.outlineOffset = "";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.outline = "";
    dropZone.style.outlineOffset = "";
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageSelect(file);
    }
  });
}

/* ================================================================== */
/*  Event Bindings                                                    */
/* ================================================================== */
function bindEvents() {
  // Intro entry buttons (global click delegation)
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("#enterChatBtn, #enterNowBtn")) setChatMode();
  });

  // Control panel
  if (elements.controlToggleBtn) {
    elements.controlToggleBtn.addEventListener("click", toggleControlPanel);
  }

  // Send / Clear / Export
  if (elements.sendBtn) elements.sendBtn.addEventListener("click", sendMessage);
  if (elements.summaryBtn) elements.summaryBtn.addEventListener("click", summarizeConversation);
  if (elements.clearBtn) {
    elements.clearBtn.addEventListener("click", () => {
      resetConversation();
      setStatus("Conversation cleared");
      elements.messageInput?.focus();
    });
  }
  if (elements.exportBtn) elements.exportBtn.addEventListener("click", exportConversation);

  // Enter to send
  if (elements.messageInput) {
    elements.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    // Paste image from clipboard
    elements.messageInput.addEventListener("paste", (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleImageSelect(file);
          break;
        }
      }
    });
  }

  // Model selection
  if (elements.modelSelect) {
    elements.modelSelect.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEYS.model, elements.modelSelect.value);
    });
  }

  // System prompt
  if (elements.systemPromptInput) {
    elements.systemPromptInput.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPromptInput.value);
    });
  }

  // Tools toggle
  if (elements.enableToolsToggle) {
    elements.enableToolsToggle.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEYS.enableTools, elements.enableToolsToggle.checked ? "1" : "0");
    });
  }

  // DNA sliders
  for (const field of DNA_FIELDS) {
    const slider = elements[field.slider];
    if (slider) slider.addEventListener("input", updateDnaPreview);
  }
  if (elements.dnaApplyBtn) {
    elements.dnaApplyBtn.addEventListener("click", () => applyDnaSettings({ silent: false }));
  }

  // Image upload
  if (elements.imageUploadBtn) {
    elements.imageUploadBtn.addEventListener("click", () => elements.imageFileInput?.click());
  }
  if (elements.imageFileInput) {
    elements.imageFileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) handleImageSelect(file);
    });
  }
  if (elements.imageClearBtn) {
    elements.imageClearBtn.addEventListener("click", clearSelectedImage);
  }

  // Memory
  if (elements.memoryAddBtn) {
    elements.memoryAddBtn.addEventListener("click", addMemoryManual);
  }
  if (elements.memoryInput) {
    elements.memoryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addMemoryManual();
      }
    });
  }
  if (elements.memoryList) {
    elements.memoryList.addEventListener("click", (e) => {
      const btn = e.target.closest(".memory-item-delete");
      if (btn?.dataset.id) deleteMemory(btn.dataset.id);
    });
  }

  // Snapshots
  if (elements.saveSnapshotBtn) elements.saveSnapshotBtn.addEventListener("click", saveCurrentSnapshot);
  if (elements.snapshotTitleInput) {
    elements.snapshotTitleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveCurrentSnapshot();
      }
    });
  }
  if (elements.snapshotList) {
    elements.snapshotList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;
      if (action === "load") loadSnapshotById(id);
      if (action === "delete") deleteSnapshotById(id);
    });
  }
}

/* ================================================================== */
/*  Restore Settings                                                  */
/* ================================================================== */
function restoreSettings() {
  const savedModel = localStorage.getItem(STORAGE_KEYS.model);
  const savedSystemPrompt = localStorage.getItem(STORAGE_KEYS.systemPrompt);
  const savedEnableTools = localStorage.getItem(STORAGE_KEYS.enableTools);

  if (savedModel && elements.modelSelect) elements.modelSelect.value = savedModel;
  if (savedSystemPrompt && elements.systemPromptInput) elements.systemPromptInput.value = savedSystemPrompt;
  if (savedEnableTools !== null && elements.enableToolsToggle) {
    elements.enableToolsToggle.checked = savedEnableTools !== "0";
  }
}

/* ================================================================== */
/*  Boot                                                              */
/* ================================================================== */
function runBootStep(step, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`[boot] ${step} failed`, error);
  }
}

initMarked();

runBootStep("intro", initIntroExperience);
runBootStep("settings", restoreSettings);
runBootStep("control-panel", restoreControlPanelState);
runBootStep("dna", loadDnaSettings);
runBootStep("snapshots-load", loadSnapshotsFromStorage);
runBootStep("snapshots-render", renderSnapshotList);
runBootStep("events", bindEvents);
runBootStep("drag-drop", initDragDrop);
runBootStep("conversation", resetConversation);

// Async boot: fetch memories from server
fetchMemories().catch(() => {});
