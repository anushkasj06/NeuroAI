import React, { useRef, useState, useEffect } from 'react';
import { emotion } from '../../services/api';

const EMOTION_KEYS = ['happy', 'neutral', 'confused', 'frustrated', 'sad', 'engaged'];
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function normalizeProbabilities(emotions = {}) {
  const normalized = {};
  let total = 0;
  for (const key of EMOTION_KEYS) {
    normalized[key] = clamp01(emotions[key]);
    total += normalized[key];
  }

  if (total > 1.05) {
    for (const key of EMOTION_KEYS) {
      normalized[key] = Number((normalized[key] / total).toFixed(3));
    }
  }
  return normalized;
}

function normalizeEstimate(raw) {
  const total = EMOTION_KEYS.reduce((sum, key) => sum + clamp01(raw[key]), 0) || 1;
  const emotions = {};
  for (const key of EMOTION_KEYS) {
    emotions[key] = Number((clamp01(raw[key]) / total).toFixed(3));
  }
  const dominantEmotion = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  return { dominantEmotion, emotions, faceDetected: true };
}

function estimateLocalEmotion(canvas, previousSignatureRef) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const width = canvas.width;
  const height = canvas.height;
  if (!ctx || !width || !height) {
    return { dominantEmotion: 'unavailable', emotions: null, faceDetected: false };
  }

  const data = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(4, Math.floor(Math.min(width, height) / 40));
  const signature = [];
  let count = 0;
  let sum = 0;
  let sumSq = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const luma = (0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]) / 255;
      signature.push(luma);
      sum += luma;
      sumSq += luma * luma;
      count++;
    }
  }

  const brightness = count ? sum / count : 0;
  const contrast = count ? Math.sqrt(Math.max(0, sumSq / count - brightness * brightness)) : 0;
  const previous = previousSignatureRef.current;
  let motion = 0;
  if (previous?.length === signature.length) {
    for (let i = 0; i < signature.length; i++) {
      motion += Math.abs(signature[i] - previous[i]);
    }
    motion /= signature.length;
  }
  previousSignatureRef.current = signature;

  if (brightness < 0.05 || brightness > 0.97 || contrast < 0.015) {
    return { dominantEmotion: 'unavailable', emotions: null, faceDetected: false };
  }

  return normalizeEstimate({
    engaged: 0.22 + contrast * 1.4 + motion * 0.8,
    happy: 0.08 + brightness * 0.16 + motion * 0.12,
    confused: 0.10 + contrast * 0.55 - motion * 0.18,
    frustrated: 0.05 + (brightness < 0.28 ? 0.06 : 0) + contrast * 0.15,
    sad: 0.04 + (brightness < 0.30 ? 0.08 : 0),
    neutral: 0.30 + Math.max(0, 0.08 - motion),
  });
}

/**
 * WebcamEmotionDetector
 * Reusable React component that accesses the student's webcam using native browser APIs,
 * captures a video frame every 5 seconds, performs facial emotion analysis via backend,
 * and renders a premium UI with real-time emotion telemetry logs.
 * 
 * @param {string} sessionId - The active learning session ID to bind logs to.
 * @param {object} triggerContext - Page or question context context variables (blockId, etc.).
 * @param {function} onEmotionDetected - Callback returning the result data back to parent containers.
 */
const WebcamEmotionDetector = ({ sessionId, triggerContext = {}, onEmotionDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionProbabilities, setEmotionProbabilities] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [emotionSource, setEmotionSource] = useState('vision');

  // Reference stream to clean up when component unmounts
  const streamRef = useRef(null);
  const analyzingRef = useRef(false);
  const lastFrameSignatureRef = useRef(null);

  // Toggle webcam capture
  const handleToggle = async () => {
    if (isActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    try {
      setPermissionError(false);
      const constraints = {
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Play error:", err));
      }
      setIsActive(true);
    } catch (err) {
      console.error('Webcam access error:', err);
      setPermissionError(true);
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setCurrentEmotion(null);
    setEmotionProbabilities(null);
    setAnalysisStatus('');
    setEmotionSource('vision');
  };

  // Auto clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Frame capture timer
  useEffect(() => {
    let intervalId = null;

    if (isActive && sessionId) {
      intervalId = setInterval(() => {
        captureFrame();
      }, 2000); // 2 seconds — fast emotion telemetry
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, sessionId, triggerContext]);

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.paused || video.ended || analyzingRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the current video frame onto the canvas
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert frame to base64 JPEG with quality compression (0.7) to keep payload small
    const base64Image = canvas.toDataURL('image/jpeg', 0.7);
    const localEstimate = estimateLocalEmotion(canvas, lastFrameSignatureRef);

    analyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      const response = await emotion.logEmotion({
        sessionId,
        base64Image,
        triggerContext
      });

      if (response.data?.status === 'success' || response.data?.status === 'warning') {
        const payload = response.data.data;

        if (payload.analysisUnavailable) {
          setCurrentEmotion(localEstimate.dominantEmotion);
          setEmotionProbabilities(localEstimate.emotions);
          setEmotionSource('local');
          setAnalysisStatus('Vision provider unavailable. Showing local camera estimate.');
          if (onEmotionDetected) {
            onEmotionDetected({ ...payload, ...localEstimate, source: 'local_estimate' });
          }
          return;
        }

        if (payload.faceDetected === false) {
          setCurrentEmotion('no_face');
          setEmotionProbabilities(null);
          setEmotionSource('camera');
          setAnalysisStatus('No face detected in the latest frame.');
          if (onEmotionDetected) onEmotionDetected(payload);
          return;
        }

        setCurrentEmotion(payload.dominantEmotion);
        setEmotionProbabilities(normalizeProbabilities(payload.emotions));
        setEmotionSource('vision');
        setAnalysisStatus('');
        
        if (onEmotionDetected) {
          onEmotionDetected(payload);
        }
      }
    } catch (err) {
      console.error('Frame analysis failed:', err.message);
      setCurrentEmotion(localEstimate.dominantEmotion);
      setEmotionProbabilities(localEstimate.emotions);
      setEmotionSource('local');
      setAnalysisStatus('Emotion API failed. Showing local camera estimate.');
    } finally {
      setIsAnalyzing(false);
      analyzingRef.current = false;
    }
  };

  // Helper mapping emotions to standard emojis
  const getEmotionEmoji = (emotion) => {
    const map = {
      happy: '😊',
      neutral: '😐',
      confused: '😕',
      frustrated: '😫',
      sad: '😢',
      engaged: '🧐'
    };
    return map[emotion] || '📸';
  };

  const getEmotionColor = (emotion) => {
    const map = {
      happy: 'text-green-500 bg-green-50 border-green-200',
      neutral: 'text-gray-500 bg-gray-50 border-gray-200',
      confused: 'text-amber-500 bg-amber-50 border-amber-200',
      frustrated: 'text-red-500 bg-red-50 border-red-200',
      sad: 'text-blue-500 bg-blue-50 border-blue-200',
      engaged: 'text-indigo-500 bg-indigo-50 border-indigo-200'
    };
    return map[emotion] || 'text-gray-400 bg-gray-50 border-gray-200';
  };

  const getEmotionLabel = (emotion) => {
    if (emotion === 'no_face') return 'No face';
    if (emotion === 'unavailable') return 'Unavailable';
    return emotion;
  };

  return (
    <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-lg p-5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-semibold text-slate-800">Real-time Emotion Tutor</h4>
          <p className="text-xs text-slate-500">Analyzes facial expressions to optimize learning speed</p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isActive ? 'bg-indigo-600' : 'bg-slate-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Webcam Feed Container */}
      <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden mb-4 border border-slate-200 shadow-inner flex items-center justify-center">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0 absolute'
          }`}
        />
        
        <canvas ref={canvasRef} className="hidden" />

        {/* Inactive overlay */}
        {!isActive && (
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-500 shadow-md">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-400">Webcam Inactive</p>
            <p className="text-xs text-slate-600 mt-1">Activate to enable AI tutor pacing</p>
          </div>
        )}

        {/* Pulse analyzer ring */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none border border-indigo-500/20 rounded-xl">
            <div className={`absolute top-3 right-3 flex items-center space-x-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isAnalyzing ? 'text-amber-400 border-amber-500/30' : 'text-green-400 border-green-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isAnalyzing ? 'bg-amber-400 animate-ping' : 'bg-green-400 animate-pulse'
              }`} />
              <span>{isAnalyzing ? 'ANALYZING' : 'ACTIVE'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Telemetry output */}
      {isActive && (
        <div className="space-y-4 animate-fadeIn">
          {currentEmotion ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tutor Diagnostic</span>
                <span className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getEmotionColor(currentEmotion)}`}>
                  <span>{getEmotionEmoji(currentEmotion)}</span>
                  <span className="capitalize">{getEmotionLabel(currentEmotion)}</span>
                </span>
              </div>
              {(analysisStatus || emotionSource === 'local') && (
                <p className="text-[10px] text-slate-500 mb-2">
                  {analysisStatus || 'Local camera estimate'}
                </p>
              )}

              {/* Individual probability telemetry bars */}
              {emotionProbabilities && (
                <div className="space-y-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  {Object.entries(emotionProbabilities).map(([key, val]) => {
                    const pct = Math.round(clamp01(val) * 100);
                    return (
                      <div key={key} className="flex items-center space-x-3 text-xs">
                        <span className="w-16 capitalize font-semibold text-slate-600">{key}</span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              key === currentEmotion ? 'bg-indigo-600' : 'bg-indigo-600/40'
                            }`}
                          />
                        </div>
                        <span className="w-8 text-right font-medium text-slate-600">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 py-2">
              Waiting for first telemetry snapshot...
            </p>
          )}
        </div>
      )}

      {permissionError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-xs font-semibold text-red-600">Camera Access Denied</p>
          <p className="text-[10px] text-red-500 mt-0.5">Please update browser permissions to allow facial pacing.</p>
        </div>
      )}
    </div>
  );
};

export default WebcamEmotionDetector;
