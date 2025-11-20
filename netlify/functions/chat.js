const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",  // Change to your GitHub Pages domain in production
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Expected POST request",
    };
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: "API key not configured",
      };
    }

    const body = JSON.parse(event.body);
    const context = body.context || "";
    const question = body.contents || "";

    if (!question) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: "Missing 'contents' (user question)",
      };
    }

    // Build prompt
    const prompt = 
      `Based ONLY on the following research paper content, answer the user's question.\n\n` +
      `PAPER CONTENT:\n${context}\n\n` +
      `USER QUESTION: ${question}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    });

    const botText = result.response.text();

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ text: botText }),
    };

  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: "Server error",
    };
  }
};
