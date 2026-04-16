import { store } from '../store.ts';

const API_URL = '/api/track';
const HEARTBEAT_INTERVAL = 15_000; // 15 seconds

let visitorId = '';
let sessionId = '';
let currentPath = '';
let pageEnteredAt = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let utmSource = '';
let utmMedium = '';
let utmCampaign = '';

function getOrCreateId(storageKey: string, storage: Storage): string {
  let id = storage.getItem(storageKey);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(storageKey, id);
  }
  return id;
}

function send(endpoint: string, data: Record<string, unknown>): void {
  if (!store.get('useApi')) return;
  const body = JSON.stringify(data);
  // Use sendBeacon if available (works on page unload), fall back to fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${API_URL}/${endpoint}`, new Blob([body], { type: 'application/json' }));
  } else {
    fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

function sendDuration(): void {
  if (!currentPath || !pageEnteredAt) return;
  const duration = Math.round((Date.now() - pageEnteredAt) / 1000);
  if (duration < 1) return;
  send('heartbeat', { sessionId, path: currentPath, duration });
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatTimer = setInterval(sendDuration, HEARTBEAT_INTERVAL);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function captureUTM(): void {
  const params = new URLSearchParams(window.location.search);
  utmSource = params.get('utm_source') || params.get('src') || sessionStorage.getItem('bm_source') || '';
  utmMedium = params.get('utm_medium') || '';
  utmCampaign = params.get('utm_campaign') || '';
}

export const tracker = {
  init(): void {
    visitorId = getOrCreateId('bm_vid', localStorage);
    sessionId = getOrCreateId('bm_sid', sessionStorage);
    captureUTM();

    // Send final duration on page hide/unload
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendDuration();
    });

    // Delegated click listener for [data-track] elements
    document.addEventListener('click', (e: Event) => {
      const el = (e.target as HTMLElement).closest?.('[data-track]');
      if (!el) return;
      const label = el.getAttribute('data-track') || '';
      tracker.trackEvent('click', 'cta_click', label);
    });
  },

  trackPageView(path: string): void {
    // Send duration for previous page before tracking new one
    if (currentPath && currentPath !== path) {
      sendDuration();
    }

    currentPath = path;
    pageEnteredAt = Date.now();

    send('pageview', {
      sessionId,
      visitorId,
      path,
      referrer: document.referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    });

    startHeartbeat();
  },

  trackEvent(
    category: 'click' | 'form_funnel' | 'interaction' | 'scroll' | 'download',
    action: string,
    label: string = '',
    value: number = 0,
    meta: Record<string, unknown> = {},
  ): void {
    send('event', {
      sessionId,
      visitorId,
      category,
      action,
      label,
      value,
      path: currentPath,
      meta,
    });
  },
};
