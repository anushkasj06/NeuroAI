/**
 * Concept Map Service — LLM-powered semantic concept extraction.
 *
 * Uses the Groq API (via grokService chatCompletion) to extract meaningful
 * domain concepts, relationships, and rich educational content from study material.
 * Falls back to lightweight lexical extraction when the LLM is unavailable.
 */

const CACHE_LIMIT = 180;
const MAX_CONCEPTS = 12;

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const conceptCache = new Map();

const normalizeText = (value, maxLength = 8000) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const toDateToken = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const setCache = (key, value) => {
  if (conceptCache.size >= CACHE_LIMIT) {
    const firstKey = conceptCache.keys().next().value;
    conceptCache.delete(firstKey);
  }
  conceptCache.set(key, value);
};

/* ─── build full material text for the LLM prompt ─────────────────────────── */

const buildMaterialText = (content) => {
  const parts = [];

  if (content.title) parts.push(`TITLE: ${normalizeText(content.title, 200)}`);
  if (content.summary) parts.push(`SUMMARY: ${normalizeText(content.summary, 1000)}`);

  const tags = (content.tags || []).filter(Boolean).join(', ');
  if (tags) parts.push(`TAGS: ${tags}`);

  let sectionName = 'Body';
  (content.blocks || []).forEach((block) => {
    if (!block || typeof block !== 'object') return;

    if (block.type === 'text' && block.style === 'heading') {
      sectionName = normalizeText(block.text, 120) || sectionName;
      parts.push(`\n## ${sectionName}`);
      return;
    }

    switch (block.type) {
      case 'text':
        if (block.text) parts.push(normalizeText(block.text, 3000));
        break;
      case 'callout':
        if (block.text) parts.push(`[NOTE] ${normalizeText(block.text, 1500)}`);
        break;
      case 'image':
      case 'video':
        if (block.caption) parts.push(`[MEDIA] ${normalizeText(block.caption, 300)}`);
        break;
      case 'checklist':
        (block.checklist || []).forEach((item) => {
          if (item?.text) parts.push(`- ${normalizeText(item.text, 200)}`);
        });
        break;
      default:
        break;
    }
  });

  return parts.join('\n').slice(0, 6000);
};

/* ─── LLM concept extraction ─────────────────────────────────────────────── */

const CONCEPT_MAP_PROMPT = `You are an expert educator and knowledge-graph architect. Analyze the following study material and produce a RICH, DETAILED concept map that genuinely teaches students.

STUDY MATERIAL:
---
{MATERIAL_TEXT}
---

Your task:
1. Extract 8–12 KEY DOMAIN CONCEPTS (meaningful academic terms, NOT generic words like "the", "data", "values").
2. For EACH concept, provide:
   - A clear 2-3 sentence definition that teaches the concept (not just a dictionary stub)
   - A concrete real-world example or analogy
   - A "key insight" — the one thing students often miss or find surprising
   - An emoji icon that visually represents the concept
   - A difficulty rating (beginner/intermediate/advanced)
   - A list of 2-3 key facts or properties
3. Generate meaningful RELATIONSHIPS between concepts with descriptive labels and categories.
4. Create a brief "learning path" — the recommended order to study these concepts.

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "concepts": [
    {
      "label": "Concept Name",
      "type": "main",
      "weight": 100,
      "emoji": "🌳",
      "difficulty": "beginner",
      "definition": "2-3 sentence educational definition that actually teaches.",
      "example": "A concrete example or analogy a student can relate to.",
      "keyInsight": "The non-obvious insight students often miss about this concept.",
      "keyFacts": ["Important fact 1", "Important fact 2", "Important fact 3"]
    }
  ],
  "relationships": [
    {
      "from": 0,
      "to": 1,
      "label": "descriptive verb/phrase",
      "category": "hierarchy|dependency|property|comparison|process",
      "strength": 85
    }
  ],
  "learningPath": [0, 1, 3, 2, 4],
  "sectionAnalysis": [
    { "section": "Section Name", "concepts": 3, "readMinutes": 2 }
  ]
}

Constraints:
- concepts: 8–12 items. Exactly one "main", 2–3 "sub", rest "detail".
- weight: 25–100 (main=100, subs 60–85, details 25–55).
- Each definition MUST be 2-3 sentences and genuinely educational (not "X is a thing").
- Each example MUST be concrete and relatable.
- Each keyInsight MUST reveal something non-obvious.
- relationships: 10–20 items. strength: 40–100. category must be one of the 5 listed.
- learningPath: array of concept indices in recommended study order.
- sectionAnalysis: 2–6 items.`;

const parseJson = (text) => {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  const jsonStr = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(jsonStr);
};

const extractConceptsWithLLM = async (materialText) => {
  const { chatCompletion } = require('./grokService');

  const prompt = CONCEPT_MAP_PROMPT.replace('{MATERIAL_TEXT}', materialText);

  const text = await chatCompletion(
    [
      { role: 'system', content: 'You are an expert educator and knowledge-graph architect. Return ONLY valid JSON. No markdown fences.' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.35, maxTokens: 4096 }
  );

  const parsed = parseJson(text);

  if (!Array.isArray(parsed.concepts) || parsed.concepts.length < 2) {
    throw new Error('LLM returned fewer than 2 concepts');
  }

  return parsed;
};

/* ─── Fallback lexical extraction ─────────────────────────────────────────── */

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'almost', 'along', 'also', 'among', 'and',
  'another', 'any', 'are', 'around', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'can', 'cannot', 'could', 'does', 'during', 'each', 'either', 'enough', 'every',
  'from', 'further', 'have', 'into', 'just', 'least', 'less', 'like', 'many', 'might', 'more',
  'most', 'much', 'must', 'near', 'need', 'only', 'other', 'ours', 'over', 'same', 'should',
  'since', 'some', 'such', 'than', 'that', 'their', 'theirs', 'them', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'under', 'until', 'very', 'want', 'were', 'what', 'when',
  'where', 'which', 'while', 'with', 'within', 'would', 'your', 'yours', 'using', 'used', 'into',
  'onto', 'across', 'without', 'student', 'students', 'topic', 'topics', 'material', 'content',
  'the', 'for', 'not', 'you', 'all', 'its', 'has', 'had', 'was', 'will', 'how', 'who', 'our',
]);

const tokenize = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+\-/#\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

const toTitleCase = (value) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join(' ');

const isNearDuplicate = (first, second) => {
  if (first === second) return true;
  if (first.includes(second) || second.includes(first)) return true;
  const firstTokens = first.split(' ');
  const secondTokens = second.split(' ');
  const intersection = firstTokens.filter((t) => secondTokens.includes(t)).length;
  const union = new Set([...firstTokens, ...secondTokens]).size || 1;
  return intersection / union >= 0.8;
};

const fallbackExtractConcepts = (content) => {
  const segments = [];
  const push = (text, weight) => {
    const normalized = normalizeText(text);
    if (normalized) segments.push({ text: normalized, weight });
  };

  push(content.title, 6);
  push(content.summary, 4);
  (content.tags || []).forEach((tag) => push(tag, 3));
  (content.blocks || []).forEach((block) => {
    if (!block) return;
    if (block.type === 'text') push(block.text, block.style === 'heading' ? 4 : 2.4);
    if (block.type === 'callout') push(block.text, 3);
    if (block.type === 'checklist') (block.checklist || []).forEach((item) => push(item?.text, 2));
  });

  const scores = new Map();
  const addScore = (phrase, amount) => {
    const n = normalizeText(phrase, 80).toLowerCase();
    if (!n || n.length < 3 || n.split(' ').length > 4) return;
    scores.set(n, (scores.get(n) || 0) + amount);
  };

  segments.forEach(({ text, weight }) => {
    const tokens = tokenize(text);
    const local = new Map();
    tokens.forEach((t) => local.set(t, (local.get(t) || 0) + 1));
    local.forEach((count, token) => addScore(token, weight * (1 + Math.log(1 + count))));
    for (let i = 0; i < tokens.length - 1; i++) addScore(`${tokens[i]} ${tokens[i + 1]}`, weight * 1.35);
  });

  const sorted = Array.from(scores.entries())
    .filter(([p]) => p.length >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 36);

  const picked = [];
  sorted.forEach(([phrase, score]) => {
    if (picked.length >= MAX_CONCEPTS) return;
    if (picked.some((item) => isNearDuplicate(item.phrase, phrase))) return;
    picked.push({ phrase, score });
  });

  if (!picked.length) picked.push({ phrase: 'core concept', score: 1 });

  const topScore = picked[0].score || 1;
  const concepts = picked.map((item, idx) => ({
    label: toTitleCase(item.phrase),
    type: idx === 0 ? 'main' : idx <= 3 ? 'sub' : 'detail',
    weight: Math.max(25, Math.min(100, Math.round((item.score / topScore) * 100))),
    emoji: idx === 0 ? '📌' : idx <= 3 ? '📎' : '📄',
    difficulty: 'beginner',
    definition: `Key concept extracted from the study material.`,
    example: '',
    keyInsight: '',
    keyFacts: [],
  }));

  const edges = [];
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const tokA = new Set(tokenize(concepts[i].label));
      const tokB = new Set(tokenize(concepts[j].label));
      let overlap = 0;
      tokA.forEach((t) => { if (tokB.has(t)) overlap++; });
      const sim = overlap / (new Set([...tokA, ...tokB]).size || 1);
      if (sim > 0.15 || (i === 0 && j <= 3)) {
        edges.push({
          from: i,
          to: j,
          label: 'related to',
          category: 'dependency',
          strength: Math.round(Math.max(40, sim * 100)),
        });
      }
    }
  }

  if (edges.length === 0) {
    for (let i = 0; i < concepts.length - 1; i++) {
      edges.push({ from: i, to: i + 1, label: 'followed by', category: 'process', strength: 50 });
    }
  }

  const learningPath = concepts.map((_, i) => i);

  return { concepts, relationships: edges, learningPath, sectionAnalysis: [] };
};

/* ─── Build final map structure ───────────────────────────────────────────── */

const CATEGORY_COLORS = {
  hierarchy: '#8b5cf6',
  dependency: '#0ea5e9',
  property: '#22c55e',
  comparison: '#f59e0b',
  process: '#ef4444',
};

const buildConceptMap = (llmResult, usedLLM, fallbackReason) => {
  const concepts = (llmResult.concepts || []).slice(0, MAX_CONCEPTS);
  const relationships = llmResult.relationships || [];
  const sectionAnalysis = llmResult.sectionAnalysis || [];
  const learningPath = llmResult.learningPath || concepts.map((_, i) => i);

  const nodes = concepts.map((item, index) => ({
    id: `node-${index}`,
    label: item.label,
    type: item.type || (index === 0 ? 'main' : index <= 3 ? 'sub' : 'detail'),
    weight: item.weight || 50,
    emoji: item.emoji || '📌',
    difficulty: item.difficulty || 'beginner',
    definition: item.definition || '',
    example: item.example || '',
    keyInsight: item.keyInsight || '',
    keyFacts: Array.isArray(item.keyFacts) ? item.keyFacts : [],
  }));

  const edges = relationships
    .filter((rel) => {
      const from = Number(rel.from);
      const to = Number(rel.to);
      return from >= 0 && from < nodes.length && to >= 0 && to < nodes.length && from !== to;
    })
    .map((rel, idx) => ({
      id: `edge-${idx}`,
      from: `node-${rel.from}`,
      to: `node-${rel.to}`,
      label: rel.label || 'related to',
      category: rel.category || 'dependency',
      color: CATEGORY_COLORS[rel.category] || CATEGORY_COLORS.dependency,
      strength: Math.max(20, Math.min(100, rel.strength || 50)),
    }));

  const maxPairs = nodes.length > 1 ? (nodes.length * (nodes.length - 1)) / 2 : 1;
  const avgStrength = edges.length
    ? Math.round(edges.reduce((sum, e) => sum + e.strength, 0) / edges.length)
    : 0;

  const analytics = {
    conceptCount: nodes.length,
    relationshipCount: edges.length,
    graphDensity: Number((edges.length / maxPairs).toFixed(2)),
    averageStrength: avgStrength,
    masteryLoad: Math.min(100, Math.round(avgStrength * 0.6 + nodes.length * 2.8)),
    sectionDistribution: sectionAnalysis.map((s) => ({
      section: s.section || 'Core',
      concepts: s.concepts || 0,
      readMinutes: s.readMinutes || 1,
    })),
    strongestConcepts: [...nodes]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map((n) => ({ label: n.label, weight: n.weight })),
    strongestLinks: [...edges]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 6)
      .map((e) => ({
        pair: `${nodes.find((n) => n.id === e.from)?.label || ''} ↔ ${nodes.find((n) => n.id === e.to)?.label || ''}`.trim(),
        strength: e.strength,
      })),
  };

  return {
    nodes,
    edges,
    learningPath: learningPath.filter((i) => i >= 0 && i < nodes.length).map((i) => `node-${i}`),
    analytics,
    model: {
      name: usedLLM ? 'Groq LLM' : 'Fallback lexical',
      provider: usedLLM ? 'groq' : 'lexical',
      usedLLM,
      usedEmbeddings: false,
      fallbackReason,
    },
    generatedAt: new Date().toISOString(),
  };
};

/* ─── Public entry point ──────────────────────────────────────────────────── */

const generateConceptMapForContent = async (content, options = {}) => {
  const forceRefresh = Boolean(options.forceRefresh);
  const contentId = content?._id?.toString() || 'unknown';
  const updatedAt = toDateToken(content?.updatedAt) || toDateToken(content?.publishedAt) || 'na';
  const cacheKey = `${contentId}:${updatedAt}`;

  if (!forceRefresh && conceptCache.has(cacheKey)) {
    return conceptCache.get(cacheKey);
  }

  const materialText = buildMaterialText(content || {});

  let llmResult = null;
  let usedLLM = false;
  let fallbackReason = null;

  try {
    llmResult = await extractConceptsWithLLM(materialText);
    usedLLM = true;
  } catch (err) {
    console.error('LLM concept extraction failed, using fallback:', err.message);
    fallbackReason = err.message || 'LLM unavailable';
    llmResult = fallbackExtractConcepts(content || {});
  }

  const conceptMap = buildConceptMap(llmResult, usedLLM, fallbackReason);
  setCache(cacheKey, conceptMap);
  return conceptMap;
};

module.exports = {
  generateConceptMapForContent,
};
