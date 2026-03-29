import * as pollService from '../services/pollService.js';
import { addClient, getClientCount } from '../services/pollSSE.js';
import { track } from '../services/analyticsService.js';

// ── Admin: CRUD ──

export async function create(req, res, next) {
  try {
    const poll = await pollService.createPoll(req.body, req.admin?.id);
    track('poll.created', 'poll', { actor: { type: 'admin', id: req.admin?.id }, target: { model: 'Poll', id: poll._id.toString() }, req });
    res.status(201).json({ success: true, data: poll });
  } catch (err) { next(err); }
}

export async function list(req, res, next) {
  try {
    const polls = await pollService.listPolls(req.query);
    res.json({ success: true, data: polls });
  } catch (err) { next(err); }
}

export async function getOne(req, res, next) {
  try {
    const poll = await pollService.getPollById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    res.json({ success: true, data: poll, viewers: getClientCount(poll._id.toString()) });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const poll = await pollService.updatePoll(req.params.id, req.body);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    res.json({ success: true, data: poll });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const poll = await pollService.deletePoll(req.params.id);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    track('poll.deleted', 'poll', { actor: { type: 'admin', id: req.admin?.id }, req });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── Admin: Live Control ──

export async function setStatus(req, res, next) {
  try {
    const poll = await pollService.setPollStatus(req.params.id, req.body.status);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    track('poll.status_changed', 'poll', { actor: { type: 'admin', id: req.admin?.id }, meta: { status: req.body.status }, req });
    res.json({ success: true, data: poll });
  } catch (err) { next(err); }
}

export async function activate(req, res, next) {
  try {
    const poll = await pollService.setActiveQuestion(req.params.id, req.body.questionIndex);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    track('poll.question_activated', 'poll', { actor: { type: 'admin', id: req.admin?.id }, meta: { questionIndex: req.body.questionIndex }, req });
    res.json({ success: true, data: poll });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

export async function results(req, res, next) {
  try {
    const data = await pollService.getDetailedResults(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Poll not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ── Public ──

export async function getActive(_req, res, next) {
  try {
    const data = await pollService.getActivePoll();
    if (!data) return res.json({ success: true, data: null });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function vote(req, res, next) {
  try {
    const { questionId, optionId, textResponse, ratingValue, sessionId } = req.body;
    const results = await pollService.castVote(
      req.params.id, questionId,
      { optionId, textResponse, ratingValue },
      sessionId, req.ip,
    );
    track('poll.vote', 'poll', { actor: { type: 'applicant' }, meta: { pollId: req.params.id, questionId }, req });
    res.json({ success: true, data: results });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

export async function liveStream(req, res) {
  addClient(req.params.id, res);
}
