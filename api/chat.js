export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body;
  if (!message)
    return res.status(400).json({ error: "Message is required" });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set" });
  }

  // ✅ Only models YOUR key supports (from your CMD result)
  const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001"
  ];

  for (let model of MODELS) {
    try {
      console.log(`Trying Gemini → ${model}`);

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: message }]
              }
            ]
          })
        }
      );

      const data = await resp.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (reply) {
        return res.json({
          source: model,
          reply
        });
      }

      console.log(`${model} returned empty`);
    } catch (err) {
      console.log(`${model} failed: ${err.message}`);
    }
  }

  return res.status(500).json({ error: "All Gemini models failed" });
}
