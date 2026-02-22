// ===============================
// 橘猫帧动画（待机 + 说话）
// ===============================
const catEl = document.getElementById("fatcat");

// 待机（原本 webp/0001.webp ~ 0151.webp）
const IDLE_START = 1;
const IDLE_END = 151;

// 说话（webp/speak/frame_0001.webp ~ frame_0105.webp）
const SPEAK_START = 1;
const SPEAK_END = 105;

let mode = "idle"; // "idle" | "speak"
let frameIndex = IDLE_START;
let dir = 1;
let timer = null;

function getIdleFrame(n) {
  const num = String(n).padStart(4, "0");
  return `/webp/${num}.webp`;
}

function getSpeakFrame(n) {
  const num = String(n).padStart(4, "0");
  return `/webp/speak/frame_${num}.webp`;
}

function stopAnim() {
  if (timer) clearInterval(timer);
  timer = null;
}

function startIdle() {
  catEl.classList.remove("speaking");
  mode = "idle";
  frameIndex = IDLE_START;
  dir = 1;

  stopAnim();
  timer = setInterval(() => {
    catEl.src = getIdleFrame(frameIndex);
    frameIndex += dir;

    if (frameIndex > IDLE_END) {
      dir = -1;
      frameIndex = IDLE_END - 1;
    }
    if (frameIndex < IDLE_START) {
      dir = 1;
      frameIndex = IDLE_START;
    }
  }, 33);
}

function startSpeak() {
  catEl.classList.add("speaking");
  mode = "speak";
  frameIndex = SPEAK_START;

  stopAnim();
  timer = setInterval(() => {
    catEl.src = getSpeakFrame(frameIndex);
    frameIndex += 1;
    if (frameIndex > SPEAK_END) frameIndex = SPEAK_START;
  }, 33);
}

startIdle();

// ===============================
// 🎵 背景音乐：默认关闭 + 按钮控制
// ===============================
const bgmEl = document.getElementById("bgm");
const musicToggleBtn = document.getElementById("musicToggle");
const BGM_LS_KEY = "fatcat_bgm_on_v1";

function setMusicUI(on) {
  if (!musicToggleBtn) return;
  musicToggleBtn.classList.toggle("on", on);
  musicToggleBtn.title = on ? "背景音乐：播放中（点击关闭）" : "背景音乐：关闭（点击播放）";
  musicToggleBtn.textContent = on ? "♪" : "♪";
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

function getSavedBgmOn() {
  try { return localStorage.getItem(BGM_LS_KEY) === "1"; } catch { return false; }
}
function saveBgmOn(on) {
  try { localStorage.setItem(BGM_LS_KEY, on ? "1" : "0"); } catch {}
}

async function setupBgm() {
  if (!bgmEl) return;

  // 默认关闭：不自动播放
  pauseBgm();
  setMusicUI(false);

  // 如果你希望“上次打开过就自动打开”，把下面这段打开：
  // const saved = getSavedBgmOn();
  // if (saved) {
  //   const ok = await playBgm();
  //   setMusicUI(ok);
  //   saveBgmOn(ok);
  // }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener("click", async () => {
      const isPlaying = bgmEl && !bgmEl.paused;
      if (isPlaying) {
        pauseBgm();
        setMusicUI(false);
        saveBgmOn(false);
      } else {
        const ok = await playBgm();
        setMusicUI(ok);
        saveBgmOn(ok);
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
const hintEl = document.getElementById("hint");

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

function setHint(text) {
  if (!hintEl) return;
  hintEl.textContent = text || "";
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
// 🐱 进入页面第一句话（原样保留）
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
  setHint("");

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
  } catch (err) {
    addBubble("橘猫网络开小差了。", "cat");
  }
}

// ===============================
// 语音录制 + 发送 + 播放（固定 5 秒）
// ===============================
let mediaStream = null;
let recorder = null;
let chunks = [];
let recordingTimeout = null;
let isRecording = false;

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
      // 尽量用 webm/opus（兼容最好）
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

      // 最长 15 秒自动停止
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
  // 为了 UI 干净：先放一个用户占位
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

  // 把用户占位替换成转写（不改历史结构，避免复杂；直接再追加一条）
  if (transcript) {
    addBubble(`🎙️ ${transcript}`, "user");
    pushHistory("user", transcript);
  }

  // 语音回复：不刷屏，只显示一行提示
  addBubble("（洛洛在用语音回复你）", "cat");
  pushHistory("assistant", replyText);

  setHint("加载语音中…");

  // 播放固定 5 秒音频 + 播放说话动画
  if (audioB64) {
    await playFixed5sAudio(audioB64, audioMime);
  }

  setHint("");
}

async function playFixed5sAudio(b64, mime) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const audioBuf = await audioCtx.decodeAudioData(binary.buffer.slice(0));

  const startAt = audioCtx.currentTime + 0.02;
  const targetDur = 5.0;

  // ✅ 说话动画：一直循环到“语音真正结束”为止
  startSpeak();

  const done = new Promise((resolve) => {
    let ended = false;
    const finish = async () => {
      if (ended) return;
      ended = true;
      startIdle(); // ✅ 语音一结束立马恢复蹦迪
      try { await audioCtx.close(); } catch {}
      resolve();
    };

    if (audioBuf.duration >= targetDur) {
      const src = audioCtx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(audioCtx.destination);
      src.onended = finish;
      src.start(startAt, 0, targetDur);
      src.stop(startAt + targetDur);
    } else {
      const src1 = audioCtx.createBufferSource();
      src1.buffer = audioBuf;
      src1.connect(audioCtx.destination);
      src1.start(startAt);
      src1.stop(startAt + audioBuf.duration);

      const remain = targetDur - audioBuf.duration;
      const silentBuf = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * remain), audioCtx.sampleRate);
      const src2 = audioCtx.createBufferSource();
      src2.buffer = silentBuf;
      src2.connect(audioCtx.destination);
      src2.onended = finish; // ✅ 最后一段结束触发恢复
      src2.start(startAt + audioBuf.duration);
      src2.stop(startAt + targetDur);
    }
  });

  await done;
}

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
