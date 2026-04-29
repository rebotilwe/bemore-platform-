export function renderNav(_currentPath: string): string {
  return `
    <nav id="main-nav" role="navigation" aria-label="Main navigation">
      <a class="nav-logo" href="#/"><img src="/be-more-group-logo.png" alt="BeMore Group" class="nav-logo-img" width="40" height="50" /></a>
      <button class="nav-burger" id="nav-burger" aria-label="Toggle menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-actions" id="nav-actions">
        <a class="nav-link" href="#/about" data-track="Nav — About Us">About Us</a>
        <a class="nav-link" href="#/status" data-track="Nav — My Status">My Status</a>
        <a class="nav-link" href="#/gateway" data-track="Nav — Apply Now">Apply Now</a>
      </div>
    </nav>`;
}

export function mountNav(): void {
  const burger = document.getElementById('nav-burger');
  const actions = document.getElementById('nav-actions');
  if (!burger || !actions) return;

  burger.addEventListener('click', () => {
    const open = actions.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  // Close menu when a link is clicked
  actions.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      actions.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
}

export function initNavScroll(): void {
}
