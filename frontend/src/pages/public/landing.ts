import type { Page } from '../../types/index.ts';
import { SUMMIT_CONFIG } from '../../constants/summit-config.ts';

export const landingPage: Page = {
  render() {
    return `
    <section class="landing">
      <div class="landing-bg" aria-hidden="true"></div>

      <!-- Co-Branding Header -->
      <div class="landing-brands fade-in">
        <div class="landing-brand-item">
          <img src="/be-more-group-logo.png" alt="BeMore Group" class="landing-brand-logo-img" />
          <span class="landing-brand-label">SME Access Initiative</span>
        </div>
        <div class="landing-brand-divider" aria-hidden="true"></div>
        <div class="landing-brand-item">
          <span class="landing-brand-logo display">PBSA</span>
          <span class="landing-brand-label">Funding Partner</span>
        </div>
      </div>

      <!-- Hero Content -->
      <div class="landing-content">
        <h1 class="landing-title display fade-up stagger-1">
          Welcome to the<br><span class="accent">Deal Origination Engine</span>
        </h1>
        <p class="landing-sub fade-up stagger-2">
          You've been invited to engage with the BeMore SME Access Initiative —
          South Africa's platform connecting property developers, landowners, and
          built environment professionals with institutional funding.
        </p>

        <!-- Summit Info -->
        ${SUMMIT_CONFIG.ACTIVE ? `<div class="landing-summit fade-up stagger-2">
          <div class="landing-summit-date display">${SUMMIT_CONFIG.DATE}</div>
          <div class="landing-summit-venue">${SUMMIT_CONFIG.VENUE}</div>
        </div>` : ''}

        <!-- Primary CTAs -->
        <div class="landing-ctas fade-up stagger-3">
          <a class="landing-cta-primary" href="#/gateway">
            <span class="landing-cta-icon">&#9654;</span>
            <span class="landing-cta-text">
              <span class="landing-cta-title">Start Your Application</span>
              <span class="landing-cta-desc">Submit your profile for merit-based review</span>
            </span>
          </a>
          <a class="landing-cta-secondary" href="#/mentee-meter">
            <span class="landing-cta-icon">&#9881;</span>
            <span class="landing-cta-text">
              <span class="landing-cta-title">Join Live Session</span>
              <span class="landing-cta-desc">Engage with the Mentee Meter live poll</span>
            </span>
          </a>
        </div>

        <!-- Quick Links -->
        <div class="landing-links fade-up stagger-4">
          <a class="landing-link" href="#/about">About BeMore</a>
          <span class="landing-link-sep" aria-hidden="true">&middot;</span>
          <a class="landing-link" href="#/">Explore Platform</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="landing-footer fade-up stagger-4">
        <p>BeMore Group (Pty) Ltd &times; PBSA &mdash; Institutional Funding Partnership</p>
      </div>
    </section>`;
  },

  mount() {},
};
