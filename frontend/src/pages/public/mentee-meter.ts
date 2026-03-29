import type { Page } from '../../types/index.ts';
import { SUMMIT_CONFIG } from '../../constants/summit-config.ts';

export const menteeMeterPage: Page = {
  render() {
    const hasUrl = !!SUMMIT_CONFIG.MENTIMETER_URL;

    const embedSection = hasUrl
      ? `<div class="mm-iframe-wrap">
           <iframe
             src="${SUMMIT_CONFIG.MENTIMETER_URL}"
             frameborder="0"
             allow="camera; microphone"
             allowfullscreen
             class="mm-iframe"
             title="BeMore Mentee Meter — Live Poll"
           ></iframe>
         </div>`
      : `<div class="mm-placeholder">
           <div class="mm-placeholder-icon">&#9881;</div>
           <h3 class="display">Coming Soon</h3>
           <p>The live polling session will be activated during the BeMore Summit.</p>
           <p class="accent">30 – 31 March 2026 · Sandton Convention Centre</p>
           <a class="btn-primary" href="#/gateway">Apply Now While You Wait →</a>
         </div>`;

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
            Engage in real-time during the BeMore Summit. Share your perspective,
            answer live polls, and see aggregated results instantly.
          </p>
        </div>
      </div>
      <div class="mm-body fade-up stagger-3">
        ${embedSection}
      </div>
      <div class="mm-cta-bar fade-up stagger-4">
        <a class="btn-ghost" href="#/">← Back to Home</a>
        <a class="btn-primary" href="#/gateway">Apply Now →</a>
      </div>
    </section>`;
  },

  mount() {},
};
