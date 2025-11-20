const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // in production restrict to your GitHub Pages domain
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Expected POST request",
    };
  }

  try {
    // API key from Netlify environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: "API key not configured",
      };
    }

    // Parse request body
    const requestBody = JSON.parse(event.body);

    // Gemini SDK
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Fetch response from Gemini
    const result = await model.generateContent(requestBody);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(result.response),
    };

  } catch (error) {
    console.error("Error proxying request:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: "Error processing your request",
    };
  }
};
