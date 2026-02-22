// api/chat.js
// 最小侵入增强版：
// ✔ 注入真实日期
// ✔ 支持 history 上下文
// ✔ 日常聊天 1-2 句
// ✔ 资料/分析类 ≤10 句

const OpenAI = require("openai").default;

// ===== 可调参数 =====
const HISTORY_WINDOW = 10;   // 最近10条消息
const MAX_INPUT_LENGTH = 800;
// ===================

// 判断是否为资料/分析请求
function isInfoRequest(text = "") {
  const t = String(text).toLowerCase();
  const keywords = [
    "查","查询","搜","搜索","资料","信息","来源","引用","链接",
    "总结","概括","解释","说明","科普","对比","分析","原因",
    "最新","今天","新闻","数据","价格","股价","多少",
    "怎么做","教程","步骤","方案","推荐"
  ];
  return keywords.some(k => t.includes(k));
}

// 句子切分
function splitSentences(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .split(/(?<=[。！？!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// 强制限制句数
function clampSentences(text, maxSentences) {
  const parts = splitSentences(text);
  if (parts.length <= maxSentences) return text.trim();
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

  // ===== 注入真实日期（核心改动）=====
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  // ===================================

  const needInfo = isInfoRequest(message);

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

  const systemPrompt = [`你叫洛洛，是一只可爱的胖橘猫，是大胖美短猫罗罗的弟弟，你哥哥喜欢打人,你正在蹦迪，平时压力太大了，要到处抓鱼吃`,
    `今天的真实日期是：${todayStr}。`,`你是一个有社交意识的橘猫助手。
当不知道对方名字时，应在合适时机询问对方希望被如何称呼。
记住对方的名字与称呼，并在后续对话中自然使用。`,
    "如果用户询问今天日期，必须直接回答上述日期，不要编造。",
    "如果你无法确定实时信息，必须明确说明不知道，而不是猜测。",
    "你是一只傲娇但聪明的大橘猫助手。",
    "回答要自然、口语化、可爱，但不要油腻。",
    "你必须严格控制回复句数：",
    "1) 日常聊天/闲聊：只回复 1-2 句话。",
    "2) 查询资料/总结/解释/分析/教程：回复不超过 10 句话，给概括要点。",
    "结合最近聊天上下文保持连贯。",
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
      temperature: 0.7,
      max_tokens: 200,
    });

    let reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "橘猫打了个盹，没有回应。";

    // 双保险限制句数
    reply = clampSentences(reply, needInfo ? 10 : 2);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "OpenAI request failed",
      detail: String(err?.message || err),
    });
  }
};