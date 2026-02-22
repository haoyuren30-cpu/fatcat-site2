// ===============================
// 橘猫帧动画
// ===============================
const catEl = document.getElementById("fatcat");

const START = 1;
const END = 151;
let frameIndex = START;
let dir = 1;

function getFrame(n) {
  const num = String(n).padStart(4, "0");
  return `/webp/${num}.webp`;
}

function tick() {
  catEl.src = getFrame(frameIndex);
  frameIndex += dir;

  if (frameIndex > END) {
    dir = -1;
    frameIndex = END - 1;
  }
  if (frameIndex < START) {
    dir = 1;
    frameIndex = START;
  }
}

setInterval(tick, 33);

// ===============================
// 🎵 BGM 控制
// ===============================
const bgmEl = document.getElementById("bgm");

function setupBgm() {
  if (!bgmEl) return;

  bgmEl.volume = 0.25;
  bgmEl.muted = true;

  const tryPlay = () => bgmEl.play().catch(() => {});

  // 页面加载先尝试播放（静音）
  tryPlay();

  // 用户第一次交互后开声
  const enableSound = () => {
    bgmEl.muted = false;
    bgmEl.volume = 0.25;
    tryPlay();
  };

  window.addEventListener("pointerdown", enableSound, { once: true });
  window.addEventListener("keydown", enableSound, { once: true });
}

setupBgm();

// ===============================
// 聊天 DOM
// ===============================
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

// ===============================
// 聊天历史
// ===============================
const LS_KEY = "fatcat_chat_history_v1";
const HISTORY_LIMIT = 10;

function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

let chatHistory = loadHistory();

// ===============================
// UI
// ===============================
function addBubble(text, role) {
  const div = document.createElement("div");
  div.className = role === "user" ? "bubble user" : "bubble cat";
  div.innerText = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// 渲染历史
chatHistory.forEach(m => {
  addBubble(m.content, m.role);
});

// ===============================
// 维护历史
// ===============================
function pushHistory(role, content) {
  chatHistory.push({ role, content });

  if (chatHistory.length > HISTORY_LIMIT) {
    chatHistory = chatHistory.slice(-HISTORY_LIMIT);
  }

  saveHistory(chatHistory);
}

// ===============================
// 🐱 进入页面第一句话
// ===============================
function formatTodayCN(d) {
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function daysSinceBirth(today) {
  const birth = new Date(2026, 1, 19); // 2026-02-19
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((t0 - birth) / 86400000);
  return diff + 1;
}

function maybeSayHello() {
  if (chatHistory.length > 0) return;

  const now = new Date();
  const intro = 
    `你好！我叫洛洛，是肥猫罗罗的弟弟。今天是我诞生的第${daysSinceBirth(now)}天。`;

  addBubble(intro, "cat");
  pushHistory("assistant", intro);
}

maybeSayHello();

// ===============================
// 发送消息
// ===============================
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  addBubble(text, "user");
  pushHistory("user", text);
  inputEl.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: chatHistory
      })
    });

    const data = await res.json();
    const reply = data.reply || "橘猫打了个盹，没有回应。";

    addBubble(reply, "cat");
    pushHistory("assistant", reply);

  } catch (err) {
    addBubble("橘猫网络开小差了。", "cat");
  }
}

// ===============================
// 事件
// ===============================
sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    sendMessage();
  }
});