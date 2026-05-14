/**
 * ═════════════════════════════════════════════════════════════════
 * UTILS INDEX - Central export for all utility functions
 * ═════════════════════════════════════════════════════════════════
 */

// Button loaders
export { startButtonLoader, stopButtonLoader, setupGlobalButtonLoaders } from './button-loaders.js';

// Sidebar helpers
export { openSb, closeSb, markActiveSidebar } from './sidebar.js';

// UI helpers
export {
  switchTab,
  togglePw,
  checkStrength,
  checkMatch,
  checkPseudo,
  generateSuggestions,
  toggleReferral,
  resendPin,
} from './ui-helpers.js';

// Form helpers
export { 
  nextStep, 
  prevStep, 
  submitRegister, 
  setupPinInputs, 
  selectPseudo 
} from './form-helpers.js';

// Error modal
export { showErrorModal, showSuccessModal, showInfoModal } from './error-modal.js';
export * from './pdf.js';
export * from './error-handler.js';
export * from './datepicker.js';
