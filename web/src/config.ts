/**
 * Application Feature Flags & Deployment Configuration
 */

// Controls whether the main Cortex AI Chat & Executive Dashboard is enabled.
// Allows dashboard to run seamlessly on localhost, internal enterprise IPs, private VPCs, and custom domains.
export const isDemoEnabled: boolean = (() => {
  if (import.meta.env.VITE_DISABLE_DEMO === 'true' || import.meta.env.VITE_DISABLE_DASHBOARD === 'true') {
    return false;
  }
  // Enabled unconditionally across all production domains, VPC internal IPs, and localhost
  return true;
})();

