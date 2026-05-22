import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { chatbot, getApiErrorMessage } from '../services/api';

const visiblePaths = ['/', '/dashboard', '/ai-dashboard', '/ai-teacher', '/study-plan', '/progress', '/profile'];

const starters = [
  'How should I revise weak topics today?',
  'Explain virtualization with an example.',
  'Make me a 30 minute study plan.',
];

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi, I am your NeuroLearn mentor. Ask me for concept help, study planning, revision strategy, quiz prep, or how to use the AI Teacher.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  const shouldShow = visiblePaths.some((path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!shouldShow) return null;

  const sendMessage = async (value = input) => {
    const userMessage = value.trim();
    if (!userMessage || isLoading) return;

    const nextMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await chatbot.sendMessage({
        message: userMessage,
        history: messages.slice(-8),
        page: location.pathname,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.data.message || 'I am here. What would you like to study?' },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: getApiErrorMessage(
            error,
            'I could not reach the AI mentor right now. Please check the backend and Grok API key.'
          ),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-700 via-sky-600 to-indigo-600 text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-1"
        aria-label="Toggle AI mentor chat"
      >
        <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-teal-300 via-sky-300 to-amber-300 opacity-60 blur transition group-hover:opacity-90" />
        <span className="relative">
          {isOpen ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleLeftRightIcon className="h-6 w-6" />}
        </span>
        {!isOpen && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-70" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-amber-400" />
          </span>
        )}
      </button>

      <div
        className={`absolute bottom-16 right-0 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 transition-all duration-300 ${
          isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="border-b border-slate-200 bg-slate-950 p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400/15 text-teal-200">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">NeuroLearn Mentor</h3>
                <p className="text-xs text-slate-300">Grok-powered study help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="h-[390px] overflow-y-auto bg-slate-50 p-4">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-gradient-to-br from-teal-700 to-sky-600 text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {message.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => sendMessage(starter)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-teal-500 focus-within:bg-white">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a concept or study plan..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
