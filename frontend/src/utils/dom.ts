/** Query a single element */
export function $(selector: string, parent: ParentNode = document): HTMLElement | null {
  return parent.querySelector(selector);
}

/** Query all matching elements */
export function $$(selector: string, parent: ParentNode = document): HTMLElement[] {
  return [...parent.querySelectorAll<HTMLElement>(selector)];
}

/** Get element by ID (throws if not found) */
export function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

/** Get typed input value */
export function inputVal(id: string): string {
  return (document.getElementById(id) as HTMLInputElement)?.value?.trim() ?? '';
}

/** Set innerHTML safely */
export function setHtml(id: string, html: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/** Add/remove error class */
export function setError(id: string, hasError: boolean): void {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('err', hasError);
}
