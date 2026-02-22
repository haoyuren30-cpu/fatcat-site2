// ===============================
// 橘猫帧动画（仅：说话循环 + 待机定格）
// 需求：取消蹦迪（待机不再播放），待机=说话帧的第一帧
// 说话：循环播放 speak 帧，直到语音结束；结束后继续0.3秒，再定格回第一帧
// 并预加载所有 speak 图片，确保不卡顿
// ===============================
const catEl = document.getElementById("fatcat");

// speak 帧：/webp/speak/frame_0001.webp ~ frame_0105.webp
const SPEAK_START = 1;
const SPEAK_END = 105;

// 待机使用 speak 第一帧
const IDLE_FRAME_INDEX = SPEAK_START;

let speakTimer = null;
let speakFrameIndex = SPEAK_START;
let speakPlaying = false;

function getSpeakFrame(n) {
  const num = String(n).padStart(4, "0");
  return `/webp/speak/frame_${num}.webp`;
}

function stopSpeakLoop() {
  if (speakTimer) clearInterval(speakTimer);
  speakTimer = null;
  speakPlaying = false;
}

function showIdleFrame() {
  stopSpeakLoop();
  // 为了避免尺寸跳动：保持 speaking class（你之前的缩放修正仍然生效）
  // 如果你想待机不缩放，可把这行改成 remove("speaking")
  catEl.classList.add("speaking");
  catEl.src = getSpeakFrame(IDLE_FRAME_INDEX);
}

function startSpeakLoop() {
  // speaking 状态：循环播放
  catEl.classList.add("speaking");
  speakPlaying = true;
  speakFrameIndex = SPEAK_START;

  if (speakTimer) clearInterval(speakTimer);

  speakTimer = setInterval(() => {
    catEl.src = getSpeakFrame(speakFrameIndex);
    speakFrameIndex += 1;
    if (speakFrameIndex > SPEAK_END) speakFrameIndex = SPEAK_START;
  }, 33);
}

// 页面初始：待机定格
showIdleFrame();

// ===============================
// 预加载所有 speak 帧（避免卡顿）
// ===============================
const PRELOAD_TOTAL = SPEAK_END - SPEAK_START + 1;

function preloadImages(urls) {
  return Promise.all(urls.map((u) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = u;

      // 更“狠”的预解码（可选）
      if (img.decode) {
        img.decode().then(() => resolve(true)).catch(() => resolve(true));
      }
    });
  }));
}

const hintEl = document.getElementById("hint");
function setHint(text) {
  if (!hintEl) return;
  hintEl.textContent = text || "";
}

(async function preloadAll() {
  try {
    setHint(`正在预加载橘猫动作…（${PRELOAD_TOTAL}帧）`);
    const urls = [];
    for (let i = SPEAK_START; i <= SPEAK_END; i++) urls.push(getSpeakFrame(i));
    await preloadImages(urls);
  } finally {
    setHint("");
  }
})();

// ===============================
// 🎵 背景音乐：默认关闭 + 左侧按钮开关（保留）
// ===============================
const bgmEl = document.getElementById("bgm");
const musicToggleBtn = document.getElementById("musicToggle");

function setMusicUI(on) {
  if (!musicToggleBtn) return;
  musicToggleBtn.textContent = on ? "⏸" : "♪";
  musicToggleBtn.title = on ? "关闭音乐" : "播放音乐";
}

async function playBgm() {
  if (!bgmEl) return false;
  try {
    bgmEl.volume = 0.25;
    await bgmEl.play();
    return true;
  } catch {
    return false;
  }
}

function pauseBgm() {
  if (!bgmEl) return;
  try { bgmEl.pause(); } catch {}
}

async function setupBgm() {
  if (!bgmEl) return;

  // 默认关闭：不自动播放
  pauseBgm();
  setMusicUI(false);

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener("click", async () => {
      const isPlaying = bgmEl && !bgmEl.paused;
      if (isPlaying) {
        pauseBgm();
        setMusicUI(false);
      } else {
        const ok = await playBgm();
        setMusicUI(ok);
        if (!ok) {
          setHint("浏览器限制：请再点一次或先点一下页面任意位置喵。");
          setTimeout(() => setHint(""), 1800);
        }
      }
    });
  }
}
setupBgm();

// ===============================
// 聊天 DOM
// ===============================
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic");

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
// 🐱 进入页面第一句话（保留）
// ===============================
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
// 文本发送
// ===============================
async function sendTextMessage() {
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
        history: chatHistory,
      }),
    });

    const data = await res.json();
    const reply = data.reply || "喵…我有点走神了。";

    addBubble(reply, "cat");
    pushHistory("assistant", reply);
  } catch {
    addBubble("橘猫网络开小差了。", "cat");
  }
}

// ===============================
// 语音录制 + 发送 + 播放（无时长限制）
// 录音最长 15 秒；播放结束后继续动画0.3秒再定格
// ===============================
let mediaStream = null;
let recorder = null;
let chunks = [];
let recordingTimeout = null;
let isRecording = false;

// 语音播放：用于中断上一段
let currentVoiceAudio = null;
let currentVoiceUrl = null;

function cleanupVoiceAudio() {
  if (currentVoiceAudio) {
    try { currentVoiceAudio.pause(); } catch {}
    currentVoiceAudio = null;
  }
  if (currentVoiceUrl) {
    try { URL.revokeObjectURL(currentVoiceUrl); } catch {}
    currentVoiceUrl = null;
  }
}

function setRecordingUI(on) {
  isRecording = on;
  if (micBtn) micBtn.classList.toggle("recording", on);
  if (micBtn) micBtn.textContent = on ? "⏹" : "🎤";
}

async function ensureMicPermission() {
  if (mediaStream) return mediaStream;
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return mediaStream;
}

function startRecording() {
  if (isRecording) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setHint("这个浏览器不支持录音喵。");
    return;
  }

  ensureMicPermission()
    .then(stream => {
      chunks = [];
      const options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      }

      recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        chunks = [];
        setRecordingUI(false);
        sendVoiceBlob(blob).catch(() => {});
      };

      recorder.start();
      setRecordingUI(true);
      setHint("录音中…（最长 15 秒）");

      recordingTimeout = setTimeout(() => {
        stopRecording();
      }, 15000);
    })
    .catch(() => {
      setHint("麦克风权限被拒绝了喵。");
    });
}

function stopRecording() {
  if (!isRecording) return;
  if (recordingTimeout) clearTimeout(recordingTimeout);
  recordingTimeout = null;

  try {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  } catch {
    setRecordingUI(false);
  }
  setHint("发送中…");
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendVoiceBlob(blob) {
  addBubble("🎙️（语音）", "user");
  pushHistory("user", "（语音）");

  const dataUrl = await blobToDataURL(blob);

  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_base64: dataUrl,
      mimeType: blob.type || "audio/webm",
      history: chatHistory,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    addBubble("喵…我这边语音处理失败了。", "cat");
    setHint("");
    return;
  }

  const transcript = data.transcript || "";
  const replyText = data.replyText || "喵~";
  const audioB64 = data.audio_base64;
  const audioMime = data.audio_mime || "audio/mpeg";

  if (transcript) {
    addBubble(`🎙️ ${transcript}`, "user");
    pushHistory("user", transcript);
  }

  addBubble("（洛洛在用语音回复你）", "cat");
  pushHistory("assistant", replyText);

  setHint("加载语音中…");

  if (audioB64) {
    await playVoiceAudioNoLimit(audioB64, audioMime);
  }

  setHint("");
}

async function playVoiceAudioNoLimit(b64, mime = "audio/mpeg") {
  cleanupVoiceAudio();

  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  audio.preload = "auto";

  currentVoiceAudio = audio;
  currentVoiceUrl = url;

  return await new Promise((resolve) => {
    const finish = () => {
      // ✅ 音频结束：动画再继续0.3秒，然后定格回第一帧
      setTimeout(() => {
        showIdleFrame();
        cleanupVoiceAudio();
        resolve();
      }, 300);
    };

    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", () => {
      showIdleFrame();
      cleanupVoiceAudio();
      setHint("语音播放失败了喵。");
      setTimeout(() => setHint(""), 1200);
      resolve();
    }, { once: true });

    audio.play().then(() => {
      startSpeakLoop(); // ✅ 真正开始播放才开始说话动画
    }).catch(() => {
      // 播放被浏览器拦截：保持定格
      showIdleFrame();
      setHint("浏览器拦截了自动播放：请再点一下页面或再发一次喵。");
      setTimeout(() => setHint(""), 1800);
      cleanupVoiceAudio();
      resolve();
    });
  });
}

// ===============================
// 事件
// ===============================
sendBtn.addEventListener("click", sendTextMessage);

inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    sendTextMessage();
  }
});

if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (!isRecording) startRecording();
    else stopRecording();
  });
}
