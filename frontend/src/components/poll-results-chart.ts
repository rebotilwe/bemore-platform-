/**
 * Pure CSS result visualisations for the Mentee Meter.
 * No canvas/SVG libraries — all HTML + CSS.
 */

export interface BarChartItem {
  text: string;
  count: number;
  pct: number;
  color?: string;
  optionId?: string;
}

export interface WordCloudItem {
  text: string;
  count: number;
}

export interface RatingData {
  average: number;
  max: number;
  totalVotes: number;
  distribution: { value: number; count: number }[];
}

export interface TextResponse {
  text: string;
  timestamp: string;
}

// ── Multiple Choice: Horizontal Bar Chart ──

export function renderBarChart(items: BarChartItem[], totalVotes: number): string {
  if (!items.length) return '<p class="poll-empty">No votes yet</p>';

  return `
    <div class="poll-bar-chart">
      ${items.map(item => {
        const pct = totalVotes > 0 ? Math.round((item.count / totalVotes) * 100) : 0;
        return `
        <div class="poll-bar-row">
          <div class="poll-bar-label">${item.text}</div>
          <div class="poll-bar-track">
            <div class="poll-bar-fill" style="width:${Math.max(pct, 2)}%;background:${item.color || 'var(--gold)'}">
              <span class="poll-bar-count">${item.count}</span>
            </div>
          </div>
          <div class="poll-bar-pct">${pct}%</div>
        </div>`;
      }).join('')}
      <div class="poll-total-votes">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>
    </div>`;
}

// ── Word Cloud ──

export function renderWordCloud(words: WordCloudItem[]): string {
  if (!words.length) return '<p class="poll-empty">No responses yet</p>';

  const maxCount = Math.max(...words.map(w => w.count));

  return `
    <div class="poll-word-cloud">
      ${words.map(w => {
        const scale = 0.7 + (w.count / maxCount) * 1.3;
        const opacity = 0.5 + (w.count / maxCount) * 0.5;
        return `<span class="poll-word" style="font-size:${scale}rem;opacity:${opacity}" title="${w.count} vote${w.count !== 1 ? 's' : ''}">${w.text}</span>`;
      }).join('')}
    </div>`;
}

// ── Rating Display ──

export function renderRatingDisplay(data: RatingData): string {
  if (data.totalVotes === 0) return '<p class="poll-empty">No ratings yet</p>';

  const stars = Array.from({ length: data.max }, (_, i) => {
    const filled = i < Math.round(data.average);
    return `<span class="poll-star ${filled ? 'filled' : ''}">&#9733;</span>`;
  }).join('');

  const distMax = Math.max(...data.distribution.map(d => d.count), 1);

  return `
    <div class="poll-rating-display">
      <div class="poll-rating-big">
        <span class="poll-rating-value display">${data.average}</span>
        <span class="poll-rating-max">/ ${data.max}</span>
      </div>
      <div class="poll-rating-stars">${stars}</div>
      <div class="poll-rating-count">${data.totalVotes} rating${data.totalVotes !== 1 ? 's' : ''}</div>
      <div class="poll-rating-dist">
        ${data.distribution.map(d => `
          <div class="poll-dist-row">
            <span class="poll-dist-label">${d.value}</span>
            <div class="poll-dist-track">
              <div class="poll-dist-fill" style="width:${(d.count / distMax) * 100}%"></div>
            </div>
            <span class="poll-dist-count">${d.count}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ── Open Text List ──

export function renderOpenTextList(responses: TextResponse[]): string {
  if (!responses.length) return '<p class="poll-empty">No responses yet</p>';

  return `
    <div class="poll-text-list">
      ${responses.map(r => `
        <div class="poll-text-item">
          <p>${escapeHtml(r.text)}</p>
        </div>
      `).join('')}
      <div class="poll-total-votes">${responses.length} response${responses.length !== 1 ? 's' : ''}</div>
    </div>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
