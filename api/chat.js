import fetch from "node-fetch";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  /* =======================
     1. TRY DEEPSEEK FIRST
  ======================= */

  try {
    const deepseekResponse = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const deepseekData = await deepseekResponse.json();

    if (deepseekData?.choices?.[0]?.message?.content) {
      return res.json({
        source: "deepseek",
        reply: deepseekData.choices[0].message.content
      });
    }

    console.log("DeepSeek failed, trying Gemini...");
  } catch (error) {
    console.log("DeepSeek error:", error.message);
  }

  /* =======================
     2. TRY GEMINI NEXT
  ======================= */

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const geminiResult = await model.generateContent(message);
    const geminiReply = geminiResult.response.text();

    if (geminiReply) {
      return res.json({
        source: "gemini",
        reply: geminiReply
      });
    }

    console.log("Gemini failed, trying OpenAI...");
  } catch (error) {
    console.log("Gemini error:", error.message);
  }

  /* =======================
     3. FINALLY TRY OPENAI
  ======================= */

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }]
    });

    const openaiReply = completion?.choices?.[0]?.message?.content;

    if (openaiReply) {
      return res.json({
        source: "openai",
        reply: openaiReply
      });
    }

  } catch (error) {
    console.log("OpenAI error:", error.message);
    return res.status(500).json({ error: "All AI providers failed." });
  }
}
