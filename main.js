// ===============================
// 橘猫帧动画（保持你原有逻辑即可）
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
// 聊天 DOM
// ===============================
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

// ===============================
// 聊天历史（新增）
// ===============================
const LS_KEY = "fatcat_chat_history_v1";
const HISTORY_LIMIT = 10; // ✅ 近10条消息

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

// 页面加载先渲染历史
chatHistory.forEach((m) => {
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
// 发送消息
// ===============================
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  // 用户气泡
  addBubble(text, "user");
  pushHistory("user", text);
  inputEl.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      // ✅ 把近10条历史一起带给后端
      body: JSON.stringify({
        message: text,
        history: chatHistory,
      }),
    });

    const data = await res.json();

    const reply = data.reply || "橘猫打了个盹，没有回应。";

    addBubble(reply, "cat");
    pushHistory("assistant", reply);
  } catch (err) {
    console.error(err);
    const fallback = "橘猫网络开小差了。";
    addBubble(fallback, "cat");
    pushHistory("assistant", fallback);
  }
}

// ===============================
// 事件
// ===============================
sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});