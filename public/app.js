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
  modelInput: document.getElementById("modelInput"),
  systemPromptInput: document.getElementById("systemPromptInput"),
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
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  clearBtn: document.getElementById("clearBtn"),
};

const state = {
  history: [],
  snapshots: [],
  dna: {
    rigor: 50,
    creativity: 50,
    empathy: 50,
    brevity: 50,
    profile: "Balanced Analyst",
    instruction: "",
  },
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
};

const WELCOME_TEXT =
  "你好，我是你的個人聊天機器人（Gemini）。你可以在左邊設定 model 與 system prompt，然後開始對話。";

const DNA_DEFAULT = {
  rigor: 50,
  creativity: 50,
  empathy: 50,
  brevity: 50,
};

const DNA_FIELDS = [
  { key: "rigor", slider: "dnaRigor", value: "dnaRigorValue" },
  { key: "creativity", slider: "dnaCreativity", value: "dnaCreativityValue" },
  { key: "empathy", slider: "dnaEmpathy", value: "dnaEmpathyValue" },
  { key: "brevity", slider: "dnaBrevity", value: "dnaBrevityValue" },
];

function parseSliderValue(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

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
  if (!slider) {
    return;
  }

  const percent = Math.max(0, Math.min(100, value));
  slider.style.background =
    `linear-gradient(90deg, rgba(59, 231, 255, 0.92) ${percent}%, rgba(255, 255, 255, 0.09) ${percent}%)`;
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

  if (rigor >= 80 && brevity >= 70 && creativity <= 45) {
    return "Precision Architect";
  }

  if (creativity >= 80 && empathy >= 65) {
    return "Vision Storyteller";
  }

  if (rigor >= 70 && creativity >= 70) {
    return "Research Maverick";
  }

  if (empathy >= 75 && brevity <= 45) {
    return "Insight Coach";
  }

  if (brevity >= 85 && rigor >= 60) {
    return "Command-Line Mentor";
  }

  return "Balanced Analyst";
}

function buildDnaInstruction(values, profile) {
  const rigorDirective =
    values.rigor >= 70
      ? "prioritize correctness, structure and explicit assumptions"
      : values.rigor <= 30
        ? "allow exploratory leaps and lightweight structure"
        : "balance rigor with flexibility";

  const creativityDirective =
    values.creativity >= 70
      ? "offer novel framing and inventive examples"
      : values.creativity <= 30
        ? "prefer conventional and reliable approaches"
        : "mix practical and creative responses";

  const empathyDirective =
    values.empathy >= 70
      ? "use warm, supportive wording and user-centered explanations"
      : values.empathy <= 30
        ? "keep tone objective and strictly task-focused"
        : "keep tone neutral and clear";

  const brevityDirective =
    values.brevity >= 70
      ? "answer concisely with compact bullet points"
      : values.brevity <= 30
        ? "allow fuller explanations with richer context"
        : "keep medium-length explanations";

  return [
    `Profile: ${profile}.`,
    `Rigor(${values.rigor}): ${rigorDirective}.`,
    `Creativity(${values.creativity}): ${creativityDirective}.`,
    `Empathy(${values.empathy}): ${empathyDirective}.`,
    `Brevity(${values.brevity}): ${brevityDirective}.`,
  ].join(" ");
}

function detectDnaEffect(values, profile) {
  if (profile === "Equilibrium Resonance") {
    return { type: "equilibrium", label: "Equilibrium Lock" };
  }

  if (
    values.rigor >= 95 ||
    values.creativity >= 95 ||
    values.empathy >= 95 ||
    values.brevity >= 95
  ) {
    return { type: "overdrive", label: "Overdrive Trigger" };
  }

  if (
    values.rigor <= 5 ||
    values.creativity <= 5 ||
    values.empathy <= 5 ||
    values.brevity <= 5
  ) {
    return { type: "focus", label: "Focus Lock" };
  }

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

  if (elements.dnaProfileLabel) {
    elements.dnaProfileLabel.textContent = profile;
  }
}

function applyDnaSettings(options = {}) {
  const { silent = false } = options;
  const values = getDnaValuesFromUI();
  const profile = deriveDnaProfile(values);
  const instruction = buildDnaInstruction(values, profile);

  state.dna = {
    ...values,
    profile,
    instruction,
  };

  if (elements.dnaProfileLabel) {
    elements.dnaProfileLabel.textContent = profile;
  }

  persistDnaSettings();

  if (!silent) {
    const { type, label } = detectDnaEffect(values, profile);

    if (elements.dnaEffectLabel) {
      elements.dnaEffectLabel.textContent = label;
    }

    if (elements.dnaPanel) {
      elements.dnaPanel.classList.remove("is-apply", "effect-equilibrium", "effect-overdrive", "effect-focus");

      void elements.dnaPanel.offsetWidth;

      elements.dnaPanel.classList.add("is-apply");

      if (type) {
        elements.dnaPanel.classList.add(`effect-${type}`);
      }

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
  const promptBlocks = [];

  if (basePrompt) {
    promptBlocks.push(basePrompt);
  }

  if (state.dna?.instruction) {
    promptBlocks.push(`[Prompt DNA] ${state.dna.instruction}`);
  }

  return promptBlocks.join("\n\n");
}

function setControlPanelOpen(isOpen, options = {}) {
  const { persist = true } = options;

  if (!elements.chatWrap || !elements.controlToggleBtn) {
    return;
  }

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

  if (persist) {
    localStorage.setItem(STORAGE_KEYS.controlOpen, isOpen ? "1" : "0");
  }
}

function toggleControlPanel() {
  const isOpen = elements.chatWrap?.classList.contains("control-open");
  setControlPanelOpen(!isOpen);
}

function restoreControlPanelState() {
  const saved = localStorage.getItem(STORAGE_KEYS.controlOpen);
  setControlPanelOpen(saved === "1", { persist: false });
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function togglePending(pending) {
  state.pending = pending;
  elements.sendBtn.disabled = pending;
  elements.typing.classList.toggle("on", pending);
  setStatus(pending ? "Thinking..." : "Ready");
}

function scrollToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderMessage(role, content) {
  const node = document.createElement("article");
  node.className = `message ${role}`;
  node.textContent = content;
  elements.messages.appendChild(node);
  scrollToBottom();
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

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

function generateSnapshotId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSnapshotTime(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

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
      .map((snapshot) => ({
        id: typeof snapshot.id === "string" ? snapshot.id : generateSnapshotId(),
        title:
          typeof snapshot.title === "string" && snapshot.title.trim()
            ? snapshot.title.trim()
            : "未命名快照",
        createdAt:
          typeof snapshot.createdAt === "string" && snapshot.createdAt.trim()
            ? snapshot.createdAt
            : new Date().toISOString(),
        history: sanitizeHistory(snapshot.history),
        model: typeof snapshot.model === "string" ? snapshot.model : "gemini-2.5-flash",
        systemPrompt: typeof snapshot.systemPrompt === "string" ? snapshot.systemPrompt : "",
      }))
      .filter((snapshot) => snapshot.history.length > 0)
      .slice(0, 20);
  } catch {
    state.snapshots = [];
  }
}

function renderSnapshotList() {
  if (!elements.snapshotList) {
    return;
  }

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

  if (manualTitle) {
    return manualTitle;
  }

  const firstUserMessage = state.history.find((item) => item.role === "user");

  if (firstUserMessage) {
    return firstUserMessage.content.slice(0, 20);
  }

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
    model: elements.modelInput.value.trim() || "gemini-2.5-flash",
    systemPrompt: elements.systemPromptInput.value,
  };

  state.snapshots = [snapshot, ...state.snapshots].slice(0, 20);
  persistSnapshots();
  renderSnapshotList();

  if (elements.snapshotTitleInput) {
    elements.snapshotTitleInput.value = "";
  }

  setStatus(`已儲存快照：${title}`);
}

function loadSnapshotById(snapshotId) {
  const snapshot = state.snapshots.find((item) => item.id === snapshotId);

  if (!snapshot) {
    return;
  }

  state.history = sanitizeHistory(snapshot.history);
  elements.modelInput.value = snapshot.model || "gemini-2.5-flash";
  elements.systemPromptInput.value = snapshot.systemPrompt || "";

  localStorage.setItem(STORAGE_KEYS.model, elements.modelInput.value.trim());
  localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPromptInput.value);

  renderConversationHistory(state.history);
  setStatus(`已載入快照：${snapshot.title}`);
}

function deleteSnapshotById(snapshotId) {
  const target = state.snapshots.find((item) => item.id === snapshotId);
  state.snapshots = state.snapshots.filter((item) => item.id !== snapshotId);
  persistSnapshots();
  renderSnapshotList();

  if (target) {
    setStatus(`已刪除快照：${target.title}`);
  }
}

function animateCounters() {
  if (state.countersAnimated) {
    return;
  }

  state.countersAnimated = true;
  const duration = 1200;

  for (const node of elements.metricNumbers) {
    const target = Number(node.dataset.target || 0);
    const suffix = node.dataset.suffix || "";
    const start = performance.now();

    const tick = (time) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      node.textContent = `${value.toLocaleString()}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }
}

function registerIntroCleanup(fn) {
  state.introCleanups.push(fn);
}

function clearIntroEffects() {
  for (const fn of state.introCleanups) {
    fn();
  }

  state.introCleanups = [];

  if (typeof state.disposeCanvas === "function") {
    state.disposeCanvas();
    state.disposeCanvas = null;
  }
}

function setChatMode() {
  if (!state.introActive) {
    return;
  }

  state.introActive = false;

  if (elements.enterChatBtn) {
    elements.enterChatBtn.disabled = true;
  }

  if (elements.enterNowBtn) {
    elements.enterNowBtn.disabled = true;
  }

  clearIntroEffects();
  window.scrollTo({ top: 0, behavior: "smooth" });

  document.body.classList.remove("mode-intro");
  document.body.classList.add("mode-chat");

  setTimeout(() => {
    if (elements.experience) {
      elements.experience.hidden = true;
    }

    elements.messageInput.focus();
  }, 620);
}

function initNetworkCanvas() {
  const canvas = elements.networkCanvas;

  if (!canvas) {
    return null;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

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

      if (point.x < -20 || point.x > width + 20) {
        point.vx *= -1;
      }

      if (point.y < -20 || point.y > height + 20) {
        point.vy *= -1;
      }
    }

    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];

      context.beginPath();
      context.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      context.fillStyle = "rgba(138, 191, 255, 0.62)";
      context.fill();

      for (let j = i + 1; j < points.length; j += 1) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);

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
        const px = a.x - pointer.x;
        const py = a.y - pointer.y;
        const pointerDistance = Math.hypot(px, py);

        if (pointerDistance < 170) {
          const pointerAlpha = (1 - pointerDistance / 170) * 0.34;
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

    if (!prefersReducedMotion && state.introActive) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function onPointerMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
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
  if (!elements.experience) {
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      }
    },
    { threshold: 0.2 },
  );

  for (const node of elements.revealNodes) {
    revealObserver.observe(node);
  }

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

    if (!state.introActive) {
      return;
    }

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, window.scrollY / maxScroll);

    if (elements.scrollMeter) {
      elements.scrollMeter.style.transform = `scaleX(${progress})`;
    }

    for (const layer of elements.parallaxLayers) {
      const depth = Number(layer.dataset.depth || 0);
      layer.style.transform = `translate3d(0, ${window.scrollY * depth}px, 0)`;
    }
  };

  const onScroll = () => {
    if (scrollRaf) {
      return;
    }

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
    const onFinalPanelClick = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("#enterChatBtn")) {
        return;
      }

      setChatMode();
    };

    elements.finalEntryPanel.addEventListener("click", onFinalPanelClick);
    registerIntroCleanup(() => elements.finalEntryPanel?.removeEventListener("click", onFinalPanelClick));
  }

  state.disposeCanvas = initNetworkCanvas();
}

async function sendMessage() {
  if (state.pending) {
    return;
  }

  const text = elements.messageInput.value.trim();

  if (!text) {
    return;
  }

  const model = elements.modelInput.value.trim() || "gemini-2.5-flash";
  const rawSystemPrompt = elements.systemPromptInput.value.trim();
  const systemPrompt = composeSystemPrompt(rawSystemPrompt);

  elements.messageInput.value = "";
  renderMessage("user", text);

  togglePending(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        history: state.history,
        model,
        systemPrompt,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Request failed");
    }

    const reply = typeof payload.reply === "string" ? payload.reply : "[No text response]";

    state.history.push({ role: "user", content: text });
    state.history.push({ role: "assistant", content: reply });

    renderMessage("assistant", reply);
  } catch (error) {
    renderMessage("assistant", `發生錯誤：${error.message}`);
  } finally {
    togglePending(false);
    elements.messageInput.focus();
  }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("#enterChatBtn, #enterNowBtn")) {
      setChatMode();
    }
  });

  if (elements.controlToggleBtn) {
    elements.controlToggleBtn.addEventListener("click", toggleControlPanel);
  }

  if (elements.sendBtn) {
    elements.sendBtn.addEventListener("click", sendMessage);
  }

  if (elements.clearBtn) {
    elements.clearBtn.addEventListener("click", () => {
      resetConversation();
      setStatus("Conversation cleared");
      elements.messageInput?.focus();
    });
  }

  if (elements.messageInput) {
    elements.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  if (elements.modelInput) {
    elements.modelInput.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEYS.model, elements.modelInput.value.trim());
    });
  }

  if (elements.systemPromptInput) {
    elements.systemPromptInput.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPromptInput.value);
    });
  }

  for (const field of DNA_FIELDS) {
    const slider = elements[field.slider];

    if (!slider) {
      continue;
    }

    slider.addEventListener("input", updateDnaPreview);
  }

  if (elements.dnaApplyBtn) {
    elements.dnaApplyBtn.addEventListener("click", () => applyDnaSettings({ silent: false }));
  }

  if (elements.saveSnapshotBtn) {
    elements.saveSnapshotBtn.addEventListener("click", saveCurrentSnapshot);
  }

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

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const action = target.dataset.action;
      const id = target.dataset.id;

      if (!action || !id) {
        return;
      }

      if (action === "load") {
        loadSnapshotById(id);
      }

      if (action === "delete") {
        deleteSnapshotById(id);
      }
    });
  }
}

function restoreSettings() {
  const savedModel = localStorage.getItem(STORAGE_KEYS.model);
  const savedSystemPrompt = localStorage.getItem(STORAGE_KEYS.systemPrompt);

  if (savedModel && elements.modelInput) {
    elements.modelInput.value = savedModel;
  }

  if (savedSystemPrompt && elements.systemPromptInput) {
    elements.systemPromptInput.value = savedSystemPrompt;
  }
}

function runBootStep(step, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`[boot] ${step} failed`, error);
  }
}

runBootStep("intro", initIntroExperience);
runBootStep("settings", restoreSettings);
runBootStep("control-panel", restoreControlPanelState);
runBootStep("dna", loadDnaSettings);
runBootStep("snapshots-load", loadSnapshotsFromStorage);
runBootStep("snapshots-render", renderSnapshotList);
runBootStep("events", bindEvents);
runBootStep("conversation", resetConversation);
