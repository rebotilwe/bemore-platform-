/** Shared chart rendering helpers for analytics and traffic pages */

export function barChart(items: { label: string; value: number; color?: string }[]): string {
  if (!items.length) return '<p class="an-empty">No data</p>';
  const max = Math.max(...items.map(i => i.value), 1);
  return `<div class="bar-chart">${items.map(i => {
    const pct = Math.round((i.value / max) * 100);
    const color = i.color || 'var(--gold)';
    return `
      <div class="bar-row">
        <div class="bar-label">${i.label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="bar-value">${i.value}</div>
      </div>`;
  }).join('')}</div>`;
}

export function donutStat(value: number, label: string, color: string): string {
  return `
    <div class="an-donut">
      <div class="an-donut-ring" style="--donut-color:${color}">
        <span class="an-donut-val display">${value}</span>
      </div>
      <div class="an-donut-lbl">${label}</div>
    </div>`;
}

export interface TrendPoint {
  period: string;
  value: number;
  tooltip?: string;
}

export function renderTrendChart(data: TrendPoint[], maxOverride?: number): string {
  if (!data.length) return '<p class="an-empty">No data in this period.</p>';
  const max = maxOverride ?? Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(Math.floor(100 / data.length) - 1, 2);
  return `
  <div class="trend-chart">
    <div class="trend-y-axis">
      <span>${max}</span>
      <span>${Math.round(max / 2)}</span>
      <span>0</span>
    </div>
    <div class="trend-bars">
      ${data.map(d => {
        const pct = Math.round((d.value / max) * 100);
        const label = d.period.length > 5 ? d.period.slice(5) : d.period;
        return `<div class="trend-bar-wrap" style="width:${barW}%">
          <div class="trend-bar" style="height:${Math.max(pct, 3)}%" title="${d.tooltip || `${d.period}: ${d.value}`}">
            ${d.value > 0 ? `<span class="trend-bar-tip">${d.value}</span>` : ''}
          </div>
          <div class="trend-bar-lbl">${label}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
