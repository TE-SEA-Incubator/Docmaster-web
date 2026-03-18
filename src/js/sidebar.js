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
      href: "dashboard.html",
      icon: "fa-house",
      label: "Tableau de bord",
    },
    {
      href: "mesDeclarationsPerte.html",
      icon: "fa-triangle-exclamation",
      label: "Mes déclarations de perte",
    },
    {
      href: "Mesdocument.html",
      icon: "fa-folder-open",
      label: "Mes Documents",
    },
    {
      href: "Mesappareils.html",
      icon: "fa-mobile-screen-button",
      label: "Mes appareils",
    },
    {
      href: "mesDeclarationsTrouvees.html",
      icon: "fa-file-circle-check",
      label: "Mes déclarations trouvées",
    },
    {
      href: "rechercher.html",
      icon: "fa-magnifying-glass",
      label: "Rechercher",
    },
    {
      href: "mesGains.html",
      icon: "fa-wallet",
      label: "Mes Gains",
    },
  ],
  compte: [
    {
      href: "Abonnement.html",
      icon: "fa-crown",
      label: "Abonnement",
    },
    {
      href: "parrainage.html?v=20260317-2",
      icon: "fa-users-gear",
      label: "Parrainage",
    },
    {
      href: "infosProfil.html",
      icon: "fa-gear",
      label: "Paramètres",
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
    if (current === 'declarer.html' && normalized === 'mesDeclarationsPerte.html') return true;
    if (current === 'trouverdocument.html' && normalized === 'mesDeclarationsTrouvees.html') return true;
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
      ? "text-red-400/70 hover:bg-white/5 hover:text-red-400"
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

// ── Rendu complet du sidebar ─────────────────────────────────────────────────
function _sbRender() {
  return `
    <!-- Overlay mobile -->
    <div class="sb-overlay" id="overlay" onclick="closeSb()"></div>

    <!-- Sidebar -->
    <aside
      class="sidebar w-[var(--sidebar,260px)] bg-green-dark flex flex-col"
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
          ${SIDEBAR_NAV.principal.map(_sbNavItem).join("")}
        </nav>

        <div class="px-5 pt-5 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">Compte</div>
        <nav class="flex flex-col gap-0.5 px-2" aria-label="Navigation compte">
          ${SIDEBAR_NAV.compte.map(_sbNavItem).join("")}
        </nav>
      </div>

      <!-- User footer -->
      <div class="px-2 py-3 border-t border-white/10 flex-shrink-0">
        <div class="flex items-center gap-2.5 px-3 py-2 rounded-[10px] cursor-pointer hover:bg-white/5 transition-colors">
          <div
            class="w-[30px] h-[30px] rounded-[8px] bg-primary flex items-center justify-center font-bricolage text-[10px] font-extrabold text-white flex-shrink-0"
            id="userInitial"
          >JM</div>
          <div>
            <div class="text-[12.5px] font-semibold text-white leading-tight" id="userName">Jean-Marc D.</div>
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
  nav.className = 'bottom-nav fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-borderMain px-2 py-2 justify-around flex md:hidden';
  nav.innerHTML = `
    <a href="dashboard.html" class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-textMuted">
      <i class="fa-solid fa-house text-base"></i>
      <span class="text-[10px] font-medium">Accueil</span>
    </a>
    <a href="Mesdocument.html" class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-textMuted">
      <i class="fa-solid fa-plus-circle text-base"></i>
      <span class="text-[10px] font-medium">Ajouter</span>
    </a>
    <a href="rechercher.html" class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-textMuted">
      <i class="fa-solid fa-magnifying-glass text-base"></i>
      <span class="text-[10px] font-medium">Rechercher</span>
    </a>
    <a href="mesGains.html" class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-textMuted">
      <i class="fa-solid fa-wallet text-base"></i>
      <span class="text-[10px] font-medium">Mes Gains</span>
    </a>
    <a href="#" class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-primary" onclick="openSb()">
      <i class="fa-solid fa-bars text-base"></i>
      <span class="text-[10px] font-semibold">Plus</span>
    </a>
  `;

  document.body.appendChild(nav);
}

function _sbSetBottomNavItemState(link, isActive) {
  if (!link) return;
  link.classList.toggle('text-primary', isActive);
  link.classList.toggle('text-textMuted', !isActive);

  const label = link.querySelector('span');
  if (label) {
    label.classList.toggle('font-semibold', isActive);
    label.classList.toggle('font-medium', !isActive);
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
      const href = link.getAttribute('href') || '';
      const onClick = link.getAttribute('onclick') || '';
      return href === '#' || onClick.includes('openSb()');
    });
    _sbSetBottomNavItemState(plusLink, true);
  }
}

function _sbInjectMobileFab() {
  if (document.getElementById('dm-mobile-fab')) return;
  if (document.querySelector('.fab')) return;

  if (!document.getElementById('dm-mobile-fab-style')) {
    const style = document.createElement('style');
    style.id = 'dm-mobile-fab-style';
    style.textContent = `
      .dm-mobile-fab-wrap{position:fixed;right:16px;bottom:82px;z-index:35;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
      .dm-mobile-fab-main{width:52px;height:52px;border:none;border-radius:999px;background:#1E3A2F;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(30,58,47,.35);cursor:pointer;transition:transform .2s ease, background .2s ease}
      .dm-mobile-fab-main:active{transform:scale(.96)}
      .dm-mobile-fab-main i{font-size:18px}
      .dm-mobile-fab-actions{display:flex;flex-direction:column;align-items:flex-end;gap:8px;opacity:0;transform:translateY(6px);pointer-events:none;transition:opacity .18s ease, transform .18s ease}
      .dm-mobile-fab-wrap.open .dm-mobile-fab-actions{opacity:1;transform:translateY(0);pointer-events:auto}
      .dm-mobile-fab-wrap.open .dm-mobile-fab-main{background:#2D5A42}
      .dm-mobile-fab-link{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border-radius:999px;background:#fff;border:1px solid #EAE3D8;color:#1A1A1A;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 8px 20px rgba(0,0,0,.08)}
      .dm-mobile-fab-link i{color:#F5A64B;font-size:12px}
      @media (min-width: 900px){.dm-mobile-fab-wrap{display:none}}
    `;
    document.head.appendChild(style);
  }

  const wrap = document.createElement('div');
  wrap.className = 'dm-mobile-fab-wrap';
  wrap.id = 'dm-mobile-fab';
  wrap.innerHTML = `
    <div class="dm-mobile-fab-actions">
      <a class="dm-mobile-fab-link" href="declarer.html"><i class="fa-solid fa-triangle-exclamation"></i>Déclarer un doc</a>
      <a class="dm-mobile-fab-link" href="Mesdocument.html"><i class="fa-solid fa-folder-plus"></i>Enregistrer un doc</a>
      <a class="dm-mobile-fab-link" href="trouverdocument.html"><i class="fa-solid fa-file-circle-check"></i>Déclarer trouvé</a>
    </div>
    <button type="button" class="dm-mobile-fab-main" aria-label="Actions rapides"><i class="fa-solid fa-plus"></i></button>
  `;

  document.body.appendChild(wrap);

  const mainButton = wrap.querySelector('.dm-mobile-fab-main');
  mainButton.addEventListener('click', function () {
    wrap.classList.toggle('open');
  });

  document.addEventListener('click', function (event) {
    if (!wrap.contains(event.target)) wrap.classList.remove('open');
  });
}

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

  const style = document.createElement("style");
  style.id = "sb-desktop-slide-style";
  style.textContent = `
        @media (min-width: 900px) {
          .sidebar {
            transition: transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1) !important;
          }
          .sidebar.open {
            width: var(--sidebar,260px) !important;
            transform: translateX(0) !important;
          }
          .sidebar.closed {
            width: 0 !important;
            min-width: 0 !important;
            transform: translateX(-100%) !important;
            overflow: hidden !important;
          }
        }
      `;
  if (!document.getElementById("sb-desktop-slide-style")) {
    document.head.appendChild(style);
  }

  _sbInjectTopbarActions();
  _sbToggleTopRightControlsByViewport();
  _sbInjectMobileBottomNav();
  _sbApplyMobileBottomNavActiveState();
  _sbInjectMobileFab();

  _sbSetState(window.innerWidth >= 900);

  // 2. Hydratation depuis la session auth (auth.js a déjà lu le localStorage
  //    mais les éléments n'existaient pas encore — on les remplit ici)
  try {
        const AUTH_KEY = "docmaster_user_session";
        const raw = localStorage.getItem(AUTH_KEY);
        if (raw) {
          const user = JSON.parse(raw);

          const initialEl = document.getElementById("userInitial");
          const nameEl    = document.getElementById("userName");
          if (initialEl && user.initial) initialEl.textContent = user.initial;
          if (nameEl    && user.name)    nameEl.textContent    = user.name;

          // Aussi mettre à jour les éléments topbar présents sur certaines pages
          ["topInitial"].forEach(function (id) {
            const el = document.getElementById(id);
            if (el && user.initial) el.textContent = user.initial;
          });
          ["topName", "helloName"].forEach(function (id) {
            const el = document.getElementById(id);
            if (el && user.name) el.textContent = user.name;
          });
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
