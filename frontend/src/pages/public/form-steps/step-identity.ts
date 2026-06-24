/* ---------------------------------------------------------------
   Step 1 — Identity (spec §5)
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../../../types/index.ts';
import { store } from '../../../store.ts';
import { renderQuestionGroup } from '../../../components/question-group.ts';
import { PROFILE_CONFIG } from '../../../utils/step-readiness.ts';

const PROFILES_WITH_COMPANY = new Set<ProfileCategory>([
  'developer', 'investor', 'student', 'professional',
]);

const PROFILES_WITH_REQUIRED_COMPANY = new Set<ProfileCategory>(['student']);

interface PersonalSlice {
  firstName?: string;
  surname?: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

function getPersonal(): PersonalSlice {
  return ((store.get('formData') ?? {}) as Record<string, unknown>).personal as PersonalSlice ?? {};
}

function patchPersonal(patch: PersonalSlice): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  const current = (fd.personal as PersonalSlice) ?? {};
  fd.personal = { ...current, ...patch };
  store.set('formData', fd);
}

function patchFormData(id: string, value: unknown): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  fd[id] = value;
  store.set('formData', fd);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function renderStepIdentity(profile: ProfileCategory): string {
  const personal = getPersonal();
  const showCompany = PROFILES_WITH_COMPANY.has(profile);
  const companyRequired = PROFILES_WITH_REQUIRED_COMPANY.has(profile);
  return `
    <div class="fdiv">Identity</div>
    <div class="frow">
      <div class="fg">
        <label class="flbl req" for="f-fn">First Name</label>
        <input class="fi" id="f-fn" type="text" name="firstName"
               autocomplete="given-name" inputmode="text"
               value="${escapeAttr(personal.firstName ?? '')}"
               placeholder="e.g. Thabo"
               aria-required="true" aria-label="First name" />
      </div>
      <div class="fg">
        <label class="flbl req" for="f-sn">Surname</label>
        <input class="fi" id="f-sn" type="text" name="surname"
               autocomplete="family-name" inputmode="text"
               value="${escapeAttr(personal.surname ?? '')}"
               placeholder="e.g. Mokoena"
               aria-required="true" aria-label="Surname" />
      </div>
    </div>
    ${showCompany ? `
    <div class="fg">
      <label class="flbl${companyRequired ? ' req' : ''}" for="f-co">Company / Organisation${companyRequired ? '' : ' <span class="flbl-hint">(optional)</span>'}</label>
      <input class="fi" id="f-co" type="text" name="companyName"
             autocomplete="organization" inputmode="text"
             value="${escapeAttr(personal.companyName ?? '')}"
             placeholder="e.g. Mokoena Developments (Pty) Ltd"
             aria-required="${companyRequired}" aria-label="Company or organisation name" />
    </div>` : ''}
    <div id="step1-questions" class="fdiv-spacer"></div>
  `;
}

export function mountStepIdentity(profile: ProfileCategory): void {
  // Guard: if profile is missing or has no config, bail out gracefully.
  // This can happen if the store is cleared or the user navigates directly
  // to /register without selecting a profile first.
  if (!profile || !PROFILE_CONFIG[profile]) {
    console.warn('mountStepIdentity: no profile config for', profile, '— redirecting to gateway');
    // Avoid a hard crash; the router will handle the redirect.
    import('../../../router.ts').then(({ navigate }) => navigate('/gateway')).catch(() => {
      window.location.hash = '/gateway';
    });
    return;
  }

  // Wire personal field inputs → store.personal
  const wirePersonal = (id: string, key: keyof PersonalSlice) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.addEventListener('input', () => {
      patchPersonal({ [key]: el.value } as PersonalSlice);
    });
  };
  wirePersonal('f-fn', 'firstName');
  wirePersonal('f-sn', 'surname');
  wirePersonal('f-co', 'companyName');

  // Render any profile-specific Step-1 questions via the shared renderer.
  const config = PROFILE_CONFIG[profile];
  const host = document.getElementById('step1-questions');
  if (host && config.step1?.length) {
    const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
    const group = renderQuestionGroup(config.step1, fd, patchFormData);
    host.innerHTML = '';
    host.appendChild(group);
  }
}