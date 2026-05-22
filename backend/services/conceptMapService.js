const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const CACHE_LIMIT = 180;
const MAX_CONCEPTS = 12;
const MAX_CANDIDATES = 36;

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
]);

const conceptCache = new Map();
let extractorPromise = null;

const toTitleCase = (value) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join(' ');

const normalizeText = (value, maxLength = 8000) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

const tokenize = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+\-/#\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

const toDateToken = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const buildMaterialSegments = (content) => {
  const segments = [];
  const push = (text, weight, section = 'Core') => {
    const normalized = normalizeText(text);
    if (!normalized) return;
    segments.push({ text: normalized, weight, section });
  };

  push(content.title, 6, 'Title');
  push(content.summary, 4, 'Summary');
  (content.tags || []).forEach((tag) => push(tag, 3, 'Tags'));

  let sectionName = 'Body';
  (content.blocks || []).forEach((block) => {
    if (!block || typeof block !== 'object') return;
    if (block.type === 'text' && block.style === 'heading') {
      sectionName = normalizeText(block.text, 120) || sectionName;
      push(block.text, 4, sectionName);
      return;
    }

    switch (block.type) {
      case 'text':
        push(block.text, block.style === 'quote' ? 2 : 2.4, sectionName);
        break;
      case 'callout':
        push(block.text, 3, sectionName);
        break;
      case 'image':
      case 'video':
        push(block.caption, 1.5, sectionName);
        break;
      case 'file':
        push(block.fileName, 1, sectionName);
        break;
      case 'checklist':
        (block.checklist || []).forEach((item) => push(item?.text, 2, sectionName));
        break;
      default:
        break;
    }
  });

  if (!segments.length && content.title) {
    push(content.title, 6, 'Title');
  }

  return segments;
};

const isNearDuplicate = (first, second) => {
  if (first === second) return true;
  const firstTokens = first.split(' ');
  const secondTokens = second.split(' ');
  if (first.includes(second) || second.includes(first)) return true;
  const intersection = firstTokens.filter((token) => secondTokens.includes(token)).length;
  const union = new Set([...firstTokens, ...secondTokens]).size || 1;
  return intersection / union >= 0.8;
};

const extractConcepts = (segments) => {
  const scores = new Map();
  const addScore = (phrase, amount) => {
    const normalized = normalizeText(phrase, 80).toLowerCase();
    if (!normalized || normalized.length < 3 || normalized.split(' ').length > 4) return;
    scores.set(normalized, (scores.get(normalized) || 0) + amount);
  };

  segments.forEach(({ text, weight }) => {
    const tokens = tokenize(text);
    if (!tokens.length) return;

    const localUnigrams = new Map();
    tokens.forEach((token) => localUnigrams.set(token, (localUnigrams.get(token) || 0) + 1));
    localUnigrams.forEach((count, token) => addScore(token, weight * (1 + Math.log(1 + count))));

    for (let i = 0; i < tokens.length - 1; i += 1) {
      addScore(`${tokens[i]} ${tokens[i + 1]}`, weight * 1.35);
    }
    for (let i = 0; i < tokens.length - 2; i += 1) {
      addScore(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`, weight * 1.1);
    }
  });

  const sorted = Array.from(scores.entries())
    .filter(([phrase]) => phrase.length >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CANDIDATES);

  const picked = [];
  sorted.forEach(([phrase, score]) => {
    if (picked.length >= MAX_CONCEPTS) return;
    if (picked.some((item) => isNearDuplicate(item.phrase, phrase))) return;
    picked.push({ phrase, score });
  });

  if (!picked.length) {
    return [{ phrase: 'core concept', score: 1 }];
  }

  const topScore = picked[0].score || 1;
  return picked.map((item) => ({
    label: toTitleCase(item.phrase),
    raw: item.phrase,
    score: item.score,
    normalizedWeight: Math.max(25, Math.min(100, Math.round((item.score / topScore) * 100))),
  }));
};

const cosineSimilarity = (first, second) => {
  let dot = 0;
  let firstNorm = 0;
  let secondNorm = 0;
  for (let i = 0; i < first.length; i += 1) {
    const a = first[i] || 0;
    const b = second[i] || 0;
    dot += a * b;
    firstNorm += a * a;
    secondNorm += b * b;
  }
  if (!firstNorm || !secondNorm) return 0;
  return dot / (Math.sqrt(firstNorm) * Math.sqrt(secondNorm));
};

const lexicalSimilarity = (first, second) => {
  const firstTokens = new Set(tokenize(first));
  const secondTokens = new Set(tokenize(second));
  if (!firstTokens.size || !secondTokens.size) return 0;
  let overlap = 0;
  firstTokens.forEach((token) => {
    if (secondTokens.has(token)) overlap += 1;
  });
  const union = new Set([...firstTokens, ...secondTokens]).size;
  return overlap / (union || 1);
};

const getExtractor = async () => {
  if (!extractorPromise) {
    extractorPromise = import('@xenova/transformers').then(async ({ pipeline }) =>
      pipeline('feature-extraction', MODEL_NAME)
    );
  }
  return extractorPromise;
};

const tensorToVectors = (output) => {
  if (!output) return null;
  if (typeof output.tolist === 'function') return output.tolist();
  if (Array.isArray(output)) return output;

  if (Array.isArray(output.dims) && output.dims.length === 2 && output.data) {
    const [rows, cols] = output.dims;
    const vectors = [];
    for (let row = 0; row < rows; row += 1) {
      const start = row * cols;
      vectors.push(Array.from(output.data.slice(start, start + cols)));
    }
    return vectors;
  }

  return null;
};

const getEmbeddings = async (phrases) => {
  try {
    const extractor = await getExtractor();
    const output = await extractor(phrases, { pooling: 'mean', normalize: true });
    const vectors = tensorToVectors(output);
    if (!vectors || vectors.length !== phrases.length) {
      throw new Error('Embedding output shape mismatch');
    }
    return { vectors, usedModel: true, reason: null };
  } catch (error) {
    return { vectors: null, usedModel: false, reason: error.message || 'Embedding model unavailable' };
  }
};

const inferNodeType = (index) => {
  if (index === 0) return 'main';
  if (index <= 3) return 'sub';
  return 'detail';
};

const buildEdges = (concepts, vectors) => {
  const scores = [];
  const useEmbeddings = Boolean(vectors && vectors.length === concepts.length);

  for (let i = 0; i < concepts.length; i += 1) {
    for (let j = i + 1; j < concepts.length; j += 1) {
      const rawScore = useEmbeddings
        ? (cosineSimilarity(vectors[i], vectors[j]) + 1) / 2
        : lexicalSimilarity(concepts[i].raw, concepts[j].raw);
      scores.push({ i, j, score: Number(rawScore.toFixed(4)) });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  const threshold = useEmbeddings ? 0.54 : 0.28;
  const perNodeLimit = 3;
  const maxEdges = Math.max(4, Math.min(22, concepts.length * 2));
  const degree = new Array(concepts.length).fill(0);
  const edges = [];

  scores.forEach((item) => {
    if (edges.length >= maxEdges) return;
    if (item.score < threshold) return;
    if (degree[item.i] >= perNodeLimit || degree[item.j] >= perNodeLimit) return;

    degree[item.i] += 1;
    degree[item.j] += 1;
    edges.push({
      id: `edge-${item.i}-${item.j}`,
      from: `node-${item.i}`,
      to: `node-${item.j}`,
      label: 'semantic link',
      strength: Math.round(item.score * 100),
    });
  });

  if (!edges.length && concepts.length > 1) {
    for (let i = 0; i < concepts.length - 1; i += 1) {
      edges.push({
        id: `edge-fallback-${i}`,
        from: `node-${i}`,
        to: `node-${i + 1}`,
        label: 'progression',
        strength: 50,
      });
    }
  }

  return edges;
};

const buildSectionDistribution = (segments, concepts) => {
  const grouped = new Map();
  segments.forEach((segment) => {
    const key = segment.section || 'Core';
    if (!grouped.has(key)) {
      grouped.set(key, { label: key, text: '' });
    }
    const current = grouped.get(key);
    current.text = `${current.text} ${segment.text}`.trim();
  });

  return Array.from(grouped.values())
    .slice(0, 8)
    .map((item) => {
      const lower = item.text.toLowerCase();
      const conceptHits = concepts.reduce(
        (sum, concept) => sum + (lower.includes(concept.raw) ? 1 : 0),
        0
      );
      const words = lower.split(/\s+/).filter(Boolean).length;
      return {
        section: item.label,
        concepts: conceptHits,
        readMinutes: Math.max(1, Math.round(words / 170)),
      };
    });
};

const buildAnalytics = (nodes, edges, sectionDistribution) => {
  const maxPairs = nodes.length > 1 ? (nodes.length * (nodes.length - 1)) / 2 : 1;
  const avgStrength = edges.length
    ? Math.round(edges.reduce((sum, edge) => sum + edge.strength, 0) / edges.length)
    : 0;

  return {
    conceptCount: nodes.length,
    relationshipCount: edges.length,
    graphDensity: Number((edges.length / maxPairs).toFixed(2)),
    averageStrength: avgStrength,
    masteryLoad: Math.min(100, Math.round((avgStrength * 0.6) + (nodes.length * 2.8))),
    sectionDistribution,
    strongestConcepts: [...nodes]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map((node) => ({ label: node.label, weight: node.weight })),
    strongestLinks: [...edges]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 6)
      .map((edge) => ({
        pair: `${nodes.find((node) => node.id === edge.from)?.label || ''} <-> ${nodes.find((node) => node.id === edge.to)?.label || ''}`.trim(),
        strength: edge.strength,
      })),
  };
};

const setCache = (key, value) => {
  if (conceptCache.size >= CACHE_LIMIT) {
    const firstKey = conceptCache.keys().next().value;
    conceptCache.delete(firstKey);
  }
  conceptCache.set(key, value);
};

const generateConceptMapForContent = async (content, options = {}) => {
  const forceRefresh = Boolean(options.forceRefresh);
  const contentId = content?._id?.toString() || 'unknown';
  const updatedAt = toDateToken(content?.updatedAt) || toDateToken(content?.publishedAt) || 'na';
  const cacheKey = `${contentId}:${updatedAt}`;

  if (!forceRefresh && conceptCache.has(cacheKey)) {
    return conceptCache.get(cacheKey);
  }

  const segments = buildMaterialSegments(content || {});
  const extractedConcepts = extractConcepts(segments);
  const embeddingResult = await getEmbeddings(extractedConcepts.map((item) => item.label));
  const edges = buildEdges(extractedConcepts, embeddingResult.vectors);

  const nodes = extractedConcepts.map((item, index) => ({
    id: `node-${index}`,
    label: item.label,
    type: inferNodeType(index),
    weight: item.normalizedWeight,
  }));

  const sectionDistribution = buildSectionDistribution(segments, extractedConcepts);
  const analytics = buildAnalytics(nodes, edges, sectionDistribution);

  const conceptMap = {
    nodes,
    edges,
    analytics,
    model: {
      name: 'all-MiniLM-L6-v2',
      provider: '@xenova/transformers',
      usedEmbeddings: embeddingResult.usedModel,
      fallbackReason: embeddingResult.reason,
    },
    generatedAt: new Date().toISOString(),
  };

  setCache(cacheKey, conceptMap);
  return conceptMap;
};

module.exports = {
  generateConceptMapForContent,
};
