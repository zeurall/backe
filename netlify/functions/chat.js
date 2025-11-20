// Filename: index.js (for your Cloudflare Worker)

export default {
  async fetch(request, env, ctx) {
    // Allows your GitHub Pages site to make requests to this worker
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // In production, restrict this to your GitHub Pages URL
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Respond to pre-flight requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Expected POST request', { status: 405 });
    }

    // The Gemini API Key is securely stored as an environment variable in Cloudflare
    const GEMINI_API_KEY = env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return new Response('API key not configured', { status: 500 });
    }
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    try {
      // Forward the request body from the client to the Gemini API
      const requestBody = await request.json();

      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await geminiResponse.json();

      // Return the Gemini response to the client
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error proxying request:', error);
      return new Response('Error processing your request', { status: 500 });
    }
  },
};
