// api/chat.js  (CommonJS)
// 目的：
// 1) 用 Responses API 调 OpenAI
// 2) 不管 output_text 在哪，都尽量把回复抽出来
// 3) 如果抽不出来，返回 debug 信息，告诉你 OpenAI 实际返回了什么结构

const OpenAI = require("openai").default;

function extractText(resp) {
  if (!resp) return "";

  // 最理想：SDK 直接提供 output_text
  if (typeof resp.output_text === "string" && resp.output_text.trim()) {
    return resp.output_text.trim();
  }

  // 兜底：遍历 output -> content 把所有 text 拼起来
  try {
    const chunks = [];
    const out = Array.isArray(resp.output) ? resp.output : [];
    for (const item of out) {
      const content = Array.isArray(item.content) ? item.content : [];
      for (const c of content) {
        // 常见：{ type:"output_text", text:"..." }
        if (typeof c?.text === "string" && c.text.trim()) chunks.push(c.text.trim());
        // 有些 SDK/模型会放在其它字段里（尽量兜底）
        if (typeof c?.content === "string" && c.content.trim()) chunks.push(c.content.trim());
      }
    }
    return chunks.join("\n").trim();
  } catch {
    return "";
  }
}

module.exports = async function handler(req, res) {
  // 允许浏览器跨域（可选；同域一般不需要，但加了更稳）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY in environment variables"
      });
    }

    const { message } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Missing message" });
    }

    // ✅ 输入上限：800 字符
    if (message.length > 800) {
      return res.status(400).json({ error: "Message too long (max 800 chars)" });
    }

    const openai = new OpenAI({ apiKey });

    const resp = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "system",
          content:
            "你是一只傲娇但聪明的大橘猫助手。每次必须输出一句中文回复，不能空，尽量简短、有点嘴硬。"
        },
        { role: "user", content: message }
      ],
      max_output_tokens: 200
    });

    const reply = extractText(resp);

    // 如果还是空：返回 debug（不影响你上线，先把原因查出来）
    if (!reply) {
      return res.status(200).json({
        reply: "",
        debug: {
          note: "Reply extracted as empty. This usually means output_text is empty and output content didn't contain text.",
          model: resp?.model,
          id: resp?.id,
          has_output_text: typeof resp?.output_text === "string" ? resp.output_text.length : null,
          output_len: Array.isArray(resp?.output) ? resp.output.length : null,
          output_types: Array.isArray(resp?.output) ? resp.output.map(o => o?.type) : null,
          first_item: resp?.output?.[0] ? {
            type: resp.output[0]?.type,
            content_types: Array.isArray(resp.output[0]?.content)
              ? resp.output[0].content.map(c => c?.type)
              : null
          } : null
        }
      });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "OpenAI request failed",
      detail: String(err?.message || err)
    });
  }
};