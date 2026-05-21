/**
 * ═════════════════════════════════════════════════════════════════
 * DEVICE.JS - Device Service Layer
 * Handles all device-related API calls and submission logic
 * ═════════════════════════════════════════════════════════════════
 */

import { 
  registerMyDevice, 
  getMyDevices, 
  reportDeviceLost,
  deleteDevice
} from './api.js';
import { 
  showErrorModal, 
  showSuccessModal, 
  getFriendlyErrorMessage,
  initDatePickers
} from '../utils/index.js';

/**
 * Initialize the device list on the page
 */
export async function initDeviceList() {
  const grid = document.getElementById('devices-grid');
  if (!grid) return;

  const addBtnHtml = `
    <button onclick="openAddDeviceModal()" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-[24px] hover:border-primary hover:bg-primary/5 transition-all group min-h-[200px]">
      <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-primary group-hover:bg-white transition-all shadow-sm">
        <i class="fa-solid fa-plus text-2xl"></i>
      </div>
      <p class="mt-4 text-[14px] font-bold text-slate-600 group-hover:text-primary transition-colors">Ajouter un appareil</p>
      <p class="text-[11px] text-slate-400">Téléphone, Ordinateur, Vélo...</p>
    </button>
  `;

  // Show skeleton loader
  grid.innerHTML = Array(2).fill(0).map(() => `
    <div class="bg-white border border-slate-100 rounded-[24px] p-2 animate-pulse">
      <div class="h-44 bg-slate-100 rounded-[20px] mb-4"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-slate-100 rounded w-3/4"></div>
        <div class="h-3 bg-slate-100 rounded w-1/2"></div>
      </div>
    </div>
  `).join('') + addBtnHtml;

  const result = await getMyDevices();

  if (result.success) {
    renderDevices(result.data, result.count);
  } else {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-3"></i>
        <p class="font-bold">${result.message}</p>
        <button onclick="initDeviceList()" class="mt-4 px-6 py-2 bg-white border border-red-200 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">Réessayer</button>
      </div>
    ` + addBtnHtml;
  }
}

/**
 * Render device cards dynamically
 */
function renderDevices(devices, totalCount) {
  const grid = document.getElementById('devices-grid');
  if (!grid) return;

  const statsTotal = document.getElementById('stats-total-devices');
  if (statsTotal) statsTotal.textContent = totalCount;

  const statTotalCount = document.getElementById('stat-total-count');
  if (statTotalCount) statTotalCount.textContent = totalCount;

  const safeCount = devices.filter(d => d.status === 'SAFE').length;
  const statSafeCount = document.getElementById('stat-safe-count');
  if (statSafeCount) statSafeCount.textContent = safeCount;

  const lostCount = devices.filter(d => d.status !== 'SAFE').length;
  const statLostCount = document.getElementById('stat-lost-count');
  if (statLostCount) statLostCount.textContent = lostCount;

  // Count devices with at least one photo (as proof/invoice)
  const invoiceCount = devices.filter(d => d.photos && d.photos.length > 0).length;
  const statInvoiceCount = document.getElementById('stat-invoice-count');
  if (statInvoiceCount) statInvoiceCount.textContent = invoiceCount;

  const categoryIcons = {
    PHONE: 'fa-mobile-screen-button',
    LAPTOP: 'fa-laptop',
    TABLET: 'fa-tablet-screen-button',
    CAMERA: 'fa-camera',
    VEHICLE: 'fa-car',
    BIKE: 'fa-bicycle',
    WATCH: 'fa-stopwatch',
    OTHER: 'fa-microchip'
  };

  const addBtnHtml = `
    <button onclick="openAddDeviceModal()" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-[24px] hover:border-primary hover:bg-primary/5 transition-all group min-h-[200px]">
      <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-primary group-hover:bg-white transition-all shadow-sm">
        <i class="fa-solid fa-plus text-2xl"></i>
      </div>
      <p class="mt-4 text-[14px] font-bold text-slate-600 group-hover:text-primary transition-colors">Ajouter un appareil</p>
      <p class="text-[11px] text-slate-400">Téléphone, Ordinateur, Vélo...</p>
    </button>
  `;

  if (devices.length === 0) {
    grid.innerHTML = addBtnHtml;
    return;
  }

  grid.innerHTML = devices.map(dev => {
    const mainPhoto = (dev.photos && dev.photos.length > 0) ? dev.photos[0] : null;
    const isLost = dev.status !== 'SAFE';

    return `
      <div class="group bg-white border ${isLost ? 'border-red-100 bg-red-50/30' : 'border-slate-100'} rounded-[24px] p-2 hover:border-primary transition-all hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer overflow-hidden relative" onclick="viewDeviceDetails('${dev.id}')">
        <div class="relative h-44 bg-slate-50 rounded-[20px] overflow-hidden mb-4">
          ${mainPhoto 
            ? `<img src="/${mainPhoto}" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="${dev.model}">`
            : `<div class="w-full h-full flex items-center justify-center text-slate-200 text-5xl"><i class="fa-solid ${categoryIcons[dev.category] || 'fa-microchip'}"></i></div>`
          }
          <div class="absolute top-3 right-3">
            <span class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isLost ? 'bg-red-500 text-white' : 'bg-white/90 backdrop-blur-sm text-slate-600'} shadow-sm border border-slate-100">
              ${isLost ? dev.status : 'Sécurisé'}
            </span>
          </div>
          <div class="absolute bottom-3 left-3">
             <div class="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-600 border border-slate-100">
               <i class="fa-solid ${categoryIcons[dev.category] || 'fa-microchip'} text-sm"></i>
             </div>
          </div>
        </div>

        <div class="p-3">
          <div class="flex justify-between items-start mb-1">
            <h4 class="text-[16px] font-bold text-slate-900 truncate">${dev.brand} ${dev.model}</h4>
            <div class="flex items-center gap-1.5 text-primary">
              <i class="fa-solid fa-shield-check text-xs"></i>
            </div>
          </div>
          <p class="text-[12px] text-slate-500 mb-4 flex items-center gap-2">
            <span class="font-mono">${dev.serial_number_imei}</span>
          </p>

          <div class="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
            <div class="flex items-center gap-2">
               <div class="w-2 h-2 rounded-full ${isLost ? 'bg-red-500' : 'bg-green-500'}"></div>
               <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${isLost ? 'Alerte Active' : 'Protégé'}</span>
            </div>
            <button onclick="event.stopPropagation(); deleteDeviceById('${dev.id}')" class="text-slate-300 hover:text-red-500 transition-colors">
              <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('') + addBtnHtml;
}

/**
 * Handle form submission for new device
 */
export async function submitDeviceForm() {
  const form = document.getElementById('add-device-form');
  if (!form) return;

  const btn = document.getElementById('save-device-btn');
  const originalHtml = btn.innerHTML;
  
  try {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Enregistrement...';

    const formData = new FormData(form);
    // Debug: collect a plaintext summary of the payload (exclude large files)
    try {
      const debugPayload = {};
      for (const pair of formData.entries()) {
        const [k, v] = pair;
        if (k.startsWith('photo_')) continue;
        debugPayload[k] = v;
      }
      console.log('📤 [Device] submitDeviceForm payload:', debugPayload);
    } catch (e) {
      console.warn('Unable to build debug payload for device submission', e);
    }
    
    // Add photos from the camera/file selection logic
    // (Assuming window.capturedBlobs or similar for photos)
    if (window.capturedDevicePhotos) {
      if (window.capturedDevicePhotos.facture) formData.append('photo_facture', window.capturedDevicePhotos.facture, 'facture.jpg');
      if (window.capturedDevicePhotos.face) formData.append('photo_face', window.capturedDevicePhotos.face, 'face.jpg');
      if (window.capturedDevicePhotos.serial) formData.append('photo_serial', window.capturedDevicePhotos.serial, 'serial.jpg');
    }

    const result = await registerMyDevice(formData);
    console.log('📥 [Device] registerMyDevice response:', result);
    if (result.success) {
      closeAddDeviceModal();
      showSuccessModal('Succès', 'Votre appareil a été enregistré avec succès.');
      initDeviceList();
    } else {
      // Show server message directly to the user instead of throwing
      const quotaInfo = (typeof result.limit !== 'undefined' && typeof result.current !== 'undefined')
        ? ` (${result.current}/${result.limit})`
        : '';
      const serverMsg = `${result.message || 'Erreur lors de l\'enregistrement de l\'appareil.'}${quotaInfo}`;
      console.warn('⚠️ [Device] server responded with non-success:', serverMsg);
      showErrorModal('Erreur', serverMsg);
      // stop further processing
      return;
    }
  } catch (error) {
    console.error('❌ [Device] submitDeviceForm error:', error);
    const msg = getFriendlyErrorMessage(error);
    showErrorModal('Erreur', msg);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

/**
 * UI Helper Functions
 */
export function openAddDeviceModal() {
  const modal = document.getElementById('add-device-modal');
  if (modal) modal.classList.remove('hidden');
  initDatePickers();
}

export function closeAddDeviceModal() {
  const modal = document.getElementById('add-device-modal');
  if (modal) modal.classList.add('hidden');
  const form = document.getElementById('add-device-form');
  if (form) form.reset();
  // Clear any photo previews/blobs
  window.capturedDevicePhotos = { facture: null, face: null, serial: null };
}

async function deleteDeviceById(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet appareil ?')) return;
  
  const result = await deleteDevice(id);
  if (result.success) {
    initDeviceList();
  } else {
    showErrorModal('Erreur', result.message);
  }
}

// Global exposure
window.openAddDeviceModal = openAddDeviceModal;
window.closeAddDeviceModal = closeAddDeviceModal;
window.submitDeviceForm = submitDeviceForm;
window.deleteDeviceById = deleteDeviceById;
window.initDeviceList = initDeviceList;

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('devices-grid')) {
    initDeviceList();
  }
});
