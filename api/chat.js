// api/chat.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, context: paperSectionsInput } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required." });
    }

    const MODELS = [
      "models/gemini-2.5-flash",
      "models/gemini-2.5-pro",
      "models/gemini-2.0-flash"
    ];

    const sectionKeywords = {
      'Abstract': ['abstract', 'overview', 'tldr'],
      'Introduction': ['introduction', 'background', 'context', 'motivation'],
      'Methods': ['method', 'experiment', 'procedure', 'approach', 'technique', 'how'],
      'Results': ['result', 'finding', 'observation', 'data', 'what did they find'],
      'Conclusion': ['conclusion', 'takeaway', 'discussion', 'summarize', 'summary']
    };

    const getSmartContext = (query, sectionContent) => {
      const stopWords = new Set(['a','an','the','is','in','on','of','for','to','what','did','they','how','were']);
      const queryKeywords = query.toLowerCase().split(/\s+/).filter(w => !stopWords.has(w) && w.length > 3);
      if (!queryKeywords.length) return sectionContent.slice(0,4000);

      const paragraphs = sectionContent.split(/\n\s*\n/).filter(p => p.trim().length > 10);
      const relevant = new Set();

      paragraphs.forEach(p => {
        for (const kw of queryKeywords) {
          if (new RegExp(`\\b${kw}\\b`, "i").test(p)) {
            relevant.add(p);
            break;
          }
        }
      });

      return relevant.size ? [...relevant].join("\n\n") : sectionContent.slice(0,4000);
    };

    const paperSections = paperSectionsInput || {};

    let useContext = false;
    let contextToSend = "";
    let detectedSection = "General";

    if (Object.keys(paperSections).length) {
      outerLoop: for (const [section, keywords] of Object.entries(sectionKeywords)) {
        for (const kw of keywords) {
          if (new RegExp(`\\b${kw}\\b`, "i").test(message)) {
            if (paperSections[section]) {
              useContext = true;
              detectedSection = section;
              contextToSend = getSmartContext(message, paperSections[section]);
              break outerLoop;
            }
          }
        }
      }

      if (/summarize|overview|summary|tl;dr/i.test(message)) {
        useContext = true;
        detectedSection = "Full";
        contextToSend = paperSections['Full'] || "";
      }
    }

    const prompt = useContext
      ? `Use ONLY the following context to answer the question.
If the answer is not in the context, say: "Not found in provided context."

CONTEXT:
${contextToSend}

QUESTION:
${message}`
      : message;

    let lastError = null;

    for (const model of MODELS) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
            })
          }
        );

        if (!resp.ok) {
          lastError = await resp.text();
          continue;
        }

        const data = await resp.json();
        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (answer) return res.json({ model_used: model, response: answer });
        lastError = `${model}: Empty response`;
      } catch (e) {
        lastError = `${model}: ${e.message}`;
      }
    }

    res.status(500).json({ error: "All Gemini models failed.", details: lastError });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
