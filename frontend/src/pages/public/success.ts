import type { Page } from '../../types/index.ts';
import { store } from '../../store.ts';

export const successPage: Page = {
  render() {
    const formData = store.get('formData') as Record<string, unknown>;
    const refNumber = (formData?.refNumber as string) || 'BM-2026-XXXX';

    return `
    <section class="success-view">
      <div class="success-wrap">
        <div class="success-ico">✓</div>
        <h2 class="success-h display">Application Received</h2>
        <p class="success-p">
          Your application has been submitted successfully. Our team will review your profile against our merit-based criteria and be in touch within 5 business days.
        </p>
        <div class="ref-box">
          <div class="ref-lbl">Reference Number</div>
          <div class="ref-num mono">${refNumber}</div>
        </div>
        <div class="summit-box">
          <h4 class="display">BeMore Summit 2026</h4>
          <p>30 – 31 March 2026 · Sandton Convention Centre</p>
          <p class="accent">Shortlisted applicants will receive personal invitations</p>
        </div>
        <a class="btn-primary" href="#/" id="success-home-btn" style="width:100%">← Return to Homepage</a>
      </div>
    </section>`;
  },
};
