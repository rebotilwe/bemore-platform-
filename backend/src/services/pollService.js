import Poll from '../models/Poll.js';
import PollResponse from '../models/PollResponse.js';
import { broadcast, getClientCount } from './pollSSE.js';

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
  return Poll.findByIdAndDelete(id);
}

// ── Live Control ──

export async function setPollStatus(id, status) {
  // Deactivate any other active poll if activating this one
  if (status === 'active') {
    await Poll.updateMany({ status: 'active' }, { status: 'paused', updatedAt: new Date() });
  }

  const poll = await Poll.findByIdAndUpdate(
    id,
    { status, updatedAt: new Date() },
    { new: true },
  );
  if (!poll) return null;

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

  const question = questionIndex >= 0 ? poll.questions[questionIndex] : null;
  const results = question ? await aggregateResults(id, question._id, question) : null;

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
  const poll = await Poll.findOne({ status: 'active' });
  if (!poll || poll.activeQuestionIndex < 0) return null;

  const question = poll.questions[poll.activeQuestionIndex];
  if (!question) return null;

  const results = await aggregateResults(poll._id, question._id, question);

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

// ── Voting ──

export async function castVote(pollId, questionId, voteData, sessionId, ip) {
  const poll = await Poll.findById(pollId);
  if (!poll || poll.status !== 'active') {
    throw Object.assign(new Error('Poll is not active'), { status: 400 });
  }

  const question = poll.questions.id(questionId);
  if (!question) {
    throw Object.assign(new Error('Question not found'), { status: 404 });
  }

  // Validate vote data matches question type
  const responseData = { pollId, questionId, sessionId, ip };

  switch (question.type) {
    case 'multiple-choice':
      if (!voteData.optionId) throw Object.assign(new Error('optionId required'), { status: 400 });
      const optionExists = question.options.id(voteData.optionId);
      if (!optionExists) throw Object.assign(new Error('Invalid option'), { status: 400 });
      responseData.optionId = voteData.optionId;
      break;
    case 'word-cloud':
    case 'open-text':
      if (!voteData.textResponse?.trim()) throw Object.assign(new Error('textResponse required'), { status: 400 });
      responseData.textResponse = voteData.textResponse.trim().slice(0, 200);
      break;
    case 'rating':
      const val = Number(voteData.ratingValue);
      if (!val || val < 1 || val > question.settings.ratingMax) {
        throw Object.assign(new Error(`ratingValue must be 1-${question.settings.ratingMax}`), { status: 400 });
      }
      responseData.ratingValue = val;
      break;
  }

  try {
    await PollResponse.create(responseData);
  } catch (err) {
    if (err.code === 11000) {
      throw Object.assign(new Error('Already voted on this question'), { status: 409 });
    }
    throw err;
  }

  // Aggregate and broadcast
  const results = await aggregateResults(pollId, questionId, question);
  broadcast(pollId.toString(), 'results', { questionId: questionId.toString(), ...results });

  return results;
}

// ── Aggregation ──

export async function aggregateResults(pollId, questionId, question) {
  const totalVotes = await PollResponse.countDocuments({ pollId, questionId });

  if (question.type === 'multiple-choice') {
    const pipeline = await PollResponse.aggregate([
      { $match: { pollId: typeof pollId === 'string' ? new (await import('mongoose')).default.Types.ObjectId(pollId) : pollId, questionId } },
      { $group: { _id: '$optionId', count: { $sum: 1 } } },
    ]);
    const breakdown = question.options.map(opt => {
      const found = pipeline.find(p => p._id?.toString() === opt._id.toString());
      const count = found?.count || 0;
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

  if (question.type === 'word-cloud' || question.type === 'open-text') {
    const responses = await PollResponse.find({ pollId, questionId })
      .select('textResponse timestamp')
      .sort({ timestamp: -1 })
      .limit(100);

    if (question.type === 'word-cloud') {
      // Word frequency
      const freq = {};
      responses.forEach(r => {
        const word = r.textResponse?.toLowerCase().trim();
        if (word) freq[word] = (freq[word] || 0) + 1;
      });
      const words = Object.entries(freq)
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
      return { totalVotes, words };
    }

    return { totalVotes, responses: responses.map(r => ({ text: r.textResponse, timestamp: r.timestamp })) };
  }

  if (question.type === 'rating') {
    const pipeline = await PollResponse.aggregate([
      { $match: { pollId: typeof pollId === 'string' ? new (await import('mongoose')).default.Types.ObjectId(pollId) : pollId, questionId } },
      { $group: { _id: null, avg: { $avg: '$ratingValue' }, count: { $sum: 1 } } },
    ]);
    const avg = pipeline[0]?.avg || 0;

    // Distribution
    const distPipeline = await PollResponse.aggregate([
      { $match: { pollId: typeof pollId === 'string' ? new (await import('mongoose')).default.Types.ObjectId(pollId) : pollId, questionId } },
      { $group: { _id: '$ratingValue', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalVotes,
      average: Math.round(avg * 10) / 10,
      max: question.settings.ratingMax,
      distribution: distPipeline.map(d => ({ value: d._id, count: d.count })),
    };
  }

  return { totalVotes };
}

// ── Detailed Results (Admin) ──

export async function getDetailedResults(pollId) {
  const poll = await Poll.findById(pollId);
  if (!poll) return null;

  const results = [];
  for (const question of poll.questions) {
    const qResults = await aggregateResults(pollId, question._id, question);
    results.push({ question, ...qResults });
  }

  return { poll: { _id: poll._id, title: poll.title, status: poll.status }, results };
}
