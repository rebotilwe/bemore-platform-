/* ---------------------------------------------------------------
   Step 3 — Constraints + Alignment (spec §5)
   Pure profile-config driven. Step 3 owns the §5.1 conditional questions
   for Land Owner (zoning, whatPreventsProgress) and Investor — the renderer
   evaluates `showIf`; we re-render on every change so the predicate fires
   against fresh formData.
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../../../types/index.ts';
import { store } from '../../../store.ts';
import { renderQuestionGroup } from '../../../components/question-group.ts';
import { PROFILE_CONFIG, visibleQuestions } from '../../../utils/step-readiness.ts';

function visibleIds(profile: ProfileCategory, fd: Record<string, unknown>): string {
  return visibleQuestions(PROFILE_CONFIG[profile].step3, fd).map(q => q.id).join('|');
}

function patchFormData(profile: ProfileCategory, id: string, value: unknown, host: HTMLElement): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  // Snapshot visibility BEFORE the mutation so we can decide whether to re-render.
  // Re-rendering on every keystroke steals input focus — only do it when this
  // field actually flips another field's `showIf` predicate (e.g. landOutcome
  // gating zoning / whatPreventsProgress).
  const before = visibleIds(profile, fd);
  fd[id] = value;
  store.set('formData', fd);
  const after = visibleIds(profile, fd);
  if (before !== after) {
    clearStaleHiddenValues(profile);
    rerender(profile, host);
  }
}

function clearStaleHiddenValues(profile: ProfileCategory): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  const all = PROFILE_CONFIG[profile].step3;
  const visible = new Set(visibleQuestions(all, fd).map(q => q.id));
  for (const q of all) {
    if (!visible.has(q.id) && q.id in fd) delete fd[q.id];
  }
  store.set('formData', fd);
}

function rerender(profile: ProfileCategory, host: HTMLElement): void {
  host.innerHTML = '';
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  host.appendChild(
    renderQuestionGroup(
      PROFILE_CONFIG[profile].step3,
      fd,
      (id, value) => patchFormData(profile, id, value, host),
    ),
  );
}

export function renderStepConstraints(_profile: ProfileCategory): string {
  return `<div id="step3-questions"></div>`;
}

export function mountStepConstraints(profile: ProfileCategory): void {
  clearStaleHiddenValues(profile);
  const host = document.getElementById('step3-questions');
  if (!host) return;
  rerender(profile, host);
}
