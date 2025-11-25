import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Gemini models your API actually supports
const MODELS = [
  "models/gemini-2.5-flash",
  "models/gemini-2.5-pro",
  "models/gemini-2.0-flash"
];

router.post("/chat", async (req, res) => {
  try {
    const { message, context } = req.body;

    // ✅ SAFETY: context is required (strict research mode)
    if (!context || context.trim() === "") {
      return res
        .status(400)
        .json({ error: "Context is required for this request." });
    }

    if (!message || message.trim() === "") {
      return res
        .status(400)
        .json({ error: "Message is required." });
    }

    const prompt = `
Use ONLY the following context to answer the question.
If the answer is not in the context, say: "Not found in provided context."

CONTEXT:
${context}

QUESTION:
${message}
`;

    let lastError = null;

    // Try models one after the other (fallback system)
    for (const model of MODELS) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }]
                }
              ],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 800
              }
            })
          }
        );

        if (!resp.ok) {
          const err = await resp.text();
          lastError = `${model}: ${err}`;
          continue;
        }

        const data = await resp.json();
        const answer =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (answer) {
          return res.json({
            model_used: model,
            response: answer
          });
        }

        lastError = `${model}: Empty response`;
      } catch (error) {
        lastError = `${model}: ${error.message}`;
      }
    }

    // If all models fail
    return res.status(500).json({
      error: "All Gemini models failed.",
      details: lastError
    });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Internal server error.",
      details: error.message
    });
  }
});

export default router;
