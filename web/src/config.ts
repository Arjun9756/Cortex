/**
 * Application Feature Flags & Deployment Configuration
 */

// Controls whether the main Cortex AI Chat & Executive Dashboard is enabled.
// In production builds, interactive demo mode is disabled on the public landing page unless explicitly enabled via VITE_ENABLE_DEMO='true'.
export const isDemoEnabled: boolean = (() => {
  if (import.meta.env.VITE_DISABLE_DEMO === 'true' || import.meta.env.VITE_DISABLE_DASHBOARD === 'true') {
    return false;
  }
  if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_DEMO !== 'true') {
    return false;
  }
  return true;
})();

