import type { Page } from '../../types/index.ts';

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
        <div class="menti-embed-wrap">
          <iframe
            id="menti-iframe"
            src="https://www.menti.com/alhr8tvbfhhu"
            title="BeMore Summit Live Poll — Mentimeter"
            frameborder="0"
            allow="clipboard-write; fullscreen"
            allowfullscreen
          ></iframe>
        </div>
      </div>
      <div class="mm-cta-bar fade-up stagger-4">
        <a class="btn-ghost" href="#/">← Back to Home</a>
        <a class="btn-primary" href="#/gateway">Apply Now →</a>
      </div>
    </section>`;
  },

  mount() {
    // Nothing needed — Mentimeter handles all interactivity inside the iframe
  },

  unmount() {
    // Clean up iframe to stop any background connections
    const iframe = document.getElementById('menti-iframe') as HTMLIFrameElement | null;
    if (iframe) iframe.src = '';
  },
};
