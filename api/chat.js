import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  // =======================
  // 1️⃣ DeepSeek
  // =======================
  try {
    const deepseekResp = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: message }],
        }),
      }
    );

    const deepseekData = await deepseekResp.json();
    const deepseekReply = deepseekData?.choices?.[0]?.message?.content;

    if (deepseekReply) return res.json({ source: "deepseek", reply: deepseekReply });
    else console.log("DeepSeek returned empty response:", deepseekData);
  } catch (err) {
    console.log("DeepSeek error:", err.message);
  }

  // =======================
  // 2️⃣ Grok (xAI)
  // =======================
  try {
    const grokResp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-latest",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message }
        ],
        temperature: 0,
        stream: false
      }),
    });

    const grokData = await grokResp.json();
    const grokReply = grokData?.choices?.[0]?.message?.content;

    if (grokReply) return res.json({ source: "grok", reply: grokReply });
    else console.log("Grok returned empty response:", grokData);
  } catch (err) {
    console.log("Grok error:", err.message);
  }

  // =======================
  // 3️⃣ AllenAI Olmo fallback
  // =======================
  try {
    const olmoResp = await fetch("https://api.allenai.org/olmo/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // your Olmo API key here
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "allenai/olmo-3-32b-think",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    const olmoData = await olmoResp.json();
    const olmoReply = olmoData?.choices?.[0]?.message?.content;

    if (olmoReply) return res.json({ source: "olmo", reply: olmoReply });
    else console.log("Olmo returned empty response:", olmoData);
  } catch (err) {
    console.log("Olmo error:", err.message);
  }

  return res.status(500).json({ error: "All AI providers failed." });
}
