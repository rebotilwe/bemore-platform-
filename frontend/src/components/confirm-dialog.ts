interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

let currentDialog: HTMLDivElement | null = null;

function showConfirmDialog(options: ConfirmDialogOptions): void {
  if (currentDialog) {
    currentDialog.remove();
  }

  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  const confirmText = options.confirmText ?? 'Confirm';
  const cancelText = options.cancelText ?? 'Cancel';
  const variant = options.confirmVariant ?? 'danger';

  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');
  dialog.setAttribute('aria-describedby', 'confirm-dialog-message');
  dialog.innerHTML = `
    <div class="confirm-dialog-content">
      <h2 id="confirm-dialog-title" class="confirm-dialog-title">${options.title}</h2>
      <p id="confirm-dialog-message" class="confirm-dialog-message">${options.message}</p>
      <div class="confirm-dialog-actions">
        <button class="btn-ghost confirm-cancel" id="confirm-cancel">${cancelText}</button>
        <button class="btn-${variant} confirm-ok" id="confirm-ok">${confirmText}</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .confirm-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--ink-dark, #141419);
      border: 1px solid var(--steel-dark, #2a2a35);
      border-radius: 12px;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      z-index: 1001;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .confirm-dialog-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--gold, #c9a84c);
      margin-bottom: 0.5rem;
    }
    .confirm-dialog-message {
      color: var(--steel-light, #c0c0c0);
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }
    .confirm-dialog-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }
    .confirm-dialog-actions .btn-danger {
      background: #dc3545;
      color: white;
      border: none;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
      transition: opacity 0.2s;
    }
    .confirm-dialog-actions .btn-danger:hover {
      opacity: 0.9;
    }
    .confirm-dialog-actions .btn-warning {
      background: #ffc107;
      color: #1a1a1a;
      border: none;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
      transition: opacity 0.2s;
    }
    .confirm-dialog-actions .btn-warning:hover {
      opacity: 0.9;
    }
  `;

  currentDialog = dialog;
  document.head.appendChild(style);
  overlay.appendChild(dialog);
  overlay.classList.add('active');

  document.getElementById('confirm-cancel')?.addEventListener('click', () => {
    closeConfirmDialog();
    options.onCancel?.();
  });

  document.getElementById('confirm-ok')?.addEventListener('click', async () => {
    const okBtn = document.getElementById('confirm-ok') as HTMLButtonElement;
    okBtn.disabled = true;
    okBtn.textContent = 'Processing...';
    
    try {
      await options.onConfirm();
    } finally {
      closeConfirmDialog();
    }
  });

  const handleOverlayClick = (e: Event) => {
    if (e.target === overlay) {
      closeConfirmDialog();
      options.onCancel?.();
    }
  };

  overlay.addEventListener('click', handleOverlayClick, { once: true });
}

function closeConfirmDialog(): void {
  if (currentDialog) {
    const style = currentDialog.previousElementSibling;
    if (style && style.tagName === 'STYLE') {
      style.remove();
    }
    currentDialog.remove();
    currentDialog = null;
  }

  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function showBulkStatusConfirm(count: number, onConfirm: () => void): void {
  showConfirmDialog({
    title: 'Change Status',
    message: `Are you sure you want to change the status of ${count} application${count > 1 ? 's' : ''}?`,
    confirmText: 'Yes, Update',
    cancelText: 'Cancel',
    confirmVariant: 'primary',
    onConfirm,
  });
}

export { showConfirmDialog, closeConfirmDialog, showBulkStatusConfirm };
