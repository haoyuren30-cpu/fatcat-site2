// api/chat.js
// 文本聊天：永远 1-2 句话，只给情绪价值，不做“搜索关键词”判断。

const OpenAI = require("openai").default;

// ===== 可调参数 =====
const HISTORY_WINDOW = 10;   // 最近10条消息
const MAX_INPUT_LENGTH = 800;
// ===================

// 句子切分（中英都尽量兼容）
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

  const { message, history } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing message" });
  }

  if (message.length > MAX_INPUT_LENGTH) {
    return res
      .status(400)
      .json({ error: "Message too long (max 800 chars)" });
  }

  // 注入真实日期（可保留）
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 安全过滤历史
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

  const systemPrompt = [
    `你叫洛洛，是一只可爱的胖橘猫，是大胖美短猫罗罗的弟弟。你说话要可爱、口语、轻松，主要提供情绪价值。`,
    `今天的真实日期是：${todayStr}。如果用户问“今天几号/日期”，必须直接回答这个日期，不要编造。`,
    `永远不要让用户去“搜索/查资料/找链接”，也不要声称你已经联网或搜索。`,
    `无论用户说什么，你都只回复不超过 2 句话（尽量 1 句话）。`,
    `如果用户情绪低落：先共情，再给一个很小的行动建议；如果用户开心：一起开心并轻轻鼓励。`,
  ].join("\n");

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const messages = [
      { role: "system", content: systemPrompt },
      ...safeHistory.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.8,
      max_tokens: 160,
    });

    let reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "喵…我刚刚打了个盹，你再说一遍嘛。";

    reply = clampSentences(reply, 2);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "OpenAI request failed",
      detail: String(err?.message || err),
    });
  }
};
