/* ---------------------------------------------------------------
   Step 2 — Position + Activity (spec §5)
   Pure profile-config driven via the shared <question-group>.
   ---------------------------------------------------------------*/

import type { ProfileCategory } from '../../../types/index.ts';
import { store } from '../../../store.ts';
import { renderQuestionGroup } from '../../../components/question-group.ts';
import { PROFILE_CONFIG, visibleQuestions } from '../../../utils/step-readiness.ts';

function patchFormData(id: string, value: unknown): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  fd[id] = value;
  store.set('formData', fd);
}

/** Drop hidden-by-showIf values from formData (per spec §6.5 row 2). */
function clearStaleHiddenValues(profile: ProfileCategory): void {
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  const all = PROFILE_CONFIG[profile].step2;
  const visible = new Set(visibleQuestions(all, fd).map(q => q.id));
  for (const q of all) {
    if (!visible.has(q.id) && q.id in fd) delete fd[q.id];
  }
  store.set('formData', fd);
}

export function renderStepPosition(_profile: ProfileCategory): string {
  return `<div id="step2-questions"></div>`;
}

export function mountStepPosition(profile: ProfileCategory): void {
  clearStaleHiddenValues(profile);
  const host = document.getElementById('step2-questions');
  if (!host) return;
  const fd = (store.get('formData') ?? {}) as Record<string, unknown>;
  host.appendChild(
    renderQuestionGroup(PROFILE_CONFIG[profile].step2, fd, patchFormData),
  );
}
