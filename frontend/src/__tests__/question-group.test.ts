import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderQuestionGroup } from '../components/question-group.ts';
import type { Question } from '../types/question.ts';

function mount(host: HTMLElement): void {
  document.body.appendChild(host);
}

describe('renderQuestionGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders text input with label, accessibility attrs, and emits onChange on input', () => {
    const onChange = vi.fn();
    const q: Question = {
      id: 'firstName',
      type: 'text',
      label: 'First name',
      required: true,
      placeholder: 'e.g. Thabo',
    };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const input = host.querySelector<HTMLInputElement>('input[type="text"]')!;
    const label = host.querySelector<HTMLLabelElement>('label')!;

    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(label.htmlFor).toBe(input.id);
    expect(input.placeholder).toBe('e.g. Thabo');

    input.value = 'Thabo';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('firstName', 'Thabo');
  });

  it('renders email input with email autocomplete + inputmode', () => {
    const q: Question = { id: 'email', type: 'email', label: 'Email', required: true };
    const host = renderQuestionGroup([q], {}, vi.fn());
    const input = host.querySelector<HTMLInputElement>('input[type="email"]')!;
    expect(input.getAttribute('autocomplete')).toBe('email');
    expect(input.getAttribute('inputmode')).toBe('email');
  });

  it('renders phone input with tel type + inputmode', () => {
    const q: Question = { id: 'phone', type: 'phone', label: 'Phone', required: true };
    const host = renderQuestionGroup([q], {}, vi.fn());
    const input = host.querySelector<HTMLInputElement>('input[type="tel"]')!;
    expect(input.getAttribute('inputmode')).toBe('tel');
  });

  it('renders textarea and emits onChange on input', () => {
    const onChange = vi.fn();
    const q: Question = { id: 'feedback', type: 'textarea', label: 'Feedback', required: false };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const ta = host.querySelector<HTMLTextAreaElement>('textarea')!;
    expect(ta).toBeTruthy();

    ta.value = 'I have feedback';
    ta.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledWith('feedback', 'I have feedback');
  });

  it('renders radio group with role="radiogroup" and toggles selection on click', () => {
    const onChange = vi.fn();
    const q: Question = {
      id: 'activityLevel',
      type: 'radio',
      label: 'How actively?',
      required: true,
      options: ['Actively looking', 'Open to the right opportunity', 'Not actively looking'],
    };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const group = host.querySelector('[role="radiogroup"]')!;
    expect(group).toBeTruthy();
    expect(group.getAttribute('aria-required')).toBe('true');

    const radios = host.querySelectorAll<HTMLElement>('[role="radio"]');
    expect(radios.length).toBe(3);

    (radios[0] as HTMLElement).click();
    expect(onChange).toHaveBeenCalledWith('activityLevel', 'Actively looking');
    expect(radios[0].classList.contains('sel')).toBe(true);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[1].getAttribute('aria-checked')).toBe('false');

    (radios[2] as HTMLElement).click();
    expect(onChange).toHaveBeenLastCalledWith('activityLevel', 'Not actively looking');
    expect(radios[0].classList.contains('sel')).toBe(false);
    expect(radios[2].classList.contains('sel')).toBe(true);
  });

  it('renders checkbox group and emits the selected option list', () => {
    const onChange = vi.fn();
    const q: Question = {
      id: 'developmentTypes',
      type: 'checkbox',
      label: 'Development type(s)',
      required: true,
      options: ['Residential', 'Commercial', 'Student Accommodation', 'Mixed-Use'],
    };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const checks = host.querySelectorAll<HTMLElement>('[role="checkbox"]');
    expect(checks.length).toBe(4);

    checks[0].click();
    expect(onChange).toHaveBeenLastCalledWith('developmentTypes', ['Residential']);
    checks[2].click();
    expect(onChange).toHaveBeenLastCalledWith('developmentTypes', ['Residential', 'Student Accommodation']);
    checks[0].click(); // unselect
    expect(onChange).toHaveBeenLastCalledWith('developmentTypes', ['Student Accommodation']);
  });

  it('renders dropdown with provided options and emits on change', () => {
    const onChange = vi.fn();
    const q: Question = {
      id: 'projectValue',
      type: 'dropdown',
      label: 'Project value',
      required: true,
      options: ['<R5M', 'R5M–R20M', 'R20M–R100M', 'R100M+'],
    };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const sel = host.querySelector<HTMLSelectElement>('select')!;
    // first option is the empty placeholder, so 4 + 1
    expect(sel.options.length).toBe(5);
    sel.value = 'R20M–R100M';
    sel.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith('projectValue', 'R20M–R100M');
  });

  it('renders file input and emits the File object on change (size-OK case)', () => {
    const onChange = vi.fn();
    const q: Question = {
      id: 'cv',
      type: 'file',
      label: 'CV upload',
      required: false,
      accept: 'application/pdf',
      maxSizeBytes: 5 * 1024 * 1024,
    };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.getAttribute('accept')).toBe('application/pdf');

    const file = new File([new Uint8Array(1024)], 'cv.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('cv', file);
  });

  it('rejects oversized file uploads client-side and shows error', () => {
    const onChange = vi.fn();
    const q: Question = {
      id: 'cv',
      type: 'file',
      label: 'CV upload',
      required: false,
      accept: 'application/pdf',
      maxSizeBytes: 1024, // 1 KB cap to make the test small
    };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    const big = new File([new Uint8Array(2048)], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [big], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(onChange).not.toHaveBeenCalled();
    const err = host.querySelector<HTMLElement>('.qg-err')!;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toMatch(/too large/i);
  });

  it('respects showIf — hidden questions do not render', () => {
    const q1: Question = {
      id: 'activityLevel',
      type: 'radio',
      label: 'How actively?',
      required: true,
      options: ['Actively looking', 'Not actively looking'],
    };
    const q2: Question = {
      id: 'notActiveReason',
      type: 'textarea',
      label: 'Why not?',
      required: true,
      showIf: (fd) => fd.activityLevel === 'Not actively looking',
    };

    // hidden case
    const host1 = renderQuestionGroup([q1, q2], { activityLevel: 'Actively looking' }, vi.fn());
    expect(host1.querySelector('[data-qg-field="notActiveReason"]')).toBeNull();
    expect(host1.querySelector('[data-qg-field="activityLevel"]')).toBeTruthy();

    // visible case
    const host2 = renderQuestionGroup([q1, q2], { activityLevel: 'Not actively looking' }, vi.fn());
    expect(host2.querySelector('[data-qg-field="notActiveReason"]')).toBeTruthy();
  });

  it('runs `validate` on input and surfaces error message', () => {
    const onChange = vi.fn();
    const q: Question = {
      id: 'email',
      type: 'email',
      label: 'Email',
      required: true,
      validate: (v) => (typeof v === 'string' && v.includes('@') ? null : 'Invalid email'),
    };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const input = host.querySelector<HTMLInputElement>('input[type="email"]')!;
    const err = host.querySelector<HTMLElement>('.qg-err')!;

    input.value = 'not-an-email';
    input.dispatchEvent(new Event('input'));
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('Invalid email');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    input.value = 'a@b.co';
    input.dispatchEvent(new Event('input'));
    expect(err.hidden).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('default validator flags required-empty fields', () => {
    const onChange = vi.fn();
    const q: Question = { id: 'firstName', type: 'text', label: 'First name', required: true };
    const host = renderQuestionGroup([q], {}, onChange);
    mount(host);

    const input = host.querySelector<HTMLInputElement>('input')!;
    input.value = '';
    input.dispatchEvent(new Event('input'));

    const err = host.querySelector<HTMLElement>('.qg-err')!;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toMatch(/required/i);
  });

  it('pre-populates inputs from formData when present', () => {
    const fd = {
      firstName: 'Thabo',
      developmentTypes: ['Residential', 'Mixed-Use'],
      projectValue: 'R20M–R100M',
      activityLevel: 'Actively looking',
    };
    const questions: Question[] = [
      { id: 'firstName', type: 'text', label: 'First name', required: true },
      {
        id: 'developmentTypes',
        type: 'checkbox',
        label: 'Types',
        required: true,
        options: ['Residential', 'Commercial', 'Mixed-Use'],
      },
      {
        id: 'projectValue',
        type: 'dropdown',
        label: 'Value',
        required: true,
        options: ['<R5M', 'R5M–R20M', 'R20M–R100M', 'R100M+'],
      },
      {
        id: 'activityLevel',
        type: 'radio',
        label: 'How actively?',
        required: true,
        options: ['Actively looking', 'Not actively looking'],
      },
    ];

    const host = renderQuestionGroup(questions, fd, vi.fn());
    mount(host);

    expect(host.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe('Thabo');
    const sel = host.querySelector<HTMLSelectElement>('select')!;
    expect(sel.value).toBe('R20M–R100M');

    const checks = host.querySelectorAll<HTMLElement>('[role="checkbox"]');
    expect(checks[0].classList.contains('sel')).toBe(true);  // Residential
    expect(checks[1].classList.contains('sel')).toBe(false); // Commercial
    expect(checks[2].classList.contains('sel')).toBe(true);  // Mixed-Use

    const radios = host.querySelectorAll<HTMLElement>('[role="radio"]');
    expect(radios[0].classList.contains('sel')).toBe(true);
  });
});
