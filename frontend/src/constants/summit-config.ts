/**
 * Summit-specific configuration.
 * Defaults are used until backend settings are fetched.
 * Admin can override via Settings page → values stored in SiteSettings collection.
 * Toggle `ACTIVE` to false after the event to hide summit-specific content.
 */
export const SUMMIT_CONFIG = {
  /** Whether summit-specific content is shown across the site */
  ACTIVE: true,
  /** Summit date display string */
  DATE: '30 – 31 March 2026',
  /** Short date for compact spaces */
  DATE_SHORT: 'Mar 30–31',
  /** Venue name */
  VENUE: 'Sandton Convention Centre',
  /** Venue location */
  LOCATION: 'Sandton, Gauteng',
  /** Full venue line */
  VENUE_FULL: 'Sandton Convention Centre, Sandton',
  /** Base URL for QR codes */
  QR_BASE_URL: 'https://bemore-tawny.vercel.app/?src=qr#/landing',
  /** Whether config has been loaded from backend */
  _loaded: false,
};

/**
 * Fetch summit settings from backend and merge into SUMMIT_CONFIG.
 * Called once on app init. Falls back to hardcoded defaults on error.
 */
export async function loadSummitConfig(): Promise<void> {
  if (SUMMIT_CONFIG._loaded) return;
  try {
    const API_URL = '/api';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_URL}/settings/public/summit_config`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data?.value && typeof json.data.value === 'object') {
      const v = json.data.value;
      if (v.active !== undefined) SUMMIT_CONFIG.ACTIVE = v.active === true || v.active === 'true';
      if (v.date) SUMMIT_CONFIG.DATE = v.date;
      if (v.date_short) SUMMIT_CONFIG.DATE_SHORT = v.date_short;
      if (v.venue) SUMMIT_CONFIG.VENUE = v.venue;
      if (v.location) SUMMIT_CONFIG.LOCATION = v.location;
      if (v.venue_full) SUMMIT_CONFIG.VENUE_FULL = v.venue_full;
    }
  } catch {
    // Use defaults — backend unreachable
  } finally {
    SUMMIT_CONFIG._loaded = true;
  }
}
