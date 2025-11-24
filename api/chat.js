import fetch from "node-fetch";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  // 1️⃣ DeepSeek
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
    if (deepseekData?.choices?.[0]?.message?.content) {
      return res.json({ source: "deepseek", reply: deepseekData.choices[0].message.content });
    }
  } catch (err) {
    console.log("DeepSeek error:", err.message);
  }

  // 2️⃣ Gemini
  try {
    const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = await genAI.listModels();
    const modelId = models.find(m => m.supportedMethods.includes("generateText"))?.name;

    if (modelId) {
      const geminiResp = await genAI.generateText({
        model: modelId,
        prompt: message,
        temperature: 0.7,
      });
      if (geminiResp?.candidates?.[0]?.content) {
        return res.json({ source: "gemini", reply: geminiResp.candidates[0].content });
      }
    }
  } catch (err) {
    console.log("Gemini error:", err.message);
  }

  // 3️⃣ OpenAI
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

  return res.status(500).json({ error: "All AI providers failed." });
}
