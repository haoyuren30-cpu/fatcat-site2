// api/chat.js  —— 使用 Chat Completions（最稳定）

const OpenAI = require("openai").default;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing message" });
  }

  if (message.length > 800) {
    return res.status(400).json({ error: "Message too long (max 800 chars)" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "你是一只傲娇但聪明的大橘猫助手，普通日常聊天必须用中文回复一到两句，注意联系上下文，如果用户询问知识检索，回复不超过20句。简短、可爱、说话甜一点。"
        },
        { role: "user", content: message }
      ],
      max_tokens: 200
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "OpenAI request failed",
      detail: String(err?.message || err)
    });
  }
};