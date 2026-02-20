// ===== 图片路径：按你当前结构 public/xxx.png =====
const IMG_OPEN  = "./public/cat.png";
const IMG_HALF  = "./public/cat_h_blink.png";
const IMG_CLOSE = "./public/cat_f_blink.png";

// ===== DOM =====
const catEl = document.getElementById("fatcat");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("chatInput");
const messagesEl = document.getElementById("messages");

// ===== 预加载（避免眨眼时“问号”）=====
function preload(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

async function preloadAll() {
  try {
    await Promise.all([preload(IMG_OPEN), preload(IMG_HALF), preload(IMG_CLOSE)]);
    // 确保初始图也在
    catEl.src = IMG_OPEN;
  } catch (e) {
    // 如果你看到问号，99%是路径不对
    console.error("Image preload failed:", e);
  }
}

// ===== 聊天显示 =====
function addBubble(text, who) {
  const div = document.createElement("div");
  div.className = `bubble ${who}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  // 滚到底部
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ===== 眨眼（open -> half -> close -> half -> open）=====
let blinking = false;
async function blinkOnce() {
  if (blinking) return;
  blinking = true;

  catEl.src = IMG_HALF;
  await new Promise(r => setTimeout(r, 70));
  catEl.src = IMG_CLOSE;
  await new Promise(r => setTimeout(r, 90));
  catEl.src = IMG_HALF;
  await new Promise(r => setTimeout(r, 70));
  catEl.src = IMG_OPEN;

  blinking = false;
}

// 每 4 秒自动眨一次
setInterval(() => { blinkOnce(); }, 4000);

// ===== 表单提交 =====
formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = inputEl.value.trim();
  if (!text) return;

  addBubble(text, "user");
  inputEl.value = "";

  // 眨一下 + 假装回复（你后面接 API 就把这里换掉）
    // 眨一下 + 调你的后端 /api/chat
  await blinkOnce();

  try {
    addBubble("…", "cat"); // 占位
    const placeholder = messagesEl.lastElementChild;

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Request failed");

    placeholder.textContent = data.reply || "（我刚刚走神了…再说一次）";
  } catch (err) {
    addBubble(`出错了：${err.message}`, "cat");
  }

// 启动
preloadAll();