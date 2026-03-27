import type { Page } from '../../types/index.ts';
import { store } from '../../store.ts';
import { toast } from '../../components/toast.ts';

export const successPage: Page = {
  render() {
    const formData = store.get('formData') as Record<string, unknown>;
    const refNumber = (formData?.refNumber as string) || 'BM-2026-XXXX';

    return `
    <section class="success-view">
      <div class="success-bg" aria-hidden="true"></div>
      <div class="success-wrap">
        <div class="success-ico fade-in">✓</div>
        <h2 class="success-h display fade-up stagger-1">Application Received</h2>
        <p class="success-p fade-up stagger-2">
          Your application has been submitted successfully. Our team will review your profile against our merit-based criteria and be in touch within 5 business days.
        </p>
        <div class="ref-box fade-up stagger-3" id="ref-box" title="Click to copy">
          <div class="ref-lbl">Reference Number</div>
          <div class="ref-num mono">${refNumber}</div>
          <div class="ref-copy-hint">Click to copy</div>
        </div>
        <div class="summit-box fade-up stagger-4">
          <h4 class="display">BeMore Summit 2026</h4>
          <p>30 – 31 March 2026 · Sandton Convention Centre</p>
          <p class="accent">Shortlisted applicants will receive personal invitations</p>
        </div>
        <a class="btn-primary full fade-up stagger-4" href="#/">← Return to Homepage</a>
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
