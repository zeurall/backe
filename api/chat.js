import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "OpenRouter API key not set" });
  }

  try {
    const resp = await fetch("https://api.openrouter.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "x-ai/grok-4.1-fast:free",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        stream: false,
        reasoning_enabled: true // toggle reasoning if needed
      })
    });

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (reply) return res.json({ source: "grok-4.1", reply });
    else return res.status(500).json({ error: "Grok 4.1 returned empty response" });

  } catch (err) {
    console.log("OpenRouter Grok error:", err.message);
    return res.status(500).json({ error: "Grok 4.1 API request failed" });
  }
}
