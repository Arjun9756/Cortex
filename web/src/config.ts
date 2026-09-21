/**
 * Application Feature Flags & Deployment Configuration
 */

// Controls whether the main Cortex AI Chat & Dashboard Demo is enabled.
// In production (Vercel, custom domain), this is strictly FALSE.
// It is ONLY enabled when running locally on localhost/127.0.0.1 in development.
export const isDemoEnabled: boolean = (() => {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') ||
      hostname.endsWith('.local');

    if (!isLocalhost) {
      // In production (e.g. cortex-ruby-xi.vercel.app), strictly disabled
      return false;
    }
  }

  // If in local development, check explicit environment variable or DEV mode
  const envVal = import.meta.env.VITE_ENABLE_DEMO;
  if (envVal !== undefined && envVal !== '') {
    return envVal === 'true' || envVal === '1';
  }
  return Boolean(import.meta.env.DEV);
})();
