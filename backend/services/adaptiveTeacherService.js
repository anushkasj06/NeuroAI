const { chatCompletion, parseJson } = require('./grokService');

const TEACHER_SYSTEM = `You are NeuroLearn AI Teacher, an expert classroom teacher, mentor, and adaptive tutor.
You teach deeply, ask one question at a time, diagnose understanding, and adapt teaching strategy.
Return valid JSON only. Do not include markdown fences.`;

const modeFromStyle = (learningStyle = '') => {
  if (/visual/i.test(learningStyle)) return 'visual';
  if (/audio/i.test(learningStyle)) return 'audio';
  if (/interactive/i.test(learningStyle)) return 'interactive';
  if (/reading|writing/i.test(learningStyle)) return 'reading';
  return 'mixed';
};

const safeJson = async (messages, opts, fallbackBuilder) => {
  try {
    const text = await chatCompletion(messages, opts);
    return parseJson(text);
  } catch (error) {
    console.error('Adaptive teacher AI failed:', error.message);
    return fallbackBuilder();
  }
};

const buildStudentContext = ({ profile, learningReport, mastery, recentAnswers = [], performance = {} }) => `
STUDENT PROFILE:
- Name: ${profile?.fullName || 'Student'}
- Education: ${profile?.educationLevel || 'General'}
- Current score: ${profile?.currentCgpaOrPercentage || 'unknown'}%
- Target score: ${profile?.targetPercentage || 'unknown'}%
- Preferred language: ${profile?.preferredLanguage || 'English'}

LEARNING SIGNALS:
- Learning style: ${learningReport?.preferredLearningStyle || 'Reading/Writing Learner'}
- Strongest mode: ${learningReport?.strongestLearningMode || 'unknown'}
- Confidence: ${learningReport?.confidenceLevel || 'Moderate'}
- Attention: ${learningReport?.attentionLevel || 'Stable'}
- Engagement: ${learningReport?.engagementScore || 60}/100
- Current mastery: ${mastery?.masteryPercent || performance.masteryPercent || 0}/100
- Weak concepts: ${(performance.weakConcepts || mastery?.weakSignals || []).join(', ') || 'none yet'}
- Recent answer pattern: ${recentAnswers.map((a) => `${a.score}%/${a.confidence}/5/${a.understandingLevel}`).join(' | ') || 'none yet'}
`;

const generateTeachingSession = async ({
  subject,
  topic,
  subtopic = '',
  difficultyLevel = 'medium',
  profile,
  learningReport,
  mastery,
  pastMistakes = [],
}) => {
  const learningStyle = learningReport?.preferredLearningStyle || 'Reading/Writing Learner';
  const activeTeachingMode = modeFromStyle(learningStyle);
  const prompt = `${buildStudentContext({ profile, learningReport, mastery, performance: { weakConcepts: pastMistakes } })}

Create a real teacher-led learning session.
SUBJECT: ${subject}
TOPIC: ${topic}${subtopic ? ` > ${subtopic}` : ''}
DIFFICULTY: ${difficultyLevel}

The session must follow this flow:
1. Introduction
2. Concept Explanation
3. Real-Life Example
4. Interactive Understanding Check
5. Short Adaptive Question placeholder
6. AI Feedback placeholder
7. Next Concept
8. Mini Revision
9. Final Adaptive Quiz setup
10. Progress Report setup

Learning style adaptation:
- Visual: diagrams, flowcharts, concept maps, visual breakdowns.
- Audio: conversational script, story explanation, TTS-ready teacher speech.
- Reading/Writing: structured notes, revision sheets, text walkthroughs.
- Interactive: challenges, checkpoints, coding/problem tasks.

Return JSON:
{
  "teacherPersona": "string",
  "activeTeachingMode": "visual|audio|reading|interactive|mixed",
  "difficultyLevel": "easy|medium|hard",
  "estimatedMinutes": number,
  "weakConcepts": ["string"],
  "strongConcepts": ["string"],
  "teachingFlow": [
    {
      "type": "introduction|concept|example|visual|interactive_check|revision|summary|teacher_note",
      "title": "string",
      "content": "rich teacher explanation, not generic notes",
      "mediaType": "markdown|diagram|flowchart|audio_script|challenge|none",
      "diagramData": {
        "nodes": [{"id": "1", "label": "string", "type": "main|sub|detail"}],
        "edges": [{"from": "1", "to": "2", "label": "string"}]
      },
      "interactionPrompt": "student-facing action or reflection",
      "estimatedMinutes": number
    }
  ],
  "openingMessage": "warm teacher message",
  "revisionPoints": ["string"],
  "ttsScript": "spoken lesson script"
}

Generate 7-10 teachingFlow blocks. Make the explanation classroom-like, concrete, and adaptive.`;

  return safeJson(
    [
      { role: 'system', content: TEACHER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.65, maxTokens: 5000 },
    () => buildFallbackTeachingSession({ subject, topic, subtopic, learningStyle, activeTeachingMode, difficultyLevel })
  );
};

const generateAdaptiveQuestion = async ({
  session,
  profile,
  learningReport,
  recentAnswers,
  previousQuestion,
  mastery,
  questionNumber,
}) => {
  const previous = recentAnswers[recentAnswers.length - 1];
  const prompt = `${buildStudentContext({ profile, learningReport, mastery, recentAnswers })}

Generate exactly ONE next adaptive question.
SESSION: ${session.subject} > ${session.topic}
CURRENT MODE: ${session.activeTeachingMode}
CURRENT DIFFICULTY: ${session.difficultyLevel}
QUESTION NUMBER: ${questionNumber}
PREVIOUS QUESTION: ${previousQuestion?.prompt || 'none'}
PREVIOUS RESULT: ${previous ? `${previous.score}% correct=${previous.isCorrect}, confidence=${previous.confidence}, responseTime=${previous.responseTimeSeconds}s, feedback=${previous.feedback}` : 'none'}

Question quality rules:
- Generate a real subject-specific teaching question, not a generic study-skill question.
- The prompt must include a concrete situation, example, diagram interpretation, misconception, or applied decision.
- Every option must be plausible to a learner. Never use joke/obvious options like "memorize the heading", "skip examples", or "ignore mistakes".
- The correct answer must require understanding ${session.topic}, not just good study behavior.
- For MCQ, include exactly 4 options with one correct answer and 3 meaningful distractors.
- If previous answer was strong, increase challenge or move to a scenario/application question.
- If weak, simplify the concept but still keep the question topic-specific.
- Use response speed and confidence. Fast wrong/high confidence means misconception. Slow low confidence means reteach gently.
- Do not generate multiple questions.

For a topic like Virtualization, a proper question should test ideas such as hypervisor role, VM isolation, resource sharing, snapshots, containers vs VMs, bare-metal vs hosted virtualization, overcommitment, or cloud deployment tradeoffs.

Return JSON:
{
  "conceptTag": "string",
  "type": "mcq|short_answer|code|scenario|true_false",
  "difficultyLevel": "easy|medium|hard",
  "prompt": "student-facing question with a concrete topic-specific scenario",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "string",
  "idealAnswer": "string",
  "hint": "teacher hint",
  "teacherPurpose": "specific concept this question diagnoses",
  "expectedTimeSeconds": number
}`;

  return safeJson(
    [
      { role: 'system', content: TEACHER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.6, maxTokens: 1800 },
    () => buildFallbackQuestion({ session, questionNumber, previous })
  );
};

const analyzeStudentAnswer = async ({ session, question, answerText, selectedOption, confidence, responseTimeSeconds }) => {
  const prompt = `Analyze the student's answer like a real teacher.

TOPIC: ${session.subject} > ${session.topic}
QUESTION: ${question.prompt}
TYPE: ${question.type}
OPTIONS: ${(question.options || []).join(' | ')}
CORRECT ANSWER: ${question.correctAnswer}
IDEAL ANSWER: ${question.idealAnswer}
STUDENT ANSWER: ${answerText || selectedOption}
CONFIDENCE: ${confidence}/5
RESPONSE TIME: ${responseTimeSeconds}s
CURRENT MODE: ${session.activeTeachingMode}
CURRENT DIFFICULTY: ${session.difficultyLevel}

Return JSON:
{
  "isCorrect": boolean,
  "score": number,
  "understandingLevel": "confused|partial|solid|advanced",
  "feedback": "specific teacher feedback",
  "misconceptionDetected": "string or empty",
  "weakConcepts": ["string"],
  "strongConcepts": ["string"],
  "nextTeachingAction": "reteach|hint|easier_question|continue|increase_difficulty",
  "suggestedMode": "visual|audio|reading|interactive|mixed",
  "suggestedDifficulty": "easy|medium|hard",
  "reteachBlock": {
    "title": "string",
    "content": "short adaptive reteaching explanation",
    "mediaType": "markdown|diagram|flowchart|audio_script|challenge|none"
  }
}`;

  return safeJson(
    [
      { role: 'system', content: TEACHER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.45, maxTokens: 2200 },
    () => buildFallbackAnalysis({ question, answerText, selectedOption, confidence, responseTimeSeconds })
  );
};

const generateProgressReport = async ({ session, answers, previousReports = [] }) => {
  const accuracy = Math.round(
    (answers.filter((answer) => answer.isCorrect).length / Math.max(1, answers.length)) * 100
  );
  const confidence = Number(
    (answers.reduce((sum, answer) => sum + Number(answer.confidence || 3), 0) / Math.max(1, answers.length)).toFixed(1)
  );
  const prompt = `Generate a human, personalized progress report.

SESSION: ${session.subject} > ${session.topic}
LEARNING MODE: ${session.activeTeachingMode}
DIFFICULTY: ${session.difficultyLevel}
QUIZ ACCURACY: ${accuracy}%
AVERAGE CONFIDENCE: ${confidence}/5
WEAK CONCEPTS: ${session.weakConcepts.join(', ') || 'none'}
STRONG CONCEPTS: ${session.strongConcepts.join(', ') || 'none'}
ANSWERS:
${answers.map((a, i) => `${i + 1}. score=${a.score}, correct=${a.isCorrect}, confidence=${a.confidence}, issue=${a.misconceptionDetected || 'none'}`).join('\n')}
PREVIOUS REPORTS: ${previousReports.map((r) => `${r.topic}: ${r.conceptMastery}%`).join(' | ') || 'none'}

Return JSON:
{
  "summary": "personal teacher summary",
  "whatStudentLearned": ["string"],
  "conceptMastery": number,
  "confidenceLevel": number,
  "quizAccuracy": number,
  "improvementFromPrevious": "string",
  "strongAreas": ["string"],
  "weakAreas": ["string"],
  "recommendedNextSteps": ["string"],
  "motivationFeedback": "human, specific motivation",
  "planModification": {
    "required": boolean,
    "reason": "string",
    "changes": ["string"]
  }
}`;

  return safeJson(
    [
      { role: 'system', content: TEACHER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.55, maxTokens: 2600 },
    () => buildFallbackReport({ session, answers, accuracy, confidence })
  );
};

const modifyStudyPlan = ({ plan, session, report }) => {
  if (!plan || !report?.planModification?.required) return { changed: false, plan };

  const weakArea = report.weakAreas?.[0] || session.topic;
  const revisionSession = {
    subject: session.subject,
    subjectSlug: session.subjectSlug,
    topic: session.topic,
    subtopic: session.subtopic || '',
    durationMinutes: report.conceptMastery < 45 ? 45 : 30,
    sessionType: 'revise',
    difficultyLevel: report.conceptMastery < 45 ? 'easy' : 'medium',
    resources: [
      `AI Teacher reteach: ${weakArea}`,
      'One-by-one adaptive quiz retry',
      'Mini revision before next new concept',
    ],
    completed: false,
    notes: report.planModification.reason,
  };

  let inserted = false;
  for (const week of plan.weeklyPlan || []) {
    for (const day of week.days || []) {
      if (!day.completed) {
        day.sessions.unshift(revisionSession);
        day.totalMinutes = Number(day.totalMinutes || 0) + revisionSession.durationMinutes;
        inserted = true;
        break;
      }
    }
    if (inserted) break;
  }

  if (!inserted) return { changed: false, plan };

  plan.adaptationHistory.push({
    reason: report.planModification.reason,
    change: report.planModification.changes?.join(' ') || `Added adaptive revision for ${session.topic}.`,
  });
  plan.aiRecommendations = [
    `AI Teacher adapted ${session.topic}: mastery ${report.conceptMastery}%, accuracy ${report.quizAccuracy}%.`,
    ...(plan.aiRecommendations || []).slice(0, 4),
  ];

  return { changed: true, plan };
};

const generateLearningContent = generateTeachingSession;

const buildFallbackTeachingSession = ({ subject, topic, subtopic, learningStyle, activeTeachingMode, difficultyLevel }) => ({
  teacherPersona: 'patient expert teacher',
  activeTeachingMode,
  difficultyLevel,
  estimatedMinutes: 35,
  weakConcepts: [],
  strongConcepts: [],
  openingMessage: `Today I will teach ${topic} like a live class: idea, example, check, feedback, and quiz.`,
  revisionPoints: [`Define ${topic}`, `Explain one real example`, `Solve one fresh question`],
  ttsScript: `Welcome. Today we are learning ${topic} in ${subject}. I will explain it step by step, then ask you one question at a time.`,
  teachingFlow: [
    {
      type: 'introduction',
      title: `Why ${topic} matters`,
      content: `${topic}${subtopic ? ` (${subtopic})` : ''} is not just a definition in ${subject}. It is a tool you use to solve real problems. We will build from intuition to application.`,
      mediaType: 'markdown',
      estimatedMinutes: 4,
    },
    {
      type: 'concept',
      title: 'Core idea',
      content: `Start with the purpose: what problem does ${topic} solve? Then learn the parts, the process, and the common mistakes. A strong answer explains both what it is and why it works.`,
      mediaType: 'markdown',
      estimatedMinutes: 8,
    },
    {
      type: 'example',
      title: 'Real-life example',
      content: `Imagine organizing tasks in a day. ${topic} gives you a structure for deciding what connects, what changes, and what must be checked before moving forward.`,
      mediaType: 'markdown',
      estimatedMinutes: 6,
    },
    {
      type: 'visual',
      title: 'Visual breakdown',
      content: `Map ${topic} into definition, parts, example, mistake, and test question.`,
      mediaType: activeTeachingMode === 'audio' ? 'audio_script' : 'diagram',
      diagramData: {
        nodes: [
          { id: '1', label: topic, type: 'main' },
          { id: '2', label: 'Purpose', type: 'sub' },
          { id: '3', label: 'Parts', type: 'sub' },
          { id: '4', label: 'Example', type: 'sub' },
          { id: '5', label: 'Mistake', type: 'detail' },
        ],
        edges: [
          { from: '1', to: '2', label: 'answers why' },
          { from: '1', to: '3', label: 'contains' },
          { from: '1', to: '4', label: 'applies in' },
          { from: '4', to: '5', label: 'watch for' },
        ],
      },
      estimatedMinutes: 5,
    },
    {
      type: 'interactive_check',
      title: 'Pause and explain',
      content: `Before the quiz, explain ${topic} in your own words in two sentences.`,
      mediaType: 'challenge',
      interactionPrompt: `What is ${topic}, and where would you use it?`,
      estimatedMinutes: 4,
    },
    {
      type: 'revision',
      title: 'Mini revision',
      content: `Remember: purpose first, structure second, example third, mistake last. That order keeps your answer clear.`,
      mediaType: 'markdown',
      estimatedMinutes: 4,
    },
  ],
});

const buildFallbackQuestion = ({ session, questionNumber, previous }) => {
  const weak = previous && previous.score < 60;
  const topic = String(session.topic || '').toLowerCase();

  if (topic.includes('virtualization')) {
    const questions = [
      {
        conceptTag: 'Hypervisor and VM isolation',
        difficultyLevel: 'medium',
        prompt:
          'A college lab has one powerful physical server. The teacher wants Windows, Linux, and a database server to run separately on the same machine without one OS crash affecting the others. Which virtualization idea makes this possible?',
        options: [
          'A hypervisor creates isolated virtual machines that share the physical hardware',
          'A compiler converts all operating systems into one common program',
          'A firewall copies the same operating system into every user account',
          'A router divides the CPU into permanent hardware partitions',
        ],
        correctAnswer: 'A hypervisor creates isolated virtual machines that share the physical hardware',
        idealAnswer:
          'Virtualization uses a hypervisor to create isolated VMs. Each VM behaves like a separate computer while sharing CPU, memory, storage, and network resources from the same physical host.',
        hint: 'Ask: what layer sits between physical hardware and multiple virtual machines?',
        teacherPurpose: 'Diagnoses whether the student understands hypervisor-based isolation and resource sharing.',
      },
      {
        conceptTag: 'Snapshots and rollback',
        difficultyLevel: 'medium',
        prompt:
          'Before installing risky software inside a virtual machine, an admin takes a snapshot. The installation corrupts the VM. What is the main benefit of the snapshot?',
        options: [
          'It lets the VM return to the saved earlier state',
          'It permanently increases the physical RAM of the host',
          'It converts the VM into a physical computer',
          'It prevents the host from needing a hypervisor',
        ],
        correctAnswer: 'It lets the VM return to the saved earlier state',
        idealAnswer:
          'A snapshot records the VM state at a point in time, so the admin can roll back after a failed update or experiment.',
        hint: 'Think of a snapshot as a restore point for a VM.',
        teacherPurpose: 'Checks understanding of snapshot use in safe experimentation and recovery.',
      },
      {
        conceptTag: 'Containers vs virtual machines',
        difficultyLevel: 'hard',
        prompt:
          'A startup wants to run many lightweight copies of the same web app quickly. They do not need a separate full operating system for each copy. Which choice best fits this requirement?',
        options: [
          'Containers, because they share the host OS kernel and start faster than full VMs',
          'Full virtual machines, because every app copy must always include a separate guest OS',
          'Bare-metal installation, because isolation is impossible without dedicated hardware',
          'Snapshots, because snapshots replace the need to run applications',
        ],
        correctAnswer: 'Containers, because they share the host OS kernel and start faster than full VMs',
        idealAnswer:
          'Containers are usually lighter than VMs because they package the app and dependencies while sharing the host OS kernel. VMs include a full guest OS and stronger OS-level separation.',
        hint: 'Compare what each unit carries: a full guest OS or just app-level dependencies.',
        teacherPurpose: 'Tests whether the student can distinguish VM virtualization from containerization tradeoffs.',
      },
    ];
    const selected = questions[Math.min(questionNumber - 1, questions.length - 1)];
    return {
      type: 'mcq',
      expectedTimeSeconds: selected.difficultyLevel === 'hard' ? 120 : 90,
      ...selected,
      difficultyLevel: weak ? 'easy' : selected.difficultyLevel,
    };
  }

  const topicName = session.topic || 'this concept';
  const isHard = !weak && questionNumber > 2;
  return {
    conceptTag: `${topicName} application`,
    type: isHard ? 'scenario' : 'mcq',
    difficultyLevel: weak ? 'easy' : isHard ? 'hard' : 'medium',
    prompt: weak
      ? `A student can repeat the definition of ${topicName}, but cannot identify it in an example. Which explanation best connects the concept to its actual role in ${session.subject}?`
      : `In a real ${session.subject} problem, you must decide whether ${topicName} is the right concept to use. Which clue would be the strongest evidence?`,
    options: [
      `The problem shows the core condition or behavior that ${topicName} is designed to handle`,
      `The problem contains a familiar word from the chapter title but no matching behavior`,
      `The problem is long, so ${topicName} must automatically be the answer`,
      `The problem has numbers, so the concept definition can be ignored`,
    ],
    correctAnswer: `The problem shows the core condition or behavior that ${topicName} is designed to handle`,
    idealAnswer: `A good application of ${topicName} starts by matching the concept's actual role to the problem situation, then explaining why the other choices do not fit.`,
    hint: `Look for the behavior or condition that makes ${topicName} necessary.`,
    teacherPurpose: `Diagnoses whether the student can apply ${topicName} to a realistic ${session.subject} situation instead of only recalling a definition.`,
    expectedTimeSeconds: isHard ? 120 : 90,
  };
};

const buildFallbackAnalysis = ({ question, answerText, selectedOption, confidence, responseTimeSeconds }) => {
  const response = answerText || selectedOption || '';
  const isCorrect = question.correctAnswer && response.trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
  const score = isCorrect ? 100 : response.length > 20 ? 55 : 25;
  return {
    isCorrect,
    score,
    understandingLevel: score >= 85 ? 'solid' : score >= 50 ? 'partial' : 'confused',
    feedback: isCorrect
      ? 'Good. You connected the concept to its purpose.'
      : 'This needs a clearer link between the idea and how it is used. Revisit the example, then try an easier version.',
    misconceptionDetected: isCorrect ? '' : 'Definition is not yet connected to application.',
    weakConcepts: isCorrect ? [] : [question.conceptTag || 'core concept'],
    strongConcepts: isCorrect ? [question.conceptTag || 'core concept'] : [],
    nextTeachingAction: isCorrect ? (confidence >= 4 && responseTimeSeconds < 90 ? 'increase_difficulty' : 'continue') : 'reteach',
    suggestedMode: isCorrect ? 'mixed' : 'interactive',
    suggestedDifficulty: isCorrect ? 'hard' : 'easy',
    reteachBlock: {
      title: 'Quick reteach',
      content: 'Focus on purpose, then walk through one concrete example before answering again.',
      mediaType: 'markdown',
    },
  };
};

const buildFallbackReport = ({ session, answers, accuracy, confidence }) => {
  const weak = [...new Set(answers.flatMap((answer) => answer.misconceptionDetected ? [answer.misconceptionDetected] : []))];
  return {
    summary: `You completed ${session.topic} with ${accuracy}% quiz accuracy and ${confidence}/5 average confidence.`,
    whatStudentLearned: [`Core idea of ${session.topic}`, 'How to connect explanation to examples', 'How to use confidence while answering'],
    conceptMastery: accuracy,
    confidenceLevel: confidence,
    quizAccuracy: accuracy,
    improvementFromPrevious: 'This session creates a new baseline for future comparison.',
    strongAreas: session.strongConcepts?.length ? session.strongConcepts : ['Willingness to attempt adaptive questions'],
    weakAreas: weak.length ? weak : session.weakConcepts || [],
    recommendedNextSteps: accuracy < 70 ? ['Do a short reteach session', 'Attempt easier adaptive questions', 'Review the mini revision'] : ['Move to the next concept', 'Try one harder application question'],
    motivationFeedback: accuracy < 70 ? 'This is fixable. The next session should slow down and make the idea more concrete.' : 'Nice work. You are ready for a harder example.',
    planModification: {
      required: accuracy < 70,
      reason: accuracy < 70 ? `Mastery for ${session.topic} is below the safe threshold.` : '',
      changes: accuracy < 70 ? ['Add revision session', 'Reduce next difficulty', 'Use interactive mode'] : [],
    },
  };
};

module.exports = {
  generateTeachingSession,
  generateLearningContent,
  generateAdaptiveQuestion,
  analyzeStudentAnswer,
  generateProgressReport,
  modifyStudyPlan,
  modeFromStyle,
};
