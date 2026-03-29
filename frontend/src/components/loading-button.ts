interface LoadingButtonOptions {
  text: string;
  loadingText?: string;
  onClick?: () => void | Promise<void>;
}

function createLoadingButton(options: LoadingButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn-primary loading-btn';
  btn.textContent = options.text;
  btn.type = 'button';

  const loadingText = options.loadingText ?? 'Loading...';

  const originalOnClick = options.onClick;
  options.onClick = async () => {
    if (btn.disabled || btn.classList.contains('loading')) return;
    
    btn.classList.add('loading');
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent || '';
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;

    try {
      if (originalOnClick) await originalOnClick();
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || options.text;
    }
  };

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (options.onClick) await options.onClick();
  });

  return btn;
}

function setButtonLoading(btn: HTMLButtonElement, loading: boolean, customLoadingText?: string): void {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent || '';
    btn.classList.add('loading');
    btn.innerHTML = `<span class="spinner"></span> ${customLoadingText ?? 'Loading...'}`;
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}

function createInlineSpinner(): HTMLSpanElement {
  const spinner = document.createElement('span');
  spinner.className = 'inline-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  return spinner;
}

export { createLoadingButton, setButtonLoading, createInlineSpinner };
