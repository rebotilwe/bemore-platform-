/* ---------------------------------------------------------------
   <question-group> — shared declarative renderer.
   See: docs/superpowers/specs/2026-05-11-onboarding-flow-update-design.md §6.3
   ---------------------------------------------------------------*/

import type { Question, QuestionOption } from '../types/question.ts';

type FormData = Record<string, unknown>;
type OnChange = (id: string, value: unknown) => void;

/* ---------- helpers ---------- */

/** Normalise a `QuestionOption` (string | {label,value}) to a `{label,value}` pair. */
function normaliseOption(o: QuestionOption): { label: string; value: string } {
  return typeof o === 'string' ? { label: o, value: o } : o;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inputId(q: Question): string {
  return `q-${q.id}`;
}

function errorId(q: Question): string {
  return `${inputId(q)}-err`;
}

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return true;
  return true;
}

/** Default validator that respects `required`. Custom `validate` overrides. */
function runValidate(q: Question, value: unknown): string | null {
  if (q.validate) return q.validate(value);
  if (q.required && !isFilled(value)) return 'This field is required.';
  return null;
}

/* ---------- input renderers ---------- */

function renderLabel(q: Question, forId: string): string {
  const cls = `flbl${q.required ? ' req' : ''}`;
  const hint = q.required ? '' : ' <span class="flbl-hint">(optional)</span>';
  return `<label class="${cls}" for="${forId}">${escapeHtml(q.label)}${hint}</label>`;
}

function renderHelpText(q: Question): string {
  if (!q.helpText) return '';
  return `<p class="qg-help" id="${inputId(q)}-help">${escapeHtml(q.helpText)}</p>`;
}

function renderError(q: Question): string {
  return `<p class="qg-err" id="${errorId(q)}" role="alert" aria-live="polite" hidden></p>`;
}

function describedBy(q: Question): string {
  const ids: string[] = [];
  if (q.helpText) ids.push(`${inputId(q)}-help`);
  ids.push(errorId(q));
  return ids.join(' ');
}

function renderTextLike(q: Question, value: unknown, type: 'text' | 'email' | 'tel'): string {
  const id = inputId(q);
  const v = typeof value === 'string' ? escapeHtml(value) : '';
  const placeholder = q.placeholder ? ` placeholder="${escapeHtml(q.placeholder)}"` : '';
  const inputmode = type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text';
  const autocomplete =
    type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'off';
  return `
    <div class="fg" data-qg-field="${q.id}" data-qg-type="${q.type}">
      ${renderLabel(q, id)}
      ${renderHelpText(q)}
      <input
        class="fi"
        id="${id}"
        type="${type}"
        name="${q.id}"
        value="${v}"
        autocomplete="${autocomplete}"
        inputmode="${inputmode}"
        ${placeholder}
        aria-required="${q.required}"
        aria-describedby="${describedBy(q)}"
        aria-invalid="false"
        data-qg-input
      />
      ${renderError(q)}
    </div>`;
}

function renderTextarea(q: Question, value: unknown): string {
  const id = inputId(q);
  const v = typeof value === 'string' ? escapeHtml(value) : '';
  const placeholder = q.placeholder ? ` placeholder="${escapeHtml(q.placeholder)}"` : '';
  return `
    <div class="fg" data-qg-field="${q.id}" data-qg-type="${q.type}">
      ${renderLabel(q, id)}
      ${renderHelpText(q)}
      <textarea
        class="fta"
        id="${id}"
        name="${q.id}"
        rows="4"
        ${placeholder}
        aria-required="${q.required}"
        aria-describedby="${describedBy(q)}"
        aria-invalid="false"
        data-qg-input
      >${v}</textarea>
      ${renderError(q)}
    </div>`;
}

function renderRadio(q: Question, value: unknown): string {
  const opts = q.options ?? [];
  const groupId = inputId(q);
  const selected = typeof value === 'string' ? value : '';
  return `
    <div class="fg" data-qg-field="${q.id}" data-qg-type="${q.type}">
      <label class="flbl${q.required ? ' req' : ''}" id="${groupId}-label">${escapeHtml(q.label)}</label>
      ${renderHelpText(q)}
      <div
        class="rg"
        id="${groupId}"
        role="radiogroup"
        aria-required="${q.required}"
        aria-labelledby="${groupId}-label"
        aria-describedby="${describedBy(q)}"
      >
        ${opts.map(raw => {
          const o = normaliseOption(raw);
          const sel = o.value === selected;
          return `
            <div
              class="ro${sel ? ' sel' : ''}"
              role="radio"
              aria-checked="${sel}"
              tabindex="0"
              data-qg-radio
              data-value="${escapeHtml(o.value)}"
            >
              <span class="rdot"></span>${escapeHtml(o.label)}
            </div>`;
        }).join('')}
      </div>
      ${renderError(q)}
    </div>`;
}

function renderCheckbox(q: Question, value: unknown): string {
  const opts = q.options ?? [];
  const groupId = inputId(q);
  const selected = Array.isArray(value) ? (value as unknown[]).filter(v => typeof v === 'string') as string[] : [];
  return `
    <div class="fg" data-qg-field="${q.id}" data-qg-type="${q.type}">
      <label class="flbl${q.required ? ' req' : ''}" id="${groupId}-label">${escapeHtml(q.label)}</label>
      ${renderHelpText(q)}
      <div
        class="cg"
        id="${groupId}"
        role="group"
        aria-labelledby="${groupId}-label"
        aria-describedby="${describedBy(q)}"
      >
        ${opts.map(raw => {
          const o = normaliseOption(raw);
          const sel = selected.includes(o.value);
          return `
            <div
              class="co${sel ? ' sel' : ''}"
              role="checkbox"
              aria-checked="${sel}"
              tabindex="0"
              data-qg-check
              data-value="${escapeHtml(o.value)}"
            >
              <span class="cbox">${sel ? '✓' : ''}</span>${escapeHtml(o.label)}
            </div>`;
        }).join('')}
      </div>
      ${renderError(q)}
    </div>`;
}

function renderDropdown(q: Question, value: unknown): string {
  const id = inputId(q);
  const opts = q.options ?? [];
  const v = typeof value === 'string' ? value : '';
  return `
    <div class="fg" data-qg-field="${q.id}" data-qg-type="${q.type}">
      ${renderLabel(q, id)}
      ${renderHelpText(q)}
      <div class="sw">
        <select
          class="fs"
          id="${id}"
          name="${q.id}"
          aria-required="${q.required}"
          aria-describedby="${describedBy(q)}"
          aria-invalid="false"
          data-qg-input
        >
          <option value="">${q.placeholder ? escapeHtml(q.placeholder) : 'Select…'}</option>
          ${opts.map(raw => {
            const o = normaliseOption(raw);
            return `<option value="${escapeHtml(o.value)}"${o.value === v ? ' selected' : ''}>${escapeHtml(o.label)}</option>`;
          }).join('')}
        </select>
      </div>
      ${renderError(q)}
    </div>`;
}

function renderFile(q: Question, value: unknown): string {
  const id = inputId(q);
  const accept = q.accept ? ` accept="${escapeHtml(q.accept)}"` : '';
  // For file inputs the "value" in formData carries the upload result metadata
  // (filename / storedAs) rather than a string. We surface the filename if present.
  const meta = (value && typeof value === 'object')
    ? value as { filename?: string; size?: number }
    : null;
  const filename = meta?.filename ? escapeHtml(meta.filename) : '';
  const sizeKb = typeof meta?.size === 'number' ? Math.round(meta.size / 1024) : null;
  return `
    <div class="fg" data-qg-field="${q.id}" data-qg-type="${q.type}">
      ${renderLabel(q, id)}
      ${renderHelpText(q)}
      <input
        class="fi qg-file"
        id="${id}"
        type="file"
        name="${q.id}"
        ${accept}
        aria-required="${q.required}"
        aria-describedby="${describedBy(q)}"
        aria-invalid="false"
        data-qg-input
      />
      <div class="qg-file-meta" data-qg-file-meta ${filename ? '' : 'hidden'}>
        ${filename ? `<span class="qg-file-name">${filename}</span>` : ''}
        ${sizeKb !== null ? `<span class="qg-file-size"> (${sizeKb} KB)</span>` : ''}
      </div>
      ${renderError(q)}
    </div>`;
}

function renderQuestion(q: Question, formData: FormData): string {
  const value = formData[q.id];
  switch (q.type) {
    case 'text':     return renderTextLike(q, value, 'text');
    case 'email':    return renderTextLike(q, value, 'email');
    case 'phone':    return renderTextLike(q, value, 'tel');
    case 'textarea': return renderTextarea(q, value);
    case 'radio':    return renderRadio(q, value);
    case 'checkbox': return renderCheckbox(q, value);
    case 'dropdown': return renderDropdown(q, value);
    case 'file':     return renderFile(q, value);
  }
}

/* ---------- error display ---------- */

function setError(field: HTMLElement, msg: string | null): void {
  const errEl = field.querySelector<HTMLElement>('.qg-err');
  const inputs = field.querySelectorAll<HTMLElement>('[data-qg-input], [role="radiogroup"], [role="group"]');
  if (msg) {
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }
    inputs.forEach(el => {
      el.setAttribute('aria-invalid', 'true');
      if (el.classList.contains('fi') || el.classList.contains('fs') || el.classList.contains('fta')) {
        el.classList.add('err');
      }
    });
  } else {
    if (errEl) {
      errEl.textContent = '';
      errEl.hidden = true;
    }
    inputs.forEach(el => {
      el.setAttribute('aria-invalid', 'false');
      el.classList.remove('err');
    });
  }
}

/* ---------- public API ---------- */

/**
 * Build a host element containing the rendered questions.
 *
 * - Iterates `questions`, evaluating `showIf` per question against `formData`.
 * - Wires `onChange` for every input type.
 * - Runs `validate()` on input/blur and surfaces inline errors.
 * - Hidden questions are not rendered. Step-readiness consumers should also
 *   strip hidden values from formData (responsibility lives in the step file).
 */
export function renderQuestionGroup(
  questions: Question[],
  formData: FormData,
  onChange: OnChange,
): HTMLElement {
  const host = document.createElement('div');
  host.className = 'question-group';

  const visible = questions.filter(q => (q.showIf ? q.showIf(formData) : true));
  host.innerHTML = visible.map(q => renderQuestion(q, formData)).join('');

  // Wire each rendered field
  for (const q of visible) {
    const field = host.querySelector<HTMLElement>(`[data-qg-field="${q.id}"]`);
    if (!field) continue;

    const validateAndEmit = (value: unknown): void => {
      const err = runValidate(q, value);
      setError(field, err);
      onChange(q.id, value);
    };

    if (q.type === 'text' || q.type === 'email' || q.type === 'phone') {
      const input = field.querySelector<HTMLInputElement>('input[data-qg-input]');
      if (!input) continue;
      input.addEventListener('input', () => validateAndEmit(input.value));
      input.addEventListener('blur', () => {
        const err = runValidate(q, input.value);
        setError(field, err);
      });
    }

    if (q.type === 'textarea') {
      const ta = field.querySelector<HTMLTextAreaElement>('textarea[data-qg-input]');
      if (!ta) continue;
      ta.addEventListener('input', () => validateAndEmit(ta.value));
      ta.addEventListener('blur', () => setError(field, runValidate(q, ta.value)));
    }

    if (q.type === 'dropdown') {
      const sel = field.querySelector<HTMLSelectElement>('select[data-qg-input]');
      if (!sel) continue;
      sel.addEventListener('change', () => validateAndEmit(sel.value));
    }

    if (q.type === 'radio') {
      const ros = field.querySelectorAll<HTMLElement>('[data-qg-radio]');
      const select = (chosen: HTMLElement) => {
        ros.forEach(el => {
          const isMe = el === chosen;
          el.classList.toggle('sel', isMe);
          el.setAttribute('aria-checked', String(isMe));
        });
        validateAndEmit(chosen.dataset.value ?? '');
      };
      ros.forEach(el => {
        el.addEventListener('click', () => select(el));
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            select(el);
          }
        });
      });
    }

    if (q.type === 'checkbox') {
      const cos = field.querySelectorAll<HTMLElement>('[data-qg-check]');
      const collect = (): string[] => {
        const out: string[] = [];
        cos.forEach(el => {
          if (el.classList.contains('sel')) {
            out.push(el.dataset.value ?? '');
          }
        });
        return out;
      };
      const toggle = (el: HTMLElement) => {
        const isSel = !el.classList.contains('sel');
        el.classList.toggle('sel', isSel);
        el.setAttribute('aria-checked', String(isSel));
        const box = el.querySelector('.cbox');
        if (box) box.textContent = isSel ? '✓' : '';
        validateAndEmit(collect());
      };
      cos.forEach(el => {
        el.addEventListener('click', () => toggle(el));
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggle(el);
          }
        });
      });
    }

    if (q.type === 'file') {
      const input = field.querySelector<HTMLInputElement>('input[type="file"][data-qg-input]');
      if (!input) continue;
      input.addEventListener('change', () => {
        const file = input.files?.[0] ?? null;
        if (!file) {
          validateAndEmit(null);
          return;
        }
        // Client-side size guard; MIME also enforced by `accept` attribute + server.
        if (q.maxSizeBytes && file.size > q.maxSizeBytes) {
          const mb = Math.round(q.maxSizeBytes / (1024 * 1024));
          setError(field, `File is too large. Maximum size is ${mb} MB.`);
          input.value = '';
          return;
        }
        // Hand the raw File to the caller; upload + metadata management is
        // the step file's responsibility (it owns the network call).
        setError(field, null);
        onChange(q.id, file);
      });
    }
  }

  return host;
}
