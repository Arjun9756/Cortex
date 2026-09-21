/**
 * Application Feature Flags & Deployment Configuration
 */

// Controls whether the main Cortex AI Chat & Dashboard Demo is enabled.
// Rule:
// - LOCAL (localhost / 127.0.0.1 / dev): ALWAYS visible (true)
// - PRODUCTION (Vercel, public domains, etc.): ALWAYS hidden (false)
export const isDemoEnabled: boolean = (() => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') ||
      hostname.endsWith('.local');

    if (isLocalhost) {
      // Local machine: ALWAYS enable demo
      return true;
    }

    // Production (Vercel, custom domains): STRICTLY disable demo
    return false;
  }

  // Fallback during Vite build / SSR: only true in DEV
  return Boolean(import.meta.env.DEV);
})();
