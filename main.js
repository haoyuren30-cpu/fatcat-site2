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
  return div;
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

// ===== 调后端 =====
async function callApi(message) {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  // 先读文本，再尝试 json（避免接口返回 html 时直接报错）
  const raw = await r.text();
  let data = null;
  try { data = JSON.parse(raw); } catch { data = { error: "Non-JSON response", raw }; }

  if (!r.ok) {
    const msg = data?.error ? `${data.error}${data.detail ? " - " + data.detail : ""}` : `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data;
}

// ===== 表单提交 =====
formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = inputEl.value.trim();
  if (!text) return;

  addBubble(text, "user");
  inputEl.value = "";

  await blinkOnce();

  const placeholder = addBubble("…", "cat");

  try {
    const data = await callApi(text);

    if (data.error) {
      placeholder.textContent = `后端报错：${data.error}${data.detail ? " - " + data.detail : ""}`;
      return;
    }

    if (data.reply) {
      placeholder.textContent = data.reply;
      return;
    }

    // reply 为空：直接把 debug 打出来（你就能看到原因）
    placeholder.textContent = `空回复（debug=${JSON.stringify(data.debug || {})}）`;
  } catch (err) {
    placeholder.textContent = `请求失败：${err.message}`;
  }
});

// ===== 启动 =====
preloadAll();