import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { toast } from '../../components/toast.ts';
import { connect, disconnect } from '../../services/poll-sse.ts';
import { renderBarChart, renderWordCloud, renderRatingDisplay, renderOpenTextList } from '../../components/poll-results-chart.ts';

function getSessionId(): string {
  let sid = sessionStorage.getItem('bm_poll_session');
  if (!sid) {
    sid = 'ps_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('bm_poll_session', sid);
  }
  return sid;
}

let currentPollId: string | null = null;
let currentQuestionId: string | null = null;
let hasVoted = false;

function renderResults(question: Record<string, unknown>, results: Record<string, unknown>): string {
  const type = question.type as string;
  const totalVotes = (results.totalVotes as number) || 0;

  if (type === 'multiple-choice') {
    return renderBarChart((results.breakdown as Array<{ text: string; count: number; pct: number; color?: string }>) || [], totalVotes);
  }
  if (type === 'word-cloud') {
    return renderWordCloud((results.words as Array<{ text: string; count: number }>) || []);
  }
  if (type === 'rating') {
    return renderRatingDisplay(results as { average: number; max: number; totalVotes: number; distribution: { value: number; count: number }[] });
  }
  if (type === 'open-text') {
    return renderOpenTextList((results.responses as Array<{ text: string; timestamp: string }>) || []);
  }
  return '';
}

function renderVoteUI(question: Record<string, unknown>): string {
  const type = question.type as string;
  const qId = (question._id as string) || '';
  const settings = (question.settings as Record<string, unknown>) || {};

  if (type === 'multiple-choice') {
    const options = (question.options as Array<{ _id: string; text: string; color?: string }>) || [];
    return `<div class="poll-options" id="poll-options">
      ${options.map(o => `
        <button class="poll-option-btn" data-option="${o._id}" data-question="${qId}">
          ${o.text}
        </button>
      `).join('')}
    </div>`;
  }

  if (type === 'word-cloud' || type === 'open-text') {
    const placeholder = type === 'word-cloud' ? 'Enter a word or short phrase...' : 'Share your thoughts...';
    const maxLen = type === 'word-cloud' ? 50 : 200;
    return `<div class="poll-text-input-wrap">
      <input type="text" id="poll-text-input" class="poll-text-field" placeholder="${placeholder}" maxlength="${maxLen}" />
      <button class="poll-submit-btn" id="poll-submit-text" data-question="${qId}">Submit</button>
    </div>`;
  }

  if (type === 'rating') {
    const max = (settings.ratingMax as number) || 5;
    const nums = Array.from({ length: max }, (_, i) => i + 1);
    return `<div class="poll-rating-input" id="poll-rating-input">
      ${nums.map(n => `<button class="poll-rating-btn" data-value="${n}" data-question="${qId}">${n}</button>`).join('')}
    </div>`;
  }

  return '';
}

function updatePollArea(data: Record<string, unknown> | null): void {
  const area = document.getElementById('poll-area');
  if (!area) return;

  if (!data) {
    area.innerHTML = `
      <div class="poll-waiting">
        <div class="poll-waiting-icon">&#9881;</div>
        <h3 class="display">Waiting for Poll</h3>
        <p>The next question will appear here when the host activates it.</p>
        <p class="accent">Stay on this page — it updates automatically.</p>
      </div>`;
    return;
  }

  const question = data.question as Record<string, unknown>;
  const results = data.results as Record<string, unknown>;
  const qIndex = (data.questionIndex as number) ?? 0;
  const totalQ = (data.totalQuestions as number) ?? 1;
  const viewers = (data.viewers as number) ?? 0;

  currentPollId = data.pollId as string;
  currentQuestionId = question._id as string;

  area.innerHTML = `
    <div class="poll-live-card">
      <div class="poll-q-header">
        <span class="poll-q-num">Question ${qIndex + 1} of ${totalQ}</span>
        ${viewers > 0 ? `<span class="poll-viewers">${viewers} live</span>` : ''}
      </div>
      <h3 class="poll-q-text display">${question.text}</h3>
      <div id="poll-vote-area">
        ${hasVoted ? '' : renderVoteUI(question)}
      </div>
      <div id="poll-results-area">
        ${(hasVoted || (question.settings as Record<string, unknown>)?.showResults) ? renderResults(question, results || {}) : ''}
      </div>
    </div>`;

  if (!hasVoted) bindVoteHandlers();
}

function bindVoteHandlers(): void {
  // Multiple choice
  document.querySelectorAll<HTMLButtonElement>('.poll-option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const optionId = btn.dataset.option!;
      const questionId = btn.dataset.question!;
      await submitVote({ optionId, questionId });
    });
  });

  // Text / word cloud
  document.getElementById('poll-submit-text')?.addEventListener('click', async () => {
    const input = document.getElementById('poll-text-input') as HTMLInputElement;
    const questionId = (document.getElementById('poll-submit-text') as HTMLElement)?.dataset.question;
    if (!input?.value.trim() || !questionId) return;
    await submitVote({ textResponse: input.value.trim(), questionId });
  });

  // Enter key for text input
  document.getElementById('poll-text-input')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      document.getElementById('poll-submit-text')?.click();
    }
  });

  // Rating
  document.querySelectorAll<HTMLButtonElement>('.poll-rating-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ratingValue = Number(btn.dataset.value);
      const questionId = btn.dataset.question!;
      await submitVote({ ratingValue, questionId });
    });
  });
}

async function submitVote(voteData: Record<string, unknown>): Promise<void> {
  if (!currentPollId || hasVoted) return;

  // Disable all vote buttons
  document.querySelectorAll<HTMLButtonElement>('.poll-option-btn, .poll-submit-btn, .poll-rating-btn').forEach(b => {
    b.disabled = true;
  });

  const res = await (api as Record<string, Function>).pollVote(currentPollId, {
    ...voteData,
    sessionId: getSessionId(),
  });

  if (res.success) {
    hasVoted = true;
    toast('Vote submitted!');
    const voteArea = document.getElementById('poll-vote-area');
    if (voteArea) voteArea.innerHTML = '<p class="poll-voted-msg">Your vote has been recorded</p>';
    const resultsArea = document.getElementById('poll-results-area');
    if (resultsArea && res.data) {
      // We'll get the full results from SSE broadcast, but show immediate feedback
    }
  } else {
    toast(res.message || 'Vote failed');
    document.querySelectorAll<HTMLButtonElement>('.poll-option-btn, .poll-submit-btn, .poll-rating-btn').forEach(b => {
      b.disabled = false;
    });
  }
}

export const menteeMeterPage: Page = {
  render() {
    return `
    <section class="mentee-meter">
      <div class="mm-hero">
        <div class="mm-hero-bg" aria-hidden="true"></div>
        <div class="mm-hero-inner">
          <div class="mm-badge fade-in">Live Interaction</div>
          <h1 class="mm-title display fade-up stagger-1">
            Mentee <span class="accent">Meter</span>
          </h1>
          <p class="mm-sub fade-up stagger-2">
            Engage in real-time during the BeMore Summit. Vote, share your perspective,
            and see results instantly.
          </p>
        </div>
      </div>
      <div class="mm-body fade-up stagger-3">
        <div id="poll-area">
          <div class="poll-waiting">
            <div class="poll-waiting-icon">&#9881;</div>
            <h3 class="display">Connecting...</h3>
            <p>Loading the live poll session.</p>
          </div>
        </div>
      </div>
      <div class="mm-cta-bar fade-up stagger-4">
        <a class="btn-ghost" href="#/">← Back to Home</a>
        <a class="btn-primary" href="#/gateway">Apply Now →</a>
      </div>
    </section>`;
  },

  mount() {
    hasVoted = false;
    currentPollId = null;
    currentQuestionId = null;

    // Fetch active poll
    (api as Record<string, Function>).getActivePoll().then((res: Record<string, unknown>) => {
      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>;
        currentPollId = data.pollId as string;
        updatePollArea(data);

        // Connect SSE for live updates
        if (currentPollId) {
          connect(currentPollId, {
            onResults: (eventData) => {
              const d = eventData as Record<string, unknown>;
              const resultsArea = document.getElementById('poll-results-area');
              if (resultsArea && d.questionId === currentQuestionId) {
                // Re-render results with updated data — need the question for type
                // For now just update vote count shown
                const totalEl = resultsArea.querySelector('.poll-total-votes');
                if (totalEl) totalEl.textContent = `${d.totalVotes} vote${(d.totalVotes as number) !== 1 ? 's' : ''}`;
                // Full re-render from SSE data
                if (d.breakdown) {
                  resultsArea.innerHTML = renderBarChart(
                    d.breakdown as Array<{ text: string; count: number; pct: number; color?: string }>,
                    d.totalVotes as number,
                  );
                } else if (d.words) {
                  resultsArea.innerHTML = renderWordCloud(d.words as Array<{ text: string; count: number }>);
                } else if (d.average !== undefined) {
                  resultsArea.innerHTML = renderRatingDisplay(d as { average: number; max: number; totalVotes: number; distribution: { value: number; count: number }[] });
                }
              }
            },
            onQuestionChange: (eventData) => {
              hasVoted = false;
              const d = eventData as Record<string, unknown>;
              updatePollArea(d.question ? { ...d, pollId: currentPollId } : null);
            },
            onPollStatus: (eventData) => {
              const d = eventData as Record<string, unknown>;
              if (d.status === 'closed' || d.status === 'paused') {
                const area = document.getElementById('poll-area');
                if (area) {
                  area.innerHTML = `
                    <div class="poll-waiting">
                      <div class="poll-waiting-icon">${d.status === 'closed' ? '&#10003;' : '&#9208;'}</div>
                      <h3 class="display">${d.status === 'closed' ? 'Poll Closed' : 'Poll Paused'}</h3>
                      <p>${d.status === 'closed' ? 'Thank you for participating!' : 'The poll will resume shortly.'}</p>
                    </div>`;
                }
              }
            },
          });
        }
      } else {
        updatePollArea(null);
      }
    });
  },

  unmount() {
    disconnect();
  },
};
