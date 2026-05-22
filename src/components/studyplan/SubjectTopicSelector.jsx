import { getTopicsForSubject } from '../../constants/topicCurriculum';

export default function SubjectTopicSelector({ subjects, selected, onSelect }) {
  const topics = getTopicsForSubject(selected.subjectSlug);
  const subtopics = topics.find((t) => t.name === selected.topic)?.subtopics || [];

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-50">
      <h3 className="font-bold text-gray-900 mb-4">Select Topic</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
          <select
            value={selected.subjectSlug}
            onChange={(e) => {
              const sub = subjects.find((s) => s.subjectSlug === e.target.value);
              onSelect({ subjectSlug: e.target.value, subjectName: sub?.subjectName || '', topic: '', subtopic: '' });
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">— Select subject —</option>
            {subjects.map((s) => (
              <option key={s.subjectSlug} value={s.subjectSlug}>{s.subjectName}</option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Topic</label>
          <select
            value={selected.topic}
            disabled={!selected.subjectSlug}
            onChange={(e) => onSelect({ ...selected, topic: e.target.value, subtopic: '' })}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-50"
          >
            <option value="">— Select topic —</option>
            {topics.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
            {topics.length === 0 && selected.subjectSlug && (
              <option value="General">General Overview</option>
            )}
          </select>
        </div>

        {/* Subtopic */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subtopic (optional)</label>
          <select
            value={selected.subtopic}
            disabled={!selected.topic || subtopics.length === 0}
            onChange={(e) => onSelect({ ...selected, subtopic: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-50"
          >
            <option value="">— All subtopics —</option>
            {subtopics.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
