/**
 * SIDEBAR.JS — Composant sidebar réutilisable
 *
 * Usage dans n'importe quelle page :
 *   1. Ajouter <div id="sidebar-root"></div> là où tu veux le sidebar
 *   2. Inclure <script src="./js/sidebar.js"></script> (après auth.js)
 *
 * Le lien actif est détecté automatiquement via window.location.pathname.
 * openSb() / closeSb() sont exposés globalement.
 */

// ── Définition des liens de navigation ──────────────────────────────────────
const SIDEBAR_NAV = {
  principal: [
    {
      href: "/dashboard.html",
      icon: "fa-house",
      label: "Tableau de bord",
    },
    {
      href: "/docDeclares.html",
      icon: "fa-list-check",
      label: "Mes déclarations",
    },
    {
      href: "/Mesdocument.html",
      icon: "fa-folder-open",
      label: "Mes Sauvegardes",
    },
    {
      href: "/Mesappareils.html",
      icon: "fa-mobile-screen-button",
      label: "Mes appareils",
    },
  ],
  compte: [
    {
      href: "/mesGains.html",
      icon: "fa-wallet",
      label: "Mes Gains",
    },
    {
      href: "/Abonnement.html",
      icon: "fa-crown",
      label: "Abonnement",
    },
    {
      href: "/parrainage.html?v=20260317-2",
      icon: "fa-users-gear",
      label: "Parrainage",
    },
    {
      href: "/infosProfil.html",
      icon: "fa-user",
      label: "Mon Profil",
    },
    {
      href: "#",
      icon: "fa-right-from-bracket",
      label: "Déconnexion",
      isLogout: true,
    },
  ],
};

// ── Détection de la page active ─────────────────────────────────────────────
function _sbCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function _sbIsActive(href) {
  if (href === "#") return false;
  const current = _sbCurrentPage();
  const normalized = href.split("/").pop().split("?")[0].split("#")[0];
  if (normalized !== current) {
    if (current === 'declarer.html' && normalized === 'docDeclares.html') return true;
    if (current === 'trouverdocument.html' && normalized === 'docDeclares.html') return true;
    if (current === 'rendre.html' && normalized === 'docDeclares.html') return true;
    return false;
  }

  const hrefQuery = href.includes('?') ? href.split('?')[1].split('#')[0] : '';
  if (!hrefQuery) return true;

  const targetParams = new URLSearchParams(hrefQuery);
  const currentParams = new URLSearchParams(window.location.search);
  for (const [key, value] of targetParams.entries()) {
    if (currentParams.get(key) !== value) return false;
  }
  return true;
}

// ── Génération d'un lien nav ─────────────────────────────────────────────────
function _sbNavItem(item) {
  const active = _sbIsActive(item.href);
  const baseClass =
    "sb-item flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium relative transition-all";
  const stateClass = active
    ? "text-white"
    : item.isLogout
      ? "logout-btn text-red-400/70 hover:bg-white/5 hover:text-red-400"
      : "text-white/60 hover:bg-white/5 hover:text-white/90";

  const iconClass = active
    ? "fa-solid " + item.icon + " w-4 text-center text-primary"
    : "fa-solid " + item.icon + " w-4 text-center opacity-80";

  const badge = item.badge
    ? `<span class="ml-auto bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">${item.badge}</span>`
    : "";

  const extraAttr = item.isLogout ? ' data-logout="true"' : "";

  return `
    <a class="${baseClass} ${stateClass}" href="${item.href}"${active ? ' aria-current="page"' : ""}${extraAttr}>
      <i class="${iconClass}"></i>
      ${item.label}
      ${badge}
    </a>`;
}

function _sbRender() {
    const session = (typeof getSession === 'function') ? getSession() : null;
    const raw = localStorage.getItem("docmaster_user_session");
    const user = session || (raw ? JSON.parse(raw) : null);
    
    let isAdmin = false;
    try {
        if (user && user.role) {
            console.log("DEBUG [Sidebar]: User role is", user.role);
            isAdmin = user.role.toUpperCase() === 'ADMIN';
        }
    } catch (e) {
        console.error("DEBUG [Sidebar]: Error checking admin role:", e);
    }

  const filterAdmin = (item) => !item.isAdmin || isAdmin;

  return `
    <!-- Overlay mobile -->
    <div class="sb-overlay page-fade-in" id="overlay" onclick="closeSb()"></div>

    <!-- Sidebar -->
    <aside
      class="sidebar w-[var(--sidebar,260px)] bg-green-dark flex flex-col page-fade-in"
      id="sidebar"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
        <img src="./assets/images/logo.png" alt="DocMaster" class="h-9 w-auto object-contain rounded" />
        <button
          class="ml-auto text-white/40 hover:text-white lg:hidden transition-colors"
          onclick="closeSb()"
          aria-label="Fermer le menu"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Nav links -->
      <div class="flex-1 overflow-y-auto py-2 custom-scroll">
        <div class="px-5 pt-4 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">Principal</div>
        <nav class="flex flex-col gap-0.5 px-2" aria-label="Navigation principale">
          ${SIDEBAR_NAV.principal.filter(filterAdmin).map(_sbNavItem).join("")}
        </nav>

        <div class="px-5 pt-5 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">Compte</div>
        <nav class="flex flex-col gap-0.5 px-2" aria-label="Navigation compte">
          ${SIDEBAR_NAV.compte.filter(filterAdmin).map(_sbNavItem).join("")}
        </nav>
      </div>

      <!-- User footer -->
      <div class="px-2 py-3 border-t border-white/10 flex-shrink-0">
        <div class="flex items-center gap-2.5 px-3 py-2 rounded-[10px] cursor-pointer hover:bg-white/5 transition-colors">
          <div
            class="w-[30px] h-[30px] rounded-[8px] bg-primary flex items-center justify-center font-bricolage text-[10px] font-extrabold text-white flex-shrink-0 overflow-hidden"
          >
            <img id="userPhoto" src="" class="w-full h-full object-cover hidden" />
            <span id="userInitial" data-user-initial>JM</span>
          </div>
          <div>
            <div class="text-[12.5px] font-semibold text-white leading-tight" id="userName" data-user-name>Jean-Marc D.</div>
            <div class="text-[10.5px] text-white/40">Plan Standard</div>
          </div>
          <i class="fa-solid fa-chevron-up ml-auto text-white/30 text-[10px]"></i>
        </div>
      </div>
    </aside>`;
}

// ── Helpers mobile open/close (exposés globalement dès le chargement) ────────
function openSb() {
  _sbSetState(true);
}

function closeSb() {
  _sbSetState(false);
}

function toggleSb() {
  const sb = document.getElementById("sidebar");
  if (!sb) return;
  const isOpen = sb.classList.contains("open") && !sb.classList.contains("closed");
  _sbSetState(!isOpen);
}

// Expose globalement pour les onclick du HTML
window.openSb = openSb;
window.closeSb = closeSb;
window.toggleSb = toggleSb;

function _sbSetState(isOpen) {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("overlay");
  if (!sb) return;

  sb.classList.toggle("open", isOpen);
  sb.classList.toggle("closed", !isOpen);

  if (ov) {
    if (window.innerWidth < 900 && isOpen) ov.classList.add("show");
    else ov.classList.remove("show");
  }
}

function _sbInjectTopbarActions() {
  const header = document.querySelector('.main-wrapper > header, .main-wrap > header, header.topbar, header.sticky');
  if (!header || header.querySelector('.dm-quick-actions') || header.querySelector('.dm-quick-search')) return;

  if (!document.getElementById('dm-quick-actions-style')) {
    const style = document.createElement('style');
    style.id = 'dm-quick-actions-style';
    style.textContent = `
      .dm-quick-search{display:none;align-items:center;gap:6px;min-width:0;margin-left:10px}
      .dm-quick-actions{display:none;align-items:center;gap:6px;min-width:0}
      .dm-qa-search{display:flex;align-items:center;gap:6px;padding:0 10px;height:38px;border:1px solid #EAE3D8;border-radius:12px;background:#FAF7F2;min-width:280px;max-width:380px}
      .dm-qa-search:focus-within{border-color:#F5A64B;background:#FEF0DC}
      .dm-qa-search i{font-size:12px;color:#9CA3AF;flex-shrink:0}
      .dm-qa-search input{border:none;outline:none;background:transparent;width:100%;font-size:13px;font-weight:600;color:#1A1A1A}
      .dm-qa-search input::placeholder{color:#9CA3AF}
      .dm-qa-link{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid transparent;border-radius:10px;color:#fff;font-size:11.5px;font-weight:700;line-height:1;text-decoration:none;white-space:nowrap;transition:all .2s}
      .dm-qa-link--red{background:#dc2626;border-color:#dc2626}
      .dm-qa-link--red:hover{background:#b91c1c;border-color:#b91c1c}
      .dm-qa-link--blue{background:#2563eb;border-color:#2563eb}
      .dm-qa-link--blue:hover{background:#1d4ed8;border-color:#1d4ed8}
      .dm-qa-link.active{opacity:.92;pointer-events:none}
      @media (min-width: 1024px){.dm-quick-search,.dm-quick-actions{display:flex}}
    `;
    document.head.appendChild(style);
  }

  const currentPage = _sbCurrentPage();
  const actions = [
    { href: 'declarer.html', icon: 'fa-triangle-exclamation', label: 'Déclarer une perte', pages: ['declarer.html'], tone: 'red' },
    { href: 'trouverdocument.html', icon: 'fa-file-circle-check', label: 'Doc retrouvé', pages: ['trouverdocument.html'], tone: 'blue' },
  ];
  const params = new URLSearchParams(window.location.search);
  const currentQuery = params.get('q') || '';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'dm-quick-search';
  const wrap = document.createElement('div');
  wrap.className = 'dm-quick-actions';
  const linksHtml = actions.map((action) => {
    const isActive = action.pages.includes(currentPage);
    const toneClass = action.tone === 'blue' ? ' dm-qa-link--blue' : ' dm-qa-link--red';
    return `<a href="${isActive ? '#' : action.href}" class="dm-qa-link${toneClass}${isActive ? ' active' : ''}" ${isActive ? 'aria-current="page"' : ''}><i class="fa-solid ${action.icon} text-[10px]"></i>${action.label}</a>`;
  }).join('');
  searchWrap.innerHTML = `
    <form class="dm-qa-search" data-dm-qa-search>
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" value="${currentQuery.replace(/"/g, '&quot;')}" placeholder="Rechercher un document..." data-dm-qa-input />
    </form>
  `;
  wrap.innerHTML = linksHtml;

  const title = header.querySelector('.font-bricolage');
  if (title) title.insertAdjacentElement('afterend', searchWrap);
  else header.appendChild(searchWrap);

  const right = header.querySelector('.ml-auto');
  if (right) right.prepend(wrap);
  else header.appendChild(wrap);

  const form = searchWrap.querySelector('[data-dm-qa-search]');
  const input = searchWrap.querySelector('[data-dm-qa-input]');
  if (form && input) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const value = input.value.trim();
      window.location.href = value ? `rechercher.html?q=${encodeURIComponent(value)}` : 'rechercher.html';
    });
  }
}

function _sbToggleTopRightControlsByViewport() {
  const header = document.querySelector('.main-wrapper > header, .main-wrap > header, header.topbar, header.sticky');
  if (!header) return;

  const rightWrap =
    header.querySelector('.ml-auto') ||
    header.querySelector('[style*="margin-left:auto"]') ||
    Array.from(header.children).find((child) => child.querySelector('.fa-bell, .fa-regular.fa-bell, .fa-solid.fa-bell')) ||
    header.lastElementChild;

  if (!rightWrap) return;

  const topInitial = rightWrap.querySelector('#topInitial') || header.querySelector('#topInitial');
  const bellIcon = rightWrap.querySelector('.fa-regular.fa-bell, .fa-solid.fa-bell');

  let profileBtn = topInitial ? topInitial.parentElement : null;
  if (!profileBtn && rightWrap.children.length > 0) {
    profileBtn = rightWrap.lastElementChild;
  }

  const notifBtn = bellIcon ? bellIcon.closest('div,button,a') : null;

  if (!profileBtn && !notifBtn) return;

  const onDesktop = window.innerWidth >= 900;

  if (profileBtn) {
    profileBtn.style.display = onDesktop ? 'none' : 'flex';
  }

  if (notifBtn) {
    notifBtn.style.display = '';
    if (getComputedStyle(notifBtn).display === 'none') notifBtn.style.display = 'flex';
  }
}

function _sbInjectMobileBottomNav() {
  if (document.querySelector('.bottom-nav')) return;

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-borderMain px-1 pb-safe pt-2 flex items-center md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.08)]';
  nav.innerHTML = `
    <a href="dashboard.html" class="nav-accueil flex-1 flex flex-col items-center gap-1.5 py-1 transition-all text-textMuted hover:text-primary active:scale-90">
      <i class="fa-solid fa-house text-xl"></i>
      <span class="text-[10px] font-bold uppercase tracking-tight">Accueil</span>
    </a>
     <a href="javascript:void(0)" onclick="toggleDeclModal()" class="nav-plus flex-1 flex flex-col items-center gap-1.5 py-1 transition-all text-textMuted hover:text-primary active:scale-90">
      <i class="fa-solid fa-circle-plus text-2xl text-primary"></i>
      <span class="text-[10px] font-bold uppercase tracking-tight text-primary">Déclaration</span>
    </a>
    <a href="Mesdocument.html" class="nav-documents flex-1 flex flex-col items-center gap-1.5 py-1 transition-all text-textMuted hover:text-primary active:scale-90">
      <i class="fa-solid fa-folder-open text-xl"></i>
      <span class="text-[10px] font-bold uppercase tracking-tight">Documents</span>
    </a>
  
    <a href="Mesappareils.html" class="nav-objets flex-1 flex flex-col items-center gap-1.5 py-1 transition-all text-textMuted hover:text-primary active:scale-90">
      <i class="fa-solid fa-mobile-screen-button text-xl"></i>
      <span class="text-[10px] font-bold uppercase tracking-tight">Mes Objets</span>
    </a>
   
  `;

  document.body.appendChild(nav);
}

function toggleDeclModal() {
  const overlay = document.getElementById('decl-modal-overlay');
  const content = document.getElementById('decl-modal-content');
  if (!overlay || !content) return;

  const isHidden = overlay.classList.contains('hidden');
  if (isHidden) {
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.style.opacity = '1';
      content.classList.remove('translate-y-full');
    }, 10);
  } else {
    overlay.style.opacity = '0';
    content.classList.add('translate-y-full');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 300);
  }
}

function _sbInjectDeclarationModal() {
  if (document.getElementById('decl-modal-overlay')) return;

  const modalHtml = `
    <div id="decl-modal-overlay" class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm hidden transition-opacity duration-300 opacity-0" onclick="toggleDeclModal()"></div>
    <div id="decl-modal-content" class="fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-[32px] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] transform translate-y-full transition-transform duration-300 ease-out md:hidden">
      <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
      <h3 class="font-bricolage text-xl font-extrabold text-textMain text-center mb-6">Faire une déclaration</h3>
      <div class="grid grid-cols-1 gap-4">
        <a href="declarer.html" class="flex items-center gap-4 p-4 rounded-2xl bg-red-50 border border-red-100 active:scale-[0.98] transition-all">
          <div class="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white text-xl">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="flex-1">
            <p class="font-bold text-textMain text-[15px]">Déclarer une perte</p>
            <p class="text-[11px] text-red-600/70 font-medium font-poppins">J'ai perdu un document</p>
          </div>
          <i class="fa-solid fa-chevron-right text-red-300"></i>
        </a>
        <a href="trouverdocument.html" class="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 active:scale-[0.98] transition-all">
          <div class="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl">
            <i class="fa-solid fa-file-circle-check"></i>
          </div>
          <div class="flex-1">
            <p class="font-bold text-textMain text-[15px]">Déclarer un objet trouvé</p>
            <p class="text-[11px] text-blue-600/70 font-medium font-poppins">J'ai retrouvé quelque chose</p>
          </div>
          <i class="fa-solid fa-chevron-right text-blue-300"></i>
        </a>
      </div>
      <button onclick="toggleDeclModal()" class="w-full mt-6 py-4 text-sm font-bold text-textMuted uppercase tracking-widest font-poppins">Annuler</button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function _sbSetBottomNavItemState(link, isActive) {
  if (!link) return;
  if (isActive) {
    link.classList.remove('text-textMuted');
    link.classList.add('text-primary', 'font-black');
    // Add a glow effect to the icon
    const icon = link.querySelector('i');
    if (icon) {
      icon.style.filter = 'drop-shadow(0 0 8px rgba(245, 166, 75, 0.6))';
      icon.style.transform = 'scale(1.1)';
    }
  } else {
    link.classList.remove('text-primary', 'font-black');
    link.classList.add('text-textMuted');
    const icon = link.querySelector('i');
    if (icon) {
      icon.style.filter = '';
      icon.style.transform = '';
    }
  }
}

function _sbApplyMobileBottomNavActiveState() {
  const nav = document.querySelector('.bottom-nav');
  if (!nav) return;

  const current = _sbCurrentPage();
  const links = Array.from(nav.querySelectorAll('a[href]'));
  let hasDirectMatch = false;

  links.forEach(function (link) {
    const href = link.getAttribute('href') || '#';
    if (href === '#') {
      _sbSetBottomNavItemState(link, false);
      return;
    }

    const normalized = href.split('/').pop().split('?')[0].split('#')[0];
    const isActive = normalized === current;
    if (isActive) hasDirectMatch = true;
    _sbSetBottomNavItemState(link, isActive);
  });

  if (!hasDirectMatch) {
    const plusLink = links.find(function (link) {
      const onClick = link.getAttribute('onclick') || '';
      return onClick.includes('toggleDeclModal()');
    });
    if (plusLink) _sbSetBottomNavItemState(plusLink, true);
  }
}

// Attach functions to window for global access
window.openSb = openSb;
window.closeSb = closeSb;
window.toggleSb = toggleSb;

// ── Injection dans le DOM + listeners (après que le DOM est prêt) ─────────────
document.addEventListener("DOMContentLoaded", function () {
  // 1. Montage du sidebar
  const root = document.getElementById("sidebar-root");
  if (root) {
    root.outerHTML = _sbRender();
  }

  // Set initial state
  document.body.classList.add("sidebar-open");
  
  const mainWrapper = document.getElementById("mainWrapper");
  if (mainWrapper) mainWrapper.classList.add("page-fade-in");

  const style = document.createElement("style");
  style.id = "sb-desktop-slide-style";
  style.textContent = `
        body {
          display: flex !important;
          height: 100vh !important;
          overflow: hidden !important;
        }
        .sb-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
          z-index: 40;
          backdrop-filter: blur(3px);
          opacity: 0;
          pointer-events: none;
          transition: opacity .28s;
        }
        .sb-overlay.show {
          display: block;
          opacity: 1;
          pointer-events: all;
        }

        .sidebar {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 50;
          transition: transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1) !important;
        }
        .sidebar.open {
          transform: translateX(0) !important;
          width: var(--sidebar,260px) !important;
        }
        .sidebar.closed {
          transform: translateX(-100%) !important;
          width: 0 !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        @media (min-width: 900px) {
          .sidebar-open .main-wrapper, .sidebar-open .main-wrap {
            margin-left: 0 !important; /* Flexbox handles the spacing */
          }
          .sidebar {
            position: relative;
            transform: translateX(0) !important;
          }
          .sidebar.closed {
            transform: translateX(-100%) !important;
          }
        }
      `;
  if (!document.getElementById("sb-desktop-slide-style")) {
    document.head.appendChild(style);
  }

  _sbInjectTopbarActions();
  _sbToggleTopRightControlsByViewport();
  _sbInjectMobileBottomNav();
  _sbInjectDeclarationModal();
  _sbApplyMobileBottomNavActiveState();

  _sbSetState(window.innerWidth >= 900);

  // 2. Hydratation depuis la session auth
  try {
    const AUTH_KEY = "docmaster_user_session";
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.name || "Utilisateur";
      const initial = user.initial || (user.nom ? user.nom[0] : "D");

      // Update Sidebar
      const initialEl = document.getElementById("userInitial");
      const photoEl = document.getElementById("userPhoto");
      const nameEl = document.getElementById("userName");

      if (initialEl) initialEl.textContent = initial;
      if (nameEl) nameEl.textContent = fullName;
      
      if (user.photo_url && photoEl) {
        const fullUrl = user.photo_url.startsWith('http') ? user.photo_url : '/' + user.photo_url.replace(/^\//, '');
        photoEl.src = fullUrl;
        photoEl.classList.remove('hidden');
        if (initialEl) initialEl.classList.add('hidden');
      }

      // Update Topbar/Header elements if they exist
      const topInitial = document.getElementById("topInitial");
      const topPhoto = document.getElementById("topPhoto");
      const topName = document.getElementById("topName");
      const helloName = document.getElementById("helloName");

      if (topInitial) topInitial.textContent = initial;
      if (topName) topName.textContent = user.prenom || user.name || fullName;
      if (helloName) helloName.textContent = user.prenom || user.name || fullName;

      if (user.photo_url && topPhoto) {
        const fullUrl = user.photo_url.startsWith('http') ? user.photo_url : '/' + user.photo_url.replace(/^\//, '');
        topPhoto.src = fullUrl;
        topPhoto.classList.remove('hidden');
        if (topInitial) topInitial.classList.add('hidden');
      }
    }
  } catch (e) { /* session absente ou invalide */ }

  // 3. Fermeture automatique sur mobile après clic sur un lien
  document.querySelectorAll(".sb-item").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.innerWidth < 900) closeSb();
    });
  });

  // 4. Gestion du logout depuis le sidebar
  document.querySelectorAll('[data-logout="true"]').forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof logout === "function") logout();
    });
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900) {
      const sb = document.getElementById("sidebar");
      if (sb && !sb.classList.contains("open") && !sb.classList.contains("closed")) {
        _sbSetState(true);
      }
    } else {
      closeSb();
    }

    _sbToggleTopRightControlsByViewport();
  });
});
