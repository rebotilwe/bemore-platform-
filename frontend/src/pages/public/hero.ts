import type { Page } from '../../types/index.ts';

export const heroPage: Page = {
  render() {
    return `
    <section class="hero">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="hero-grid" aria-hidden="true"></div>
      <div class="hero-inner">
        <div class="hero-left">
          <div class="hero-badge fade-in">
            <div class="badge-dot" aria-hidden="true"></div>
            SME Access Initiative — Now Open
          </div>
          <h1 class="hero-title fade-up stagger-1">
            <span class="line">Access</span>
            <span class="line accent">Capital.</span>
            <span class="line">Unlock Scale.</span>
          </h1>
          <div class="hero-rule fade-up stagger-2"></div>
          <p class="hero-sub fade-up stagger-2">
            The BeMore SME Access Initiative connects emerging property developers, landowners,
            student accommodation operators, and built environment professionals with institutional funding
            partners. Limited access. Strictly merit-based selection.
          </p>
          <div class="hero-actions fade-up stagger-3">
            <a class="btn-primary" href="#/gateway" data-track="Hero — Apply Now">Apply Now →</a>
            <a class="btn-ghost" href="#/about" data-track="Hero — Learn More">Learn More</a>
          </div>
          <div class="hero-stats fade-up stagger-4">
            <div class="stat-item">
              <div class="stat-num display">BeMore</div>
              <div class="stat-label">SME Access Initiative</div>
            </div>
            <div class="stat-item">
              <div class="stat-num display">R20M+</div>
              <div class="stat-label">Deal Room Access</div>
            </div>
          </div>
        </div>
        <div class="hero-right fade-up stagger-2">
          <div class="hero-card">
            <h3 class="hero-card-title display">Institutional Funding Partners</h3>
            <div class="funders-label">Lead institutional funding partners</div>
            <div class="funders-grid funders-grid--single">
              <div class="funder-pill funder-pill--featured">DBSA</div>
              <div class="funder-pill">NHFC</div>
              <div class="funder-pill">NEF</div>
              <div class="funder-pill">SAIF</div>
            </div>
            <div class="merit-box">
              <p>Limited Access</p>
              <small>Strictly Merit-Based Selection</small>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  },
  mount() {
  }
};