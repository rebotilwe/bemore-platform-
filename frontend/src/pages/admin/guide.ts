import type { Page } from '../../types/index.ts';
import { mountAdminLayout } from './layout.ts';

const GUIDE_SECTIONS = [
  {
    id: 'quick-start',
    icon: '&#9654;',
    title: 'Quick Start — Your First 10 Minutes',
    content: `
      <div class="guide-steps">
        <div class="guide-step">
          <div class="guide-step-num">1</div>
          <div class="guide-step-body">
            <h4>Check the Dashboard</h4>
            <p>Start at <a href="#/admin/dashboard">Dashboard</a>. The 4 KPI cards at the top tell you everything at a glance: total applications, under review, pipeline count, and conversion rate.</p>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">2</div>
          <div class="guide-step-body">
            <h4>Review New Applications</h4>
            <p>Go to <a href="#/admin/leads">All Leads</a>. Filter by status <strong>"New"</strong> to see unreviewed applications. Click any name to open the full detail modal.</p>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">3</div>
          <div class="guide-step-body">
            <h4>Classify Your Best Leads</h4>
            <p>In the detail modal, use the <strong>Classification</strong> dropdown to mark leads as <span class="guide-tag hot">HOT</span>, <span class="guide-tag warm">WARM</span>, or <span class="guide-tag cold">COLD</span>. This helps prioritise follow-ups.</p>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">4</div>
          <div class="guide-step-body">
            <h4>Move Leads Through the Pipeline</h4>
            <p>Change status from <strong>New → Reviewing → Shortlisted → Invited → Funded</strong>. Each status change automatically sends a branded email notification to the applicant.</p>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">5</div>
          <div class="guide-step-body">
            <h4>Print QR Codes for Events</h4>
            <p>Visit <a href="#/admin/qr">QR Codes</a> to generate branded QR codes. Choose different source tags (brochure, banner, badge) so you can track which materials drive the most scans.</p>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'pipeline',
    icon: '&#9679;',
    title: 'The Application Pipeline',
    content: `
      <p class="guide-intro">Every application flows through 5 stages. Each transition triggers an email to the applicant.</p>
      <div class="guide-pipeline">
        <div class="guide-pipe-stage">
          <div class="guide-pipe-dot" style="background:var(--steel-light)"></div>
          <div class="guide-pipe-info">
            <strong>New</strong>
            <p>Just submitted. No action taken yet. Review the profile, form data, and auto-tags.</p>
            <div class="guide-pipe-action">Action: Read and assess the application</div>
          </div>
        </div>
        <div class="guide-pipe-stage">
          <div class="guide-pipe-dot" style="background:var(--gold)"></div>
          <div class="guide-pipe-info">
            <strong>Reviewing</strong>
            <p>You've started evaluating. The applicant receives an "Under Review" email with a 5-day timeline.</p>
            <div class="guide-pipe-action">Action: Set classification (hot/warm/cold), add admin notes</div>
          </div>
        </div>
        <div class="guide-pipe-stage">
          <div class="guide-pipe-dot" style="background:#e8c97a"></div>
          <div class="guide-pipe-info">
            <strong>Shortlisted</strong>
            <p>This applicant qualifies. They receive a congratulations email. They now appear in the <a href="#/admin/deal-room">Deal Room</a>.</p>
            <div class="guide-pipe-action">Action: Assign PBSA funder, grant deal room access</div>
          </div>
        </div>
        <div class="guide-pipe-stage">
          <div class="guide-pipe-dot" style="background:var(--green)"></div>
          <div class="guide-pipe-info">
            <strong>Invited</strong>
            <p>Formally invited to participate. They receive full details via email.</p>
            <div class="guide-pipe-action">Action: Confirm deal room entry, send reminder if needed</div>
          </div>
        </div>
        <div class="guide-pipe-stage">
          <div class="guide-pipe-dot" style="background:#66bb6a"></div>
          <div class="guide-pipe-info">
            <strong>Funded</strong>
            <p>Matched with a funding partnership through PBSA. The applicant is notified of onboarding next steps.</p>
            <div class="guide-pipe-action">Action: Follow up with onboarding documentation</div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'leads',
    icon: '&#9776;',
    title: 'Managing Leads',
    content: `
      <div class="guide-feature-grid">
        <div class="guide-feature">
          <h4>Search & Filter</h4>
          <p>Use the search bar to find any applicant by name, email, or reference number. Filter by status (dropdown) or profile type (tabs) to narrow results.</p>
        </div>
        <div class="guide-feature">
          <h4>Sort Columns</h4>
          <p>Click any column header with arrows (Name, Type, Status, Date) to sort ascending or descending. Gold arrow shows active sort.</p>
        </div>
        <div class="guide-feature">
          <h4>Bulk Actions</h4>
          <p>Tick checkboxes next to multiple leads, then use "Change Status To..." dropdown and click "Apply". A confirmation dialog prevents accidents. Emails send automatically for shortlisted, invited, and funded statuses.</p>
        </div>
        <div class="guide-feature">
          <h4>Quick Shortlist</h4>
          <p>Each lead has a "Shortlist" button. One click moves them to shortlisted status. Click "Remove" to revert.</p>
        </div>
        <div class="guide-feature">
          <h4>Export to CSV</h4>
          <p>Click "Export CSV" to download all leads (not filtered) with 19 columns including classification, engagement source, follow-up status, and admin notes. Open in Excel for offline review.</p>
        </div>
        <div class="guide-feature">
          <h4>Detail Modal</h4>
          <p>Click any applicant's name to open the full detail view. From here you can change status, add notes, classify the lead, set follow-up reminders, and see every piece of form data they submitted.</p>
        </div>
      </div>`,
  },
  {
    id: 'classification',
    icon: '&#9733;',
    title: 'Classifying & Following Up',
    content: `
      <p class="guide-intro">Classification and follow-up tracking turn raw leads into an actionable pipeline.</p>

      <h4>Classification Levels</h4>
      <div class="guide-class-grid">
        <div class="guide-class-card hot">
          <div class="guide-class-label">HOT</div>
          <p>High-value, shovel-ready, institutional-grade. Contact within 24 hours. Likely invitee and deal room candidate.</p>
        </div>
        <div class="guide-class-card warm">
          <div class="guide-class-label">WARM</div>
          <p>Good potential but needs more info or isn't quite ready. Review within the week. May need follow-up call.</p>
        </div>
        <div class="guide-class-card cold">
          <div class="guide-class-label">COLD</div>
          <p>Doesn't meet current criteria or incomplete submission. Keep on file for future rounds. No immediate action.</p>
        </div>
      </div>

      <h4 style="margin-top:var(--sp-6)">Follow-Up Tracker</h4>
      <p>In the detail modal, toggle "Follow-Up Required", set a due date, and add notes. Use this to ensure no promising lead falls through the cracks.</p>
      <div class="guide-tip">
        <strong>Pro Tip:</strong> Filter leads by classification on the Dashboard's "Lead Classification" card to quickly identify your hottest prospects for post-event follow-up.
      </div>`,
  },
  {
    id: 'deal-room',
    icon: '&#9670;',
    title: 'Deal Room Management',
    content: `
      <p class="guide-intro">The Deal Room is your command centre for qualified leads. Only shortlisted, invited, and funded applications appear here.</p>

      <h4>Deal Room Access</h4>
      <div class="guide-feature-grid">
        <div class="guide-feature">
          <h4>Deal Room Entry</h4>
          <p>Grants access to the exclusive deal room sessions where applicants present to funding partners. Toggle the checkbox on each deal card.</p>
        </div>
      </div>

      <h4 style="margin-top:var(--sp-6)">PBSA Assignment</h4>
      <p>Click the <strong>PBSA</strong> chip on a deal card to assign (or unassign) the applicant to PBSA as a funding partner. The chip turns gold when assigned. The summary bar at the top shows total PBSA assignments.</p>

      <div class="guide-tip">
        <strong>Pro Tip:</strong> Use the search bar to quickly find specific applicants. Search works across name, email, reference number, and company name.
      </div>`,
  },
  {
    id: 'reports',
    icon: '&#9650;',
    title: 'Intelligence Reports',
    content: `
      <p class="guide-intro">Four pre-built reports powered by the auto-tagging engine. Each filters applications by specific intelligence criteria.</p>

      <div class="guide-report-grid">
        <div class="guide-report" style="border-color:#c9a84c">
          <h4 style="color:#c9a84c">Funding Threshold</h4>
          <p>Developers flagged as <strong>HIGH_VALUE</strong> or <strong>LARGE_CAPITAL</strong> — these are your R20M+ deals seeking serious institutional backing.</p>
          <div class="guide-report-use">Use for: Identifying top-tier funding candidates for PBSA</div>
        </div>
        <div class="guide-report" style="border-color:#4cb87a">
          <h4 style="color:#4cb87a">Pipeline Ready</h4>
          <p>Developers tagged <strong>PIPELINE_READY</strong> — combining <strong>SHOVEL_READY</strong> (construction-ready or under construction), <strong>HIGH_VALUE</strong> (R20M+ project value), and <strong>ACTIVELY_LOOKING</strong>. Ready for institutional capital.</p>
          <div class="guide-report-use">Use for: Top-priority deal flow into PBSA</div>
        </div>
        <div class="guide-report" style="border-color:#7ab8e8">
          <h4 style="color:#7ab8e8">Institutional Grade</h4>
          <p>Developers tagged <strong>INSTITUTIONAL_GRADE</strong> — combining <strong>HIGH_VALUE</strong> with <strong>STUDENT_FOCUS</strong>. The clearest matches for the PBSA student-accommodation thesis.</p>
          <div class="guide-report-use">Use for: Matching with student accommodation funding</div>
        </div>
        <div class="guide-report" style="border-color:#e8a47a">
          <h4 style="color:#e8a47a">Deal Room Shortlist</h4>
          <p>All applicants with <strong>shortlisted</strong> or <strong>invited</strong> status — your active deal pipeline.</p>
          <div class="guide-report-use">Use for: Deal room scheduling and pipeline review</div>
        </div>
      </div>

      <div class="guide-tip">
        <strong>Pro Tip:</strong> Run the "Funding Threshold" report, then click into each lead to classify as hot/warm/cold. Export the results as CSV for offline deal preparation.
      </div>`,
  },
  {
    id: 'analytics',
    icon: '&#9632;',
    title: 'Analytics & Insights',
    content: `
      <p class="guide-intro">The analytics page gives you deep visibility into your pipeline performance. Use the time range buttons (7D, 30D, 90D, 1Y) to adjust the window.</p>

      <div class="guide-feature-grid">
        <div class="guide-feature">
          <h4>Conversion Funnel</h4>
          <p>See how many applications move from New to Funded. A healthy funnel narrows gradually. A sharp drop at any stage signals a bottleneck to investigate.</p>
        </div>
        <div class="guide-feature">
          <h4>Submission Trends</h4>
          <p>Track daily, weekly, or monthly submission volume. Spikes after QR campaigns or marketing pushes are visible here. Use this to measure campaign effectiveness.</p>
        </div>
        <div class="guide-feature">
          <h4>Tag Distribution</h4>
          <p>Shows which intelligence tags are most common. If "HIGH_VALUE" is rare, your pipeline may need more high-tier applicants. A healthy share of "ACTIVELY_LOOKING" + "SHOVEL_READY" signals deal-ready momentum.</p>
        </div>
        <div class="guide-feature">
          <h4>Demographics</h4>
          <p>Understand your pipeline composition: estimated project values, previous funding experience, and land status. Use this to tailor your engagement strategy.</p>
        </div>
        <div class="guide-feature">
          <h4>Engagement Sources</h4>
          <p>See how users found the platform (QR code, direct visit, etc.). Use different QR source tags for different materials to measure which drives the most applications.</p>
        </div>
        <div class="guide-feature">
          <h4>Deal Room Metrics</h4>
          <p>Track how many applicants have deal room entry. Monitor PBSA assignment rates across the pipeline.</p>
        </div>
      </div>`,
  },
  {
    id: 'qr',
    icon: '&#9635;',
    title: 'QR Code Campaigns',
    content: `
      <p class="guide-intro">Every printed QR code can be tracked. Use different source tags to measure which materials drive the most engagement.</p>

      <h4>How to Create a QR Code</h4>
      <div class="guide-steps">
        <div class="guide-step">
          <div class="guide-step-num">1</div>
          <div class="guide-step-body">
            <p>Go to <a href="#/admin/qr">QR Codes</a> in the sidebar.</p>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">2</div>
          <div class="guide-step-body">
            <p>Select a <strong>source tag</strong> from the dropdown (e.g., "qr-brochure" for brochures, "qr-banner" for banners).</p>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">3</div>
          <div class="guide-step-body">
            <p>Click <strong>Download PNG</strong> to get a high-resolution (1000x1000px) QR code for print.</p>
          </div>
        </div>
      </div>

      <h4 style="margin-top:var(--sp-6)">Source Tags Explained</h4>
      <div class="guide-tags-table">
        <div class="guide-tags-row"><span class="guide-tags-key">qr</span><span>General QR code (default)</span></div>
        <div class="guide-tags-row"><span class="guide-tags-key">qr-brochure</span><span>Printed brochures and handouts</span></div>
        <div class="guide-tags-row"><span class="guide-tags-key">qr-banner</span><span>Standing banners and signage</span></div>
        <div class="guide-tags-row"><span class="guide-tags-key">qr-badge</span><span>Name badges and lanyards</span></div>
        <div class="guide-tags-row"><span class="guide-tags-key">qr-flyer</span><span>Flyers and leaflets</span></div>
      </div>

      <div class="guide-tip">
        <strong>Pro Tip:</strong> Check the Dashboard's "Engagement Sources" card to see exactly how many applications came from each material type.
      </div>`,
  },
  {
    id: 'audit',
    icon: '&#9201;',
    title: 'Audit Trail',
    content: `
      <p class="guide-intro">Every action on the platform is logged. The <a href="#/admin/audit-log">Audit Log</a> provides full transparency for compliance and accountability.</p>

      <h4>What Gets Tracked</h4>
      <div class="guide-feature-grid">
        <div class="guide-feature">
          <h4>Application Events</h4>
          <p>New submissions, status changes, bulk updates, and detail views. Every time someone submits or an admin modifies an application, it's recorded.</p>
        </div>
        <div class="guide-feature">
          <h4>Admin Actions</h4>
          <p>CSV exports, report generation, dashboard views. Know who accessed what data and when.</p>
        </div>
        <div class="guide-feature">
          <h4>Authentication</h4>
          <p>Login attempts (successful and failed), token verifications. Monitor for suspicious access patterns.</p>
        </div>
        <div class="guide-feature">
          <h4>System Events</h4>
          <p>Email notifications sent, reminders dispatched. Verify that communications were delivered.</p>
        </div>
      </div>

      <p>Use the <strong>search bar</strong> to find specific events (e.g., search for a reference number to see its full history). Filter by category using the tab buttons.</p>`,
  },
  {
    id: 'emails',
    icon: '&#9993;',
    title: 'Email Automation',
    content: `
      <p class="guide-intro">The platform sends branded emails automatically. You don't need to do anything — just change the application status and the right email fires.</p>

      <div class="guide-email-grid">
        <div class="guide-email">
          <div class="guide-email-trigger">On Submit</div>
          <div class="guide-email-subject">Application Received</div>
          <p>Sent immediately when someone submits. Includes their reference number and links to check status.</p>
        </div>
        <div class="guide-email">
          <div class="guide-email-trigger">Status → Reviewing</div>
          <div class="guide-email-subject">Application Under Review</div>
          <p>Tells the applicant you're actively looking at their profile. Sets expectation of 5 business days.</p>
        </div>
        <div class="guide-email">
          <div class="guide-email-trigger">Status → Shortlisted</div>
          <div class="guide-email-subject">You Have Been Shortlisted!</div>
          <p>Congratulations email. Mentions PBSA partnership and deal room review process.</p>
        </div>
        <div class="guide-email">
          <div class="guide-email-trigger">Status → Invited</div>
          <div class="guide-email-subject">Invitation</div>
          <p>Formal invitation with full event details: 30-31 March, Sandton Convention Centre, dress code.</p>
        </div>
        <div class="guide-email">
          <div class="guide-email-trigger">Status → Funded</div>
          <div class="guide-email-subject">Funding Partnership Confirmed</div>
          <p>Partnership match confirmed. Team will follow up with terms and onboarding.</p>
        </div>
        <div class="guide-email">
          <div class="guide-email-trigger">Manual Send</div>
          <div class="guide-email-subject">Reminder</div>
          <p>Sent via the send-reminders API. Use for last-minute reminders before the event.</p>
        </div>
      </div>

      <div class="guide-tip">
        <strong>Important:</strong> Every email includes the BeMore x PBSA co-branding, the applicant's reference number, and buttons linking back to the platform. All emails come from <code>info@bts-app.co.za</code>.
      </div>`,
  },
];

export const guidePage: Page = {
  render() {
    const nav = GUIDE_SECTIONS.map(s =>
      `<a class="guide-nav-item" href="#guide-${s.id}" data-section="${s.id}">
        <span class="guide-nav-icon">${s.icon}</span>
        <span>${s.title.split(' — ')[0]}</span>
      </a>`
    ).join('');

    const sections = GUIDE_SECTIONS.map(s =>
      `<div class="guide-section" id="guide-${s.id}">
        <div class="guide-section-header">
          <span class="guide-section-icon">${s.icon}</span>
          <h3 class="guide-section-title">${s.title}</h3>
        </div>
        <div class="guide-section-body">${s.content}</div>
      </div>`
    ).join('');

    return `
    <div class="guide-page">
      <div class="guide-header">
        <h2 class="admin-main-title">Admin Guide</h2>
        <p class="guide-header-sub">Everything you need to get the best out of the BeMore platform. Click any section to jump straight to it.</p>
      </div>
      <div class="guide-layout">
        <nav class="guide-nav">${nav}</nav>
        <div class="guide-content">${sections}</div>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();

    // Smooth scroll for nav links
    document.querySelectorAll<HTMLAnchorElement>('.guide-nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.dataset.section;
        const target = document.getElementById(`guide-${id}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.querySelectorAll('.guide-nav-item').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    });

    // Highlight nav on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace('guide-', '');
          document.querySelectorAll('.guide-nav-item').forEach(l => {
            l.classList.toggle('active', (l as HTMLElement).dataset.section === id);
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    document.querySelectorAll('.guide-section').forEach(s => observer.observe(s));
  },
};
