import { useState } from 'react';

export default function MaterialViewer({ material, learningStyle, onStartQuiz }) {
  const [tab, setTab] = useState('main');
  const [flipped, setFlipped] = useState({});
  const [ttsPlaying, setTtsPlaying] = useState(false);

  const tabs = buildTabs(learningStyle, material);

  const handleTTS = () => {
    if (!material.audioScript && !material.content) return;
    const text = material.audioScript || material.summary || material.content?.slice(0, 500);
    if ('speechSynthesis' in window) {
      if (ttsPlaying) { window.speechSynthesis.cancel(); setTtsPlaying(false); return; }
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.9;
      utt.onend = () => setTtsPlaying(false);
      window.speechSynthesis.speak(utt);
      setTtsPlaying(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-1">{material.subject} · {material.difficultyLevel}</p>
            <h2 className="text-xl font-bold">{material.topic}{material.subtopic ? ` — ${material.subtopic}` : ''}</h2>
            <p className="text-sm text-white/80 mt-1">{material.summary}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">{learningStyle}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs">~{material.estimatedReadMinutes}min</span>
          </div>
        </div>
      </div>

      {/* Key points */}
      {material.keyPoints?.length > 0 && (
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
          <p className="text-xs font-semibold text-indigo-600 mb-2">⚡ Key Points</p>
          <div className="flex flex-wrap gap-2">
            {material.keyPoints.map((kp, i) => (
              <span key={i} className="px-3 py-1 bg-white border border-indigo-100 rounded-full text-xs text-indigo-700 font-medium">{kp}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-t-xl text-sm font-medium border-b-2 transition-all ${tab === t.id ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Main content */}
        {tab === 'main' && (
          <div>
            {learningStyle === 'Audio Learner' && (
              <div className="mb-4 flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <button onClick={handleTTS} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${ttsPlaying ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>
                  {ttsPlaying ? '⏹ Stop' : '▶ Listen'}
                </button>
                <p className="text-xs text-amber-700">Click to hear this lesson read aloud</p>
              </div>
            )}
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {material.content}
            </div>
          </div>
        )}

        {/* Visual map */}
        {tab === 'visual' && material.visualMapData && (
          <ConceptMap data={material.visualMapData} />
        )}

        {/* Flashcards */}
        {tab === 'flashcards' && (
          <FlashcardDeck cards={material.flashcards || []} flipped={flipped} onFlip={(i) => setFlipped((p) => ({ ...p, [i]: !p[i] }))} />
        )}

        {/* Code exercises */}
        {tab === 'code' && (
          <CodeExercises exercises={material.codeExercises || []} />
        )}

        {/* Audio script */}
        {tab === 'audio' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={handleTTS} className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${ttsPlaying ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>
                {ttsPlaying ? '⏹ Stop Audio' : '▶ Play Audio'}
              </button>
              <p className="text-xs text-gray-500">Browser text-to-speech</p>
            </div>
            <div className="p-5 bg-amber-50 rounded-xl border border-amber-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {material.audioScript || material.content}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-6 pb-6 flex gap-3 flex-wrap">
        {(material.quizQuestions?.length > 0) && (
          <button onClick={onStartQuiz} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm hover:opacity-90">
            🧪 Take Quiz ({material.quizQuestions.length} questions)
          </button>
        )}
      </div>
    </div>
  );
}

function buildTabs(learningStyle, material) {
  const tabs = [{ id: 'main', emoji: '📄', label: 'Content' }];
  if (material.visualMapData?.nodes?.length > 0) tabs.push({ id: 'visual', emoji: '🗺️', label: 'Concept Map' });
  if (material.flashcards?.length > 0) tabs.push({ id: 'flashcards', emoji: '🃏', label: 'Flashcards' });
  if (material.audioScript) tabs.push({ id: 'audio', emoji: '🎧', label: 'Audio' });
  if (material.codeExercises?.length > 0) tabs.push({ id: 'code', emoji: '💻', label: 'Exercises' });
  return tabs;
}

function ConceptMap({ data }) {
  const { nodes = [], edges = [] } = data;
  const mainNodes = nodes.filter((n) => n.type === 'main');
  const subNodes = nodes.filter((n) => n.type === 'sub');
  const detailNodes = nodes.filter((n) => n.type === 'detail');

  return (
    <div className="space-y-4">
      {mainNodes.map((n) => {
        const children = edges.filter((e) => e.from === n.id).map((e) => nodes.find((nd) => nd.id === e.to)).filter(Boolean);
        return (
          <div key={n.id} className="text-center">
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-lg mb-4">
              {n.label}
            </div>
            {children.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {children.map((c) => {
                  const grandchildren = edges.filter((e) => e.from === c.id).map((e) => nodes.find((nd) => nd.id === e.to)).filter(Boolean);
                  return (
                    <div key={c.id} className="text-center">
                      <div className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-xl text-sm font-medium mb-2">{c.label}</div>
                      {grandchildren.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1">
                          {grandchildren.map((gc) => (
                            <span key={gc.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">{gc.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {subNodes.filter((n) => !edges.some((e) => e.to === n.id)).map((n) => (
        <div key={n.id} className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">{n.label}</div>
      ))}
    </div>
  );
}

function FlashcardDeck({ cards, flipped, onFlip }) {
  const DIFF = { easy: 'border-emerald-200 bg-emerald-50', medium: 'border-amber-200 bg-amber-50', hard: 'border-red-200 bg-red-50' };
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <div key={i} onClick={() => onFlip(i)} className={`cursor-pointer rounded-2xl border-2 p-5 min-h-[120px] flex items-center justify-center text-center transition-all hover:shadow-md ${DIFF[card.difficulty] || DIFF.medium}`}>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">{flipped[i] ? 'Answer' : 'Question'} · {card.difficulty}</p>
            <p className="text-sm font-medium text-gray-800">{flipped[i] ? card.back : card.front}</p>
            <p className="text-xs text-gray-400 mt-2">Tap to {flipped[i] ? 'see question' : 'reveal answer'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeExercises({ exercises }) {
  const [shown, setShown] = useState({});
  return (
    <div className="space-y-5">
      {exercises.map((ex, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
            <p className="text-white text-sm font-medium">{ex.title}</p>
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">{ex.language}</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">{ex.description}</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs overflow-x-auto">{ex.starterCode}</pre>
            <button onClick={() => setShown((p) => ({ ...p, [i]: !p[i] }))} className="mt-3 text-xs text-indigo-600 font-medium hover:underline">
              {shown[i] ? 'Hide solution' : 'Show solution'}
            </button>
            {shown[i] && <pre className="mt-2 bg-emerald-900 text-emerald-300 p-4 rounded-xl text-xs overflow-x-auto">{ex.solution}</pre>}
          </div>
        </div>
      ))}
    </div>
  );
}
