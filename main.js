// =============================
// 元素
// =============================
const catEl = document.getElementById("fatcat");
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

// =============================
// 帧动画设置
// =============================
const START = 1;
const END = 151;

let frameIndex = START;
let dir = 1;

// 生成帧路径
function getFrame(n) {
  const num = String(n).padStart(4, "0");
  return `/webp/${num}.webp`;
}

// 播放一帧
function tick() {
  catEl.src = getFrame(frameIndex);

  frameIndex += dir;

  // 151 -> 150
  if (frameIndex > END) {
    dir = -1;
    frameIndex = END - 1;
  }

  // 1 -> 1 -> 2...
  if (frameIndex < START) {
    dir = 1;
    frameIndex = START;
  }
}

// 30fps 播放
setInterval(tick, 33);

// =============================
// 聊天 UI
// =============================
function addBubble(text, role) {
  const div = document.createElement("div");
  div.className = role === "user" ? "bubble user" : "bubble cat";
  div.innerText = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// =============================
// 发送消息
// =============================
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  addBubble(text, "user");
  inputEl.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    if (data.reply) {
      addBubble(data.reply, "cat");
    } else {
      addBubble("橘猫打了个哈欠，没有说话。", "cat");
    }

  } catch (err) {
    console.error(err);
    addBubble("橘猫网络开小差了。", "cat");
  }
}

// =============================
// 事件
// =============================
sendBtn.onclick = sendMessage;

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});