import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, openRouterModel } = req.body; // optionally specify OpenRouter model
  if (!message) return res.status(400).json({ error: "Message is required" });

  // Helper to log errors
  const logError = (source, data) => console.log(`${source} failed or empty response:`, JSON.stringify(data));

  // =======================
  // 1️⃣ DeepSeek
  // =======================
  if (process.env.DEEPSEEK_API_KEY) {
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
            model: "DeepSeek-V3.1 Terminus",
            messages: [{ role: "user", content: message }],
          }),
        }
      );

      const deepseekData = await deepseekResp.json();
      const deepseekReply = deepseekData?.choices?.[0]?.message?.content;

      if (deepseekReply) return res.json({ source: "deepseek", reply: deepseekReply });
      else logError("DeepSeek", deepseekData);
    } catch (err) {
      console.log("DeepSeek error:", err.message);
    }
  } else {
    console.log("Skipping DeepSeek: API key not set");
  }

  // =======================
  // 2️⃣ Grok (xAI)
  // =======================
  if (process.env.GROK_API_KEY) {
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
      else logError("Grok", grokData);
    } catch (err) {
      console.log("Grok error:", err.message);
    }
  } else {
    console.log("Skipping Grok: API key not set");
  }

  // =======================
  // 3️⃣ OpenRouter (any model)
  // =======================
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const modelName = openRouterModel || "all-mpnet-base-v2"; // default model
      const openRouterResp = await fetch("https://api.openrouter.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          stream: false
        }),
      });

      const openRouterData = await openRouterResp.json();
      const openRouterReply = openRouterData?.choices?.[0]?.message?.content;

      if (openRouterReply) return res.json({ source: "openrouter", reply: openRouterReply });
      else logError("OpenRouter", openRouterData);
    } catch (err) {
      console.log("OpenRouter error:", err.message);
    }
  } else {
    console.log("Skipping OpenRouter: API key not set");
  }

  // =======================
  // 4️⃣ AllenAI Olmo
  // =======================
  if (process.env.OPENAI_API_KEY) {
    try {
      const olmoResp = await fetch("https://api.allenai.org/olmo/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // your Olmo key
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
      else logError("Olmo", olmoData);
    } catch (err) {
      console.log("Olmo error:", err.message);
    }
  } else {
    console.log("Skipping Olmo: API key not set");
  }

  // =======================
  // All failed
  // =======================
  return res.status(500).json({ error: "All AI providers failed." });
}
