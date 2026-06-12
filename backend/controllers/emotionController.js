const emotionAnalysisService = require('../services/emotionAnalysisService');

exports.logEmotion = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId, base64Image, triggerContext } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId is required'
      });
    }

    if (!base64Image) {
      return res.status(400).json({
        status: 'error',
        message: 'base64Image is required'
      });
    }

    const result = await emotionAnalysisService.analyzeEmotion({
      userId,
      sessionId,
      base64Image,
      triggerContext
    });

    if (!result.success) {
      // In case of error (e.g. timeout, service offline), send 200 with fallback data
      // to prevent frontend loops from breaking
      return res.status(200).json({
        status: 'warning',
        message: result.message,
        data: result.fallbackData
      });
    }

    res.status(201).json({
      status: 'success',
      data: result.data
    });
  } catch (error) {
    console.error('[Emotion Controller] Error logging emotion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete facial analysis'
    });
  }
};
