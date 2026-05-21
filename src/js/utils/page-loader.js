// page-loader.js - Centralized Page loader utilities

import { initDatePickers } from './datepicker.js';
// Expose minimal API helpers to pages that use inline scripts
import * as api from '../services/api.js';

/**
 * Ensures the loader element exists, creates it if not.
 * We use 'dm-global-page-loader' ID to avoid collisions.
 */
function getLoader() {
    let loader = document.getElementById('dm-global-page-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'dm-global-page-loader';
        loader.className = 'fixed inset-0 z-[1000] flex items-center justify-center bg-[#F4EFE6]/90 backdrop-blur-md transition-opacity duration-300 opacity-0 pointer-events-none';
        loader.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <div class="relative w-16 h-16">
                    <div class="absolute inset-0 border-4 border-[#F5A64B]/20 rounded-full"></div>
                    <div class="absolute inset-0 border-4 border-[#F5A64B] rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p class="font-bricolage text-[#F5A64B] font-bold animate-pulse">Chargement...</p>
            </div>
        `;
        document.body.appendChild(loader);

        // Add keyframe style
        if (!document.querySelector('style[data-dm-loader-style]')) {
            const style = document.createElement('style');
            style.setAttribute('data-dm-loader-style', 'true');
            style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    }
    return loader;
}

export function showPageLoader() {
    const loader = getLoader();
    loader.classList.remove('opacity-0', 'pointer-events-none');
    loader.classList.add('opacity-100');
}

export function hidePageLoader() {
    const loader = document.getElementById('dm-global-page-loader');
    if (loader) {
        loader.classList.add('opacity-0', 'pointer-events-none');
        loader.classList.remove('opacity-100');
    }
}

export function togglePageLoader(show = true) {
    if (show) showPageLoader();
    else hidePageLoader();
}

document.addEventListener('DOMContentLoaded', () => {
    initDatePickers();
});

// Global window access
window.toggleLoader = togglePageLoader;
window.showPageLoader = showPageLoader;
window.hidePageLoader = hidePageLoader;

// Expose selected API functions for legacy inline pages
window.registerMyDevice = api.registerMyDevice;
window.getMyDevices = api.getMyDevices;
window.reportDeviceLost = api.reportDeviceLost;
window.deleteDevice = api.deleteDevice;
window.verifyDevice = api.verifyDevice;
