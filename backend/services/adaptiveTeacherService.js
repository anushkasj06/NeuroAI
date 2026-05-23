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
  const topicLabel = `${topic}${subtopic ? ` > ${subtopic}` : ''}`;
  const prompt = `${buildStudentContext({ profile, learningReport, mastery, performance: { weakConcepts: pastMistakes } })}

You are preparing a full, rich teaching session on a SPECIFIC topic. Every word you write must be about the actual subject matter — never generic filler.

SUBJECT: ${subject}
TOPIC: ${topicLabel}
DIFFICULTY: ${difficultyLevel}

=== TEACHING FLOW RULES ===
Generate 7-10 blocks. Each block MUST have one of these types ONLY:
  introduction, concept, example, visual, interactive_check, revision, summary, teacher_note

Do NOT invent other types. Do NOT use types like "quiz", "feedback", "progress_report", or "adaptive_question".

A good session includes AT LEAST:
- 1 introduction block
- 2 concept blocks (each covering a different sub-concept or principle)
- 1 example block
- 1 visual block
- 1 interactive_check block
- 1 revision or summary block

=== CONTENT QUALITY RULES ===
For EVERY block, the "content" field must be:
- At minimum **150 words** of real educational prose, not filler.
- Written as 3-5 paragraphs using **bold**, bullet points, numbered lists, and markdown headers.
- Packed with actual ${subject} subject matter about ${topicLabel}.

For "concept" blocks specifically:
- Explain the **definition** of the concept in plain language.
- Break down the **underlying principles** and how they connect.
- List **sub-concepts**, **formulas**, or **rules** that the student must know.
- Explain **why** each part matters, not just what it is.

For "example" blocks specifically:
- Describe a **real-world scenario** where ${topicLabel} is applied.
- Walk through the scenario **step by step**, showing inputs, decisions, and outcomes.
- Explain what would go wrong if the concept were applied incorrectly.

For "visual" blocks specifically:
- The "diagramData" field is MANDATORY and must contain:
  - At least **6 nodes** with labels that are REAL concept terms from ${topicLabel} (e.g., specific techniques, components, stages — NOT generic words like "Purpose", "Parts", "Example").
  - At least **6 edges** with descriptive relationship labels.
  - Node types: "main" for the central concept, "sub" for key components, "detail" for specifics.
- The "content" field must also explain the diagram in prose.

=== LEARNING STYLE ADAPTATION ===
- Visual learners: extra diagrams, spatial descriptions, color/shape references.
- Audio learners: conversational tone, story-driven explanations, TTS-friendly phrasing.
- Reading/Writing learners: structured notes, definitions-first, text-heavy walkthroughs.
- Interactive learners: embedded mini-challenges, "try this" prompts, decision checkpoints.

Return JSON (no markdown fences):
{
  "teacherPersona": "string – a specific persona, e.g. 'encouraging systems engineering professor'",
  "activeTeachingMode": "visual|audio|reading|interactive|mixed",
  "difficultyLevel": "easy|medium|hard",
  "estimatedMinutes": number,
  "weakConcepts": ["string"],
  "strongConcepts": ["string"],
  "teachingFlow": [
    {
      "type": "introduction|concept|example|visual|interactive_check|revision|summary|teacher_note",
      "title": "string – specific to ${topicLabel}",
      "content": "3-5 paragraphs of rich markdown, minimum 150 words, about the ACTUAL subject matter",
      "mediaType": "markdown|diagram|flowchart|audio_script|challenge|none",
      "diagramData": {
        "nodes": [{"id": "1", "label": "real concept term", "type": "main|sub|detail"}],
        "edges": [{"from": "1", "to": "2", "label": "relationship description"}]
      },
      "interactionPrompt": "student-facing question or reflection prompt",
      "estimatedMinutes": number
    }
  ],
  "openingMessage": "warm, specific teacher greeting mentioning ${topicLabel}",
  "revisionPoints": ["string – specific facts or concepts to remember"],
  "ttsScript": "spoken lesson script covering the key points of ${topicLabel}"
}

CRITICAL REMINDERS:
1. Every "content" field must have 150+ words of REAL ${subject} knowledge about ${topicLabel}.
2. "visual" blocks MUST include "diagramData" with 6+ nodes using domain-specific labels.
3. Only use valid types: introduction, concept, example, visual, interactive_check, revision, summary, teacher_note.
4. Generate 7-10 teachingFlow blocks total.`;

  return safeJson(
    [
      { role: 'system', content: TEACHER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.65, maxTokens: 8000 },
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

const buildFallbackTeachingSession = ({ subject, topic, subtopic, learningStyle, activeTeachingMode, difficultyLevel }) => {
  const topicLabel = `${topic}${subtopic ? ` (${subtopic})` : ''}`;
  const subjectCtx = subject || 'this subject';

  return {
    teacherPersona: `patient and thorough ${subjectCtx} instructor`,
    activeTeachingMode,
    difficultyLevel,
    estimatedMinutes: 40,
    weakConcepts: [],
    strongConcepts: [],
    openingMessage: `Welcome! Today we are going to take a deep dive into **${topicLabel}** within ${subjectCtx}. I will walk you through the core ideas, show you a real-world example, map out the concept visually, and then check your understanding before we wrap up. Let's get started!`,
    revisionPoints: [
      `Be able to define ${topic} and explain its role in ${subjectCtx}`,
      `Identify at least three key components or principles of ${topic}`,
      `Describe one real scenario where ${topic} is applied and what outcome it produces`,
      `Explain how ${topic} connects to other concepts in ${subjectCtx}`,
    ],
    ttsScript: `Welcome to today's lesson. We are studying ${topicLabel} in ${subjectCtx}. I will start by explaining why this concept matters, then break down the key ideas, walk through a real example, show you a concept map, and finally check your understanding with a quick exercise. Let's begin.`,
    teachingFlow: [
      {
        type: 'introduction',
        title: `Why ${topic} Matters in ${subjectCtx}`,
        content: `**${topicLabel}** is one of the foundational ideas in ${subjectCtx}, and understanding it well will unlock your ability to tackle more advanced problems later.\n\nBefore we jump into definitions, let's think about **why** this concept exists in the first place. Every concept in ${subjectCtx} was developed to solve a specific problem or address a specific need. **${topic}** is no different — it emerged because practitioners needed a structured way to handle challenges related to this area.\n\nIn this session, we will cover:\n- **The definition and core principles** behind ${topic}\n- **Key components and sub-concepts** you need to master\n- **A real-world scenario** that shows ${topic} in action\n- **A visual concept map** to help you see how everything connects\n- **A self-check exercise** so you can test your own understanding\n\nBy the end, you should be able to explain ${topic} to someone else in your own words, identify it in real situations, and understand how it fits into the bigger picture of ${subjectCtx}. Let's dive in!`,
        mediaType: 'markdown',
        estimatedMinutes: 4,
      },
      {
        type: 'concept',
        title: `Understanding ${topic}: Definition & Core Principles`,
        content: `**What is ${topic}?**\n\nAt its core, **${topic}** refers to the set of principles, methods, and structures within ${subjectCtx} that govern how we approach this particular area of knowledge. Think of it as the "rulebook" that tells us what the important pieces are, how they interact, and what outcomes we should expect.\n\n**Core Principles:**\n\n1. **Foundational Principle** — Every application of ${topic} begins with understanding the base conditions or inputs. Without knowing where you start, you cannot predict where you will end up.\n2. **Structural Organization** — ${topic} is not a single flat idea; it has layers. There are primary components that form the backbone, and secondary details that refine the output.\n3. **Relationship Mapping** — The components of ${topic} do not exist in isolation. Each one influences the others, and understanding these relationships is what separates surface-level knowledge from true mastery.\n4. **Boundary Conditions** — Knowing when ${topic} applies and when it does **not** apply is just as important as knowing the definition. Many exam and interview mistakes come from applying a concept outside its valid scope.\n\n**Why does this matter?**\n\nIf you only memorize the definition of ${topic}, you will struggle when a problem presents the concept in a slightly different form. But if you understand the **principles** underneath, you can recognize ${topic} even when it is disguised in an unfamiliar scenario. That is the difference between a student who recalls and a student who understands.`,
        mediaType: 'markdown',
        estimatedMinutes: 8,
      },
      {
        type: 'concept',
        title: `Key Components & Sub-Concepts of ${topic}`,
        content: `Now that we have the big picture, let's break **${topic}** into its key building blocks. Every complex concept can be decomposed into smaller, more manageable pieces.\n\n**Component 1: Inputs & Prerequisites**\nBefore ${topic} can be applied, certain conditions must be met. These are the inputs — the data, the context, or the initial state that the process requires. Understanding what goes *in* helps you predict what comes *out*.\n\n**Component 2: Core Mechanism**\nThis is the heart of ${topic} — the actual process, algorithm, rule, or transformation that takes the inputs and produces a result. When your teacher or textbook describes "how ${topic} works," they are usually describing this mechanism.\n\n**Component 3: Outputs & Outcomes**\nWhat does ${topic} produce? What changes after it is applied? Being able to articulate the expected outcome is critical for both exam answers and real-world application.\n\n**Component 4: Constraints & Limitations**\nNo concept works everywhere. **${topic}** has specific constraints — situations where it breaks down, edge cases that produce unexpected results, or assumptions that must hold true for the concept to be valid.\n\n**Component 5: Connections to Other Concepts**\n${topic} does not exist alone in ${subjectCtx}. It connects to related ideas, builds on prerequisite knowledge, and feeds into more advanced topics. Mapping these connections is essential for deep understanding.\n\n**Pro Tip:** When studying, always ask yourself: *What are the inputs? What is the mechanism? What is the output? When does it fail?* This four-question framework works for almost any concept in ${subjectCtx}.`,
        mediaType: 'markdown',
        estimatedMinutes: 8,
      },
      {
        type: 'example',
        title: `Real-World Scenario: ${topic} in Action`,
        content: `Let's see **${topic}** applied in a realistic situation. Theory is important, but you truly learn a concept when you watch it work.\n\n**The Scenario:**\nImagine you are working on a project in ${subjectCtx}. You encounter a problem that requires you to decide how to structure your approach. The stakes are real — a wrong decision could lead to wasted effort, incorrect results, or a system that does not meet requirements.\n\n**Step 1: Identify the Need**\nYou recognize that the problem matches the pattern where **${topic}** applies. The inputs are present, the conditions are met, and the expected outcome aligns with your goal. This is the *recognition* phase — knowing **when** to use the concept.\n\n**Step 2: Apply the Core Mechanism**\nYou follow the structured approach that ${topic} prescribes. You process the inputs according to the rules and principles we discussed earlier. At each step, you check that the constraints are satisfied.\n\n**Step 3: Evaluate the Output**\nThe result is produced. You compare it against the expected outcome. Does it meet the criteria? Does it satisfy the requirements? If yes, the application was successful. If not, you go back and check which constraint was violated or which input was incorrect.\n\n**Step 4: Learn from Edge Cases**\nIn this scenario, suppose one of the assumptions did not perfectly hold. The output was *mostly* correct but had a subtle flaw. This is where deep understanding of ${topic} pays off — you can diagnose *why* it went slightly wrong and adjust.\n\n**Key Takeaway:** The ability to apply ${topic} step-by-step, check your work at each stage, and diagnose problems when things go wrong — that is what separates a student who truly understands the concept from one who only memorized the definition.`,
        mediaType: 'markdown',
        estimatedMinutes: 7,
      },
      {
        type: 'visual',
        title: `Concept Map: How ${topic} Fits Together`,
        content: `Below is a visual concept map of **${topic}** showing how its components relate to each other. The central node represents the topic itself, and the surrounding nodes represent key components, inputs, outputs, and connections.\n\n**How to read this map:**\n- The **main node** (${topic}) is the central concept.\n- **Sub nodes** represent the major building blocks — inputs, core mechanism, outputs, and constraints.\n- **Detail nodes** represent specific examples, edge cases, or connections to related concepts.\n- The **edges** (arrows) describe the relationship between connected nodes.\n\nWhen you study, try to recreate this map from memory. If you can draw the relationships between all the pieces without looking, you have a strong grasp of ${topic}. If a connection feels unclear, that is exactly the area to review.`,
        mediaType: activeTeachingMode === 'audio' ? 'audio_script' : 'diagram',
        diagramData: {
          nodes: [
            { id: '1', label: topic, type: 'main' },
            { id: '2', label: `${topic} Inputs`, type: 'sub' },
            { id: '3', label: `Core Mechanism`, type: 'sub' },
            { id: '4', label: `Expected Outputs`, type: 'sub' },
            { id: '5', label: `Constraints & Limits`, type: 'sub' },
            { id: '6', label: `Related Concepts in ${subjectCtx}`, type: 'sub' },
            { id: '7', label: `Common Mistakes`, type: 'detail' },
            { id: '8', label: `Real-World Applications`, type: 'detail' },
          ],
          edges: [
            { from: '1', to: '2', label: 'requires' },
            { from: '2', to: '3', label: 'feeds into' },
            { from: '3', to: '4', label: 'produces' },
            { from: '3', to: '5', label: 'bounded by' },
            { from: '1', to: '6', label: 'connects to' },
            { from: '5', to: '7', label: 'leads to' },
            { from: '4', to: '8', label: 'enables' },
            { from: '6', to: '3', label: 'informs' },
          ],
        },
        estimatedMinutes: 5,
      },
      {
        type: 'interactive_check',
        title: `Check Your Understanding of ${topic}`,
        content: `Let's pause and see how well you have absorbed the material so far. This is not a graded quiz — it is a self-check to help you identify any gaps before we move on.\n\n**Exercise:** In your own words, answer the following questions:\n\n1. **Define ${topic}** in 2-3 sentences without looking at your notes. Focus on the *purpose* of the concept, not just a textbook phrase.\n2. **Name at least three key components** of ${topic} and explain what each one does.\n3. **Describe one scenario** where ${topic} would be the correct approach, and one scenario where it would **not** apply.\n4. **Identify one common mistake** students make when applying ${topic}, and explain why it is wrong.\n\nTake your time with this. Writing out your answers — even in rough form — forces your brain to organize the information actively rather than passively reading it. If you get stuck on any question, scroll back to the relevant section and re-read it before trying again.`,
        mediaType: 'challenge',
        interactionPrompt: `Explain ${topic} in your own words: What is it, what are its key parts, and when would you use it in ${subjectCtx}?`,
        estimatedMinutes: 5,
      },
      {
        type: 'revision',
        title: `Quick Revision: ${topic} Essentials`,
        content: `Let's consolidate everything we covered about **${topic}** into a concise revision summary.\n\n**🔑 Key Points to Remember:**\n\n- **Definition:** ${topic} is a structured approach within ${subjectCtx} that addresses specific challenges by following defined principles and producing predictable outcomes.\n- **Core Components:** Inputs → Core Mechanism → Outputs, all bounded by Constraints.\n- **When to Apply:** Use ${topic} when the problem matches its input pattern and the constraints are satisfied.\n- **When NOT to Apply:** Do not force ${topic} onto problems that violate its assumptions — this is the most common exam mistake.\n- **Connections:** ${topic} is related to other concepts in ${subjectCtx}; understanding these links helps you build a complete mental model.\n\n**📝 Revision Strategy:**\n1. Close your notes and try to write the definition from memory.\n2. Draw the concept map from memory — label every node and edge.\n3. Walk through the real-world example step by step without looking.\n4. If anything feels shaky, revisit just that section — do not re-read everything.\n\nYou are building strong foundations here. In the next phase, we will test this knowledge with adaptive questions that push you to *apply* what you have learned, not just recall it.`,
        mediaType: 'markdown',
        estimatedMinutes: 4,
      },
    ],
  };
};

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
