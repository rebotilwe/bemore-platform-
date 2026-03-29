interface EmptyStateOptions {
  title: string;
  message?: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
}

function renderEmptyState(options: EmptyStateOptions): string {
  const icon = options.icon ?? '📭';
  const message = options.message ?? '';

  return `
    <div class="empty-state-component">
      <div class="empty-state-icon">${icon}</div>
      <h3 class="empty-state-title">${options.title}</h3>
      ${message ? `<p class="empty-state-message">${message}</p>` : ''}
      ${options.actionText && options.onAction ? `
        <button class="btn-primary empty-state-action" data-action="empty-state">
          ${options.actionText}
        </button>
      ` : ''}
    </div>
  `;
}

function mountEmptyStateAction(onAction: () => void): void {
  document.querySelector('[data-action="empty-state"]')?.addEventListener('click', onAction);
}

const EMPTY_STATES = {
  leads: {
    title: 'No leads yet',
    message: 'Submit a form to see leads here.',
    icon: '👥',
  },
  report: {
    title: 'No data available',
    message: 'No data available for this report.',
    icon: '📊',
  },
  dashboard: {
    title: 'No data to display',
    message: 'Submit applications to see statistics here.',
    icon: '📈',
  },
  search: {
    title: 'No results found',
    message: 'Try adjusting your search or filters.',
    icon: '🔍',
  },
};

export { renderEmptyState, mountEmptyStateAction, EMPTY_STATES };
