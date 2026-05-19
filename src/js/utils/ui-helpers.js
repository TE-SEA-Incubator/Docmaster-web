/**
 * ═════════════════════════════════════════════════════════════════
 * UI HELPERS - Authentication form UI helpers
 * ═════════════════════════════════════════════════════════════════
 */

import { apiSendVerificationPin } from '../services/api.js';

/**
 * Switch between login and register tabs
 */
export function switchTab(tab, prefix = '') {
  const isLogin = tab === 'login';
  
  // Forms
  const forms = [
    document.getElementById(prefix + 'form-login'),
    document.getElementById(prefix + 'form-register')
  ];
  
  forms.forEach(f => { if(f) f.classList.remove('visible'); });
  const activeForm = document.getElementById(prefix + 'form-' + tab);
  if (activeForm) activeForm.classList.add('visible');

  // Tabs
  const loginBtn = document.getElementById(prefix + 'tab-login');
  const registerBtn = document.getElementById(prefix + 'tab-register');
  
  if (loginBtn) {
    loginBtn.classList.toggle('text-white', isLogin);
    loginBtn.classList.toggle('text-textMuted', !isLogin);
    const icon = loginBtn.querySelector('i');
    if (icon) icon.classList.toggle('text-primary', !isLogin);
  }
  if (registerBtn) {
    registerBtn.classList.toggle('text-white', !isLogin);
    registerBtn.classList.toggle('text-textMuted', isLogin);
    const icon = registerBtn.querySelector('i');
    if (icon) icon.classList.toggle('text-primary', isLogin);
  }

  // Slider
  const slider = document.getElementById(prefix + 'toggle-slider');
  if (slider) {
    slider.style.left = isLogin ? '1.5px' : 'calc(50% + 1.5px)';
  }
}

/**
 * Toggle password visibility
 */
export function togglePw(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  button.innerHTML = `<i class="fa-regular fa-${isPassword ? 'eye-slash' : 'eye'}"></i>`;
}

/**
 * Check password strength
 */
export function checkStrength(input, prefix) {
  const value = input.value;
  const strengthBar = document.querySelector(`#${prefix}-pw-bar`);
  if (!strengthBar) return;

  let strength = 'weak';
  if (value.length >= 12 && /[A-Z]/.test(value) && /[0-9]/.test(value)) {
    strength = 'strong';
  } else if (value.length >= 8) {
    strength = 'medium';
  }

  strengthBar.className = `pw-bar ${strength}`;
}

/**
 * Check if passwords match
 */
export function checkMatch(prefix) {
  const pw1 = document.getElementById(`${prefix}-pw1`)?.value || '';
  const pw2 = document.getElementById(`${prefix}-pw2`)?.value || '';
  const okMsg = document.getElementById(`${prefix}-pw-ok`);

  if (okMsg) {
    okMsg.classList.toggle('hidden', pw1 !== pw2 || !pw1);
  }
}

/**
 * Check pseudo availability
 */
export function checkPseudo(input, prefix) {
  const value = input.value.toLowerCase();
  const suggestionsDiv = document.getElementById(`${prefix}-suggestions`);
  
  if (!suggestionsDiv || value.length < 3) return;

  // Mock pseudo suggestions
  const suggestions = [
    `${value}_42`,
    `${value}_pro`,
    `${value}_official`,
    `${value}_2024`,
  ];

  suggestionsDiv.innerHTML = suggestions
    .map(s => `<button type="button" class="pseudo-chip" onclick="selectPseudo('${prefix}', '${s}', this)">${s}</button>`)
    .join('');
}

/**
 * Generate suggestions based on name
 */
export function generateSuggestions(prefix, nom, prenom) {
  const container = document.getElementById(prefix + '-suggestions');
  if (!container) return;
  const suggs = [
    `${prenom}_${nom}`,
    `${prenom}.${nom}`,
    `${prenom}${Math.floor(Math.random() * 90 + 10)}`,
    `${nom}_${prenom.charAt(0)}`,
    `${prenom}_dm`,
  ];
  container.innerHTML = suggs.map(s =>
    `<button type="button" class="pseudo-chip" onclick="selectPseudo('${prefix}','${s}',this)">${s}</button>`
  ).join('');
}



/**
 * Toggle referral field
 */
export function toggleReferral(prefix) {
  const field = document.getElementById(`${prefix}-referral-field`);
  const chevron = document.getElementById(`${prefix}-referral-chevron`);
  
  if (field) field.classList.toggle('hidden');
  if (chevron) chevron.style.transform = field?.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

/**
 * Resend PIN code
 */
export async function resendPin(event) {
  event?.preventDefault();
  const prefix = event?.target?.dataset?.prefix || 'm';
  const emailInput = document.getElementById(`${prefix}-email`);
  const phoneInput = document.getElementById(`${prefix}-phone`);
  const email = emailInput?.value.trim();
  const telephone = phoneInput?.value.trim();
  
  if (!email) {
    showAlert('Veuillez d\'abord entrer votre adresse email.', 'error');
    return;
  }

  const btn = event?.target;
  if (btn && btn.tagName === 'BUTTON') {
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Envoi...';
    
    const result = await apiSendVerificationPin(email, telephone);
    
    btn.disabled = false;
    btn.innerText = originalText;
    
    if (result.success) {
      showAlert('Un nouveau code a été envoyé.', 'success');
    } else {
      showAlert(result.message, 'error');
    }
  } else {
    const result = await apiSendVerificationPin(email, telephone);
    if (result.success) {
      showAlert('Un nouveau code a été envoyé.', 'success');
    } else {
      showAlert(result.message, 'error');
    }
  }
}

/**
 * Show a custom modal instead of native alert
 */
export function showAlert(message, type = 'info') {
  // Check if modal container already exists
  let modalContainer = document.getElementById('global-alert-modal');
  
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'global-alert-modal';
    modalContainer.innerHTML = `
      <div id="alert_modal_element" class="modal-overlay hidden fixed inset-0 w-full h-full z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
        <div class="modal-box bg-white border-none shadow-2xl rounded-[32px] p-8 relative overflow-hidden max-w-sm w-full transform transition-all duration-300 scale-100">
          <!-- Background decoration -->
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#f5a64b]/10 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-[#f5a64b]/5 rounded-full blur-3xl"></div>

          <!-- Close button top right -->
          <button id="alert-close-btn" class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-20">✕</button>

          <div class="flex flex-col items-center text-center gap-6 relative z-10">
            <div id="modal-icon-container" class="w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl transform rotate-3 transition-transform hover:rotate-0 duration-300">
              <i id="modal-icon" class="fa-solid fa-circle-info"></i>
            </div>
            
            <div class="space-y-2">
              <h3 id="modal-title" class="font-bricolage text-3xl font-extrabold tracking-tight text-gray-900">Notification</h3>
              <p id="modal-message" class="text-gray-500 leading-relaxed text-lg max-w-[280px] mx-auto"></p>
            </div>

            <div class="w-full mt-2">
              <button id="alert-ok-btn" class="btn border-none w-full rounded-2xl text-white font-bold h-14 text-lg shadow-lg shadow-[#f5a64b]/20 hover:shadow-[#f5a64b]/40 transition-all duration-300" style="background-color: #f5a64b;">
                D'accord
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalContainer);
    
    // Ajout d'une fonction de fermeture explicite au cas où, 
    // bien que notifications.js gère désormais 'modal-overlay'.
    window.closeAlertModal = function() {
      const el = document.getElementById('alert_modal_element');
      if (el) el.classList.add('hidden');
    };

    document.getElementById('alert-close-btn').addEventListener('click', window.closeAlertModal);
    document.getElementById('alert-ok-btn').addEventListener('click', window.closeAlertModal);
  }

  const modal = document.getElementById('alert_modal_element');
  const titleEl = document.getElementById('modal-title');
  const messageEl = document.getElementById('modal-message');
  const iconEl = document.getElementById('modal-icon');
  const iconCont = document.getElementById('modal-icon-container');

  // Set message
  messageEl.textContent = message;

  // Set type-specific styles
  iconCont.className = 'w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl transform rotate-3 transition-transform hover:rotate-0 duration-300';
  
  const msgLower = message.toLowerCase();
  const isError = type === 'error' || 
                  msgLower.includes('erreur') || 
                  msgLower.includes('impossible') || 
                  msgLower.includes('échouée') || 
                  msgLower.includes('échec') || 
                  msgLower.includes('incorrect') || 
                  msgLower.includes('invalide') || 
                  msgLower.includes('manquant') || 
                  message.includes('❌');
                  
  const isSuccess = type === 'success' || 
                    msgLower.includes('succès') || 
                    msgLower.includes('félicitations') || 
                    msgLower.includes('bravo') || 
                    msgLower.includes('réussie') || 
                    msgLower.includes('réussi') || 
                    msgLower.includes('terminé') || 
                    msgLower.includes('envoyée') || 
                    msgLower.includes('confirmé') || 
                    message.includes('✅') || 
                    message.includes('✓') ||
                    message.includes('success');

  if (isError) {
    titleEl.textContent = 'Oups !';
    iconEl.className = 'fa-solid fa-circle-xmark';
    iconCont.classList.add('bg-red-50', 'text-red-500');
  } else if (isSuccess) {
    titleEl.textContent = 'Génial !';
    iconEl.className = 'fa-solid fa-circle-check';
    iconCont.classList.add('bg-green-50', 'text-green-500');
  } else {
    titleEl.textContent = 'Notification';
    iconEl.className = 'fa-solid fa-circle-info';
    iconCont.classList.add('bg-[#f5a64b]/10', 'text-[#f5a64b]');
  }

  modal.classList.remove('hidden');
}

// Make it global so it can be used easily everywhere
window.showAlert = showAlert;

// Override native alert to use our custom modal
window.alert = function(message) {
  showAlert(message);
};

/**
 * Toggle the global page loader
 */
export function toggleLoader(show = true) {
  let loader = document.getElementById('page-loader');
  
  // Auto-inject if missing
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.className = 'fixed inset-0 z-[100] bg-[#F4EFE6]/80 backdrop-blur-md flex items-center justify-center transition-all duration-500 opacity-0 pointer-events-none';
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
  }
  
  if (show) {
    loader.classList.remove('opacity-0', 'pointer-events-none');
    loader.classList.add('opacity-100');
  } else {
    loader.classList.add('opacity-0', 'pointer-events-none');
    loader.classList.remove('opacity-100');
  }
}

// Make it global
window.toggleLoader = toggleLoader;
