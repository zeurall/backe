import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "API key not set" });
    }

    const { context = "", contents = "" } = req.body;

    if (!contents) {
      return res.status(400).json({ error: "Missing 'contents'" });
    }

    const prompt = `
Based ONLY on the following research paper content, answer the user's question.

PAPER CONTENT:
${context}

USER QUESTION:
${contents}
    `;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.status(200).json({ text });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
