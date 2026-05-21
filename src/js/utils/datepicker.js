import flatpickrModule from "flatpickr";
import { French as FrenchModule } from "flatpickr/dist/l10n/fr.js";

// Use global flatpickr if available (from CDN), otherwise use imported module
const flatpickr = window.flatpickr || flatpickrModule;
const French = window.flatpickr?.l10ns?.fr || FrenchModule;

// Import CSS via JS if your bundler supports it, otherwise include it in HTML
// import "flatpickr/dist/flatpickr.min.css";

/**
 * Initialize flatpickr on all date inputs
 * @param {string} selector - CSS selector for inputs
 */
export function initDatePickers(selector = 'input[type="date"], .datepicker, #custom-date') {
  const inputs = document.querySelectorAll(selector);
  
  inputs.forEach(input => {
    // Avoid double initialization
    if (input._flatpickr) return;

    if (input.type === 'date') {
      input.type = 'text';
    }

    input.classList.add('datepicker');

    const options = {
      locale: French,
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "j F Y",
      allowInput: true,
      animate: true
    };

    // Special case for search page: trigger filter on change
    if (input.id === 'custom-date' && typeof window.filterDocuments === 'function') {
      options.onChange = () => window.filterDocuments();
    }
    
    flatpickr(input, options);
  });
}

/**
 * Initialize flatpickr on a specific element
 * @param {HTMLElement|string} el 
 * @param {object} options 
 */
export function initSingleDatePicker(el, options = {}) {
  const target = typeof el === 'string' ? document.querySelector(el) : el;
  if (!target) return;

  target.type = 'text';
  target.classList.add('datepicker');

  return flatpickr(target, {
    locale: French,
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "j F Y",
    allowInput: true,
    animate: true,
    ...options
  });
}
