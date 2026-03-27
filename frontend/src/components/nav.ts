export function renderNav(_currentPath: string): string {
  return `
    <nav id="main-nav" role="navigation" aria-label="Main navigation">
      <div class="nav-logo display">BE<span>MORE</span></div>
      <div class="nav-actions">
        <a class="nav-link" href="#/gateway">Apply Now</a>
        <span class="nav-link">Summit Agenda</span>
      </div>
    </nav>`;
}

export function initNavScroll(): void {
}
