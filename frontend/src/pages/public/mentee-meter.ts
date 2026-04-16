import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { store } from '../../store.ts';

const DEFAULT_MENTI_ID = 'alhr8tvbfhhu';

export const menteeMeterPage: Page = {
  render() {
    if (!store.get('pollsEnabled')) {
      return `
      <section class="mentee-meter">
        <div class="mm-hero">
          <div class="mm-hero-bg" aria-hidden="true"></div>
          <div class="mm-hero-inner">
            <h1 class="mm-title display fade-up stagger-1">Mentee <span class="accent">Meter</span></h1>
            <p class="mm-sub fade-up stagger-2">Live polling is not active at the moment. Check back soon.</p>
          </div>
        </div>
        <div class="mm-cta-bar fade-up stagger-3">
          <a class="btn-ghost" href="#/" data-track="Mentee Meter — Back Home">← Back to Home</a>
          <a class="btn-primary" href="#/gateway" data-track="Mentee Meter — Apply Now">Apply Now →</a>
        </div>
      </section>`;
    }

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
            Engage in real-time with BeMore. Vote, share your perspective,
            and see results instantly.
          </p>
        </div>
      </div>
      <div class="mm-body fade-up stagger-3">
        <div class="menti-embed-wrap">
          <iframe
            id="menti-iframe"
            src="https://www.menti.com/${DEFAULT_MENTI_ID}"
            title="BeMore Live Poll — Mentimeter"
            frameborder="0"
            allow="clipboard-write; fullscreen"
            allowfullscreen
          ></iframe>
        </div>
      </div>
      <div class="mm-cta-bar fade-up stagger-4">
        <a class="btn-ghost" href="#/" data-track="Mentee Meter — Back Home">← Back to Home</a>
        <a class="btn-primary" href="#/gateway" data-track="Mentee Meter — Apply Now">Apply Now →</a>
      </div>
    </section>`;
  },

  async mount() {
    // Fetch configurable Mentimeter ID from backend settings
    try {
      const res = await api.getSetting('mentimeter_id');
      if (res.success && res.data?.value) {
        const iframe = document.getElementById('menti-iframe') as HTMLIFrameElement | null;
        if (iframe) iframe.src = `https://www.menti.com/${res.data.value}`;
      }
    } catch {
      // Use default hardcoded ID
    }
  },

  unmount() {
    const iframe = document.getElementById('menti-iframe') as HTMLIFrameElement | null;
    if (iframe) iframe.src = '';
  },
};
