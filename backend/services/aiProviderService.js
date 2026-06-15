/**
 * AI Provider Service.
 * Implements a unified abstraction for multimodal (vision) completions.
 * Fallback priority:
 *   1. Gemini (gemini-1.5-flash)
 *   2. OpenAI (gpt-4o-mini / gpt-4o)
 *   3. Grok / Groq (llama-3.2-11b-vision-preview or grok-vision models)
 */

const fetch = require('node-fetch');

// Helper to strip standard data URL prefixes if present in base64 string
const cleanBase64 = (base64Str) => {
  if (!base64Str) return '';
  return base64Str.replace(/^data:image\/[a-z]+;base64,/, '');
};

// ── 1. Gemini Completion ─────────────────────────────────────────────────────
// const geminiVisionCompletion = async (base64Image, promptText) => {
//   const apiKey = process.env.GEMINI_API_KEY;
//   if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

//   const model = process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash';
//   const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

//   const requestBody = {
//     contents: [
//       {
//         parts: [
//           { text: promptText },
//           {
//             inlineData: {
//               mimeType: 'image/jpeg',
//               data: cleanBase64(base64Image)
//             }
//           }
//         ]
//       }
//     ],
//     generationConfig: {
//       temperature: 0.1,
//       responseMimeType: 'application/json'
//     }
//   };

//   const response = await fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(requestBody)
//   });

//   if (!response.ok) {
//     const errText = await response.text();
//     throw new Error(`Gemini API error ${response.status}: ${errText}`);
//   }

//   const data = await response.json();
//   const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
//   if (!text) throw new Error('Empty response from Gemini vision model');
//   return text;
// };

// ── 2. OpenAI Completion ─────────────────────────────────────────────────────
// const openAiVisionCompletion = async (base64Image, promptText) => {
//   const apiKey = process.env.OPENAI_API_KEY;
//   if (!apiKey) throw new Error('OPENAI_API_KEY is not defined');

//   const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
//   const url = 'https://api.openai.com/v1/chat/completions';

//   const cleanB64 = cleanBase64(base64Image);
//   const imageUrl = `data:image/jpeg;base64,${cleanB64}`;

//   const requestBody = {
//     model: model,
//     messages: [
//       {
//         role: 'user',
//         content: [
//           { type: 'text', text: promptText },
//           {
//             type: 'image_url',
//             image_url: { url: imageUrl }
//           }
//         ]
//       }
//     ],
//     temperature: 0.1,
//     response_format: { type: 'json_object' }
//   };

//   const response = await fetch(url, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${apiKey}`
//     },
//     body: JSON.stringify(requestBody)
//   });

//   if (!response.ok) {
//     const errText = await response.text();
//     throw new Error(`OpenAI API error ${response.status}: ${errText}`);
//   }

//   const data = await response.json();
//   const text = data?.choices?.[0]?.message?.content;
//   if (!text) throw new Error('Empty response from OpenAI vision model');
//   return text;
// };

// ── 3. Grok / Groq Completion ───────────────────────────────────────────────
const grokVisionCompletion = async (base64Image, promptText) => {
  // Try GROK_API_KEY (xAI) or GROQ_API_KEY (Groq client)
  const apiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Neither GROK_API_KEY nor GROQ_API_KEY is defined');

  // If using Groq endpoint
  const isGroq = !!process.env.GROQ_API_KEY;
  const url = isGroq 
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions'; // x.ai endpoint

  const model = isGroq
    ? (process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview')
    : (process.env.GROK_VISION_MODEL || 'grok-2-vision-1212');

  const cleanB64 = cleanBase64(base64Image);
  const imageUrl = `data:image/jpeg;base64,${cleanB64}`;

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: { url: imageUrl }
          }
        ]
      }
    ],
    temperature: 0.1
    // Groq and xAI vision models support JSON responses differently. We ask for it in prompt.
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Grok/Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Grok/Groq vision model');
  return text;
};

// ── Core Orchestrator with Fallbacks ─────────────────────────────────────────
exports.generateVisionCompletion = async (base64Image, promptText) => {
  const providers = [
    // { name: 'Gemini', fn: () => geminiVisionCompletion(base64Image, promptText), key: process.env.GEMINI_API_KEY },
    // { name: 'OpenAI', fn: () => openAiVisionCompletion(base64Image, promptText), key: process.env.OPENAI_API_KEY },
    { name: 'Grok/Groq', fn: () => grokVisionCompletion(base64Image, promptText), key: process.env.GROK_API_KEY || process.env.GROQ_API_KEY }
  ];

  let lastError = null;

  for (const provider of providers) {
    if (provider.key) {
      try {
        console.log(`[AI Provider] Attempting completions using ${provider.name}...`);
        const result = await provider.fn();
        console.log(`[AI Provider] Successfully generated response via ${provider.name}.`);
        return result;
      } catch (err) {
        console.error(`[AI Provider] ${provider.name} failed:`, err.message);
        lastError = err;
      }
    } else {
      console.log(`[AI Provider] Skipping ${provider.name} (API Key not set).`);
    }
  }

  throw new Error(`All vision AI providers failed. Last error: ${lastError ? lastError.message : 'No API keys set'}`);
};
