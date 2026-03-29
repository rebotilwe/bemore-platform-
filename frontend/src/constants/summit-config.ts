/**
 * Summit-specific configuration.
 * Update MENTIMETER_URL when the actual Mentimeter link is provided.
 * Redeploy takes ~30s on Vercel after changing this value.
 */
export const SUMMIT_CONFIG = {
  /** The Mentimeter embed URL. Set to empty string to show placeholder. */
  MENTIMETER_URL: '',
  /** Whether the Mentee Meter feature is active */
  MENTIMETER_ENABLED: true,
  /** Base URL for QR codes */
  QR_BASE_URL: 'https://bemore-tawny.vercel.app/?src=qr#/landing',
};
