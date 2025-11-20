const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",  // Consider restricting this to your GitHub Pages domain
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle pre-flight OPTIONS requests for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // Ensure it's a POST request
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Method Not Allowed",
    };
  }

  try {
    // Securely get the API key from Netlify environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "API key is not configured." }),
      };
    }

    const body = JSON.parse(event.body);
    const pageContext = body.context || "";
    const userMessage = body.contents || "";

    if (!userMessage) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing 'contents' (the user's question) in the request body." }),
      };
    }

    // Construct the prompt for the AI
    const prompt = 
      `Based ONLY on the following research paper content, answer the user's question.\n\n` +
      `PAPER CONTENT:\n${pageContext}\n\n` +
      `USER QUESTION: ${userMessage}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // *** THIS IS THE CORRECTED MODEL NAME ***
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Return the successful response
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
      body: JSON.stringify({ error: "An internal server error occurred." }),
    };
  }
};
