/* ---------------------------------------------------------------
   Step 4 — Contact (spec §5)
   - Email + phone are written directly to `store.personal` per spec §7.2
     final paragraph.
   - Professional only: the `cv` file question triggers a multipart upload
     (POST /api/applications/upload, spec §8.1). The raw `File` is replaced
     in store with `{ field, filename, storedAs }` and stashed in
     `store.attachments` so form.ts can include it on submission.
   - Spec §6.5 UI states for the upload (in-progress, error, success) are
     surfaced inline on the file input's helper / error elements.
   ---------------------------------------------------------------*/

import type { ProfileCategory, AttachmentRef } from '../../../types/index.ts';
import { store } from '../../../store.ts';
import { renderQuestionGroup } from '../../../components/question-group.ts';
import { PROFILE_CONFIG } from '../../../utils/step-readiness.ts';
import { api } from '../../../api.ts';

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

function setAttachments(list: AttachmentRef[]): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  fd.attachments = list;
  store.set('formData', fd);
}

function setUploadInFlight(inFlight: boolean): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  fd.__uploadInFlight = inFlight;
  store.set('formData', fd);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function renderStepContact(_profile: ProfileCategory): string {
  const personal = getPersonal();
  return `
    <div class="fdiv">Contact Details</div>
    <div class="frow">
      <div class="fg">
        <label class="flbl req" for="f-em">Email Address</label>
        <input class="fi" id="f-em" type="email" name="email"
               autocomplete="email" inputmode="email"
               value="${escapeAttr(personal.email ?? '')}"
               placeholder="you@company.co.za"
               aria-required="true" aria-label="Email address" />
      </div>
      <div class="fg">
        <label class="flbl req" for="f-ph">Phone Number</label>
        <input class="fi" id="f-ph" type="tel" name="phone"
               autocomplete="tel" inputmode="tel"
               value="${escapeAttr(personal.phone ?? '')}"
               placeholder="+27 XX XXX XXXX"
               aria-required="true" aria-label="Phone number" />
      </div>
    </div>
    <div id="step4-questions"></div>
  `;
}

export function mountStepContact(profile: ProfileCategory): void {
  // Wire personal fields → store.personal
  const wirePersonal = (id: string, key: keyof PersonalSlice) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.addEventListener('input', () => {
      patchPersonal({ [key]: el.value } as PersonalSlice);
    });
  };
  wirePersonal('f-em', 'email');
  wirePersonal('f-ph', 'phone');

  // Render any profile-specific Step-4 questions (Professional `cv` only).
  const config = PROFILE_CONFIG[profile];
  const host = document.getElementById('step4-questions');
  if (!host || !config.step4.length) return;

  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;

  const onChange = async (id: string, value: unknown): Promise<void> => {
    if (id === 'cv') {
      await handleCvChange(value, host);
      return;
    }
    const next = (store.get('formData') ?? {}) as Record<string, unknown>;
    next[id] = value;
    store.set('formData', next);
  };

  host.appendChild(
    renderQuestionGroup(config.step4, fd, (id, value) => { void onChange(id, value); }),
  );
}

/* ──────── CV upload state machine (spec §6.5) ──────── */

function setCvError(host: HTMLElement, msg: string | null): void {
  const errEl = host.querySelector<HTMLElement>('[data-qg-field="cv"] .qg-err');
  if (!errEl) return;
  if (msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  } else {
    errEl.textContent = '';
    errEl.hidden = true;
  }
}

function setCvMeta(host: HTMLElement, label: string | null, sizeBytes: number | null): void {
  const meta = host.querySelector<HTMLElement>('[data-qg-field="cv"] [data-qg-file-meta]');
  if (!meta) return;
  if (!label) {
    meta.hidden = true;
    meta.innerHTML = '';
    return;
  }
  meta.hidden = false;
  const sizeFrag = sizeBytes !== null
    ? `<span class="qg-file-size"> (${Math.round(sizeBytes / 1024)} KB)</span>`
    : '';
  meta.innerHTML =
    `<span class="qg-file-name">${label.replace(/</g, '&lt;')}</span>${sizeFrag}`;
}

async function handleCvChange(value: unknown, host: HTMLElement): Promise<void> {
  // Clear previous attachment before re-upload
  setAttachments([]);

  if (!(value instanceof File)) {
    setCvError(host, null);
    setCvMeta(host, null, null);
    return;
  }

  setCvError(host, null);
  setCvMeta(host, `${value.name} — uploading…`, value.size);
  setUploadInFlight(true);

  const result = await api.uploadAttachment(value);
  setUploadInFlight(false);

  if (!result.success || !result.data) {
    const msg = result.message || 'Upload failed. Please try again.';
    setCvError(host, msg);
    setCvMeta(host, null, null);
    return;
  }

  setAttachments([{ field: 'cv', filename: result.data.filename, storedAs: result.data.storedAs }]);
  setCvMeta(host, result.data.filename, result.data.size);
}
