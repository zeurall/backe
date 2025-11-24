import fetch from "node-fetch";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  } catch (err) {
    console.log("DeepSeek error:", err.message);
  }

  // =======================
  // 2️⃣ Gemini (GoogleGenerativeAI)
  // =======================
  try {
    const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5" });

    const geminiResp = await model.generateContent({
      prompt: message,
      temperature: 0.7
    });

    const geminiReply = geminiResp?.candidates?.[0]?.content;
    if (geminiReply) return res.json({ source: "gemini", reply: geminiReply });
  } catch (err) {
    console.log("Gemini error:", err.message);
  }

  // =======================
  // 3️⃣ Grok (xAI)
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
  } catch (err) {
    console.log("Grok error:", err.message);
  }

  // =======================
  // 4️⃣ OpenAI fallback
  // =======================
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });

    const openaiReply = completion?.choices?.[0]?.message?.content;
    if (openaiReply) return res.json({ source: "openai", reply: openaiReply });
  } catch (err) {
    console.log("OpenAI error:", err.message);
  }

  // =======================
  // If all fail
  // =======================
  return res.status(500).json({ error: "All AI providers failed." });
}
