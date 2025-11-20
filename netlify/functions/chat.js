const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("API key is not configured.");
    }

    const body = JSON.parse(event.body);
    const pageContext = body.context || "";
    const userMessage = body.contents || "";

    if (!userMessage) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing 'contents' in request." }) };
    }

    const prompt =
      `Based ONLY on the following research paper content, answer the user's question.\n\n` +
      `PAPER CONTENT:\n${pageContext}\n\n` +
      `USER QUESTION: ${userMessage}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // This model name WILL work with the "latest" library version
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // The 'generateContent' method expects a simple string prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };

  } catch (err) {
    console.error("Function Error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
