import type { Page } from '../../types/index.ts';
import { login } from '../../auth.ts';
import { navigate } from '../../router.ts';

export const loginPage: Page = {
  render() {
    return `
    <section class="login-view">
      <div class="login-glow" aria-hidden="true"></div>
      <button class="btn-ghost login-back" id="login-back">← Back to Home</button>
      <div class="admin-login-box">
        <div class="login-logo-wrap">
          <img src="/be-more-group-logo.png" alt="BeMore Group" class="login-logo-img" />
        </div>
        <h1 class="admin-title display">Admin Portal</h1>
        <p class="admin-sub">BeMore SME Access Initiative — Secure Access</p>
        <form id="login-form" autocomplete="on">
          <div class="admin-field">
            <label for="al-email">Email</label>
            <input id="al-email" type="email" class="fi" placeholder="admin@bemore.co.za" autocomplete="email" required />
          </div>
          <div class="admin-field">
            <label for="al-pass">Password</label>
            <input id="al-pass" type="password" class="fi" placeholder="Enter password" autocomplete="current-password" required />
          </div>
          <div id="login-err" class="login-err" role="alert"></div>
          <button type="submit" class="btn-login">Sign In →</button>
        </form>
        <p class="login-hint">Demo: admin@bemore.co.za / BeMore@2026!</p>
      </div>
    </section>`;
  },

  mount() {
    document.getElementById('login-back')?.addEventListener('click', () => navigate('/'));

    const form = document.getElementById('login-form') as HTMLFormElement | null;
    const errEl = document.getElementById('login-err');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('al-email') as HTMLInputElement).value.trim();
      const pass = (document.getElementById('al-pass') as HTMLInputElement).value;

      if (errEl) errEl.textContent = '';

      const result = await login(email, pass);
      if (result.success) {
        navigate('/admin/dashboard');
      } else {
        if (errEl) errEl.textContent = result.message || 'Invalid credentials';
      }
    });
  },
};
