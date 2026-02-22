// api/voice.js
// 语音聊天：接收 base64 音频 -> 转文字 -> 生成 1-2 句回复 -> TTS 输出音频（前端统一裁剪/补齐到5秒）

const OpenAI = require("openai").default;
const { toFile } = require("openai");

// ===== 可调参数 =====
const HISTORY_WINDOW = 10;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 放宽到15MB，15秒webm一般足够
// ===================

function stripDataUrl(b64) {
  if (typeof b64 !== "string") return "";
  const idx = b64.indexOf(",");
  return b64.startsWith("data:") && idx !== -1 ? b64.slice(idx + 1) : b64;
}

function splitSentences(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .split(/(?<=[。！？!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function clampSentences(text, maxSentences) {
  const parts = splitSentences(text);
  if (parts.length <= maxSentences) return String(text).trim();
  return parts.slice(0, maxSentences).join(" ");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { audio_base64, mimeType, history } = req.body || {};
  if (typeof audio_base64 !== "string" || !audio_base64.trim()) {
    return res.status(400).json({ error: "Missing audio_base64" });
  }

  const b64 = stripDataUrl(audio_base64);
  let buf;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64" });
  }

  if (buf.length <= 0) return res.status(400).json({ error: "Empty audio" });
  if (buf.length > MAX_AUDIO_BYTES) {
    return res.status(400).json({ error: "Audio too large" });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          m =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .slice(-HISTORY_WINDOW)
    : [];

  // 注入真实日期
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const systemPrompt = [
    `你叫洛洛，是一只可爱的胖橘猫，是大胖美短猫罗罗的弟弟。你说话要可爱、口语、轻松，主要提供情绪价值。`,
    `今天的真实日期是：${todayStr}。如果用户问“今天几号/日期”，必须直接回答这个日期，不要编造。`,
    `永远不要让用户去“搜索/查资料/找链接”，也不要声称你已经联网或搜索。`,
    `无论用户说什么，你都只回复不超过 2 句话（尽量 1 句话）。`,
    `如果用户情绪低落：先共情，再给一个很小的行动建议；如果用户开心：一起开心并轻轻鼓励。`,
  ].join("\n");

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1) STT
    const ext = (mimeType && String(mimeType).includes("mp4")) ? "m4a" : "webm";
    const file = await toFile(buf, `voice.${ext}`, { type: mimeType || "audio/webm" });

    // whisper-1 是稳定可用的转写模型名（如你已有别的模型，可自行替换）
    const transcript = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    const userText = (transcript && transcript.text ? transcript.text : "").trim() || "（听不清）";

    // 2) 生成回复（文本）
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...safeHistory.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userText },
      ],
      temperature: 0.8,
      max_tokens: 160,
    });

    let replyText =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "喵…我刚刚没听清，你再说一次嘛。";

    replyText = clampSentences(replyText, 2);

    // 3) TTS（返回 mp3，前端统一裁剪/补齐到5秒）
    // 用“喵~”增强可爱感
    const ttsText = `喵呜喵呜~ ${replyText}`;

    const speech = await client.audio.speech.create({
      model: "tts-1",
      voice: "shimmer",
      input: ttsText,
      format: "mp3",
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioOutB64 = audioBuffer.toString("base64");

    return res.status(200).json({
      transcript: userText,
      replyText,
      audio_base64: audioOutB64,
      audio_mime: "audio/mpeg",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "OpenAI voice request failed",
      detail: String(err?.message || err),
    });
  }
};
