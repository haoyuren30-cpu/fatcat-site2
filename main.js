const IMG_OPEN  = "./public/cat.png";
const IMG_HALF  = "./public/cat_h_blink.png";
const IMG_CLOSE = "./public/cat_f_blink.png";

const cat = document.getElementById("fatcat");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");

let ready = false;
let blinking = false;

function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("load failed: " + url));
    img.src = url;
  });
}

// 预加载三张图，避免“问号”
Promise.all([preload(IMG_OPEN), preload(IMG_HALF), preload(IMG_CLOSE)])
  .then(() => {
    ready = true;
    if (cat) cat.src = IMG_OPEN;
  })
  .catch((e) => console.error(e));

function blinkOnce() {
  if (!ready || blinking || !cat) return;
  blinking = true;

  cat.src = IMG_HALF;
  setTimeout(() => (cat.src = IMG_CLOSE), 120);
  setTimeout(() => (cat.src = IMG_HALF), 240);
  setTimeout(() => {
    cat.src = IMG_OPEN;
    blinking = false;
  }, 360);
}

// 每 4 秒自动眨眼一次
setInterval(() => {
  blinkOnce();
}, 4000);

// 发送消息：不做真实对话，只做“眨一下”演示（你后面接API再改）
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input?.value?.trim();
  if (!text) return;

  // 你以后在这里接 OpenAI API / 你自己的后端
  // 这里先做 UI 反馈
  input.value = "";
  blinkOnce();
});
