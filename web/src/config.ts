/**
 * Application Feature Flags & Deployment Configuration
 */

// Controls whether the main Cortex AI Chat & Dashboard Demo is enabled.
// Set VITE_ENABLE_DEMO=true in .env to enable access to the live demo.
// Set VITE_ENABLE_DEMO=false in .env to disable demo buttons for public deployments.
export const isDemoEnabled: boolean = (() => {
  const envVal = import.meta.env.VITE_ENABLE_DEMO;
  if (envVal !== undefined && envVal !== '') {
    return envVal === 'true' || envVal === '1';
  }
  // Default: Enabled in local development mode, disabled in production unless VITE_ENABLE_DEMO=true
  return import.meta.env.DEV;
})();
