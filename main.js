// ===== 图片路径 =====
const IMG_OPEN  = "./public/cat.png";
const IMG_HALF  = "./public/cat_h_blink.png";
const IMG_CLOSE = "./public/cat_f_blink.png";

// ===== DOM =====
const catEl = document.getElementById("fatcat");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("chatInput");
const messagesEl = document.getElementById("messages");

// ===== 预加载 =====
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
    catEl.src = IMG_OPEN;
  } catch (e) {
    console.error("Image preload failed:", e);
  }
}

// ===== 气泡 =====
function addBubble(text, who) {
  const div = document.createElement("div");
  div.className = `bubble ${who}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ===== 眨眼 =====
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

setInterval(() => blinkOnce(), 4000);

// ===== 表单提交 =====
formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = inputEl.value.trim();
  if (!text) return;

  addBubble(text, "user");
  inputEl.value = "";

  await blinkOnce();

  try {
    addBubble("…", "cat");
    const placeholder = messagesEl.lastElementChild;

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Request failed");

    placeholder.textContent = data.reply || "（橘猫走神了，再试一次）";
  } catch (err) {
    addBubble("出错了：" + err.message, "cat");
  }
});

// ===== 启动 =====
preloadAll();