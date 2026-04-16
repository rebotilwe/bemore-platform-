import type { Page } from '../../types/index.ts';
import { api } from '../../api.ts';
import { toast } from '../../components/toast.ts';
import { CATEGORY_LABELS } from '../../constants/categories.ts';
import { STATUS_LABELS } from '../../constants/status.ts';
import { formatDate } from '../../utils/format.ts';

const STATUS_TIMELINE: Record<string, number> = {
  new: 1, reviewing: 2, shortlisted: 3, invited: 4, funded: 5,
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  new: 'Your application has been received and is in the queue for review.',
  reviewing: 'Our team is actively reviewing your profile against our merit-based criteria.',
  shortlisted: 'Congratulations! You have been shortlisted for the BeMore SME Access Initiative.',
  invited: 'You have been formally invited to the BeMore initiative. Check your email for details.',
  funded: 'Your funding partnership has been confirmed. Our team will be in touch with next steps.',
};

function renderTimeline(status: string): string {
  const steps = ['new', 'reviewing', 'shortlisted', 'invited', 'funded'];
  const current = STATUS_TIMELINE[status] || 1;

  return steps.map((s, i) => {
    const step = i + 1;
    const done = step < current;
    const active = step === current;
    const label = (STATUS_LABELS as Record<string, string>)[s] || s;
    const cls = done ? 'done' : active ? 'active' : '';
    return `<div class="st-step ${cls}">
      <div class="st-marker">${done ? '&#10003;' : step}</div>
      <div class="st-label">${label}</div>
    </div>`;
  }).join('');
}

export const statusPage: Page = {
  render() {
    return `
    <section class="status-page">
      <div class="status-bg" aria-hidden="true"></div>
      <div class="status-inner">
        <h1 class="status-title display fade-up stagger-1">Check Your <span class="accent">Application Status</span></h1>
        <p class="status-sub fade-up stagger-2">
          Enter your reference number and email address to view your application progress.
        </p>

        <!-- Lookup Form -->
        <div class="status-form fade-up stagger-3" id="status-form">
          <div class="status-field">
            <label class="status-label" for="st-ref">Reference Number</label>
            <input id="st-ref" class="status-input mono" type="text" placeholder="BM-XXXXXXXX" autocomplete="off" />
          </div>
          <div class="status-field">
            <label class="status-label" for="st-email">Email Address</label>
            <input id="st-email" class="status-input" type="email" placeholder="you@example.co.za" />
          </div>
          <button class="btn-primary full" id="st-lookup-btn" data-track="Status — Check Status">Check Status</button>
        </div>

        <!-- Results (hidden initially) -->
        <div class="status-result" id="status-result" style="display:none"></div>

        <div class="status-links fade-up stagger-4">
          <a class="btn-ghost" href="#/" data-track="Status — Back Home">← Back to Home</a>
        </div>
      </div>
    </section>`;
  },

  mount() {
    const btn = document.getElementById('st-lookup-btn') as HTMLButtonElement;
    const refInput = document.getElementById('st-ref') as HTMLInputElement;
    const emailInput = document.getElementById('st-email') as HTMLInputElement;
    const resultDiv = document.getElementById('status-result') as HTMLElement;
    const formDiv = document.getElementById('status-form') as HTMLElement;

    btn?.addEventListener('click', async () => {
      const ref = refInput.value.trim();
      const email = emailInput.value.trim();

      if (!ref || !email) {
        toast('Please enter both your reference number and email');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Checking...';

      const res = await api.lookupStatus(ref, email);

      btn.disabled = false;
      btn.textContent = 'Check Status';

      if (!res.success || !res.data) {
        toast(res.message || 'Application not found');
        return;
      }

      const d = res.data;
      const typeLbl = (CATEGORY_LABELS as Record<string, string>)[d.userType] || d.userType;
      const statusLbl = (STATUS_LABELS as Record<string, string>)[d.status] || d.status;
      const statusDesc = STATUS_DESCRIPTIONS[d.status] || '';

      formDiv.style.display = 'none';
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div class="st-card fade-up">
          <div class="st-greeting display">Welcome back, <span class="accent">${d.firstName}</span></div>

          <div class="st-ref-row">
            <span class="st-ref-label">Reference</span>
            <span class="st-ref-val mono">${d.refNumber}</span>
          </div>

          <div class="st-info-grid">
            <div class="st-info">
              <div class="st-info-label">Profile</div>
              <div class="st-info-val">${typeLbl}</div>
            </div>
            <div class="st-info">
              <div class="st-info-label">Current Status</div>
              <div class="st-info-val accent">${statusLbl}</div>
            </div>
            <div class="st-info">
              <div class="st-info-label">Submitted</div>
              <div class="st-info-val">${formatDate(d.submittedAt)}</div>
            </div>
          </div>

          <div class="st-status-msg">
            <p>${statusDesc}</p>
          </div>

          <div class="st-timeline-title">Application Progress</div>
          <div class="st-timeline">
            ${renderTimeline(d.status)}
          </div>

          ${d.tags?.length ? `
          <div class="st-tags-section">
            <div class="st-tags-title">Intelligence Tags</div>
            <div class="st-tags">${d.tags.map(t => `<span class="tag-badge">${t}</span>`).join(' ')}</div>
          </div>` : ''}

          <div class="st-next-steps">
            <h3>Next Steps</h3>
            <div class="next-steps-grid">
              <a class="next-step-card" href="#/gateway">
                <div class="next-step-icon">&#9654;</div>
                <div class="next-step-label">Submit Another Deal</div>
                <div class="next-step-desc">Register a different project</div>
              </a>
              <a class="next-step-card" href="#/mentee-meter">
                <div class="next-step-icon">&#9881;</div>
                <div class="next-step-label">Live Poll</div>
                <div class="next-step-desc">Join the Mentee Meter session</div>
              </a>
              <a class="next-step-card" href="#/about">
                <div class="next-step-icon">&#9733;</div>
                <div class="next-step-label">About BeMore</div>
                <div class="next-step-desc">Explore the ecosystem</div>
              </a>
            </div>
          </div>

          <div class="st-data-rights">
            <h3>Your Data Rights (POPIA)</h3>
            <p>You have the right to export or delete your personal data at any time.</p>
            <div class="st-data-btns">
              <button class="btn-ghost" id="st-export-btn">Export My Data</button>
              <button class="btn-ghost btn-danger-ghost" id="st-delete-btn">Delete My Data</button>
            </div>
          </div>

          <button class="btn-ghost full" id="st-back-btn">← Check Another Application</button>
        </div>`;

      document.getElementById('st-export-btn')?.addEventListener('click', async () => {
        const expRes = await api.exportMyData(ref, email);
        if (expRes.success && expRes.data) {
          const blob = new Blob([JSON.stringify(expRes.data, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `bemore-data-${ref}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
          toast('Your data has been downloaded');
        } else {
          toast(expRes.message || 'Export failed');
        }
      });

      document.getElementById('st-delete-btn')?.addEventListener('click', async () => {
        if (!confirm('This will permanently delete all your application data. This action cannot be undone. Are you sure?')) return;
        if (!confirm('Final confirmation: Type OK to delete your data permanently.')) return;
        const delRes = await api.deleteMyData(ref, email);
        if (delRes.success) {
          toast('Your data has been permanently deleted');
          formDiv.style.display = 'block';
          resultDiv.style.display = 'none';
          refInput.value = '';
          emailInput.value = '';
        } else {
          toast(delRes.message || 'Deletion failed');
        }
      });

      document.getElementById('st-back-btn')?.addEventListener('click', () => {
        formDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        refInput.value = '';
        emailInput.value = '';
      });
    });

    // Submit on Enter
    [refInput, emailInput].forEach(input => {
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btn?.click();
      });
    });
  },
};
