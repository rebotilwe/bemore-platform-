import type { Page } from '../../types/index.ts';
import { SUMMIT_CONFIG } from '../../constants/summit-config.ts';

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
            partners including PBSA. Limited access. Strictly merit-based selection.
          </p>
          <div class="hero-actions fade-up stagger-3">
            <a class="btn-primary" href="#/gateway">Apply Now →</a>
            <a class="btn-ghost" href="#/about">Learn More</a>
          </div>
          <div class="hero-stats fade-up stagger-4">
            ${SUMMIT_CONFIG.ACTIVE ? `<div class="stat-item">
              <div class="stat-num display">${SUMMIT_CONFIG.DATE_SHORT.split(' ')[1] || '30–31'}</div>
              <div class="stat-label">${SUMMIT_CONFIG.DATE_SHORT.split(' ')[0] || 'Mar'} Summit</div>
            </div>` : ''}
            <div class="stat-item">
              <div class="stat-num display">PBSA</div>
              <div class="stat-label">Lead Funding Partner</div>
            </div>
            <div class="stat-item">
              <div class="stat-num display">R20M+</div>
              <div class="stat-label">Deal Room Access</div>
            </div>
          </div>
        </div>
        <div class="hero-right fade-up stagger-2">
          ${SUMMIT_CONFIG.ACTIVE ? `<div class="summit-banner">${SUMMIT_CONFIG.LOCATION} · ${SUMMIT_CONFIG.DATE_SHORT}</div>` : ''}
          <div class="hero-card">
            <h3 class="hero-card-title display">Institutional Funding Partners</h3>
            <div class="funders-label">Lead institutional funding partner</div>
            <div class="funders-grid funders-grid--single">
              <div class="funder-pill funder-pill--featured">PBSA</div>
              <div class="funder-pill">Institutional Partners</div>
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
