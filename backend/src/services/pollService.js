import Poll from '../models/Poll.js';
import PollResponse from '../models/PollResponse.js';
import { broadcast, getClientCount } from './pollSSE.js';

// ═══════════════════════════════════════════════
// IN-MEMORY CACHE — avoids hitting MongoDB on every vote
// ═══════════════════════════════════════════════

/** Cached active poll document */
let activePollCache = null;
let activePollCacheTime = 0;
const POLL_CACHE_TTL = 5000; // 5 seconds

/** In-memory vote counters per question: Map<questionId, Map<optionId|value, count>> */
const voteCounters = new Map();
const totalVoteCounters = new Map();
const MAX_CACHED_QUESTIONS = 50; // LRU eviction threshold
const counterAccessOrder = []; // Track access order for LRU

/** Debounce timers for broadcast */
const broadcastTimers = new Map();
const BROADCAST_DEBOUNCE = 150;

function getOrCreateCounter(questionId) {
  if (!voteCounters.has(questionId)) {
    // LRU eviction if over limit
    if (voteCounters.size >= MAX_CACHED_QUESTIONS) {
      const oldest = counterAccessOrder.shift();
      if (oldest) { voteCounters.delete(oldest); totalVoteCounters.delete(oldest); }
    }
    voteCounters.set(questionId, new Map());
    totalVoteCounters.set(questionId, 0);
  }
  // Move to end of access order (most recently used)
  const idx = counterAccessOrder.indexOf(questionId);
  if (idx > -1) counterAccessOrder.splice(idx, 1);
  counterAccessOrder.push(questionId);
  return voteCounters.get(questionId);
}

function invalidateCache() {
  activePollCache = null;
  activePollCacheTime = 0;
}

function invalidateCounters(questionId) {
  if (questionId) {
    voteCounters.delete(questionId);
    totalVoteCounters.delete(questionId);
    const idx = counterAccessOrder.indexOf(questionId);
    if (idx > -1) counterAccessOrder.splice(idx, 1);
  } else {
    voteCounters.clear();
    totalVoteCounters.clear();
    counterAccessOrder.length = 0;
  }
}

// ── CRUD ──

export async function createPoll(data, adminId) {
  const poll = new Poll({ ...data, createdBy: adminId });
  await poll.save();
  return poll;
}

export async function listPolls(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  return Poll.find(filter).sort({ createdAt: -1 });
}

export async function getPollById(id) {
  return Poll.findById(id);
}

export async function updatePoll(id, data) {
  const poll = await Poll.findById(id);
  if (!poll) return null;
  if (poll.status !== 'draft') {
    throw Object.assign(new Error('Can only edit polls in draft status'), { status: 400 });
  }
  Object.assign(poll, data);
  await poll.save();
  return poll;
}

export async function deletePoll(id) {
  await PollResponse.deleteMany({ pollId: id });
  invalidateCache();
  invalidateCounters();
  return Poll.findByIdAndDelete(id);
}

// ── Live Control ──

export async function setPollStatus(id, status) {
  if (status === 'active') {
    await Poll.updateMany({ status: 'active' }, { status: 'paused', updatedAt: new Date() });
  }

  const poll = await Poll.findByIdAndUpdate(
    id,
    { status, updatedAt: new Date() },
    { new: true },
  );
  if (!poll) return null;

  invalidateCache();
  invalidateCounters();
  broadcast(id, 'poll-status', { status: poll.status });
  return poll;
}

export async function setActiveQuestion(id, questionIndex) {
  const poll = await Poll.findById(id);
  if (!poll) return null;
  if (questionIndex < -1 || questionIndex >= poll.questions.length) {
    throw Object.assign(new Error('Invalid question index'), { status: 400 });
  }

  poll.activeQuestionIndex = questionIndex;
  poll.updatedAt = new Date();
  await poll.save();

  invalidateCache();

  const question = questionIndex >= 0 ? poll.questions[questionIndex] : null;
  let results = null;
  if (question) {
    // Warm the counter cache from DB for the new question
    results = await aggregateFromDB(id, question._id, question);
    warmCounter(question._id.toString(), question, results);
  }

  broadcast(id, 'question-change', {
    questionIndex,
    question,
    results,
    totalQuestions: poll.questions.length,
  });

  return poll;
}

// ── Active Poll (Public) ──

export async function getActivePoll() {
  // Use cache if fresh
  const now = Date.now();
  if (activePollCache && (now - activePollCacheTime) < POLL_CACHE_TTL) {
    const poll = activePollCache;
    const question = poll.questions[poll.activeQuestionIndex];
    if (!question) return null;
    const qId = question._id.toString();
    const results = voteCounters.has(qId)
      ? buildResultsFromCounter(qId, question)
      : await aggregateFromDB(poll._id, question._id, question);

    return {
      pollId: poll._id,
      title: poll.title,
      description: poll.description,
      questionIndex: poll.activeQuestionIndex,
      totalQuestions: poll.questions.length,
      question,
      results,
      viewers: getClientCount(poll._id.toString()),
    };
  }

  const poll = await Poll.findOne({ status: 'active' });
  if (!poll || poll.activeQuestionIndex < 0) {
    activePollCache = null;
    return null;
  }

  activePollCache = poll;
  activePollCacheTime = now;

  const question = poll.questions[poll.activeQuestionIndex];
  if (!question) return null;

  const results = await aggregateFromDB(poll._id, question._id, question);
  warmCounter(question._id.toString(), question, results);

  return {
    pollId: poll._id,
    title: poll.title,
    description: poll.description,
    questionIndex: poll.activeQuestionIndex,
    totalQuestions: poll.questions.length,
    question,
    results,
    viewers: getClientCount(poll._id.toString()),
  };
}

// ── Voting (HOT PATH — optimized) ──

export async function castVote(pollId, questionId, voteData, sessionId, ip) {
  // Use cached poll if available, else fetch
  let poll = activePollCache;
  if (!poll || poll._id.toString() !== pollId.toString()) {
    poll = await Poll.findById(pollId);
  }
  if (!poll || poll.status !== 'active') {
    throw Object.assign(new Error('Poll is not active'), { status: 400 });
  }

  const question = poll.questions.id(questionId);
  if (!question) {
    throw Object.assign(new Error('Question not found'), { status: 404 });
  }

  const responseData = { pollId, questionId, sessionId, ip };

  switch (question.type) {
    case 'multiple-choice':
      if (!voteData.optionId) throw Object.assign(new Error('optionId required'), { status: 400 });
      if (!question.options.id(voteData.optionId)) throw Object.assign(new Error('Invalid option'), { status: 400 });
      responseData.optionId = voteData.optionId;
      break;
    case 'word-cloud':
    case 'open-text':
      if (!voteData.textResponse?.trim()) throw Object.assign(new Error('textResponse required'), { status: 400 });
      responseData.textResponse = voteData.textResponse.trim().slice(0, 200);
      break;
    case 'rating': {
      const val = Number(voteData.ratingValue);
      if (!val || val < 1 || val > question.settings.ratingMax) {
        throw Object.assign(new Error(`ratingValue must be 1-${question.settings.ratingMax}`), { status: 400 });
      }
      responseData.ratingValue = val;
      break;
    }
  }

  // Write to DB (deduplication via unique index)
  try {
    await PollResponse.create(responseData);
  } catch (err) {
    if (err.code === 11000) {
      throw Object.assign(new Error('Already voted on this question'), { status: 409 });
    }
    throw err;
  }

  // Update in-memory counter (fast, no DB query)
  const qId = questionId.toString();
  const counter = getOrCreateCounter(qId);
  totalVoteCounters.set(qId, (totalVoteCounters.get(qId) || 0) + 1);

  if (question.type === 'multiple-choice') {
    const optId = voteData.optionId.toString();
    counter.set(optId, (counter.get(optId) || 0) + 1);
  } else if (question.type === 'rating') {
    const rKey = `r_${voteData.ratingValue}`;
    counter.set(rKey, (counter.get(rKey) || 0) + 1);
    // Update running average
    const total = totalVoteCounters.get(qId);
    const prevAvg = counter.get('_avg') || 0;
    counter.set('_avg', prevAvg + (voteData.ratingValue - prevAvg) / total);
  } else if (question.type === 'word-cloud') {
    const word = responseData.textResponse.toLowerCase();
    counter.set(word, (counter.get(word) || 0) + 1);
  }

  // Debounced broadcast — batches rapid votes
  debouncedBroadcast(pollId.toString(), qId, question);

  return buildResultsFromCounter(qId, question);
}

// ── Debounced Broadcast ──

function debouncedBroadcast(pollId, questionId, question) {
  const key = `${pollId}_${questionId}`;
  if (broadcastTimers.has(key)) return; // Already scheduled

  broadcastTimers.set(key, setTimeout(() => {
    broadcastTimers.delete(key);
    const results = buildResultsFromCounter(questionId, question);
    broadcast(pollId, 'results', { questionId, ...results });
  }, BROADCAST_DEBOUNCE));
}

// ── Build results from in-memory counters ──

function buildResultsFromCounter(questionId, question) {
  const counter = voteCounters.get(questionId) || new Map();
  const totalVotes = totalVoteCounters.get(questionId) || 0;

  if (question.type === 'multiple-choice') {
    const breakdown = question.options.map(opt => {
      const count = counter.get(opt._id.toString()) || 0;
      return {
        optionId: opt._id,
        text: opt.text,
        color: opt.color,
        count,
        pct: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
      };
    });
    return { totalVotes, breakdown };
  }

  if (question.type === 'word-cloud') {
    const words = [];
    for (const [text, count] of counter) {
      if (!text.startsWith('_')) words.push({ text, count });
    }
    words.sort((a, b) => b.count - a.count);
    return { totalVotes, words: words.slice(0, 50) };
  }

  if (question.type === 'rating') {
    const avg = counter.get('_avg') || 0;
    const distribution = [];
    for (const [key, count] of counter) {
      if (key.startsWith('r_')) {
        distribution.push({ value: Number(key.slice(2)), count });
      }
    }
    distribution.sort((a, b) => a.value - b.value);
    return {
      totalVotes,
      average: Math.round(avg * 10) / 10,
      max: question.settings.ratingMax,
      distribution,
    };
  }

  if (question.type === 'open-text') {
    // For open text, we still need DB since we store full responses
    return { totalVotes };
  }

  return { totalVotes };
}

// ── Warm counter from DB results ──

function warmCounter(questionId, question, dbResults) {
  const counter = getOrCreateCounter(questionId);
  counter.clear();
  totalVoteCounters.set(questionId, dbResults.totalVotes || 0);

  if (question.type === 'multiple-choice' && dbResults.breakdown) {
    for (const item of dbResults.breakdown) {
      counter.set(item.optionId.toString(), item.count);
    }
  } else if (question.type === 'word-cloud' && dbResults.words) {
    for (const w of dbResults.words) {
      counter.set(w.text, w.count);
    }
  } else if (question.type === 'rating' && dbResults.distribution) {
    counter.set('_avg', dbResults.average || 0);
    for (const d of dbResults.distribution) {
      counter.set(`r_${d.value}`, d.count);
    }
  }
}

// ── Full DB Aggregation (used for initial load + admin results) ──

async function aggregateFromDB(pollId, questionId, question) {
  const mongoose = (await import('mongoose')).default;
  const matchPollId = typeof pollId === 'string' ? new mongoose.Types.ObjectId(pollId) : pollId;
  const totalVotes = await PollResponse.countDocuments({ pollId, questionId });

  if (question.type === 'multiple-choice') {
    const pipeline = await PollResponse.aggregate([
      { $match: { pollId: matchPollId, questionId } },
      { $group: { _id: '$optionId', count: { $sum: 1 } } },
    ]);
    const breakdown = question.options.map(opt => {
      const found = pipeline.find(p => p._id?.toString() === opt._id.toString());
      const count = found?.count || 0;
      return { optionId: opt._id, text: opt.text, color: opt.color, count, pct: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0 };
    });
    return { totalVotes, breakdown };
  }

  if (question.type === 'word-cloud' || question.type === 'open-text') {
    const responses = await PollResponse.find({ pollId, questionId })
      .select('textResponse timestamp').sort({ timestamp: -1 }).limit(100);
    if (question.type === 'word-cloud') {
      const freq = {};
      responses.forEach(r => { const w = r.textResponse?.toLowerCase().trim(); if (w) freq[w] = (freq[w] || 0) + 1; });
      const words = Object.entries(freq).map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 50);
      return { totalVotes, words };
    }
    return { totalVotes, responses: responses.map(r => ({ text: r.textResponse, timestamp: r.timestamp })) };
  }

  if (question.type === 'rating') {
    const pipeline = await PollResponse.aggregate([
      { $match: { pollId: matchPollId, questionId } },
      { $group: { _id: null, avg: { $avg: '$ratingValue' } } },
    ]);
    const distPipeline = await PollResponse.aggregate([
      { $match: { pollId: matchPollId, questionId } },
      { $group: { _id: '$ratingValue', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return {
      totalVotes,
      average: Math.round((pipeline[0]?.avg || 0) * 10) / 10,
      max: question.settings.ratingMax,
      distribution: distPipeline.map(d => ({ value: d._id, count: d.count })),
    };
  }

  return { totalVotes };
}

// Alias for backward compatibility
export const aggregateResults = aggregateFromDB;

// ── Detailed Results (Admin) ──

export async function getDetailedResults(pollId) {
  const poll = await Poll.findById(pollId);
  if (!poll) return null;

  const results = [];
  for (const question of poll.questions) {
    const qResults = await aggregateFromDB(pollId, question._id, question);
    results.push({ question, ...qResults });
  }

  return { poll: { _id: poll._id, title: poll.title, status: poll.status }, results };
}
