import type { Page } from '../../types/index.ts';
import { mountAdminLayout } from './layout.ts';
import { toast } from '../../components/toast.ts';

const QR_BASE_URL = 'https://bemore-tawny.vercel.app/?src=qr#/landing';
const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

function buildQrUrl(data: string, size = 400): string {
  return `${QR_API}?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=0a0a0f&color=c9a84c&format=png`;
}

export const qrGeneratorPage: Page = {
  render() {
    const qrImgUrl = buildQrUrl(QR_BASE_URL, 400);

    return `
    <div class="qr-page">
      <div class="qr-header">
        <h2 class="admin-main-title">QR Code Generator</h2>
        <p class="qr-header-sub">Generate scannable QR codes for summit materials, print collateral, and event signage.</p>
      </div>

      <div class="qr-content">
        <div class="qr-preview-card">
          <div class="qr-brand-header">
            <img src="/be-more-group-logo.png" alt="BeMore Group" class="qr-brand-logo" />
            <span class="qr-brand-sub">SME Access Initiative</span>
          </div>
          <div class="qr-img-wrap">
            <img id="qr-img" src="${qrImgUrl}" alt="BeMore QR Code" width="300" height="300" />
          </div>
          <div class="qr-scan-label">Scan to Access the Platform</div>
          <div class="qr-url mono" id="qr-url">${QR_BASE_URL}</div>
        </div>

        <div class="qr-actions">
          <div class="qr-input-group">
            <label class="qr-label" for="qr-custom-url">QR Destination URL</label>
            <input id="qr-custom-url" class="qr-input" type="url" value="${QR_BASE_URL}" />
            <button class="btn-primary" id="qr-update-btn">Update QR</button>
          </div>

          <div class="qr-input-group">
            <label class="qr-label" for="qr-source">Source Tag (for analytics)</label>
            <select id="qr-source" class="qr-input">
              <option value="qr">qr (default)</option>
              <option value="qr-brochure">qr-brochure</option>
              <option value="qr-banner">qr-banner</option>
              <option value="qr-badge">qr-badge</option>
              <option value="qr-flyer">qr-flyer</option>
            </select>
          </div>

          <div class="qr-btn-row">
            <button class="btn-primary" id="qr-download-btn">Download PNG</button>
            <button class="btn-ghost" id="qr-copy-btn">Copy URL</button>
          </div>

          <div class="qr-info">
            <h4>Source Tracking</h4>
            <p>Each QR code includes a <code>?src=</code> parameter that automatically tracks how users arrive at the platform. Use different source tags for different print materials to measure effectiveness.</p>
          </div>
        </div>
      </div>
    </div>`;
  },

  mount() {
    mountAdminLayout();

    const img = document.getElementById('qr-img') as HTMLImageElement;
    const urlInput = document.getElementById('qr-custom-url') as HTMLInputElement;
    const sourceSelect = document.getElementById('qr-source') as HTMLSelectElement;
    const urlDisplay = document.getElementById('qr-url') as HTMLElement;

    function getCurrentUrl(): string {
      const base = urlInput.value.split('?')[0];
      const src = sourceSelect.value;
      return `${base}?src=${src}`;
    }

    document.getElementById('qr-update-btn')?.addEventListener('click', () => {
      const url = getCurrentUrl();
      img.src = buildQrUrl(url, 400);
      urlDisplay.textContent = url;
      toast('QR code updated');
    });

    sourceSelect?.addEventListener('change', () => {
      const url = getCurrentUrl();
      img.src = buildQrUrl(url, 400);
      urlDisplay.textContent = url;
    });

    document.getElementById('qr-download-btn')?.addEventListener('click', async () => {
      const url = getCurrentUrl();
      const highRes = buildQrUrl(url, 1000);
      try {
        const resp = await fetch(highRes);
        const blob = await resp.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `bemore-qr-${sourceSelect.value}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('QR code downloaded');
      } catch {
        window.open(highRes, '_blank');
      }
    });

    document.getElementById('qr-copy-btn')?.addEventListener('click', () => {
      const url = getCurrentUrl();
      navigator.clipboard.writeText(url).then(() => toast('URL copied!')).catch(() => {});
    });
  },
};
