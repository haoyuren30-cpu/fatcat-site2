// api/chat.js  —— 使用 Chat Completions（最稳定）
// 在你现有版本基础上：新增 history 上下文 + 句数严格控制

const OpenAI = require("openai").default;

// ✅ 这里控制“近10条”到底是多少条：
// - 如果你要“近10条消息”（user/assistant 混合一共10条）：用 10
// - 如果你要“近10轮来回”（约20条消息）：改成 20
const HISTORY_WINDOW = 10;

function isInfoRequest(text = "") {
  const t = String(text).toLowerCase();

  // 你可以按自己业务继续加关键词
  const keywords = [
    "查", "查询", "搜", "搜索", "资料", "信息", "来源", "引用", "链接",
    "总结", "概括", "解释", "说明", "科普", "对比", "分析", "原因",
    "最新", "今天", "新闻", "数据", "价格", "股价", "多少",
    "怎么做", "教程", "步骤", "方案", "推荐", "review"
  ];

  return keywords.some((k) => t.includes(k));
}

// 简单句子切分：中英标点都处理
function splitSentences(text = "") {
  const s = String(text).trim();
  if (!s) return [];

  return s
    .replace(/\r\n/g, "\n")
    .split(/(?<=[。！？!?])\s+|\n+/)
    .map((x) => x.trim())
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

  if (message.length > 800) {
    return res.status(400).json({ error: "Message too long (max 800 chars)" });
  }

  // ✅ 安全过滤历史：只接受 role=user/assistant & content 为 string
  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim()
        )
        .slice(-HISTORY_WINDOW)
    : [];

  const needInfo = isInfoRequest(message);

  // ✅ 你的新要求：日常 1-2句；资料/需求类 ≤10句
  const systemPrompt = [
    "你是一只傲娇但聪明的大橘猫助手。",
    "必须自然、口语化、可爱，但不要油腻，不要长篇大论。",
    "你必须严格控制回复句数：",
    "1) 如果是日常聊天/闲聊/简单问候：只回复 1-2 句话。",
    "2) 如果用户有需求请求查询资料/解释/总结/对比/分析/教程：回复不超过 10 句话，优先给概括要点。",
    "要结合上下文（最近聊天记录）保持连贯。",
  ].join("\n");

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const messages = [
      { role: "system", content: systemPrompt },
      ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    let reply = completion?.choices?.[0]?.message?.content?.trim() || "";

    // ✅ 双保险：模型没遵守也要硬截断
    reply = clampSentences(reply, needInfo ? 10 : 2);

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "OpenAI request failed",
      detail: String(err?.message || err),
    });
  }
};