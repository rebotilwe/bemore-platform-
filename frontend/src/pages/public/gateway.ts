import type { Page, ProfileCategory } from '../../types/index.ts';
import { CATEGORIES } from '../../constants/categories.ts';
import { store } from '../../store.ts';
import { navigate } from '../../router.ts';

export const gatewayPage: Page = {
  render() {
    const total = CATEGORIES.length;
    const cards = CATEGORIES.map((c, i) => `
      <div class="gc" data-profile="${c.slug}" tabindex="0" role="button" aria-label="${c.title}">
        <div class="gc-num">${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>
        <div class="gc-ico" aria-hidden="true">${c.icon}</div>
        <div class="gc-title">${c.title}</div>
        <p class="gc-desc">${c.description}</p>
        <span class="gc-arrow" aria-hidden="true">→</span>
      </div>`).join('');

    return `
    <section class="gateway">
      <div class="gw-head">
        <div class="gw-step">Step 1 — Profile Selection</div>
        <h2 class="gw-h2">Which best describes you?</h2>
        <p class="gw-sub">Select your profile to reveal your tailored application. Your selection determines which funding pathways are matched to you.</p>
      </div>
      <div class="gw-grid" role="list">${cards}</div>
    </section>`;
  },
  mount() {
    document.querySelectorAll<HTMLElement>('.gc').forEach(card => {
      const handler = () => {
        const profile = card.dataset.profile;
        if (profile) {
          store.set('selectedProfile', profile as ProfileCategory);
          store.set('currentStep', 1);
          store.set('formData', {});
          navigate('/register');
        }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
      });
    });
  }
};
