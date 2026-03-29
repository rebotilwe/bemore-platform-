import type { Page } from '../../types/index.ts';
import { store } from '../../store.ts';
import { toast } from '../../components/toast.ts';

export const successPage: Page = {
  render() {
    const formData = store.get('formData') as Record<string, unknown>;
    const refNumber = (formData?.refNumber as string) || 'BM-2026-XXXX';
    const source = sessionStorage.getItem('bm_source');
    const sourceBadge = source && source !== 'direct'
      ? `<div class="success-source-badge fade-in">Arrived via <strong>${source.toUpperCase()}</strong> scan</div>`
      : '';

    return `
    <section class="success-view">
      <div class="success-bg" aria-hidden="true"></div>
      <div class="success-wrap">
        ${sourceBadge}
        <div class="success-ico fade-in">&check;</div>
        <h2 class="success-h display fade-up stagger-1">Application Received</h2>
        <p class="success-p fade-up stagger-2">
          Your application has been submitted successfully. Our team will review your profile against our merit-based criteria and be in touch within 5 business days.
        </p>
        <div class="ref-box fade-up stagger-3" id="ref-box" title="Click to copy">
          <div class="ref-lbl">Reference Number</div>
          <div class="ref-num mono">${refNumber}</div>
          <div class="ref-copy-hint">Click to copy</div>
        </div>

        <!-- What Happens Next Timeline -->
        <div class="success-timeline fade-up stagger-3">
          <h3 class="success-timeline-title display">What Happens Next</h3>
          <div class="timeline">
            <div class="timeline-step done">
              <div class="timeline-marker">&check;</div>
              <div class="timeline-content">
                <div class="timeline-label">Application Received</div>
                <div class="timeline-desc">Your profile has been captured</div>
              </div>
            </div>
            <div class="timeline-step">
              <div class="timeline-marker">2</div>
              <div class="timeline-content">
                <div class="timeline-label">Merit-Based Review</div>
                <div class="timeline-desc">Within 5 business days</div>
              </div>
            </div>
            <div class="timeline-step">
              <div class="timeline-marker">3</div>
              <div class="timeline-content">
                <div class="timeline-label">Shortlist Notification</div>
                <div class="timeline-desc">Qualifying applicants notified</div>
              </div>
            </div>
            <div class="timeline-step">
              <div class="timeline-marker">4</div>
              <div class="timeline-content">
                <div class="timeline-label">Summit Invitation</div>
                <div class="timeline-desc">30 – 31 March 2026 · Sandton</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Steps CTAs -->
        <div class="next-steps fade-up stagger-4">
          <h3 class="next-steps-title display">Continue Your Journey</h3>
          <div class="next-steps-grid">
            <a class="next-step-card" href="#/gateway">
              <div class="next-step-icon">&#9654;</div>
              <div class="next-step-label">Submit Another Deal</div>
              <div class="next-step-desc">Register a different profile or project</div>
            </a>
            <a class="next-step-card" href="#/mentee-meter">
              <div class="next-step-icon">&#9881;</div>
              <div class="next-step-label">Live Poll</div>
              <div class="next-step-desc">Join the Mentee Meter live session</div>
            </a>
            <a class="next-step-card" href="#/about">
              <div class="next-step-icon">&#9733;</div>
              <div class="next-step-label">Explore the Platform</div>
              <div class="next-step-desc">Learn about the BeMore ecosystem</div>
            </a>
          </div>
        </div>

        <div class="success-actions fade-up stagger-4" style="display:flex;gap:12px;flex-wrap:wrap">
          <a class="btn-primary" href="#/status" style="flex:1">Check My Status</a>
          <a class="btn-ghost" href="#/" style="flex:1">← Return to Homepage</a>
        </div>
      </div>
    </section>`;
  },

  mount() {
    document.getElementById('ref-box')?.addEventListener('click', () => {
      const refNum = document.querySelector('.ref-num')?.textContent;
      if (refNum) {
        navigator.clipboard.writeText(refNum).then(() => {
          toast('Reference number copied!');
        }).catch(() => {});
      }
    });
  },
};
