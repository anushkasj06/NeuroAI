import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useLocation } from 'react-router-dom';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  const genAI = new GoogleGenerativeAI('AIzaSyAIur2VbrDPjm-gsheC5L8LVZzo7A2LmnE', {
    apiVersion: 'v1'
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Only show chatbot on home and dashboard pages
  if (!['/', '/dashboard'].includes(location.pathname)) {
    return null;
  }

  const systemPrompt = `You are an AI assistant specialized in helping students with their academic performance and study-related questions. 
  You should only answer questions related to:
  - Study techniques and methods
  - Academic performance improvement
  - Time management for students
  - Exam preparation strategies
  - Subject-specific study tips
  - Academic goal setting
  - Learning strategies
  - CGPA improvement tips
  - Study schedule planning
  - Academic stress management
  
  Important guidelines:
  1. Keep responses concise and to the point (2-3 lines maximum)
  2. Focus on actionable advice
  3. Use emojis for key points (e.g., 📚 for study tips, ⏰ for time management)
  4. Be encouraging and positive
  5. If a question is not related to these topics, politely inform the user that you can only answer study-related questions.`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain"
        }
      });
      
      // Start a new chat with the system prompt
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
        ],
      });

      // Send the user's message and get the response
      const result = await chat.sendMessage([{ text: userMessage }]);
      const response = await result.response;
      
      // Check if we have a valid response
      if (!response || !response.text) {
        throw new Error('Invalid response from API');
      }

      const text = response.text();
      console.log('API Response:', text); // Debug log

      if (!text) {
        throw new Error('Empty response from API');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('Detailed Error:', error); // More detailed error logging
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I apologize, but I encountered an error: ${error.message}. Please try again or rephrase your question.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Rest of the component remains the same...
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative group bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'rotate-180' : ''
        }`}
        aria-label="Toggle chat"
      >
        {/* Animated ring effect */}
        <div className="absolute inset-0 rounded-full bg-white opacity-25 group-hover:scale-110 transition-transform duration-300"></div>
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Pulse effect */}
        <div className="absolute -inset-2 rounded-full border-2 border-white/30 opacity-0 group-hover:opacity-100 animate-ping"></div>
        
        {/* Icon */}
        <div className="relative">
          <svg
            className="w-6 h-6 transform group-hover:scale-110 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          
          {/* Notification dot */}
          <div className="absolute -top-1 -right-1 h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
        </div>
      </button>

      {/* Chat Window */}
      <div
        className={`absolute bottom-16 right-0 w-96 bg-white rounded-lg shadow-2xl transform transition-all duration-300 ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Study Assistant</h3>
              <p className="text-xs text-white/80">Online</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div className="bg-white rounded-lg p-4 max-w-[80%] shadow-sm">
                <p className="text-gray-800">
                  Hello! I'm your Study Assistant. I can help you with:
                </p>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• Study techniques and methods</li>
                  <li>• Academic performance improvement</li>
                  <li>• Time management strategies</li>
                  <li>• Exam preparation tips</li>
                  <li>• CGPA improvement advice</li>
                </ul>
                <p className="mt-3 text-gray-800">
                  What would you like to know about?
                </p>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-gray-800'
                }`}
              >
                <div className="prose prose-sm max-w-none">
                  {message.content.split('\n').map((line, i) => (
                    <p key={i} className={`mb-2 last:mb-0 ${
                      message.role === 'assistant' ? 'text-gray-700 leading-relaxed' : ''
                    }`}>
                      {line.includes('*') ? (
                        <span className="flex items-start">
                          <span className="mr-2">{line.split('*')[0]}</span>
                          <span className="text-blue-500">{line.split('*')[1]}</span>
                        </span>
                      ) : (
                        line
                      )}
                    </p>
                  ))}
                </div>
                {message.role === 'assistant' && (
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a study-related question..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 bg-gray-50"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full p-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;