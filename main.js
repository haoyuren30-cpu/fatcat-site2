const messages = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

sendBtn.onclick = () => {
  const text = input.value.trim();
  if (!text) return;

  addMessage("你：" + text, "user");
  input.value = "";

  setTimeout(() => {
    addMessage("橘猫：喵～猫猫--呆。", "cat");
  }, 400);
};

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
const IMG_OPEN  = "/cat.png";
  const IMG_HALF  = "/cat_half.png";
  const IMG_CLOSE = "/cat_close.png";

const cat = document.getElementById("fatcat");

let ready = false;

// 预加载
function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
}

Promise.all([preload(IMG_OPEN), preload(IMG_HALF), preload(IMG_CLOSE)])
  .then(() => {
    ready = true;
    // 确保初始是睁眼
    cat.src = IMG_OPEN;
  })
  .catch((e) => {
    console.error("preload failed:", e);
  });
  let blinking = false;

function blinkOnce() {
  if (!ready || blinking) return;
  blinking = true;

  cat.src = IMG_HALF;

  setTimeout(() => (cat.src = IMG_CLOSE), 120);
  setTimeout(() => (cat.src = IMG_HALF), 240);
  setTimeout(() => {
    cat.src = IMG_OPEN;
    blinking = false;
  }, 360);
}
