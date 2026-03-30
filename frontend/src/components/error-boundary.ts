class ErrorBoundary {
  private container: HTMLElement | null = null;
  private onError: ((error: Error, errorInfo: string) => void) | null = null;

  constructor(containerId: string = 'app', onError?: (error: Error, errorInfo: string) => void) {
    this.container = document.getElementById(containerId);
    this.onError = onError ?? null;
    this.init();
  }

  private init(): void {
    window.addEventListener('error', (event) => this.handleError(event.error || new Error(event.message)));
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.handleError(error);
    });
  }

  private handleError(error: Error): void {
    console.error('Application error:', error);
    if (this.onError) {
      this.onError(error, error.stack || '');
    }
    this.showErrorUI(error);
  }

  private showErrorUI(_error: Error): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="error-boundary">
        <div class="error-boundary-content">
          <div class="error-icon">⚠</div>
          <h1>Something went wrong</h1>
          <p class="error-message">We're sorry, but something unexpected happened. Please try again.</p>
          <button class="btn-primary" id="error-retry">Try Again</button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .error-boundary {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ink, #0a0a0f);
        color: var(--ink-light, #f5f5f5);
        font-family: 'DM Sans', sans-serif;
        padding: 2rem;
      }
      .error-boundary-content {
        text-align: center;
        max-width: 400px;
      }
      .error-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
      }
      .error-boundary h1 {
        font-family: 'Cormorant Garamond', serif;
        font-size: 2rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: var(--gold, #c9a84c);
      }
      .error-message {
        color: var(--steel, #a0a0a0);
        margin-bottom: 1.5rem;
        line-height: 1.6;
      }
      .error-boundary .btn-primary {
        background: var(--gold, #c9a84c);
        color: var(--ink, #0a0a0f);
        border: none;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        border-radius: 4px;
        transition: opacity 0.2s;
      }
      .error-boundary .btn-primary:hover {
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);

    document.getElementById('error-retry')?.addEventListener('click', () => {
      style.remove();
      window.location.reload();
    });
  }
}

export { ErrorBoundary };
