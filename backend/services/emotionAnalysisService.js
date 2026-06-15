const EmotionLog = require('../models/adaptive/EmotionLog');
const { generateVisionCompletion } = require('./aiProviderService');

// System prompt telling the AI models how to format results
const EMOTION_DETECTION_SYSTEM = `You are an expert facial analysis and emotion classification AI.
You will inspect the image of the student and determine if a human face is present.

If a human face is detected:
1. Classify the emotion probabilities (values between 0.00 and 1.00, sum does not need to equal 1) for: happy, neutral, confused, frustrated, sad, engaged.
2. Identify the dominant emotion (must be one of: happy, neutral, confused, frustrated, sad, engaged).

Return ONLY a valid JSON object matching this structure:
{
  "faceDetected": true,
  "emotions": {
    "happy": 0.05,
    "neutral": 0.70,
    "confused": 0.10,
    "frustrated": 0.05,
    "sad": 0.00,
    "engaged": 0.10
  },
  "dominantEmotion": "neutral"
}

If NO face is detected in the frame:
Return ONLY this JSON structure:
{
  "faceDetected": false,
  "emotions": {
    "happy": 0.00,
    "neutral": 1.00,
    "confused": 0.00,
    "frustrated": 0.00,
    "sad": 0.00,
    "engaged": 0.00
  },
  "dominantEmotion": "neutral"
}

Do not include markdown fences, preambles, or explanations outside the JSON.`;

const parseJsonClean = (text) => {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return JSON.parse(cleaned.slice(start, end + 1));
};

exports.analyzeEmotion = async ({ userId, sessionId, base64Image, triggerContext }) => {
  if (!base64Image) {
    throw new Error('Image data is required for emotion detection');
  }

  try {
    const rawResult = await generateVisionCompletion(base64Image, EMOTION_DETECTION_SYSTEM);
    const result = parseJsonClean(rawResult);

    // Create the DB record
    const log = await EmotionLog.create({
      userId,
      sessionId,
      faceDetected: result.faceDetected ?? true,
      emotions: {
        happy: result.emotions?.happy ?? 0,
        neutral: result.emotions?.neutral ?? 1,
        confused: result.emotions?.confused ?? 0,
        frustrated: result.emotions?.frustrated ?? 0,
        sad: result.emotions?.sad ?? 0,
        engaged: result.emotions?.engaged ?? 0
      },
      dominantEmotion: result.dominantEmotion || 'neutral',
      triggerContext: triggerContext || {}
    });

    return {
      success: true,
      data: log
    };
  } catch (error) {
    console.error('[Emotion Service] Analysis failed:', error.message);
    
    // In case of complete AI failure, return a fallback neutral record but do not save it to DB
    // to preserve integrity of statistical data
    return {
      success: false,
      message: error.message,
      fallbackData: {
        faceDetected: false,
        dominantEmotion: 'neutral',
        emotions: { happy: 0, neutral: 1, confused: 0, frustrated: 0, sad: 0, engaged: 0 }
      }
    };
  }
};
