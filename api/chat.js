import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing message" });
  }

  // ✅ 输入上限：800 字符（省钱+安全）
  if (message.length > 800) {
    return res.status(400).json({ error: "Message too long (max 800 chars)" });
  }

  try {
    const resp = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        { role: "system", content: "你是一只傲娇但聪明的大橘猫助手，回答简短、可爱、嘴硬一点。" },
        { role: "user", content: message }
      ],
      // ✅ 输出上限：200 tokens
      max_output_tokens: 200
    });

    return res.status(200).json({ reply: resp.output_text || "" });
  } catch (err) {
    return res.status(500).json({ error: "OpenAI request failed", detail: String(err?.message || err) });
  }
}