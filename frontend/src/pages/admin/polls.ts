import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { toast } from '../../components/toast.ts';
import { mountAdminLayout } from './layout.ts';
import { connect, disconnect } from '../../services/poll-sse.ts';
import { renderBarChart, renderWordCloud, renderRatingDisplay, renderOpenTextList } from '../../components/poll-results-chart.ts';

type ApiCall = (typeof api) & Record<string, Function>;
const $ = (id: string) => document.getElementById(id);

const STATUS_CSS: Record<string, string> = {
  draft: 'background:rgba(138,138,154,0.15);color:var(--steel)',
  active: 'background:rgba(76,184,122,0.15);color:var(--green)',
  paused: 'background:rgba(201,168,76,0.15);color:var(--gold)',
  closed: 'background:rgba(201,76,76,0.15);color:var(--red)',
};

// @ts-ignore — tracked for conditional rendering
let _view: string = 'list';
let editingPoll: Record<string, unknown> | null = null;
let controlPoll: Record<string, unknown> | null = null;

// ═══════════════════════════════════════════
//  VIEWS
// ═══════════════════════════════════════════

function renderPollList(polls: Record<string, unknown>[]): string {
  if (!polls.length) {
    return `<div class="poll-empty-state">
      <p>No polls created yet.</p>
      <button class="btn-primary" id="btn-create-poll">Create Your First Poll</button>
    </div>`;
  }

  return `
    <div class="poll-list">
      ${polls.map(p => {
        const qs = (p.questions as unknown[])?.length || 0;
        const css = STATUS_CSS[p.status as string] || '';
        return `<div class="poll-list-item" data-id="${p._id}">
          <div class="poll-list-info">
            <div class="poll-list-title">${p.title}</div>
            <div class="poll-list-meta">${qs} question${qs !== 1 ? 's' : ''} &middot; <span style="${css};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">${p.status}</span></div>
          </div>
          <div class="poll-list-actions">
            ${p.status === 'draft' ? `<button class="btn-action" data-edit="${p._id}">Edit</button>` : ''}
            ${p.status === 'draft' ? `<button class="btn-action" data-activate="${p._id}">Activate</button>` : ''}
            ${p.status === 'active' ? `<button class="btn-primary" data-control="${p._id}" style="font-size:13px">Control Panel</button>` : ''}
            ${p.status === 'paused' ? `<button class="btn-action" data-resume="${p._id}">Resume</button>` : ''}
            ${p.status !== 'draft' ? `<button class="btn-action" data-results="${p._id}">View Results</button>` : ''}
            ${['draft', 'closed'].includes(p.status as string) ? `<button class="btn-action" data-delete="${p._id}" style="color:var(--red)">Delete</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderPollBuilder(poll?: Record<string, unknown>): string {
  const title = (poll?.title as string) || '';
  const desc = (poll?.description as string) || '';
  const questions = (poll?.questions as Array<Record<string, unknown>>) || [];

  return `
    <div class="poll-builder">
      <h3 class="poll-builder-title">${poll ? 'Edit Poll' : 'Create New Poll'}</h3>
      <div class="poll-builder-field">
        <label>Poll Title</label>
        <input type="text" id="pb-title" class="poll-builder-input" value="${title}" placeholder="e.g. Deal Readiness Assessment" maxlength="200" />
      </div>
      <div class="poll-builder-field">
        <label>Description (optional)</label>
        <input type="text" id="pb-desc" class="poll-builder-input" value="${desc}" placeholder="Brief description for context" maxlength="500" />
      </div>

      <div class="poll-builder-questions" id="pb-questions">
        <h4>Questions</h4>
        <div id="pb-question-list">
          ${questions.length ? questions.map((q, i) => renderQuestionEditor(q, i)).join('') : renderQuestionEditor({}, 0)}
        </div>
        <button class="btn-ghost" id="pb-add-question" style="margin-top:var(--sp-3)">+ Add Question</button>
      </div>

      <div class="poll-builder-actions">
        <button class="btn-ghost" id="pb-cancel">Cancel</button>
        <button class="btn-primary" id="pb-save">Save as Draft</button>
        <button class="btn-primary" id="pb-save-activate" style="background:var(--green);border-color:var(--green)">Save & Activate</button>
      </div>
    </div>`;
}

function renderQuestionEditor(q: Record<string, unknown>, index: number): string {
  const type = (q.type as string) || 'multiple-choice';
  const text = (q.text as string) || '';
  const options = (q.options as Array<Record<string, unknown>>) || [{ text: '' }, { text: '' }];
  const ratingMax = (q.settings as Record<string, unknown>)?.ratingMax || 5;

  return `
    <div class="pb-question" data-index="${index}">
      <div class="pb-question-header">
        <span class="pb-question-num">Q${index + 1}</span>
        ${index > 0 ? `<button class="pb-remove-q" data-remove="${index}" title="Remove">&times;</button>` : ''}
      </div>
      <input type="text" class="poll-builder-input pb-q-text" value="${text}" placeholder="Enter your question..." maxlength="500" />
      <select class="poll-builder-input pb-q-type">
        <option value="multiple-choice" ${type === 'multiple-choice' ? 'selected' : ''}>Multiple Choice</option>
        <option value="word-cloud" ${type === 'word-cloud' ? 'selected' : ''}>Word Cloud</option>
        <option value="rating" ${type === 'rating' ? 'selected' : ''}>Rating Scale</option>
        <option value="open-text" ${type === 'open-text' ? 'selected' : ''}>Open Text</option>
      </select>
      ${type === 'multiple-choice' ? `
        <div class="pb-options">
          ${options.map((o, oi) => `
            <div class="pb-option-row">
              <input type="text" class="poll-builder-input pb-opt-text" value="${(o.text as string) || ''}" placeholder="Option ${oi + 1}" maxlength="100" />
              ${oi > 1 ? `<button class="pb-remove-opt" title="Remove">&times;</button>` : ''}
            </div>
          `).join('')}
          <button class="btn-ghost pb-add-opt" style="font-size:12px;padding:4px 12px">+ Add Option</button>
        </div>` : ''}
      ${type === 'rating' ? `
        <div class="pb-rating-config">
          <label>Scale: 1 to</label>
          <select class="poll-builder-input pb-rating-max" style="width:auto;display:inline-block">
            <option value="5" ${ratingMax === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${ratingMax === 10 ? 'selected' : ''}>10</option>
          </select>
        </div>` : ''}
    </div>`;
}

function renderControlPanel(poll: Record<string, unknown>, results?: Record<string, unknown>): string {
  const questions = (poll.questions as Array<Record<string, unknown>>) || [];
  const activeIdx = (poll.activeQuestionIndex as number) ?? -1;
  const activeQ = activeIdx >= 0 ? questions[activeIdx] : null;
  const viewers = (poll as Record<string, unknown>).viewers || 0;

  return `
    <div class="poll-control">
      <div class="poll-control-header">
        <div>
          <h3 class="poll-control-title">${poll.title}</h3>
          <span style="${STATUS_CSS[poll.status as string] || ''};padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;text-transform:uppercase">${poll.status}</span>
          <span class="poll-viewers-badge">${viewers} viewer${(viewers as number) !== 1 ? 's' : ''} connected</span>
        </div>
        <div class="poll-control-btns">
          ${poll.status === 'active' ? `<button class="btn-action" id="pc-pause" style="color:var(--gold)">Pause</button>` : ''}
          ${poll.status === 'paused' ? `<button class="btn-action" id="pc-resume" style="color:var(--green)">Resume</button>` : ''}
          <button class="btn-action" id="pc-close" style="color:var(--red)">Close Poll</button>
        </div>
      </div>

      <div class="poll-control-nav">
        <button class="btn-action" id="pc-prev" ${activeIdx <= 0 ? 'disabled' : ''}>← Previous</button>
        <span class="poll-control-qnum">
          ${activeIdx >= 0 ? `Question ${activeIdx + 1} of ${questions.length}` : 'No question active'}
        </span>
        <button class="btn-primary" id="pc-next" ${activeIdx >= questions.length - 1 ? 'disabled' : ''}>
          ${activeIdx < 0 ? 'Start First Question →' : 'Next Question →'}
        </button>
      </div>

      ${activeQ ? `
        <div class="poll-control-question">
          <div class="poll-control-qtype">${(activeQ.type as string).replace('-', ' ')}</div>
          <h4 class="poll-control-qtext display">${activeQ.text}</h4>
        </div>
        <div id="pc-results" class="poll-control-results">
          ${results ? renderResultsForType(activeQ, results) : '<p class="poll-empty">Waiting for votes...</p>'}
        </div>
      ` : `
        <div class="poll-control-question" style="text-align:center;padding:var(--sp-10)">
          <p class="poll-empty">Click "Start First Question" to begin the poll.</p>
        </div>
      `}

      <button class="btn-ghost" id="pc-back" style="margin-top:var(--sp-6)">← Back to Poll List</button>
    </div>`;
}

function renderResultsForType(question: Record<string, unknown>, results: Record<string, unknown>): string {
  const type = question.type as string;
  const totalVotes = (results.totalVotes as number) || 0;
  if (type === 'multiple-choice') return renderBarChart((results.breakdown as Array<{ text: string; count: number; pct: number; color?: string }>) || [], totalVotes);
  if (type === 'word-cloud') return renderWordCloud((results.words as Array<{ text: string; count: number }>) || []);
  if (type === 'rating') return renderRatingDisplay(results as { average: number; max: number; totalVotes: number; distribution: { value: number; count: number }[] });
  if (type === 'open-text') return renderOpenTextList((results.responses as Array<{ text: string; timestamp: string }>) || []);
  return '';
}

// ═══════════════════════════════════════════
//  FULL RESULTS VIEW
// ═══════════════════════════════════════════

function renderFullResults(poll: Record<string, unknown>, results: Array<Record<string, unknown>>): string {
  const questions = (poll.questions as Array<Record<string, unknown>>) || [];
  let totalResponses = 0;
  results.forEach(r => { totalResponses += (r.totalVotes as number) || 0; });

  return `
    <div class="poll-results-full">
      <div class="poll-results-header">
        <div>
          <h3 class="poll-results-title display">${poll.title}</h3>
          <p class="poll-results-sub">${questions.length} question${questions.length !== 1 ? 's' : ''} &middot; ${totalResponses} total response${totalResponses !== 1 ? 's' : ''}</p>
        </div>
      </div>

      ${results.map((r, i) => {
        const q = (r.question || questions[i]) as Record<string, unknown>;
        if (!q) return '';
        const type = q.type as string;
        const totalVotes = (r.totalVotes as number) || 0;

        return `
        <div class="poll-results-question">
          <div class="poll-results-q-header">
            <span class="poll-results-q-num">Q${i + 1}</span>
            <span class="poll-results-q-type">${type.replace('-', ' ')}</span>
            <span class="poll-results-q-votes">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</span>
          </div>
          <h4 class="poll-results-q-text">${q.text}</h4>
          <div class="poll-results-q-chart">
            ${renderResultsForType(q, r)}
          </div>
        </div>`;
      }).join('')}

      <button class="btn-ghost" id="pr-back" style="margin-top:var(--sp-6)">← Back to Polls</button>
    </div>`;
}

async function openFullResults(pollId: string): Promise<void> {
  const container = $('polls-content');
  if (!container) return;
  container.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card" style="height:200px"></div>';

  const res = await (api as ApiCall).getPollResults(pollId);
  if (!res.success || !res.data) {
    toast('Failed to load results');
    loadPollList();
    return;
  }

  const data = res.data as Record<string, unknown>;
  const poll = data.poll as Record<string, unknown>;
  const results = (data.results as Array<Record<string, unknown>>) || [];

  container.innerHTML = renderFullResults(poll, results);

  $('pr-back')?.addEventListener('click', () => loadPollList());
}

// ═══════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════

async function loadPollList(): Promise<void> {
  const container = $('polls-content');
  if (!container) return;
  container.innerHTML = '<div class="skeleton skeleton-card"></div>';

  const res = await (api as ApiCall).getPolls();
  if (!res.success) {
    container.innerHTML = '<p class="detail-empty">Failed to load polls.</p>';
    return;
  }

  const polls = (res.data || []) as Record<string, unknown>[];
  container.innerHTML = `
    <button class="btn-primary" id="btn-create-poll" style="margin-bottom:var(--sp-5)">+ Create New Poll</button>
    ${renderPollList(polls)}`;

  bindListActions(polls);
}

function collectQuestions(): Record<string, unknown>[] {
  const questions: Record<string, unknown>[] = [];
  document.querySelectorAll('.pb-question').forEach(el => {
    const text = (el.querySelector('.pb-q-text') as HTMLInputElement)?.value.trim();
    const type = (el.querySelector('.pb-q-type') as HTMLSelectElement)?.value;
    if (!text) return;

    const q: Record<string, unknown> = { text, type };
    if (type === 'multiple-choice') {
      const opts: { text: string }[] = [];
      el.querySelectorAll('.pb-opt-text').forEach((input) => {
        const val = (input as HTMLInputElement).value.trim();
        if (val) opts.push({ text: val });
      });
      q.options = opts.length >= 2 ? opts : [{ text: 'Option 1' }, { text: 'Option 2' }];
    }
    if (type === 'rating') {
      q.settings = { ratingMax: Number((el.querySelector('.pb-rating-max') as HTMLSelectElement)?.value) || 5 };
    }
    questions.push(q);
  });
  return questions;
}

async function savePoll(activate: boolean): Promise<void> {
  const title = ($('pb-title') as HTMLInputElement)?.value.trim();
  if (!title) { toast('Title is required'); return; }

  const questions = collectQuestions();
  if (!questions.length) { toast('Add at least one question'); return; }

  const data = {
    title,
    description: ($('pb-desc') as HTMLInputElement)?.value.trim() || undefined,
    questions,
  };

  let res: { success?: boolean; data?: unknown; message?: string };
  if (editingPoll) {
    res = await (api as ApiCall).updatePoll(editingPoll._id as string, data);
  } else {
    res = await (api as ApiCall).createPoll(data);
  }

  if (res.success) {
    if (activate && res.data) {
      const pollId = (res.data as Record<string, unknown>)._id as string;
      await (api as ApiCall).setPollStatus(pollId, 'active');
      await (api as ApiCall).setPollActiveQuestion(pollId, 0);
      toast('Poll created and activated!');
    } else {
      toast(editingPoll ? 'Poll updated' : 'Poll saved as draft');
    }
    editingPoll = null;
    _view ='list';
    loadPollList();
  } else {
    toast((res as Record<string, unknown>).message as string || 'Save failed');
  }
}

async function openControlPanel(pollId: string): Promise<void> {
  const container = $('polls-content');
  if (!container) return;
  container.innerHTML = '<div class="skeleton skeleton-card"></div>';

  const res = await (api as ApiCall).getPollResults(pollId);
  if (!res.success || !res.data) { toast('Failed to load poll'); loadPollList(); return; }

  const data = res.data as Record<string, unknown>;
  controlPoll = data.poll as Record<string, unknown>;
  const results = (data.results as Array<Record<string, unknown>>) || [];

  // Get viewer count
  const pollRes = await (api as ApiCall).getPolls();
  const fullPoll = ((pollRes.data || []) as Record<string, unknown>[]).find(p => (p._id as string) === pollId);
  if (fullPoll) controlPoll = { ...controlPoll, ...fullPoll };

  const activeIdx = (controlPoll.activeQuestionIndex as number) ?? -1;
  const activeResults = activeIdx >= 0 ? results[activeIdx] : null;

  _view ='control';
  container.innerHTML = renderControlPanel(controlPoll, activeResults || undefined);
  bindControlActions(pollId, results);

  // Connect SSE for live result updates
  connect(pollId, {
    onResults: (eventData) => {
      const d = eventData as Record<string, unknown>;
      const resultsArea = $('pc-results');
      const questions = (controlPoll?.questions as Array<Record<string, unknown>>) || [];
      const activeIdx = (controlPoll?.activeQuestionIndex as number) ?? -1;
      const activeQ = activeIdx >= 0 ? questions[activeIdx] : null;
      if (resultsArea && activeQ && d.questionId === (activeQ._id as string)?.toString()) {
        resultsArea.innerHTML = renderResultsForType(activeQ, d);
      }
    },
  });
}

// ═══════════════════════════════════════════
//  EVENT BINDINGS
// ═══════════════════════════════════════════

function bindListActions(polls: Record<string, unknown>[]): void {
  $('btn-create-poll')?.addEventListener('click', () => {
    editingPoll = null;
    _view ='builder';
    const container = $('polls-content');
    if (container) {
      container.innerHTML = renderPollBuilder();
      bindBuilderActions();
    }
  });

  document.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.activate!;
      await (api as ApiCall).setPollStatus(id, 'active');
      await (api as ApiCall).setPollActiveQuestion(id, 0);
      toast('Poll activated!');
      loadPollList();
    });
  });

  document.querySelectorAll('[data-control]').forEach(btn => {
    btn.addEventListener('click', () => {
      openControlPanel((btn as HTMLElement).dataset.control!);
    });
  });

  document.querySelectorAll('[data-resume]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await (api as ApiCall).setPollStatus((btn as HTMLElement).dataset.resume!, 'active');
      toast('Poll resumed');
      loadPollList();
    });
  });

  document.querySelectorAll('[data-results]').forEach(btn => {
    btn.addEventListener('click', () => {
      openFullResults((btn as HTMLElement).dataset.results!);
    });
  });

  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const poll = polls.find(p => (p._id as string) === (btn as HTMLElement).dataset.edit);
      if (poll) {
        editingPoll = poll;
        _view ='builder';
        const container = $('polls-content');
        if (container) {
          container.innerHTML = renderPollBuilder(poll);
          bindBuilderActions();
        }
      }
    });
  });

  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this poll and all its responses?')) return;
      await (api as ApiCall).deletePoll((btn as HTMLElement).dataset.delete!);
      toast('Poll deleted');
      loadPollList();
    });
  });
}

function bindBuilderActions(): void {
  $('pb-cancel')?.addEventListener('click', () => { editingPoll = null; _view ='list'; loadPollList(); });
  $('pb-save')?.addEventListener('click', () => savePoll(false));
  $('pb-save-activate')?.addEventListener('click', () => savePoll(true));

  $('pb-add-question')?.addEventListener('click', () => {
    const list = $('pb-question-list');
    if (!list) return;
    const count = list.querySelectorAll('.pb-question').length;
    const div = document.createElement('div');
    div.innerHTML = renderQuestionEditor({}, count);
    list.appendChild(div.firstElementChild!);
    bindQuestionEditorEvents();
  });

  bindQuestionEditorEvents();
}

function bindQuestionEditorEvents(): void {
  // Type change — re-render question to show/hide options
  document.querySelectorAll('.pb-q-type').forEach(sel => {
    sel.addEventListener('change', () => {
      const qDiv = sel.closest('.pb-question') as HTMLElement;
      const index = Number(qDiv?.dataset.index || 0);
      const text = (qDiv?.querySelector('.pb-q-text') as HTMLInputElement)?.value || '';
      const type = (sel as HTMLSelectElement).value;
      const newHtml = renderQuestionEditor({ text, type }, index);
      qDiv.outerHTML = newHtml;
      bindQuestionEditorEvents();
    });
  });

  // Add option
  document.querySelectorAll('.pb-add-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const optContainer = btn.closest('.pb-options');
      if (!optContainer) return;
      const count = optContainer.querySelectorAll('.pb-option-row').length;
      const div = document.createElement('div');
      div.className = 'pb-option-row';
      div.innerHTML = `<input type="text" class="poll-builder-input pb-opt-text" placeholder="Option ${count + 1}" maxlength="100" /><button class="pb-remove-opt" title="Remove">&times;</button>`;
      btn.before(div);
      bindQuestionEditorEvents();
    });
  });

  // Remove option
  document.querySelectorAll('.pb-remove-opt').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.pb-option-row')?.remove());
  });

  // Remove question
  document.querySelectorAll('.pb-remove-q').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.pb-question')?.remove());
  });
}

function bindControlActions(pollId: string, _allResults: Record<string, unknown>[]): void {
  $('pc-next')?.addEventListener('click', async () => {
    const current = (controlPoll?.activeQuestionIndex as number) ?? -1;
    const next = current + 1;
    await (api as ApiCall).setPollActiveQuestion(pollId, next);
    if (controlPoll) controlPoll.activeQuestionIndex = next;
    openControlPanel(pollId);
  });

  $('pc-prev')?.addEventListener('click', async () => {
    const current = (controlPoll?.activeQuestionIndex as number) ?? 0;
    const prev = Math.max(0, current - 1);
    await (api as ApiCall).setPollActiveQuestion(pollId, prev);
    if (controlPoll) controlPoll.activeQuestionIndex = prev;
    openControlPanel(pollId);
  });

  $('pc-pause')?.addEventListener('click', async () => {
    await (api as ApiCall).setPollStatus(pollId, 'paused');
    toast('Poll paused');
    loadPollList();
  });

  $('pc-resume')?.addEventListener('click', async () => {
    await (api as ApiCall).setPollStatus(pollId, 'active');
    toast('Poll resumed');
    openControlPanel(pollId);
  });

  $('pc-close')?.addEventListener('click', async () => {
    if (!confirm('Close this poll? Voting will stop.')) return;
    await (api as ApiCall).setPollStatus(pollId, 'closed');
    toast('Poll closed');
    disconnect();
    loadPollList();
  });

  $('pc-back')?.addEventListener('click', () => { disconnect(); _view ='list'; loadPollList(); });
}

// ═══════════════════════════════════════════
//  PAGE EXPORT
// ═══════════════════════════════════════════

export const pollsPage: Page = {
  render() {
    return `
    <div class="polls-page">
      <div class="polls-header">
        <h2 class="admin-main-title">Mentee Meter</h2>
        <p class="polls-header-sub">Create and manage live polls for the summit.</p>
      </div>
      <div id="polls-content">
        <div class="skeleton skeleton-card"></div>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();
    _view ='list';
    editingPoll = null;
    controlPoll = null;
    loadPollList();
  },

  unmount() {
    disconnect();
  },
};
