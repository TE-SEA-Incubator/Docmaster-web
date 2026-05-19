/**
 * DocMaster Notifications System
 * Mobile: Full-screen page | Desktop: Floating modal
 */

(function() {
  // 1. Inject CSS
  const style = document.createElement('style');
  style.id = 'dm-notifications-styles';
  style.textContent = `
    .custom-scroll::-webkit-scrollbar { width: 4px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #EAE3D8; border-radius: 10px; }

    /* Modal outer wrapper */
    #notifModal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
    }

    #notifModal.open {
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    /* Backdrop */
    #notifBackdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    /* The card */
    #notifCard {
      position: relative;
      background: #ffffff;
      width: 100%;
      max-height: 82vh;
      border-radius: 2rem 2rem 0 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
      box-shadow: 0 -20px 60px rgba(0,0,0,0.18);
    }

    #notifModal.open #notifCard {
      transform: translateY(0);
    }

    /* Desktop: show as centered floating card */
    @media (min-width: 768px) {
      #notifModal.open {
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      #notifCard {
        max-width: 480px;
        max-height: 80vh;
        border-radius: 2.5rem;
        transform: scale(0.92) translateY(12px);
        opacity: 0;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
        box-shadow: 0 25px 80px rgba(0,0,0,0.18);
      }
      #notifModal.open #notifCard {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    /* Drag handle (mobile only) */
    .notif-drag-handle {
      width: 2.5rem;
      height: 4px;
      background: #e2e8f0;
      border-radius: 99px;
      margin: 0.75rem auto 0;
      flex-shrink: 0;
    }
    @media (min-width: 768px) {
      .notif-drag-handle { display: none; }
    }

    /* Notification list area */
    #notifListModal {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    #notifListModal::-webkit-scrollbar { width: 4px; }
    #notifListModal::-webkit-scrollbar-thumb { background: #EAE3D8; border-radius: 10px; }

    /* Individual notification item */
    .notif-item {
      display: flex;
      gap: 0.875rem;
      align-items: flex-start;
      padding: 0.875rem;
      border-radius: 1.25rem;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      transition: background 0.2s;
    }
    .notif-item:hover { background: #f1f5f9; }
    .notif-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.875rem;
      background: white;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
  `;
  document.head.appendChild(style);

  // 2. Inject Modal HTML — bottom sheet on mobile, card on desktop
  const modalHtml = `
    <div id="notifModal" role="dialog" aria-modal="true" aria-label="Notifications">
      <div id="notifBackdrop" onclick="closeNotifModal()"></div>

      <div id="notifCard">
        <!-- Pull Handle (mobile only) -->
        <div class="notif-drag-handle"></div>

        <!-- Header -->
        <div style="padding: 1.25rem 1.5rem 1rem; display:flex; align-items:center; justify-content:space-between; border-bottom: 1px solid #f1f5f9; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:2.75rem; height:2.75rem; background:#FEF0DC; border-radius:0.875rem; display:flex; align-items:center; justify-content:center;">
              <i class="fa-solid fa-bell" style="color:#F5A64B; font-size:1.125rem;"></i>
            </div>
            <div>
              <h2 style="font-family:'Bricolage Grotesque',sans-serif; font-size:1.125rem; font-weight:800; color:#1A1A1A; letter-spacing:-0.02em; line-height:1;">Notifications</h2>
              <p style="font-size:0.65rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-top:0.2rem;">
                <span id="notifCountModal" style="color:#F5A64B;">0</span> non lue(s)
              </p>
            </div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button onclick="toggleNotifSettings()" style="width:2.5rem; height:2.5rem; border-radius:0.75rem; background:#f8fafc; border:1px solid #e2e8f0; color:#94a3b8; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.borderColor='#F5A64B';this.style.color='#F5A64B'" onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#94a3b8'">
              <i class="fa-solid fa-sliders" style="font-size:0.8rem;"></i>
            </button>
            <button onclick="closeNotifModal()" style="width:2.5rem; height:2.5rem; border-radius:0.75rem; background:#f8fafc; border:1px solid #e2e8f0; color:#94a3b8; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='#fee2e2';this.style.borderColor='#fca5a5';this.style.color='#ef4444'" onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';this.style.color='#94a3b8'">
              <i class="fa-solid fa-xmark" style="font-size:0.875rem;"></i>
            </button>
          </div>
        </div>

        <!-- Settings Dropdown -->
        <div id="notifSettingsModal" style="display:none; padding:0.875rem 1.5rem; background:#f8fafc; border-bottom:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.65rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.75rem;">Paramètres</p>
          <div style="display:flex; flex-direction:column; gap:0.625rem;">
            <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
              <span style="font-size:0.8125rem; font-weight:600; color:#475569;">Alertes par Email</span>
              <input type="checkbox" checked style="accent-color:#F5A64B; width:1rem; height:1rem;">
            </label>
            <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
              <span style="font-size:0.8125rem; font-weight:600; color:#475569;">Push Mobile</span>
              <input type="checkbox" checked style="accent-color:#F5A64B; width:1rem; height:1rem;">
            </label>
          </div>
        </div>

        <!-- Notification List -->
        <div id="notifListModal">
          <!-- dynamic notifications injected here -->
        </div>

        <!-- Footer -->
        <div style="padding:1rem 1.5rem; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; align-items:center; justify-content:flex-end; flex-shrink:0;">
          <button onclick="markAllRead()" style="font-size:0.75rem; font-weight:700; color:#F5A64B; background:none; border:none; cursor:pointer; letter-spacing:0.02em;">
            Marquer tout comme lu
          </button>
        </div>
      </div>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  });

  // 3. Global Functions
  window.openNotifModal = function() {
    const modal = document.getElementById('notifModal');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Add explicit listener to the modal container itself
    modal.onclick = (e) => {
      if (e.target === modal) window.closeNotifModal();
    };
  };

  window.closeNotifModal = function() {
    const modal = document.getElementById('notifModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  window.toggleNotifSettings = function() {
    const settings = document.getElementById('notifSettingsModal');
    settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
  };

  window.markAllRead = async function() {
    // If a custom handler is defined (e.g. in dashboard.js), call it
    if (window.customMarkAllReadHandler) {
      await window.customMarkAllReadHandler();
    }

    const countElm = document.getElementById('notifCountModal');
    if (countElm) countElm.innerText = '0';
    
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = 'none';

    document.querySelectorAll('.notif-item').forEach(function(item) {
      item.style.background = '#f8fafc';
      item.style.borderColor = '#f1f5f9';
    });
  };


  window.addNotification = function(title, message, time, icon, isRead = false) {
    const container = document.getElementById('notifListModal');
    if (!container) return;

    const iconClass = icon || 'fa-solid fa-bell';
    const background = isRead ? '#f8fafc' : '#FEFBF6';
    const border = isRead ? '#f1f5f9' : '#FEF0DC';
    
    const notif = `
      <div class="notif-item" style="background: ${background}; border-color: ${border}">
        <div class="notif-icon">
          <i class="${iconClass}" style="color:#F5A64B; font-size:0.875rem;"></i>
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:0.5rem; margin-bottom:0.2rem;">
            <h4 style="font-family:'Bricolage Grotesque',sans-serif; font-size:0.8125rem; font-weight:800; color:#1A1A1A; text-transform:uppercase; letter-spacing:0.02em; line-height:1.3;">${title}</h4>
            <span style="font-size:0.625rem; color:#94a3b8; font-weight:700; text-transform:uppercase; white-space:nowrap; flex-shrink:0;">${time}</span>
          </div>
          <p style="font-size:0.78rem; color:#64748b; line-height:1.55;">${message}</p>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('afterbegin', notif);

    // Update count & dot if unread
    if (!isRead) {
      const countElm = document.getElementById('notifCountModal');
      const dot = document.getElementById('notifDot');
      if (countElm) {
        const currentCount = parseInt(countElm.innerText || '0');
        countElm.innerText = currentCount + 1;
      }
      if (dot) dot.style.display = 'block';
    }
  };

  // Helper to clear list
  window.clearNotifications = function() {
    const container = document.getElementById('notifListModal');
    const countElm = document.getElementById('notifCountModal');
    const dot = document.getElementById('notifDot');
    if (container) container.innerHTML = '';
    if (countElm) countElm.innerText = '0';
    if (dot) dot.style.display = 'none';
  };

  /* ════════════════════════════════════════════════════════════════
     FERMETURE UNIVERSELLE DES MODALS
     Gère : backdrop click + touche Échap
     Fonctionne par délégation → couvre les modals injectés dynamiquement
  ════════════════════════════════════════════════════════════════ */

  // Fonctions de fermeture nommées par id de modal
  const _MODAL_CLOSERS = {
    confirmOverlay:       'closeConfirmModal',
    confirmLostModal:     'closeConfirmLost',
    addModal:             'closeAddModal',
    verifyModal:          'closeVerifyModal',
    'add-modal':          'closeModal',
    'camera-modal':       'closeCameraModal',
    modalWrapper:         'closeSubscriptionModal',
    recoveryModalWrapper: 'closeRecoveryModal',
    notifModal:           'closeNotifModal',
  };

  // Ferme un modal selon son pattern
  function _doClose(el) {
    if (!el) return;
    const fn = _MODAL_CLOSERS[el.id];
    if (fn && typeof window[fn] === 'function') { window[fn](); return; }

    if (el.tagName === 'DIALOG') { el.close(); return; }

    if (el.classList.contains('confirm-overlay') ||
        el.classList.contains('success-overlay') ||
        el.classList.contains('modal-bg')) {
      el.classList.remove('show'); return;
    }
    if (el.classList.contains('modal-overlay')) {
      el.classList.add('hidden'); return;
    }
    // Wrappers fixed flex (modalWrapper, recoveryModalWrapper…)
    el.classList.add('hidden');
    el.classList.remove('flex');
  }

  // Remonte le DOM pour trouver le conteneur modal
  function _findModal(target) {
    let el = target;
    while (el && el !== document.body) {
      if (_isModalContainer(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function _isModalContainer(el) {
    return (
      // Tout <dialog> ouvert (natif, DaisyUI, alert_modal_element…)
      (el.tagName === 'DIALOG' && el.open) ||
      // Modals injectés dynamiquement par id
      el.id === 'notifModal' ||
      el.id === 'alert_modal_element' ||
      // Classes d'overlay
      el.classList.contains('confirm-overlay') ||
      el.classList.contains('success-overlay') ||
      el.classList.contains('modal-bg') ||
      el.classList.contains('modal-overlay') ||
      el.id === 'modalWrapper' ||
      el.id === 'recoveryModalWrapper'
    );
  }

  // Vérifie si le clic est sur le fond et non sur la boîte de contenu
  function _isBackdropClick(e, modal) {
    if (e.target === modal) return true;

    // Pour <dialog> DaisyUI : hors de .modal-box = backdrop
    if (modal.tagName === 'DIALOG') {
      const box = modal.querySelector('.modal-box');
      return box ? !box.contains(e.target) : true;
    }

    // Cherche la boîte de contenu
    let box = modal.querySelector(
      '.modal-box, .confirm-card, .success-card, #notifCard, ' +
      '[id$="ModalBox"], [id$="Box"]'
    );
    if (!box && modal.classList.contains('modal-bg')) {
      box = modal.querySelector('.modal');
    }

    if (!box) return true;
    return !box.contains(e.target);
  }

  // Vérifie si un modal est actuellement visible
  function _isVisible(el) {
    if (el.tagName === 'DIALOG') return el.open;
    if (el.id === 'notifModal') return el.classList.contains('open');
    if (el.classList.contains('modal-overlay') ||
        el.id === 'modalWrapper' || el.id === 'recoveryModalWrapper') {
      return !el.classList.contains('hidden');
    }
    return el.classList.contains('show');
  }

  // Clic délégué sur document (capture = attrape tout même stopPropagation)
  document.addEventListener('click', function(e) {
    const modal = _findModal(e.target);
    if (!modal || !_isVisible(modal) || !_isBackdropClick(e, modal)) return;
    _doClose(modal);
  }, true);

  // Touche Échap → ferme le modal le plus en avant
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    const candidates = Array.from(document.querySelectorAll(
      'dialog.modal[open], ' +
      '.confirm-overlay.show, .success-overlay.show, .modal-bg.show, ' +
      '.modal-overlay:not(.hidden), ' +
      '#notifModal.open, ' +
      '#modalWrapper:not(.hidden), #recoveryModalWrapper:not(.hidden)'
    ));
    if (!candidates.length) return;
    const top = candidates.reduce((best, el) => {
      const z  = parseInt(getComputedStyle(el).zIndex, 10) || 0;
      const bz = parseInt(getComputedStyle(best).zIndex, 10) || 0;
      return z >= bz ? el : best;
    });
    e.preventDefault();
    _doClose(top);
  });

})();

